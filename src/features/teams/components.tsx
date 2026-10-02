import { useRef, useState } from 'react'
import { UserRound } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTeamWorkspaceFn, manageTeamFn } from './server-functions'
import type { TheaterDirectoryMember } from '@/features/memberships/queries'
import { TeamGovernance } from './governance'
import type { TeamAction, TeamWorkspace } from './schemas'

export function PeopleAndTeams({
  theaterId,
  members,
  initialWorkspace,
}: {
  theaterId: string
  members: TheaterDirectoryMember[]
  initialWorkspace: TeamWorkspace
}) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<string[]>([])
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [recipient, setRecipient] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // Retain identity through an uncertain network outcome, including a failed refresh.
  const refreshButton = useRef<HTMLButtonElement | null>(null)
  const pending = useRef<{ key: string; commandId: string } | null>(null)
  const selected = workspace.teams.find((team) => team.id === selectedId)
  const actorId = workspace.actorId
  const displayName = (id: string) =>
    members.find((member) => member.userId === id)?.displayName ??
    'Former Theater Member'
  const filtered = members.filter(
    (member) =>
      member.displayName
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()) &&
      (!filters.length ||
        workspace.teams.some(
          (team) =>
            filters.includes(team.id) && team.memberIds.includes(member.userId),
        )),
  )

  async function refresh() {
    const result = await getTeamWorkspaceFn({ data: { theaterId } })
    if (!result.ok) throw new Error(result.error.message)
    setWorkspace(result.data)
    setFilters((current) =>
      current.filter((id) => result.data.teams.some((team) => team.id === id)),
    )
    return result.data
  }
  async function run(action: TeamAction) {
    if (busy) return false
    setBusy(true)
    setError(null)
    setMessage(null)
    const key = JSON.stringify(action)
    if (pending.current?.key !== key)
      pending.current = { key, commandId: crypto.randomUUID() }
    try {
      const result = await manageTeamFn({
        data: { ...action, theaterId, commandId: pending.current.commandId },
      })
      if (!result.ok) {
        setError(result.error.message)
        return false
      }
      await refresh()
      pending.current = null
      if (action.action === 'create') {
        setName('')
        setSelectedId(result.data.teamId)
      }
      if (action.action === 'invite') setRecipient('')
      setMessage(
        action.action === 'invite'
          ? 'Invitation sent. Membership begins only after acceptance.'
          : action.action === 'respond'
            ? `Invitation ${action.response}.`
            : action.action === 'leave'
              ? 'You left the Team. Independent Event participation is unchanged.'
              : action.action === 'create'
                ? 'Team created. You are its Owner.'
                : 'Team administration saved.',
      )
      return true
    } catch {
      setError(
        'Teams could not be saved. Your input is preserved; retry when connected.',
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-6">
      <Card
        role="region"
        aria-labelledby="people-directory"
        className="mt-6 min-w-0"
      >
        <CardHeader>
          <CardTitle>
            <h2 id="people-directory">Directory</h2>
          </CardTitle>
          <CardDescription>
            Active Theater Members. Search names and select any overlapping
            Teams.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-4">
          <div>
            <Label htmlFor="member-search">Search Members</Label>
            <Input
              id="member-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
            />
          </div>
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-2 text-sm font-medium">
              Team filters · matches any selected Team
            </legend>
            {workspace.teams.map((team) => (
              <label
                key={team.id}
                className="flex max-w-full items-center gap-2 text-sm break-words"
              >
                <input
                  type="checkbox"
                  checked={filters.includes(team.id)}
                  onChange={(event) =>
                    setFilters((current) =>
                      event.target.checked
                        ? [...current, team.id]
                        : current.filter((id) => id !== team.id),
                    )
                  }
                />
                {team.name}
              </label>
            ))}
            {!workspace.teams.length && (
              <p className="text-sm text-muted-foreground">No Teams yet.</p>
            )}
          </fieldset>
          <p role="status" className="text-sm text-muted-foreground">
            {filtered.length} Members
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((member) => (
              <li
                key={member.userId}
                className="flex min-w-0 items-start gap-3 rounded-lg border p-3"
              >
                <Avatar size="lg">
                  <AvatarImage
                    src={member.avatarUrl ?? undefined}
                    alt={`${member.displayName} avatar`}
                  />
                  <AvatarFallback>
                    <UserRound aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {member.displayName}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {member.roles.map((role) => (
                      <Badge variant="secondary" key={role}>
                        {role}
                      </Badge>
                    ))}
                    {workspace.teams
                      .filter((team) => team.memberIds.includes(member.userId))
                      .map((team) => (
                        <Badge
                          variant="outline"
                          className="whitespace-normal break-words"
                          key={team.id}
                        >
                          {team.name}
                        </Badge>
                      ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {!filtered.length && (
            <p>No Members match your search and Team filters.</p>
          )}
          {(search || filters.length > 0) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch('')
                setFilters([])
              }}
            >
              Clear search and filters
            </Button>
          )}
        </CardContent>
      </Card>
      <Card role="region" aria-labelledby="teams-heading" className="min-w-0">
        <CardHeader>
          <CardTitle>
            <h2 id="teams-heading">Teams</h2>
          </CardTitle>
          <CardDescription>
            Join by individual invitation and consent. Team membership grants no
            Theater or Event authority.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 min-w-0">
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <Button
            ref={refreshButton}
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError(null)
              try {
                await refresh()
              } catch {
                setError('Teams could not be loaded. Retry when connected.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Refresh Teams; keep editing input
          </Button>
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (!name.trim() || name.trim().length > 80) {
                setError('Team name must contain 1 to 80 characters.')
                return
              }
              void run({ action: 'create', name })
            }}
            noValidate
          >
            <Label htmlFor="new-team-name">New Team name</Label>
            <Input
              id="new-team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
              maxLength={80}
            />
            <Button disabled={busy} type="submit">
              Create Team
            </Button>
          </form>
          {!workspace.teams.length && (
            <p>No Teams yet. Create the first Team in this Theater.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {workspace.teams.map((team) => (
              <Button
                className="h-auto max-w-full whitespace-normal break-words"
                key={team.id}
                variant={team.id === selectedId ? 'secondary' : 'outline'}
                aria-pressed={team.id === selectedId}
                onClick={() => {
                  setSelectedId(team.id)
                  setRecipient('')
                }}
              >
                View {team.name}
                {team.invitations.some(
                  (invitation) => invitation.userId === actorId,
                )
                  ? ' · Invitation pending'
                  : ''}
              </Button>
            ))}
          </div>
          {selected && (
            <section
              aria-label={`${selected.name} Team`}
              className="grid gap-3 rounded-lg border p-4 min-w-0"
            >
              <h3 className="font-semibold break-words">{selected.name}</h3>
              <p className="text-sm">
                Team Owner: {displayName(selected.ownerId)}
              </p>
              {!selected.ownerEligible && (
                <p>
                  Team ownership needs recovery. New invitations are paused.
                </p>
              )}
              <ul>
                {selected.memberIds.map((id) => (
                  <li className="break-words" key={id}>
                    {displayName(id)}
                    {id === actorId ? ' · You' : ''}
                    {selected.adminIds.includes(id) ? ' · Team Admin' : ''}
                  </li>
                ))}
              </ul>
              {selected.invitations.map((invitation) => (
                <div
                  key={invitation.userId}
                  className="grid gap-2 rounded-md border p-3"
                >
                  <p>
                    Pending invitation: {displayName(invitation.userId)} ·
                    Invited by {displayName(invitation.inviterId)}
                  </p>
                  {invitation.userId === actorId && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={busy || !selected.ownerEligible}
                        onClick={() =>
                          void run({
                            action: 'respond',
                            teamId: selected.id,
                            expectedVersion: selected.version,
                            response: 'accepted',
                          })
                        }
                      >
                        Accept Team invitation
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void run({
                            action: 'respond',
                            teamId: selected.id,
                            expectedVersion: selected.version,
                            response: 'declined',
                          })
                        }
                      >
                        Decline Team invitation
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {(selected.ownerId === actorId ||
                selected.adminIds.includes(actorId)) &&
                selected.ownerEligible && (
                  <form
                    className="grid gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      if (!recipient) {
                        setError('Choose an active Theater Member.')
                        return
                      }
                      void run({
                        action: 'invite',
                        teamId: selected.id,
                        expectedVersion: selected.version,
                        memberUserId: recipient,
                      })
                    }}
                  >
                    <Label htmlFor="team-recipient">
                      Invite Theater Member
                    </Label>
                    <select
                      id="team-recipient"
                      className="w-full min-w-0 rounded-md border bg-background p-2 text-sm"
                      value={recipient}
                      disabled={busy}
                      onChange={(event) => setRecipient(event.target.value)}
                    >
                      <option value="">Choose a Member</option>
                      {members
                        .filter(
                          (member) =>
                            !selected.memberIds.includes(member.userId) &&
                            !selected.invitations.some(
                              (invitation) =>
                                invitation.userId === member.userId,
                            ),
                        )
                        .map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.displayName}
                          </option>
                        ))}
                    </select>
                    <Button disabled={busy} type="submit">
                      Send Team invitation
                    </Button>
                  </form>
                )}
              <TeamGovernance
                key={selected.id}
                team={selected}
                actorId={actorId}
                displayName={displayName}
                busy={busy}
                error={error}
                run={run}
                focusFallback={() => refreshButton.current?.focus()}
              />
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
