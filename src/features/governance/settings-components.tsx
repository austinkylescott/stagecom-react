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
          <Link
            activeProps={{ className: 'bg-[var(--sea-ink)] text-white' }}
            className="min-h-11 shrink-0 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-extrabold text-[var(--sea-ink)] no-underline outline-none hover:bg-[var(--surface-strong)] focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35"
            key={section.id}
            params={{ theaterSlug }}
            to={`/app/$theaterSlug/settings/${section.id}`}
          >
            {section.label}
          </Link>
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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
        Theater Settings
      </p>
      <h1 className="display-title mt-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-[var(--sea-ink-soft)]">{description}</p>
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
      <div className="island-shell max-w-2xl rounded-lg px-6 py-6">
        <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
          Transfer Theater ownership
        </h2>
        <p className="mt-2 text-[var(--sea-ink-soft)]">
          You remain the Owner until the proposed successor explicitly accepts.
        </p>
        {candidates.length === 0 ? (
          <p className="mt-5 rounded-md border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--sea-ink-soft)]">
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
            <label className="grid gap-2 text-sm font-bold">
              Proposed successor
              <select
                className="rounded-md border border-[var(--line)] bg-white px-4 py-3"
                onChange={(event) => setMemberUserId(event.target.value)}
                value={memberUserId}
              >
                {candidates.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-bold">
                Your role after acceptance
              </legend>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  checked={formerOwnerRole === 'admin'}
                  name="former-owner-role"
                  onChange={() => setFormerOwnerRole('admin')}
                  type="radio"
                />
                Remain an Admin (default)
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  checked={formerOwnerRole === 'member'}
                  name="former-owner-role"
                  onChange={() => setFormerOwnerRole('member')}
                  type="radio"
                />
                Remain a Member
              </label>
            </fieldset>
            <button
              className="rounded-md bg-[var(--sea-ink)] px-4 py-3 font-extrabold text-white disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting
                ? 'Proposing transfer…'
                : 'Propose ownership transfer'}
            </button>
          </form>
        )}
        {message ? (
          <p className="mt-4 text-sm font-semibold">{message}</p>
        ) : null}
      </div>
    </section>
  )
}
