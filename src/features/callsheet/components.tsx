import type { CallsheetCommitment } from './read-model'

export type CallsheetTheater = {
  id: string
  isDefault: boolean
  name: string
  slug: string
  status: string
}

export function CallsheetPage({
  commitments,
  theaters,
}: {
  commitments: CallsheetCommitment[]
  theaters: CallsheetTheater[]
}) {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Personal workspace
        </p>
        <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)]">
          Callsheet
        </h1>
        <p className="mt-3 text-[var(--sea-ink-soft)]">
          Your current Event commitments across every active Theater.
        </p>
      </header>

      <section aria-labelledby="your-commitments" className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            className="text-2xl font-extrabold text-[var(--sea-ink)]"
            id="your-commitments"
          >
            Your commitments
          </h2>
          <p className="text-sm font-semibold text-[var(--sea-ink-soft)]">
            {commitments.length === 1
              ? '1 item'
              : `${commitments.length} items`}
          </p>
        </div>
        {commitments.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {commitments.map((commitment) => (
              <CommitmentCard commitment={commitment} key={commitment.id} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--line)] px-5 py-6 text-[var(--sea-ink-soft)]">
            <p className="font-semibold">
              Nothing needs your response right now.
            </p>
            <p className="mt-1 text-sm">
              Upcoming Calls and Event responses will appear here when they need
              you.
            </p>
          </div>
        )}
      </section>

      <section
        aria-labelledby="your-theaters"
        className="mt-10 border-t border-[var(--line)] pt-8"
      >
        <h2
          className="text-2xl font-extrabold text-[var(--sea-ink)]"
          id="your-theaters"
        >
          Your Theaters
        </h2>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          Enter a Theater when you need its shared work or schedule.
        </p>
        {theaters.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {theaters.map((theater) => (
              <article
                className="island-shell rounded-lg px-5 py-5"
                key={theater.id}
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
                  {theater.status} {theater.isDefault ? '· Default' : ''}
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-[var(--sea-ink)]">
                  {theater.name}
                </h3>
                <a
                  className="mt-5 inline-flex w-full justify-center rounded-md bg-[var(--sea-ink)] px-4 py-3 text-sm font-extrabold text-white no-underline sm:w-auto"
                  href={`/app/${theater.slug}`}
                >
                  Enter Theater
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--line)] px-5 py-6 text-[var(--sea-ink-soft)]">
            <p>No Theater memberships yet. Create a Theater to begin.</p>
            <a
              className="mt-4 inline-flex w-full justify-center rounded-md bg-[var(--sea-ink)] px-4 py-3 text-sm font-extrabold text-white no-underline sm:w-auto"
              href="/onboarding/theater"
            >
              Create a Theater
            </a>
          </div>
        )}
      </section>
    </main>
  )
}

function CommitmentCard({ commitment }: { commitment: CallsheetCommitment }) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function respond(response: 'accepted' | 'declined') {
    if (!commitment.invitationId) return
    setPending(true)
    setMessage(null)
    try {
      const result = await respondToTheaterAdminInvitationFn({
        data: {
          commandId: crypto.randomUUID(),
          invitationId: commitment.invitationId,
          response,
        },
      })
      setMessage(
        result.ok ? `Admin authority ${response}.` : result.error.message,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="island-shell rounded-lg px-5 py-5">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
        <span>{commitment.theater.title}</span>
        <span aria-hidden="true">·</span>
        <span>{commitment.relationship}</span>
      </div>
      <h3 className="mt-2 text-xl font-extrabold text-[var(--sea-ink)]">
        {commitment.event.title}
      </h3>
      <p className="mt-2 text-sm font-semibold text-[var(--sea-ink-soft)]">
        {commitment.action}
      </p>
      <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
        {formatCommitmentTime(commitment.actionableAt)}
      </p>
      {commitment.urgencyReason ? (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
          {commitment.urgencyReason}
        </p>
      ) : null}
      {commitment.invitationId ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-md bg-[var(--sea-ink)] px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
            disabled={pending || message !== null}
            onClick={() => respond('accepted')}
            type="button"
          >
            Accept Admin authority
          </button>
          <button
            className="rounded-md border border-[var(--line)] bg-white px-4 py-3 text-sm font-extrabold disabled:opacity-50"
            disabled={pending || message !== null}
            onClick={() => respond('declined')}
            type="button"
          >
            Decline
          </button>
        </div>
      ) : (
        <a
          className="mt-5 inline-flex w-full justify-center rounded-md bg-[var(--sea-ink)] px-4 py-3 text-sm font-extrabold text-white no-underline sm:w-auto"
          href={`/app/${commitment.theater.slug}/events/${commitment.event.slug}${commitment.targetAnchor}`}
        >
          {commitment.action}
        </a>
      )}
      {message ? <p className="mt-3 text-sm font-semibold">{message}</p> : null}
    </article>
  )
}

function formatCommitmentTime(actionableAt: string | null) {
  if (!actionableAt) return 'Response needed'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(actionableAt))
}
import { useState } from 'react'

import { respondToTheaterAdminInvitationFn } from '@/features/admin-invitations/server-functions'
