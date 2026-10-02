import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Team, TeamAction } from './schemas'

export function TeamGovernance({
  team,
  actorId,
  displayName,
  busy,
  error,
  run,
  focusFallback,
}: {
  team: Team
  actorId: string
  displayName: (id: string) => string
  busy: boolean
  error: string | null
  run: (action: TeamAction) => Promise<boolean>
  focusFallback: () => void
}) {
  const [name, setName] = useState(team.name)
  const [admin, setAdmin] = useState('')
  const [successor, setSuccessor] = useState('')
  const [recovery, setRecovery] = useState('')
  const [depart, setDepart] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    action: TeamAction
    description: string
  } | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const cancelButton = useRef<HTMLButtonElement | null>(null)
  const owner = team.ownerId === actorId
  const administrator = owner || team.adminIds.includes(actorId)
  const member = team.memberIds.includes(actorId)
  const identity = { teamId: team.id, expectedVersion: team.version }
  function confirm(action: TeamAction, description: string) {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    setConfirmation({ action, description })
  }
  const options = (ids: string[]) => (
    <>
      <option value="">Choose a Member</option>
      {ids.map((id) => (
        <option key={id} value={id}>
          {displayName(id)}
        </option>
      ))}
    </>
  )
  const others = team.memberIds.filter((id) => id !== team.ownerId)
  return (
    <div className="grid min-w-0 gap-3 [&_button]:h-auto [&_button]:whitespace-normal [&_button]:break-words">
      {administrator && (
        <form
          className="grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void run({ action: 'rename', ...identity, name })
          }}
        >
          <Label htmlFor="team-name">Team name</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
            maxLength={80}
            required
          />
          <Button disabled={busy} type="submit">
            Rename Team
          </Button>
        </form>
      )}
      {team.adminInvitationIds.map((id) => (
        <div key={id} className="grid gap-2">
          <p>Pending Team Admin: {displayName(id)}</p>
          {id === actorId && (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() =>
                  confirm(
                    {
                      action: 'respond_admin',
                      ...identity,
                      response: 'accepted',
                    },
                    'Accept Admin authority within Team scope. This grants no Theater or Event authority.',
                  )
                }
              >
                Accept Team Admin authority
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run({
                    action: 'respond_admin',
                    ...identity,
                    response: 'declined',
                  })
                }
              >
                Decline Team Admin authority
              </Button>
            </div>
          )}
        </div>
      ))}
      {owner && (
        <>
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void run({
                action: 'offer_admin',
                ...identity,
                memberUserId: admin,
              })
            }}
          >
            <Label htmlFor="team-admin">Offer Team Admin to</Label>
            <select
              id="team-admin"
              className="w-full min-w-0 rounded-md border bg-background p-2 text-sm"
              required
              disabled={busy}
              value={admin}
              onChange={(event) => setAdmin(event.target.value)}
            >
              {options(
                others.filter(
                  (id) =>
                    !team.adminIds.includes(id) &&
                    !team.adminInvitationIds.includes(id),
                ),
              )}
            </select>
            <Button type="submit" disabled={busy}>
              Offer Admin authority
            </Button>
          </form>
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void run({
                action: 'offer_transfer',
                ...identity,
                memberUserId: successor,
                depart,
              })
            }}
          >
            <Label htmlFor="team-successor">Ownership successor</Label>
            <select
              id="team-successor"
              className="w-full min-w-0 rounded-md border bg-background p-2 text-sm"
              required
              disabled={busy}
              value={successor}
              onChange={(event) => setSuccessor(event.target.value)}
            >
              {options(others)}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={depart}
                disabled={busy}
                onChange={(event) => setDepart(event.target.checked)}
              />
              Leave when successor accepts
            </label>
            <p className="text-sm text-muted-foreground">
              You remain Owner until the successor accepts. Departure commits
              with their acceptance.
            </p>
            <Button type="submit" disabled={busy}>
              Offer ownership
            </Button>
          </form>
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void run({
                action: 'offer_recovery',
                ...identity,
                memberUserId: recovery,
              })
            }}
          >
            <Label htmlFor="team-recovery">Recovery nominee</Label>
            <select
              id="team-recovery"
              className="w-full min-w-0 rounded-md border bg-background p-2 text-sm"
              required
              disabled={busy}
              value={recovery}
              onChange={(event) => setRecovery(event.target.value)}
            >
              {options(others)}
            </select>
            <p className="text-sm text-muted-foreground">
              A consenting nominee succeeds if you lose Theater membership.
              Otherwise, the longest-standing eligible Member succeeds.
            </p>
            <Button type="submit" disabled={busy}>
              Offer recovery nomination
            </Button>
          </form>
        </>
      )}
      {team.transfer && (
        <div className="grid gap-2">
          <p>
            Ownership offered to {displayName(team.transfer.userId)}
            {team.transfer.depart
              ? ' · departure on acceptance'
              : ' · current Owner stays a Member'}
          </p>
          {owner && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run({ action: 'cancel_transfer', ...identity })
              }
            >
              Cancel ownership offer
            </Button>
          )}
          {team.transfer.userId === actorId && (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() =>
                  confirm(
                    {
                      action: 'respond_transfer',
                      ...identity,
                      response: 'accepted',
                    },
                    `Accept accountable Team ownership.${team.transfer?.depart ? ' The current Owner’s departure commits with your acceptance.' : ' The current Owner stays a Member.'}`,
                  )
                }
              >
                Accept Team ownership
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run({
                    action: 'respond_transfer',
                    ...identity,
                    response: 'declined',
                  })
                }
              >
                Decline Team ownership
              </Button>
            </div>
          )}
        </div>
      )}
      {team.recovery && (
        <div className="grid gap-2">
          <p>
            Recovery nominee: {displayName(team.recovery.userId)} ·{' '}
            {team.recovery.accepted ? 'Accepted' : 'Pending acceptance'}
          </p>
          {owner && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run({ action: 'cancel_recovery', ...identity })
              }
            >
              Clear recovery nomination
            </Button>
          )}
          {team.recovery.userId === actorId && !team.recovery.accepted && (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy}
                onClick={() =>
                  confirm(
                    {
                      action: 'respond_recovery',
                      ...identity,
                      response: 'accepted',
                    },
                    'Accept nomination to become accountable Team Owner if the current Owner loses Theater membership.',
                  )
                }
              >
                Accept recovery nomination
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run({
                    action: 'respond_recovery',
                    ...identity,
                    response: 'declined',
                  })
                }
              >
                Decline recovery nomination
              </Button>
            </div>
          )}
        </div>
      )}
      {owner &&
        [...team.adminIds, ...team.adminInvitationIds].map((id) => (
          <Button
            key={id}
            variant="outline"
            disabled={busy}
            onClick={() =>
              confirm(
                { action: 'remove_admin', ...identity, memberUserId: id },
                `Remove Admin authority from ${displayName(id)}. Their Team membership remains.`,
              )
            }
          >
            Remove Admin authority from {displayName(id)}
          </Button>
        ))}
      {team.adminIds.includes(actorId) && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            confirm(
              { action: 'relinquish_admin', ...identity },
              'Relinquish your Team Admin authority. Your Team membership remains.',
            )
          }
        >
          Relinquish Team Admin authority
        </Button>
      )}
      {administrator &&
        others
          .filter(
            (id) =>
              id !== actorId &&
              !team.adminIds.includes(id) &&
              !team.adminInvitationIds.includes(id),
          )
          .map((id) => (
            <Button
              key={id}
              variant="outline"
              disabled={busy}
              onClick={() =>
                confirm(
                  { action: 'remove', ...identity, memberUserId: id },
                  `Remove ${displayName(id)} from this Team. Independent Event participation is unchanged.`,
                )
              }
            >
              Remove {displayName(id)} from Team
            </Button>
          ))}
      {member && (
        <>
          {owner && others.length > 1 && (
            <p className="text-sm text-muted-foreground">
              Choose a successor and wait for acceptance before leaving.
            </p>
          )}
          <Button
            variant="outline"
            disabled={busy || (owner && others.length > 1)}
            onClick={() =>
              confirm(
                { action: 'leave', ...identity },
                `${owner ? (others.length === 1 ? `${displayName(others[0])} becomes Owner automatically.` : 'Leaving dissolves this Team and closes pending invitations.') : 'Leave this Team?'} Independent Event participation is unchanged.`,
              )
            }
          >
            Leave Team
          </Button>
        </>
      )}
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmation(null)
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="fixed top-1/2 left-1/2 z-50 grid max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            cancelButton.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (returnFocus.current?.isConnected) returnFocus.current.focus()
            else focusFallback()
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault()
          }}
        >
          <DialogTitle className="text-lg font-semibold">
            Confirm Team action
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {confirmation?.description}
          </DialogDescription>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy}
              onClick={async () => {
                if (confirmation && (await run(confirmation.action)))
                  setConfirmation(null)
              }}
            >
              Confirm action
            </Button>
            <Button
              ref={cancelButton}
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
