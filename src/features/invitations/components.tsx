import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Copy, Loader2, MailPlus, Theater } from 'lucide-react'
import { useState } from 'react'

import { PeopleAndTeams } from '@/features/teams/components'
import type { TeamWorkspace } from '@/features/teams/schemas'
import { ReusableJoinLinksManager } from '@/features/join-links/components'
import { AccessAndRolesManager } from '@/features/memberships/components'
import {
  acceptTargetedInvitationFn,
  createTargetedInvitationFn,
  revokeTargetedInvitationFn,
} from './server-functions'

import type { TargetedInvitationListItem } from './persistence'
import type { TargetedInvitationView } from './queries'
import type { ReusableJoinLinkListItem } from '@/features/join-links/persistence'
import type { PeopleWorkspace } from '@/features/memberships/queries'

export function PeopleWorkspacePage({
  canManage,
  actorUserId,
  initialInvitations,
  initialJoinLinks,
  initialTeams,
  people,
  theaterId,
}: {
  canManage: boolean
  actorUserId: string
  initialInvitations: TargetedInvitationListItem[]
  initialJoinLinks: ReusableJoinLinkListItem[]
  initialTeams: TeamWorkspace
  people: PeopleWorkspace
  theaterId: string
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  return (
    <main className="page-wrap py-6">
      <h1 className="text-2xl font-semibold tracking-tight">People</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        See who belongs to this Theater and who can operate it.
      </p>

      <PeopleAndTeams
        key={theaterId}
        theaterId={theaterId}
        members={people.directory}
        initialWorkspace={initialTeams}
      />

      {canManage ? (
        <Card className="mt-7  px-5 py-5 gap-0">
          <h2 className="text-xl font-semibold text-foreground">Invitations</h2>
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
            <Label className="grid flex-1 gap-2 text-sm font-medium text-foreground">
              Recipient email
              <Input
                onChange={(event) => setEmail(event.target.value)}
                placeholder="member@example.com"
                required
                type="email"
                value={email}
              />
            </Label>
            <Button
              className="mt-auto"
              disabled={isSubmitting || !email.trim()}
              type="submit"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MailPlus className="size-4" />
              )}
              Create invitation
            </Button>
          </form>
          {shareUrl ? (
            <div className="mt-4 rounded-md border border-border bg-accent px-4 py-4">
              <p className="font-semibold text-foreground">
                Copy this link now. It will not be shown again.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label="Shareable invitation link"
                  className="min-w-0 flex-1"
                  readOnly
                  value={shareUrl}
                />
                <Button
                  variant="outline"

                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  type="button"
                >
                  <Copy className="size-4" /> Copy
                </Button>
              </div>
            </div>
          ) : null}
          {error ? <ErrorNotice message={error} /> : null}
        </Card>
      ) : (
        <Card className="mt-7  px-5 py-5 gap-0">
          <p className="font-semibold text-muted-foreground">
            Owner or Admin access is required to manage invitations.
          </p>
        </Card>
      )}

      {canManage ? (
        <section aria-labelledby="targeted-invitations" className="mt-7">
          <h3
            className="text-xl font-semibold text-foreground"
            id="targeted-invitations"
          >
            Targeted Invitations
          </h3>
          <div className="mt-4 grid gap-3">
            {invitations.length === 0 ? (
              <p className="rounded-lg px-5 py-5 text-muted-foreground">
                No Targeted Invitations yet.
              </p>
            ) : (
              invitations.map((invitation) => (
                <Card
                  role="article"
                  className="flex flex-col justify-between gap-4  px-5 py-4 sm:flex-row sm:items-center gap-0"
                  key={invitation.id}
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {invitation.email}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {invitation.status} · expires{' '}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  {invitation.status === 'pending' ? (
                    <Button
                      variant="destructive"

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
                    </Button>
                  ) : null}
                </Card>
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
      {canManage && people.operator ? (
        <>
          <AccessAndRolesManager
            actorUserId={actorUserId}
            initialAdminAuthorityHistory={people.adminAuthorityHistory}
            initialMembers={people.operator.members}
            theaterId={theaterId}
          />
          <section aria-labelledby="former-members" className="mt-10">
            <h2
              className="text-2xl font-semibold text-foreground"
              id="former-members"
            >
              Former Members
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Historical memberships are kept separate from the active
              Directory.
            </p>
            <div className="mt-4 grid gap-3">
              {people.operator.formerMembers.length === 0 ? (
                <p className="rounded-lg px-5 py-5 text-muted-foreground">
                  No Former Theater Members.
                </p>
              ) : (
                people.operator.formerMembers.map((member) => (
                  <Card
                    role="article"
                    className=" px-5 py-4 gap-0"
                    key={member.userId}
                  >
                    <h3 className="font-semibold text-foreground">
                      {member.displayName}
                    </h3>
                    <p className="mt-1 text-sm capitalize text-muted-foreground">
                      Membership ended · former role: {member.roles.join(', ')}
                    </p>
                  </Card>
                ))
              )}
            </div>
          </section>
        </>
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
      <Card className="w-full max-w-xl  px-6 py-7 sm:px-8 gap-0">
        {acceptedTheater ? (
          <CheckCircle2 className="size-7 text-muted-foreground" />
        ) : (
          <Theater className="size-7 text-muted-foreground" />
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
        ) : preview.state === 'pending' || preview.state === 'accepted' ? (
          signedIn ? (
            <Button
              className="mt-6"
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
            </Button>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="default">
                <Link search={{ inviteToken }} to="/login">
                  Sign in to accept
                </Link>
              </Button>
              <Link
                className="rounded-md border border-border px-4 py-3 font-semibold no-underline"
                search={{ inviteToken }}
                to="/signup"
              >
                Create account
              </Link>
            </div>
          )
        ) : null}
        {error ? <ErrorNotice message={error} /> : null}
      </Card>
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
    <p className="mt-4 rounded-md border border-border bg-muted px-4 py-3 text-sm font-semibold text-foreground">
      {message}
    </p>
  )
}
