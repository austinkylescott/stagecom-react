// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PeopleWorkspacePage } from './components'

import type { PeopleWorkspace } from '@/features/memberships/queries'

afterEach(cleanup)

const people = {
  directory: [
    { displayName: 'Owner Olive', roles: ['owner'], userId: 'owner' },
    { displayName: 'Member Mira', roles: [], userId: 'member' },
  ],
  operator: {
    formerMembers: [
      {
        displayName: 'Former Fern',
        endedMembership: true as const,
        roles: ['member'],
        userId: 'former',
      },
    ],
    members: [
      {
        capabilities: ['reviewer'] as Array<'proposer' | 'reviewer'>,
        displayName: 'Owner Olive',
        membershipVersion: 1,
        roles: ['owner'],
        userId: 'owner',
      },
    ],
  },
} satisfies PeopleWorkspace

describe('PeopleWorkspacePage', () => {
  it('gives an active Member a privacy-safe Directory without management data', () => {
    render(
      <PeopleWorkspacePage
        actorUserId="member"
        canManage={false}
        initialInvitations={[]}
        initialJoinLinks={[]}
        people={{ directory: people.directory, operator: null }}
        theaterId="10000000-0000-0000-0000-000000000001"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Directory' })).toBeTruthy()
    expect(screen.getByText('Owner Olive')).toBeTruthy()
    expect(screen.getByText('Member Mira')).toBeTruthy()
    expect(screen.getByText('owner')).toBeTruthy()
    expect(screen.queryByText('Access & Roles')).toBeNull()
    expect(screen.queryByText('Former Members')).toBeNull()
    expect(screen.queryByText('Reviewer')).toBeNull()
    expect(screen.queryByLabelText('Recipient email')).toBeNull()
  })

  it('organizes Operator relationship management into Invitations, Access & Roles, and Former Members', () => {
    render(
      <PeopleWorkspacePage
        actorUserId="owner"
        canManage
        initialInvitations={[]}
        initialJoinLinks={[]}
        people={people}
        theaterId="10000000-0000-0000-0000-000000000001"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Directory' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Invitations' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Access & Roles' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Former Members' })).toBeTruthy()
    expect(screen.getByText('Former Fern')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove reviewer' })).toBeTruthy()
  })
})
