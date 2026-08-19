import { describe, expect, it } from 'vitest'

import { getTheaterNavigation } from './navigation'

describe('getTheaterNavigation', () => {
  it('keeps read-only Theater destinations while omitting protected configuration for Members', () => {
    expect(getTheaterNavigation(['member'])).toEqual([
      'operations',
      'calendar',
      'events',
    ])
  })

  it('adds configuration destinations for Theater Operators without changing the shared structure', () => {
    expect(getTheaterNavigation(['admin'])).toEqual([
      'operations',
      'calendar',
      'events',
      'people',
      'settings',
    ])
  })
})
