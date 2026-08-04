import { Link } from '@tanstack/react-router'
import { CheckCircle2, Copy, Loader2, MailPlus, Theater } from 'lucide-react'
import { useState } from 'react'

import { ReusableJoinLinksManager } from '@/features/join-links/components'
import { TheaterMembersManager } from '@/features/memberships/components'
import {
  acceptTargetedInvitationFn,
  createTargetedInvitationFn,
  revokeTargetedInvitationFn,
} from './server-functions'

import type { TargetedInvitationListItem } from './persistence'
import type { TargetedInvitationView } from './queries'
import type { ReusableJoinLinkListItem } from '@/features/join-links/persistence'
import type { TheaterMemberListItem } from '@/features/memberships/queries'

export function TargetedInvitationsPage({
  canManage,
  actorUserId,
  initialInvitations,
  initialJoinLinks,
  initialMembers,
  theaterId,
}: {
  canManage: boolean
  actorUserId: string
  initialInvitations: TargetedInvitationListItem[]
  initialJoinLinks: ReusableJoinLinkListItem[]
  initialMembers: TheaterMemberListItem[]
  theaterId: string
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  return (
    <main className="page-wrap py-10 sm:py-14">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        Members
      </p>
      <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
        Theater Members
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--sea-ink-soft)]">
        Manage active membership and invite people to join this Theater.
      </p>

      {canManage ? (
        <TheaterMembersManager
          actorUserId={actorUserId}
          initialMembers={initialMembers}
          theaterId={theaterId}
        />
      ) : null}

      {canManage ? (
        <section className="island-shell mt-7 rounded-lg px-5 py-5">
          <h2 className="text-xl font-extrabold text-[var(--sea-ink)]">
            Invite a Member
          </h2>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={async (event) => {
              event.preventDefault()
              setError(null)
              setShareUrl(null)
              setIsSubmitting(true)

              try {
                const result = await createTargetedInvitationFn({
                  data: { email, theaterId },
                })

                if (!result.ok) {
                  setError(result.error.message)
                  return
                }

                const url = new URL(
                  `/join/${encodeURIComponent(result.data.inviteToken)}`,
                  window.location.origin,
                ).toString()
                setShareUrl(url)
                setEmail('')
                setInvitations((current) => [
                  {
                    createdAt: new Date().toISOString(),
                    email: email.trim().toLowerCase(),
                    expiresAt: result.data.expiresAt,
                    id: result.data.id,
                    status: 'pending',
                  },
                  ...current,
                ])
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <label className="grid flex-1 gap-2 text-sm font-bold text-[var(--sea-ink)]">
              Recipient email
              <input
                className="rounded-md border border-[var(--line)] bg-white px-3 py-3 font-normal"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="member@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            <button
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
              disabled={isSubmitting || !email.trim()}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MailPlus className="size-4" />
              )}
              Create invitation
            </button>
          </form>
          {shareUrl ? (
            <div className="mt-4 rounded-md border border-[var(--theater)] bg-[var(--theater-soft)] px-4 py-4">
              <p className="font-extrabold text-[var(--theater-ink)]">
                Copy this link now. It will not be shown again.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  aria-label="Shareable invitation link"
                  className="min-w-0 flex-1 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
                  readOnly
                  value={shareUrl}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-extrabold"
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  type="button"
                >
                  <Copy className="size-4" /> Copy
                </button>
              </div>
            </div>
          ) : null}
          {error ? <ErrorNotice message={error} /> : null}
        </section>
      ) : (
        <section className="island-shell mt-7 rounded-lg px-5 py-5">
          <p className="font-semibold text-[var(--sea-ink-soft)]">
            Owner or Admin access is required to manage invitations.
          </p>
        </section>
      )}

      {canManage ? (
        <section className="mt-7">
          <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
            Invitation history
          </h2>
          <div className="mt-4 grid gap-3">
            {invitations.length === 0 ? (
              <p className="island-shell rounded-lg px-5 py-5 text-[var(--sea-ink-soft)]">
                No Targeted Invitations yet.
              </p>
            ) : (
              invitations.map((invitation) => (
                <article
                  className="island-shell flex flex-col justify-between gap-4 rounded-lg px-5 py-4 sm:flex-row sm:items-center"
                  key={invitation.id}
                >
                  <div>
                    <p className="font-extrabold text-[var(--sea-ink)]">
                      {invitation.email}
                    </p>
                    <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                      {invitation.status} · expires{' '}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  {invitation.status === 'pending' ? (
                    <button
                      className="rounded-md border border-red-200 px-4 py-2 text-sm font-extrabold text-red-800"
                      onClick={async () => {
                        setError(null)
                        const result = await revokeTargetedInvitationFn({
                          data: { invitationId: invitation.id },
                        })

                        if (!result.ok) {
                          setError(result.error.message)
                          return
                        }

                        setInvitations((current) =>
                          current.map((candidate) =>
                            candidate.id === invitation.id
                              ? { ...candidate, status: 'revoked' }
                              : candidate,
                          ),
                        )
                      }}
                      type="button"
                    >
                      Revoke
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
      {canManage ? (
        <ReusableJoinLinksManager
          initialLinks={initialJoinLinks}
          theaterId={theaterId}
        />
      ) : null}
    </main>
  )
}

export function TargetedInvitationPage({
  inviteToken,
  preview,
  signedIn,
}: {
  inviteToken: string
  preview: TargetedInvitationView
  signedIn: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [acceptedTheater, setAcceptedTheater] = useState<{
    name: string
    slug: string
  } | null>(null)

  const stateCopy = getInvitationStateCopy(preview)

  return (
    <main className="page-wrap grid min-h-[72vh] place-items-center py-10">
      <section className="island-shell w-full max-w-xl rounded-lg px-6 py-7 sm:px-8">
        {acceptedTheater ? (
          <CheckCircle2 className="size-7 text-[var(--palm)]" />
        ) : (
          <Theater className="size-7 text-[var(--palm)]" />
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
        ) : preview.state === 'pending' || preview.state === 'accepted' ? (
          signedIn ? (
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
              disabled={isSubmitting}
              onClick={async () => {
                setError(null)
                setIsSubmitting(true)

                try {
                  const result = await acceptTargetedInvitationFn({
                    data: { inviteToken },
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
              Accept invitation
            </button>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white no-underline"
                search={{ inviteToken }}
                to="/login"
              >
                Sign in to accept
              </Link>
              <Link
                className="rounded-md border border-[var(--line)] px-4 py-3 font-extrabold no-underline"
                search={{ inviteToken }}
                to="/signup"
              >
                Create account
              </Link>
            </div>
          )
        ) : null}
        {error ? <ErrorNotice message={error} /> : null}
      </section>
    </main>
  )
}

function getInvitationStateCopy(preview: TargetedInvitationView) {
  switch (preview.state) {
    case 'pending':
      return {
        title: `Join ${preview.theaterName}`,
        copy: 'This invitation grants base Theater Member access after you sign in with the invited email address.',
      }
    case 'accepted':
      return {
        title: 'Invitation already used',
        copy: 'Sign in to verify whether this invitation belongs to your account.',
      }
    case 'expired':
      return {
        title: 'Invitation expired',
        copy: 'Ask the Theater Owner or Admin for a new invitation.',
      }
    case 'revoked':
      return {
        title: 'Invitation revoked',
        copy: 'Ask the Theater Owner or Admin if you still need access.',
      }
    case 'invalid':
      return {
        title: 'Invitation link is invalid',
        copy: 'Check the link or ask the Theater Owner or Admin for a fresh invitation.',
      }
  }
}

function ErrorNotice({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
      {message}
    </p>
  )
}
