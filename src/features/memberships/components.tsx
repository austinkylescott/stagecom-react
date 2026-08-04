import { useState } from 'react'

import { deactivateTheaterMembershipFn } from './server-functions'

import type { TheaterMemberListItem } from './queries'

export function TheaterMembersManager({
  actorUserId,
  initialMembers,
  theaterId,
}: {
  actorUserId: string
  initialMembers: TheaterMemberListItem[]
  theaterId: string
}) {
  const [members, setMembers] = useState(initialMembers)
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null)
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(
    null,
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeOwnerCount = members.filter((member) =>
    member.roles.includes('owner'),
  ).length

  return (
    <section className="island-shell mt-7 rounded-lg px-5 py-5">
      <h2 className="text-xl font-extrabold text-[var(--sea-ink)]">
        Active Theater Members
      </h2>
      <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
        Deactivation ends this Theater’s current capabilities and Event work.
        Proposal decisions, factual history, and published credits remain.
      </p>
      <div className="mt-4 grid gap-3">
        {members.map((member) => {
          const isLastOwner =
            member.roles.includes('owner') && activeOwnerCount === 1
          const isConfirming = confirmingUserId === member.userId

          return (
            <article
              className="rounded-md border border-[var(--line)] bg-white px-4 py-4"
              key={member.userId}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-[var(--sea-ink)]">
                    {member.displayName}
                    {member.userId === actorUserId ? ' · You' : ''}
                  </h3>
                  <p className="mt-1 text-sm capitalize text-[var(--sea-ink-soft)]">
                    {member.roles.join(', ')}
                    {member.capabilities.length > 0
                      ? ` · ${member.capabilities.join(', ')}`
                      : ''}
                  </p>
                </div>
                <button
                  className="rounded-md border border-red-200 px-4 py-2 text-sm font-extrabold text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLastOwner || deactivatingUserId !== null}
                  onClick={() => {
                    setError(null)
                    setMessage(null)
                    setConfirmingUserId(member.userId)
                  }}
                  type="button"
                >
                  {isLastOwner
                    ? 'Accountable Owner required'
                    : 'Deactivate Member'}
                </button>
              </div>
              {isConfirming ? (
                <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-4">
                  <p className="text-sm font-semibold text-red-950">
                    Deactivate {member.displayName}? Current Theater authority,
                    leadership, and Cast assignments will end atomically.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="rounded-md bg-red-800 px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
                      disabled={deactivatingUserId !== null}
                      onClick={async () => {
                        setError(null)
                        setMessage(null)
                        setDeactivatingUserId(member.userId)
                        try {
                          const result = await deactivateTheaterMembershipFn({
                            data: {
                              commandId: crypto.randomUUID(),
                              expectedMembershipVersion:
                                member.membershipVersion,
                              memberUserId: member.userId,
                              theaterId,
                            },
                          })

                          if (!result.ok) {
                            setError(result.error.message)
                            return
                          }

                          setMembers((current) =>
                            current.filter(
                              (candidate) =>
                                candidate.userId !== result.data.memberUserId,
                            ),
                          )
                          setConfirmingUserId(null)
                          setMessage(
                            `${member.displayName} was deactivated. ${result.data.atRiskEventIds.length} affected Event${result.data.atRiskEventIds.length === 1 ? '' : 's'} became At Risk.`,
                          )
                        } finally {
                          setDeactivatingUserId(null)
                        }
                      }}
                      type="button"
                    >
                      {deactivatingUserId === member.userId
                        ? 'Deactivating…'
                        : 'Confirm deactivation'}
                    </button>
                    <button
                      className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-extrabold"
                      disabled={deactivatingUserId !== null}
                      onClick={() => setConfirmingUserId(null)}
                      type="button"
                    >
                      Keep active
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-900">
          {error}
        </p>
      ) : null}
    </section>
  )
}
