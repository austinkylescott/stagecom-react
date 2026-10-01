import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { proposeTheaterOwnershipTransferFn } from '@/features/ownership-transfers/server-functions'

import { getTheaterSettingsSections } from './settings-navigation'

import type { TheaterMemberListItem } from '@/features/memberships/queries'
import type { Database } from '@/server/db/database.types'

type TheaterRole = Database['public']['Enums']['theater_role']

export function TheaterSettingsNavigation({
  roles,
  theaterSlug,
}: {
  roles: TheaterRole[]
  theaterSlug: string
}) {
  return (
    <nav
      aria-label="Theater settings"
      className="mt-6"
      data-testid="theater-settings-navigation"
    >
      <div className="flex gap-2 overflow-x-auto pb-2">
        {getTheaterSettingsSections(roles).map((section) => (
          <Button asChild variant="outline">
            <Link
              activeProps={{ className: 'bg-foreground text-white' }}

              key={section.id}
              params={{ theaterSlug }}
              to={`/app/$theaterSlug/settings/${section.id}`}
            >
              {section.label}
            </Link>
          </Button>
        ))}
      </div>
    </nav>
  )
}

export function SettingsSectionHeader({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <header className="page-wrap pt-8 sm:pt-10">
      <p className="text-xs font-medium tracking-normal text-muted-foreground">
        Theater Settings
      </p>
      <h1 className="display-title mt-3 text-2xl font-medium text-foreground sm:text-2xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
    </header>
  )
}

export function OwnershipSecuritySettings({
  currentOwnerId,
  initialMembers,
  theaterId,
}: {
  currentOwnerId: string
  initialMembers: TheaterMemberListItem[]
  theaterId: string
}) {
  const candidates = initialMembers.filter(
    (member) => member.userId !== currentOwnerId,
  )
  const [memberUserId, setMemberUserId] = useState(candidates[0]?.userId ?? '')
  const [formerOwnerRole, setFormerOwnerRole] = useState<'admin' | 'member'>(
    'admin',
  )
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  return (
    <section className="page-wrap pb-12 pt-6">
      <Card className="max-w-2xl  px-6 py-6 gap-0">
        <h2 className="text-2xl font-semibold text-foreground">
          Transfer Theater ownership
        </h2>
        <p className="mt-2 text-muted-foreground">
          You remain the Owner until the proposed successor explicitly accepts.
        </p>
        {candidates.length === 0 ? (
          <p className="mt-5 rounded-md border border-border bg-white px-4 py-3 text-sm font-semibold text-muted-foreground">
            Add an active Theater Member before transferring ownership.
          </p>
        ) : (
          <form
            className="mt-5 grid gap-4"
            onSubmit={async (event) => {
              event.preventDefault()
              setMessage(null)
              setIsSubmitting(true)
              try {
                const result = await proposeTheaterOwnershipTransferFn({
                  data: {
                    commandId: crypto.randomUUID(),
                    formerOwnerRole,
                    memberUserId,
                    theaterId,
                  },
                })
                setMessage(
                  result.ok
                    ? 'Ownership transfer proposed. The recipient must accept before authority changes.'
                    : result.error.message,
                )
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <Label className="grid gap-2 text-sm font-medium">
              Proposed successor
              <NativeSelect
                onChange={(event) => setMemberUserId(event.target.value)}
                value={memberUserId}
              >
                {candidates.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                  </option>
                ))}
              </NativeSelect>
            </Label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">
                Your role after acceptance
              </legend>
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  checked={formerOwnerRole === 'admin'}
                  name="former-owner-role"
                  onChange={() => setFormerOwnerRole('admin')}
                  type="radio"
                />
                Remain an Admin (default)
              </Label>
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  checked={formerOwnerRole === 'member'}
                  name="former-owner-role"
                  onChange={() => setFormerOwnerRole('member')}
                  type="radio"
                />
                Remain a Member
              </Label>
            </fieldset>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? 'Proposing transfer…'
                : 'Propose ownership transfer'}
            </Button>
          </form>
        )}
        {message ? (
          <p className="mt-4 text-sm font-semibold">{message}</p>
        ) : null}
      </Card>
    </section>
  )
}
