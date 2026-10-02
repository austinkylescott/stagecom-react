// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PeopleWorkspacePage } from './components'

import type { PeopleWorkspace } from '@/features/memberships/queries'

afterEach(cleanup)

const people = {
  adminAuthorityHistory: [
    {
      actorDisplayName: 'Owner Olive',
      createdAt: '2026-08-26T12:30:00.000Z',
      memberDisplayName: 'Member Mira',
    },
  ],
  directory: [
    {
      avatarUrl: null,
      displayName: 'Owner Olive',
      roles: ['owner'],
      userId: 'owner',
    },
    {
      avatarUrl: null,
      displayName: 'Member Mira',
      roles: [],
      userId: 'member',
    },
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
      {
        capabilities: [],
        displayName: 'Admin Ash',
        membershipVersion: 1,
        roles: ['admin', 'member'],
        userId: 'admin',
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
        initialTeams={{ actorId: 'member', teams: [] }}
        people={{
          adminAuthorityHistory: [],
          directory: people.directory,
          operator: null,
        }}
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
        initialTeams={{ actorId: 'member', teams: [] }}
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
    expect(
      screen.getByRole('button', { name: 'Remove Admin authority' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Admin authority history' }),
    ).toBeTruthy()
    expect(
      screen.getByText(/Owner Olive removed Admin authority from Member Mira/),
    ).toBeTruthy()
  })
})

it("discards another Theater's Teams and search input when People changes Theater", () => {
  const props = {
    actorUserId: 'member',
    canManage: false,
    initialInvitations: [],
    initialJoinLinks: [],
    people: {
      adminAuthorityHistory: [],
      directory: people.directory,
      operator: null,
    },
  }
  const { rerender } = render(
    <PeopleWorkspacePage
      {...props}
      theaterId="first"
      initialTeams={{
        actorId: 'member',
        teams: [
          {
            id: 'team',
            name: 'First Theater Team',
            ownerId: 'member',
            ownerEligible: true,
            version: 1,
            memberIds: ['member'],
            invitations: [],
          },
        ],
      }}
    />,
  )
  fireEvent.change(screen.getByLabelText('Search Members'), {
    target: { value: 'Mira' },
  })
  rerender(
    <PeopleWorkspacePage
      {...props}
      theaterId="second"
      initialTeams={{ actorId: 'member', teams: [] }}
    />,
  )
  expect(
    screen.queryByRole('button', { name: 'View First Theater Team' }),
  ).toBeNull()
  expect(screen.getByLabelText('Search Members')).toHaveProperty('value', '')
})
