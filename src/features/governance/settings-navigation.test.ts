import { describe, expect, it } from 'vitest'

import { getTheaterSettingsSections } from './settings-navigation'

describe('getTheaterSettingsSections', () => {
  it('keeps ordinary operational settings available to an Admin while withholding Owner sovereignty', () => {
    expect(getTheaterSettingsSections(['admin'])).toEqual([
      {
        description: 'Public Theater identity and how visitors find it.',
        id: 'public-presence',
        label: 'Public Presence',
      },
      {
        description:
          'Producer eligibility, review timing, and exceptional approval.',
        id: 'event-policy',
        label: 'Event Policy',
      },
      {
        description: 'Primary Venue identity and scheduling buffers.',
        id: 'venue-calendar',
        label: 'Venue & Calendar',
      },
    ])
  })

  it('adds Ownership & Security only for the current Owner', () => {
    expect(getTheaterSettingsSections(['owner'])).toEqual([
      expect.objectContaining({ id: 'public-presence' }),
      expect.objectContaining({ id: 'event-policy' }),
      expect.objectContaining({ id: 'venue-calendar' }),
      {
        description: 'Transfer final Theater authority deliberately.',
        id: 'ownership-security',
        label: 'Ownership & Security',
      },
    ])
  })
})
