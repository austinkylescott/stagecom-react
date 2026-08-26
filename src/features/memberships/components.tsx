import { useState } from 'react'

import { setTheaterMemberCapabilityFn } from '@/features/governance/server-functions'
import {
  inviteTheaterAdminFn,
  removeTheaterAdminFn,
} from '@/features/admin-invitations/server-functions'
import { deactivateTheaterMembershipFn } from './server-functions'

import type {
  AdminAuthorityHistoryEntry,
  TheaterMemberListItem,
} from './queries'

export function AccessAndRolesManager({
  actorUserId,
  initialAdminAuthorityHistory,
  initialMembers,
  theaterId,
}: {
  actorUserId: string
  initialAdminAuthorityHistory: AdminAuthorityHistoryEntry[]
  initialMembers: TheaterMemberListItem[]
  theaterId: string
}) {
  const [members, setMembers] = useState(initialMembers)
  const [adminAuthorityHistory, setAdminAuthorityHistory] = useState(
    initialAdminAuthorityHistory,
  )
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null)
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(
    null,
  )
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null)
  const [removingAdminUserId, setRemovingAdminUserId] = useState<string | null>(
    null,
  )
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeOwnerCount = members.filter((member) =>
    member.roles.includes('owner'),
  ).length

  return (
    <section aria-labelledby="access-and-roles" className="mt-10">
      <h2
        className="text-2xl font-extrabold text-[var(--sea-ink)]"
        id="access-and-roles"
      >
        Access &amp; Roles
      </h2>
      <p className="mt-2 max-w-2xl text-[var(--sea-ink-soft)]">
        Manage narrow Proposer and Reviewer capabilities separately from Theater
        Operator authority. Deactivation ends current access while preserving
        factual history.
      </p>
      <div className="mt-4 grid gap-3">
        {members.map((member) => {
          const isLastOwner =
            member.roles.includes('owner') && activeOwnerCount === 1
          const isConfirming = confirmingUserId === member.userId

          return (
            <article
              className="island-shell rounded-lg px-5 py-4"
              key={member.userId}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-[var(--sea-ink)]">
                    {member.displayName}
                    {member.userId === actorUserId ? ' · You' : ''}
                  </h3>
                  <p className="mt-1 text-sm capitalize text-[var(--sea-ink-soft)]">
                    Theater role: {member.roles.join(', ')}
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
                  {isLastOwner ? 'Accountable Owner required' : 'Deactivate'}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!member.roles.includes('owner') &&
                !member.roles.includes('admin') ? (
                  <button
                    className="rounded-md border border-[var(--theater-ink)] bg-white px-3 py-2 text-sm font-bold text-[var(--theater-ink)] disabled:opacity-50"
                    disabled={invitingUserId !== null}
                    onClick={async () => {
                      setError(null)
                      setMessage(null)
                      setInvitingUserId(member.userId)
                      try {
                        const result = await inviteTheaterAdminFn({
                          data: {
                            commandId: crypto.randomUUID(),
                            memberUserId: member.userId,
                            theaterId,
                          },
                        })
                        setMessage(
                          result.ok
                            ? `Admin authority was offered to ${member.displayName}. It begins only if they accept.`
                            : result.error.message,
                        )
                      } finally {
                        setInvitingUserId(null)
                      }
                    }}
                    type="button"
                  >
                    {invitingUserId === member.userId
                      ? 'Offering Admin authority…'
                      : 'Offer Admin authority'}
                  </button>
                ) : null}
                {member.roles.includes('admin') ? (
                  <button
                    className="rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-red-800 disabled:opacity-50"
                    disabled={removingAdminUserId !== null}
                    onClick={async () => {
                      setError(null)
                      setMessage(null)
                      setRemovingAdminUserId(member.userId)
                      try {
                        const result = await removeTheaterAdminFn({
                          data: {
                            commandId: crypto.randomUUID(),
                            memberUserId: member.userId,
                            theaterId,
                          },
                        })
                        if (!result.ok) {
                          setError(result.error.message)
                          return
                        }
                        setMembers((current) =>
                          current.map((candidate) =>
                            candidate.userId === member.userId
                              ? { ...candidate, roles: result.data.roles }
                              : candidate,
                          ),
                        )
                        const actor = members.find(
                          (candidate) => candidate.userId === actorUserId,
                        )
                        setAdminAuthorityHistory((current) => [
                          {
                            actorDisplayName:
                              actor?.displayName ?? 'A Theater Operator',
                            createdAt: result.data.removedAt,
                            memberDisplayName: member.displayName,
                          },
                          ...current,
                        ])
                        setMessage(
                          member.userId === actorUserId
                            ? 'You relinquished Admin authority and remain an active Theater Member.'
                            : `Admin authority was removed from ${member.displayName}. They remain an active Theater Member.`,
                        )
                      } finally {
                        setRemovingAdminUserId(null)
                      }
                    }}
                    type="button"
                  >
                    {removingAdminUserId === member.userId
                      ? 'Removing Admin authority…'
                      : member.userId === actorUserId
                        ? 'Relinquish Admin authority'
                        : 'Remove Admin authority'}
                  </button>
                ) : null}
                {(['proposer', 'reviewer'] as const).map((capability) => {
                  const enabled = member.capabilities.includes(capability)

                  return (
                    <button
                      className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold"
                      key={capability}
                      onClick={async () => {
                        setError(null)
                        setMessage(null)
                        const result = await setTheaterMemberCapabilityFn({
                          data: {
                            capability,
                            enabled: !enabled,
                            theaterId,
                            userId: member.userId,
                          },
                        })

                        if (!result.ok) {
                          setError(result.error.message)
                          return
                        }

                        setMembers((current) =>
                          current.map((candidate) =>
                            candidate.userId === member.userId
                              ? {
                                  ...candidate,
                                  capabilities: enabled
                                    ? candidate.capabilities.filter(
                                        (value) => value !== capability,
                                      )
                                    : [...candidate.capabilities, capability],
                                }
                              : candidate,
                          ),
                        )
                      }}
                      type="button"
                    >
                      {enabled ? 'Remove' : 'Designate'} {capability}
                    </button>
                  )
                })}
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
                              (candidate) => candidate.userId !== member.userId,
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
      {adminAuthorityHistory.length > 0 ? (
        <section aria-labelledby="admin-authority-history" className="mt-8">
          <h3
            className="text-lg font-extrabold text-[var(--sea-ink)]"
            id="admin-authority-history"
          >
            Admin authority history
          </h3>
          <div className="mt-3 grid gap-2">
            {adminAuthorityHistory.map((entry) => (
              <p
                className="rounded-md border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--sea-ink-soft)]"
                key={`${entry.actorDisplayName}-${entry.memberDisplayName}-${entry.createdAt}`}
              >
                {entry.actorDisplayName} removed Admin authority from{' '}
                {entry.memberDisplayName} ·{' '}
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            ))}
          </div>
        </section>
      ) : null}
      {message ? (
        <p className="mt-4 font-semibold text-emerald-900">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-4 font-semibold text-red-900">{error}</p>
      ) : null}
    </section>
  )
}
