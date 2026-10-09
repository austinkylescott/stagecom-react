// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CallsheetPage } from './components'

const responses = vi.hoisted(() => ({
  admin: vi.fn(),
  ownership: vi.fn(),
  staff: vi.fn(),
}))
vi.mock('@/features/admin-invitations/server-functions', () => ({
  respondToTheaterAdminInvitationFn: responses.admin,
}))
vi.mock('@/features/ownership-transfers/server-functions', () => ({
  respondToTheaterOwnershipTransferFn: responses.ownership,
}))
vi.mock('@/features/events/server-functions', () => ({
  respondToEventStaffInvitationFn: responses.staff,
}))
beforeEach(() => vi.resetAllMocks())

afterEach(cleanup)

it('lets an Admin invitee review the recorded offer and authority before responding', () => {
  render(
    <CallsheetPage
      theaters={[]}
      sharedWork={[]}
      commitments={[
        {
          id: 'admin:1',
          responseId: '1',
          kind: 'admin_invitation',
          action: 'Respond to Admin invitation',
          actionableAt: null,
          relationship: 'Theater Member',
          targetAnchor: '',
          theater: { slug: 'north', title: 'North Stage' },
          event: { slug: '', title: 'Admin authority invitation' },
          invitation: {
            offeredBy: 'Alex Rivera',
            offeredAt: '2026-10-07T14:00:00Z',
          },
        },
      ]}
    />,
  )
  expect(screen.getByText(/Acceptance grants Admin authority/)).toBeTruthy()
  expect(screen.getByText(/Declining grants no Admin authority/)).toBeTruthy()
  fireEvent.click(screen.getByText('Review invitation details'))
  expect(screen.getByText('Invited by Alex Rivera')).toBeTruthy()
  expect(
    screen
      .getByText(/Offered:/)
      .querySelector('time')
      ?.getAttribute('datetime'),
  ).toBe('2026-10-07T14:00:00Z')
  expect(
    screen.getByRole('button', { name: 'Accept Admin authority' }),
  ).toBeTruthy()
})

it.each(['admin', 'member'] as const)(
  'explains ownership transfer with the recorded former Owner role %s',
  (formerOwnerRole) => {
    render(
      <CallsheetPage
        theaters={[]}
        sharedWork={[]}
        commitments={[
          {
            id: 'ownership:1',
            responseId: '1',
            kind: 'ownership_transfer',
            action: 'Respond to ownership transfer',
            actionableAt: null,
            relationship: 'Proposed successor',
            targetAnchor: '',
            theater: { slug: 'north', title: 'North Stage' },
            event: { slug: '', title: 'Theater ownership transfer' },
            invitation: {
              offeredBy: 'Alex Rivera',
              offeredAt: null,
              formerOwnerRole,
            },
          },
        ]}
      />,
    )
    expect(
      screen.getByText(/Acceptance makes you the Theater Owner/),
    ).toBeTruthy()
    expect(
      screen.getByText(
        formerOwnerRole === 'admin'
          ? /former Owner becomes an Admin/
          : /former Owner becomes a Theater Member/,
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('Review invitation details'))
    expect(screen.getByText('Proposed by Alex Rivera')).toBeTruthy()
    expect(
      screen.getByText('Offer time not recorded or unavailable.'),
    ).toBeTruthy()
  },
)

it('explains Staff responsibility and preserves unknown historical context without an invented deadline', () => {
  render(
    <CallsheetPage
      theaters={[]}
      sharedWork={[]}
      commitments={[
        {
          id: 'staff:1',
          responseId: '1',
          kind: 'staff_invitation',
          action: 'Respond to staff assignment',
          actionableAt: null,
          relationship: 'Event staff invitee · Front of house',
          targetAnchor: '',
          theater: { slug: 'north', title: 'North Stage' },
          event: { slug: 'opening', title: 'Opening Night' },
          invitation: {
            offeredBy: null,
            offeredAt: null,
            responsibility: 'Front of house',
          },
        },
      ]}
    />,
  )
  expect(
    screen.getByText(
      /Acceptance confirms your Event staff responsibility: Front of house/,
    ),
  ).toBeTruthy()
  fireEvent.click(screen.getByText('Review invitation details'))
  expect(screen.getByText('Inviter not recorded or unavailable.')).toBeTruthy()
  expect(
    screen.getByText('Offer time not recorded or unavailable.'),
  ).toBeTruthy()
  expect(screen.queryByText(/deadline|due within/i)).toBeNull()
})

// These mocks represent the remote server-function response boundary.
it.each([
  ['admin_invitation', 'Accept Admin authority', 'Admin authority', 'admin'],
  [
    'ownership_transfer',
    'Accept Theater ownership',
    'Theater ownership transfer',
    'ownership',
  ],
  [
    'staff_invitation',
    'Accept staff assignment',
    'Event staff assignment',
    'staff',
  ],
] as const)(
  'keeps %s failures actionable, blocks duplicate responses, and clears only the resolved task',
  async (kind, acceptName, subject, endpoint) => {
    let finish!: (result: unknown) => void
    responses[endpoint].mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    render(
      <CallsheetPage
        theaters={[]}
        sharedWork={[]}
        commitments={[
          {
            id: 'offer:1',
            responseId: '1',
            kind,
            action: 'Respond',
            actionableAt: null,
            relationship: 'Invitee',
            targetAnchor: '',
            theater: { slug: 'north', title: 'North Stage' },
            event: { slug: 'opening', title: 'Invitation' },
          },
          {
            id: 'call:1',
            kind: 'occurrence_call',
            action: 'View Call',
            actionableAt: '2026-11-01T14:00:00Z',
            relationship: 'Cast Member',
            targetAnchor: '#occurrence:1',
            theater: { slug: 'north', title: 'North Stage' },
            event: { slug: 'called', title: 'Confirmed Event' },
          },
        ]}
      />,
    )
    const accept = screen.getByRole('button', { name: acceptName })
    fireEvent.click(accept)
    expect(accept.hasAttribute('disabled')).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Decline' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(screen.getByRole('status').textContent).toContain(
      'Saving your response',
    )
    fireEvent.click(accept)
    expect(responses[endpoint]).toHaveBeenCalledTimes(1)
    finish({
      ok: false,
      error: { message: 'The offer changed. Review it and try again.' },
    })
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'The offer changed',
      ),
    )
    expect(accept.hasAttribute('disabled')).toBe(false)
    responses[endpoint].mockResolvedValueOnce({
      ok: true,
      data: { status: 'declined' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        `${subject} declined.`,
      ),
    )
    expect(screen.queryByRole('button', { name: acceptName })).toBeNull()
    expect(
      within(screen.getByRole('region', { name: 'Confirmed Calls' })).getByText(
        'Confirmed Event',
      ),
    ).toBeTruthy()
  },
)

it('reports the recorded result and keeps success distinct from a subsequent refresh failure', async () => {
  responses.admin.mockResolvedValueOnce({
    ok: true,
    data: { status: 'accepted' },
  })
  render(
    <CallsheetPage
      theaters={[]}
      sharedWork={[]}
      onResponded={async () => {
        throw new Error('Read unavailable')
      }}
      commitments={[
        {
          id: 'admin:1',
          responseId: '1',
          kind: 'admin_invitation',
          action: 'Respond',
          actionableAt: null,
          relationship: 'Theater Member',
          targetAnchor: '',
          theater: { slug: 'north', title: 'North Stage' },
          event: { slug: '', title: 'Admin authority invitation' },
        },
      ]}
    />,
  )
  fireEvent.click(
    screen.getByRole('button', { name: 'Accept Admin authority' }),
  )
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toContain(
      'Admin authority accepted. Refresh to load the updated Callsheet.',
    ),
  )
  expect(
    screen.queryByRole('button', { name: 'Accept Admin authority' }),
  ).toBeNull()
})
