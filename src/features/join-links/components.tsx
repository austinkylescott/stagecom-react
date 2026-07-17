import { Link } from '@tanstack/react-router'
import { CheckCircle2, Copy, Link2, Loader2, RotateCw } from 'lucide-react'
import { useRef, useState } from 'react'

import {
  acceptReusableJoinLinkFn,
  createReusableJoinLinkFn,
  revokeReusableJoinLinkFn,
  rotateReusableJoinLinkFn,
} from './server-functions'

import type { ReusableJoinLinkListItem } from './persistence'
import type { ReusableJoinLinkView } from './queries'

export function ReusableJoinLinksManager({
  initialLinks,
  theaterId,
}: {
  initialLinks: ReusableJoinLinkListItem[]
  theaterId: string
}) {
  const [error, setError] = useState<string | null>(null)
  const expiresAtRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [links, setLinks] = useState(initialLinks)
  const maxUsesRef = useRef<HTMLInputElement>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  function showToken(joinToken: string) {
    setShareUrl(
      new URL(
        `/join-link/${encodeURIComponent(joinToken)}`,
        window.location.origin,
      ).toString(),
    )
  }

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
        Reusable Join Links
      </h2>
      <p className="mt-2 max-w-2xl text-[var(--sea-ink-soft)]">
        Anyone with an active link can join as a base Member. Add an expiry or
        use limit when the link should close automatically.
      </p>
      <form
        className="island-shell mt-4 grid gap-4 rounded-lg px-5 py-5 md:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault()
          const submittedExpiresAt = expiresAtRef.current?.value ?? ''
          const submittedMaxUses = maxUsesRef.current?.value ?? ''
          setError(null)
          setShareUrl(null)
          setIsSubmitting(true)

          try {
            const result = await createReusableJoinLinkFn({
              data: {
                ...(submittedExpiresAt
                  ? {
                      expiresAt: new Date(submittedExpiresAt).toISOString(),
                    }
                  : {}),
                ...(submittedMaxUses
                  ? { maxUses: Number(submittedMaxUses) }
                  : {}),
                theaterId,
              },
            })

            if (!result.ok) {
              setError(result.error.message)
              return
            }

            showToken(result.data.joinToken)
            if (expiresAtRef.current) {
              expiresAtRef.current.value = ''
            }
            if (maxUsesRef.current) {
              maxUsesRef.current.value = ''
            }
            setLinks((current) => [
              {
                createdAt: result.data.createdAt,
                expiresAt: result.data.expiresAt,
                id: result.data.id,
                maxUses: result.data.maxUses,
                revokedAt: null,
                rotatedFromId: null,
                status: 'active',
                useCount: 0,
              },
              ...current,
            ])
          } finally {
            setIsSubmitting(false)
          }
        }}
      >
        <label className="grid gap-2 text-sm font-bold text-[var(--sea-ink)]">
          Expires (optional)
          <input
            className="rounded-md border border-[var(--line)] bg-white px-3 py-3 font-normal"
            name="expiresAt"
            ref={expiresAtRef}
            type="datetime-local"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[var(--sea-ink)]">
          Maximum uses (optional)
          <input
            className="rounded-md border border-[var(--line)] bg-white px-3 py-3 font-normal"
            min="1"
            name="maxUses"
            ref={maxUsesRef}
            type="number"
          />
        </label>
        <button
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          Create Join Link
        </button>
      </form>
      {shareUrl ? <ShareableJoinLink value={shareUrl} /> : null}
      {error ? <JoinLinkError message={error} /> : null}

      <div className="mt-4 grid gap-3">
        {links.length === 0 ? (
          <p className="island-shell rounded-lg px-5 py-5 text-[var(--sea-ink-soft)]">
            No Reusable Join Links yet.
          </p>
        ) : (
          links.map((link) => (
            <article
              className="island-shell flex flex-col justify-between gap-4 rounded-lg px-5 py-4 sm:flex-row sm:items-center"
              key={link.id}
            >
              <div>
                <p className="font-extrabold capitalize text-[var(--sea-ink)]">
                  {link.status}
                </p>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  {link.useCount}
                  {link.maxUses === null ? ' uses' : ` of ${link.maxUses} uses`}
                  {' · '}
                  {link.expiresAt
                    ? `expires ${new Date(link.expiresAt).toLocaleString()}`
                    : 'does not expire'}
                </p>
              </div>
              {link.status === 'active' ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-4 py-2 text-sm font-extrabold"
                    onClick={async () => {
                      setError(null)
                      setShareUrl(null)
                      const result = await rotateReusableJoinLinkFn({
                        data: { joinLinkId: link.id },
                      })

                      if (!result.ok) {
                        setError(result.error.message)
                        return
                      }

                      showToken(result.data.joinToken)
                      setLinks((current) => [
                        {
                          createdAt: result.data.createdAt,
                          expiresAt: result.data.expiresAt,
                          id: result.data.id,
                          maxUses: result.data.maxUses,
                          revokedAt: null,
                          rotatedFromId: result.data.rotatedFromId,
                          status: 'active',
                          useCount: 0,
                        },
                        ...current.map((candidate) =>
                          candidate.id === link.id
                            ? {
                                ...candidate,
                                revokedAt: new Date().toISOString(),
                                status: 'revoked' as const,
                              }
                            : candidate,
                        ),
                      ])
                    }}
                    type="button"
                  >
                    <RotateCw className="size-4" /> Rotate
                  </button>
                  <button
                    className="rounded-md border border-red-200 px-4 py-2 text-sm font-extrabold text-red-800"
                    onClick={async () => {
                      setError(null)
                      const result = await revokeReusableJoinLinkFn({
                        data: { joinLinkId: link.id },
                      })

                      if (!result.ok) {
                        setError(result.error.message)
                        return
                      }

                      setLinks((current) =>
                        current.map((candidate) =>
                          candidate.id === link.id
                            ? {
                                ...candidate,
                                revokedAt: new Date().toISOString(),
                                status: 'revoked' as const,
                              }
                            : candidate,
                        ),
                      )
                    }}
                    type="button"
                  >
                    Revoke
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  )
}

export function ReusableJoinLinkPage({
  joinToken,
  preview,
  signedIn,
}: {
  joinToken: string
  preview: ReusableJoinLinkView
  signedIn: boolean
}) {
  const [acceptedTheater, setAcceptedTheater] = useState<{
    name: string
    slug: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const stateCopy = getJoinLinkStateCopy(preview)
  const next = `/join-link/${encodeURIComponent(joinToken)}`

  return (
    <main className="page-wrap grid min-h-[72vh] place-items-center py-10">
      <section className="island-shell w-full max-w-xl rounded-lg px-6 py-7 sm:px-8">
        {acceptedTheater ? (
          <CheckCircle2 className="size-7 text-[var(--palm)]" />
        ) : (
          <Link2 className="size-7 text-[var(--palm)]" />
        )}
        <h1 className="display-title mt-4 text-3xl font-bold text-[var(--sea-ink)]">
          {acceptedTheater
            ? `You joined ${acceptedTheater.name}`
            : stateCopy.title}
        </h1>
        <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">
          {acceptedTheater
            ? 'Your base Member access is active.'
            : stateCopy.copy}
        </p>

        {acceptedTheater ? (
          <a
            className="mt-6 inline-flex rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white no-underline"
            href={`/app/${acceptedTheater.slug}`}
          >
            Open Theater workspace
          </a>
        ) : preview.state === 'active' ? (
          signedIn ? (
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
              disabled={isSubmitting}
              onClick={async () => {
                setError(null)
                setIsSubmitting(true)

                try {
                  const result = await acceptReusableJoinLinkFn({
                    data: { joinToken },
                  })

                  if (!result.ok) {
                    setError(result.error.message)
                    return
                  }

                  setAcceptedTheater(result.data.theater)
                } finally {
                  setIsSubmitting(false)
                }
              }}
              type="button"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Join Theater
            </button>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white no-underline"
                search={{ next }}
                to="/login"
              >
                Sign in to join
              </Link>
              <Link
                className="rounded-md border border-[var(--line)] px-4 py-3 font-extrabold no-underline"
                search={{ next }}
                to="/signup"
              >
                Create account
              </Link>
            </div>
          )
        ) : null}
        {error ? <JoinLinkError message={error} /> : null}
      </section>
    </main>
  )
}

function ShareableJoinLink({ value }: { value: string }) {
  return (
    <div className="mt-4 rounded-md border border-[var(--theater)] bg-[var(--theater-soft)] px-4 py-4">
      <p className="font-extrabold text-[var(--theater-ink)]">
        Copy this link now. Its token will not be shown again.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Shareable Reusable Join Link"
          className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
          readOnly
          value={value}
        />
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-extrabold"
          onClick={() => navigator.clipboard.writeText(value)}
          type="button"
        >
          <Copy className="size-4" /> Copy
        </button>
      </div>
    </div>
  )
}

function getJoinLinkStateCopy(preview: ReusableJoinLinkView) {
  switch (preview.state) {
    case 'active':
      return {
        title: `Join ${preview.theaterName}`,
        copy: 'This Reusable Join Link grants base Theater Member access after you sign in.',
      }
    case 'expired':
      return {
        title: 'Join Link expired',
        copy: 'Ask the Theater Owner or Admin for a new link.',
      }
    case 'revoked':
      return {
        title: 'Join Link revoked',
        copy: 'Ask the Theater Owner or Admin if you still need access.',
      }
    case 'exhausted':
      return {
        title: 'Join Link exhausted',
        copy: 'This link has reached its use limit. Ask for a new link.',
      }
    case 'invalid':
      return {
        title: 'Join Link is invalid',
        copy: 'Check the link or ask the Theater Owner or Admin for a fresh one.',
      }
  }
}

function JoinLinkError({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
      {message}
    </p>
  )
}
