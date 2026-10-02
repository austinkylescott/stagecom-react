import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  getCastTeamOptionsFn,
  reviewTeamCastInvitationsFn,
  sendTeamCastInvitationsFn,
} from './server-functions'
import type { TeamWorkspace } from '@/features/teams/schemas'
import type { CastReview, TeamSelection } from './schemas'

const statusLabels = {
  eligible: 'Will receive an invitation',
  accepted: 'Accepted Cast · excluded',
  pending: 'Pending invitation · excluded',
  declined: 'Declined invitation · excluded',
  withdrawn: 'Withdrawn Cast · excluded',
  removed: 'Removed Cast · excluded',
  ineligible: 'Former Theater Member · excluded',
  not_in_team: 'No longer an accepted Member of a selected Team · excluded',
}

export function TeamCastInvitations({
  eventId,
  members,
  onSent,
}: {
  eventId: string
  members: Array<{ userId: string; displayName: string }>
  onSent: () => Promise<void>
}) {
  const [workspace, setWorkspace] = useState<TeamWorkspace | null>(null)
  const [selection, setSelection] = useState<TeamSelection>([])
  const [review, setReview] = useState<CastReview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  async function loadTeams() {
    setBusy(true)
    setError(null)
    try {
      const result = await getCastTeamOptionsFn({ data: { eventId } })
      if (result.ok) setWorkspace(result.data)
      else setError(result.error.message)
    } catch {
      setError('Teams could not be loaded. Retry loading Teams.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    void loadTeams()
  }, [eventId])
  function changeSelection(next: TeamSelection) {
    setSelection(next)
    setReview(null)
    setNotice(null)
    setError(null)
  }
  return (
    <section
      className="mt-6 grid gap-4 border-t pt-5"
      aria-label="Invite Team Members to Cast"
    >
      <h3 className="text-lg font-semibold">Invite Team Members to Cast</h3>
      <p className="text-sm text-muted-foreground">
        Select whole Teams or individual Members. Overlapping Teams become
        unique named recipients. Each person must accept their own Event
        invitation.
      </p>
      {error ? <p role="alert">{error}</p> : null}
      {notice ? <p role="status">{notice}</p> : null}
      {!workspace ? (
        <Button type="button" disabled={busy} onClick={loadTeams}>
          {busy ? 'Loading Teams…' : 'Retry loading Teams'}
        </Button>
      ) : (
        <>
          {workspace.teams.length === 0 ? (
            <p>
              No Teams yet. Create a Team in People, or invite an individual
              Theater Member below.
            </p>
          ) : null}
          <fieldset disabled={busy} className="grid gap-4">
            <legend className="sr-only">
              Teams and Members for Cast invitations
            </legend>
            {workspace.teams.map((team) => {
              const selected = selection.find((s) => s.teamId === team.id)
              return (
                <fieldset
                  className="min-w-0 rounded-md border p-3"
                  key={team.id}
                >
                  <legend className="px-1 font-medium">{team.name}</legend>
                  <Label className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      checked={selected?.memberIds === null}
                      onChange={(e) =>
                        changeSelection([
                          ...selection.filter((s) => s.teamId !== team.id),
                          ...(e.target.checked
                            ? [{ teamId: team.id, memberIds: null }]
                            : []),
                        ])
                      }
                    />
                    Select whole Team: {team.name}
                  </Label>
                  <div className="grid gap-1">
                    {team.memberIds.map((userId) => (
                      <Label
                        className="flex items-center gap-2 py-2"
                        key={userId}
                      >
                        <input
                          type="checkbox"
                          checked={
                            selected?.memberIds === null ||
                            !!selected?.memberIds.includes(userId)
                          }
                          onChange={(e) => {
                            const ids =
                              selected?.memberIds === null
                                ? team.memberIds
                                : (selected?.memberIds ?? [])
                            const next = e.target.checked
                              ? [...ids, userId]
                              : ids.filter((id) => id !== userId)
                            changeSelection([
                              ...selection.filter((s) => s.teamId !== team.id),
                              ...(next.length
                                ? [
                                    {
                                      teamId: team.id,
                                      memberIds: [...new Set(next)],
                                    },
                                  ]
                                : []),
                            ])
                          }}
                        />
                        {members.find((m) => m.userId === userId)
                          ?.displayName ?? 'Member unavailable'}{' '}
                        in {team.name}
                      </Label>
                    ))}
                    {!team.memberIds.length ? (
                      <p className="text-sm">No eligible Team Members.</p>
                    ) : null}
                  </div>
                </fieldset>
              )
            })}
          </fieldset>
          <Button
            type="button"
            disabled={busy || !selection.length}
            onClick={async () => {
              setBusy(true)
              setError(null)
              setNotice(null)
              try {
                const result = await reviewTeamCastInvitationsFn({
                  data: { eventId, selection },
                })
                if (result.ok) setReview(result.data)
                else setError(result.error.message)
              } catch {
                setError(
                  'The named review could not be loaded. Your selection is preserved; retry review.',
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            Review named recipients
          </Button>
        </>
      )}
      {review ? (
        <section
          aria-label="Named recipient review"
          className="grid gap-3 rounded-md border p-4"
          tabIndex={-1}
        >
          <h4 className="font-semibold">Named recipient review</h4>
          {review.snapshot.recipients.length ? (
            <ul className="grid gap-3">
              {review.snapshot.recipients.map((person) => (
                <li key={person.userId}>
                  <span className="font-medium">{person.displayName}</span>
                  <p className="text-sm text-muted-foreground">
                    {statusLabels[person.status]}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recipients remain in the selected Teams.</p>
          )}
          <p>
            {
              review.snapshot.recipients.filter((p) => p.status === 'eligible')
                .length
            }{' '}
            unique eligible recipients. Existing Cast and invitations are
            excluded.
          </p>
          <Button
            type="button"
            disabled={
              busy ||
              !review.snapshot.recipients.some((p) => p.status === 'eligible')
            }
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                const result = await sendTeamCastInvitationsFn({
                  data: { reviewId: review.reviewId },
                })
                if (!result.ok) {
                  setError(result.error.message)
                  return
                }
                if (result.data.state === 'refreshed') {
                  setReview(result.data.review)
                  setNotice(result.data.message)
                  return
                }
                setNotice(
                  `${result.data.recipientIds.length} Cast invitations sent. Each person must accept individually.`,
                )
                setReview(null)
                setSelection([])
                await onSent()
              } catch {
                setError(
                  'Cast invitations could not be confirmed. Your review is preserved; retry safely when connected.',
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            Send reviewed invitations
          </Button>
        </section>
      ) : null}
    </section>
  )
}
