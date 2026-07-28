import { describe, expect, it } from 'vitest'

import { resolveLocalDateTime } from './time'

describe('Event local time resolution', () => {
  it('resolves a Theater-local time to one canonical instant and offset', () => {
    expect(
      resolveLocalDateTime('2026-07-15T19:30', 'America/New_York'),
    ).toEqual({
      startsAt: '2026-07-15T23:30:00.000Z',
      utcOffsetMinutes: -240,
    })
  })

  it('rejects a local time skipped by the daylight-saving transition', () => {
    expect(() =>
      resolveLocalDateTime('2026-03-08T02:30', 'America/New_York'),
    ).toThrow('does not exist')
  })

  it('rejects a local time repeated by the daylight-saving transition', () => {
    expect(() =>
      resolveLocalDateTime('2026-11-01T01:30', 'America/New_York'),
    ).toThrow('ambiguous')
  })

  it('rejects an unknown timezone', () => {
    expect(() =>
      resolveLocalDateTime('2026-07-15T19:30', 'Stagecom/Backstage'),
    ).toThrow('timezone is invalid')
  })
})
