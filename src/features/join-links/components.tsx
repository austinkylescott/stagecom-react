import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { ReusableJoinLinkView } from './public-queries'

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
      <h2 className="text-2xl font-semibold text-foreground">
        Reusable Join Links
      </h2>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Anyone with an active link can join as a base Member. Add an expiry or
        use limit when the link should close automatically.
      </p>
      <form
        className="mt-4 grid gap-4 rounded-lg px-5 py-5 md:grid-cols-3"
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
        <Label className="grid gap-2 text-sm font-medium text-foreground">
          Expires (optional)
          <Input name="expiresAt" ref={expiresAtRef} type="datetime-local" />
        </Label>
        <Label className="grid gap-2 text-sm font-medium text-foreground">
          Maximum uses (optional)
          <Input min="1" name="maxUses" ref={maxUsesRef} type="number" />
        </Label>
        <Button className="mt-auto" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          Create Join Link
        </Button>
      </form>
      {shareUrl ? <ShareableJoinLink value={shareUrl} /> : null}
      {error ? <JoinLinkError message={error} /> : null}

      <div className="mt-4 grid gap-3">
        {links.length === 0 ? (
          <p className="rounded-lg px-5 py-5 text-muted-foreground">
            No Reusable Join Links yet.
          </p>
        ) : (
          links.map((link) => (
            <Card
              role="article"
              className="flex flex-col justify-between gap-4  px-5 py-4 sm:flex-row sm:items-center gap-0"
              key={link.id}
            >
              <div>
                <p className="font-semibold capitalize text-foreground">
                  {link.status}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
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
                  <Button
                    variant="outline"

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
                  </Button>
                  <Button
                    variant="destructive"

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
                  </Button>
                </div>
              ) : null}
            </Card>
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
      <Card className="w-full max-w-xl  px-6 py-7 sm:px-8 gap-0">
        {acceptedTheater ? (
          <CheckCircle2 className="size-7 text-muted-foreground" />
        ) : (
          <Link2 className="size-7 text-muted-foreground" />
        )}
        <h1 className="display-title mt-4 text-2xl font-medium text-foreground">
          {acceptedTheater
            ? `You joined ${acceptedTheater.name}`
            : stateCopy.title}
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          {acceptedTheater
            ? 'Your base Member access is active.'
            : stateCopy.copy}
        </p>

        {acceptedTheater ? (
          <Button asChild variant="default" className="mt-6">
            <a href={`/app/${acceptedTheater.slug}`}>Open Theater workspace</a>
          </Button>
        ) : preview.state === 'active' ? (
          signedIn ? (
            <Button
              className="mt-6"
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
            </Button>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="default">
                <Link search={{ next }} to="/login">
                  Sign in to join
                </Link>
              </Button>
              <Link
                className="rounded-md border border-border px-4 py-3 font-semibold no-underline"
                search={{ next }}
                to="/signup"
              >
                Create account
              </Link>
            </div>
          )
        ) : null}
        {error ? <JoinLinkError message={error} /> : null}
      </Card>
    </main>
  )
}

function ShareableJoinLink({ value }: { value: string }) {
  return (
    <div className="mt-4 rounded-md border border-border bg-accent px-4 py-4">
      <p className="font-semibold text-foreground">
        Copy this link now. Its token will not be shown again.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="Shareable Reusable Join Link"
          className="min-w-0 flex-1"
          readOnly
          value={value}
        />
        <Button
          variant="outline"

          onClick={() => navigator.clipboard.writeText(value)}
          type="button"
        >
          <Copy className="size-4" /> Copy
        </Button>
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
    <p className="mt-4 rounded-md border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground">
      {message}
    </p>
  )
}
