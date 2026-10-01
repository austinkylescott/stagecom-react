import { describe, expect, it } from 'vitest'

import { getTheaterNavigation } from './navigation'

describe('getTheaterNavigation', () => {
  it('keeps People available to Members while omitting protected configuration', () => {
    expect(getTheaterNavigation(['member'])).toEqual([
      'portal',
      'calendar',
      'events',
      'people',
    ])
  })

  it('adds configuration destinations for Theater Operators without changing the shared structure', () => {
    expect(getTheaterNavigation(['admin'])).toEqual([
      'portal',
      'calendar',
      'events',
      'people',
      'operations',
      'settings',
    ])
  })
})
