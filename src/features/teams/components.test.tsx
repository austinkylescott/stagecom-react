// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { PeopleAndTeams } from './components'

afterEach(cleanup)
it('searches names with overlapping Team filters while keeping identities readable', () => {
  render(
    <PeopleAndTeams
      theaterId="theater"
      members={[
        { userId: 'a', displayName: 'Eno French', avatarUrl: null, roles: [] },
        {
          userId: 'b',
          displayName: 'Austin Scott',
          avatarUrl: '/avatar.svg',
          roles: [],
        },
      ]}
      initialWorkspace={{
        actorId: 'a',
        teams: [
          {
            id: 'ants',
            name: 'Ants 2 Gods',
            ownerId: 'b',
            ownerEligible: true,
            version: 1,
            memberIds: ['a', 'b'],
            invitations: [],
            adminIds: [],
            adminInvitationIds: [],
            transfer: null,
            recovery: null,
          },
          {
            id: 'french',
            name: 'Eno & Dan French',
            ownerId: 'a',
            ownerEligible: true,
            version: 1,
            memberIds: ['a'],
            invitations: [],
            adminIds: [],
            adminInvitationIds: [],
            transfer: null,
            recovery: null,
          },
        ],
      }}
    />,
  )
  const directory = screen.getByRole('region', { name: 'Directory' })
  fireEvent.change(within(directory).getByLabelText('Search Members'), {
    target: { value: 'ENO' },
  })
  expect(within(directory).getByText('Eno French')).toBeTruthy()
  expect(within(directory).queryByText('Austin Scott')).toBeNull()
  fireEvent.click(within(directory).getByLabelText('Eno & Dan French'))
  expect(
    within(directory).getByText('Ants 2 Gods', {
      selector: '[data-slot="badge"]',
    }),
  ).toBeTruthy()
  fireEvent.change(within(directory).getByLabelText('Search Members'), {
    target: { value: 'missing' },
  })
  expect(
    within(directory).getByText(
      'No Members match your search and Team filters.',
    ),
  ).toBeTruthy()
})
