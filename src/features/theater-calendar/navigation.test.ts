import { describe, expect, it } from 'vitest'
import {
  calendarDateKey,
  calendarDays,
  calendarEntryOnDay,
  calendarSearchSchema,
  shiftCalendarPeriod,
} from './navigation'

describe('Calendar period and day boundaries', () => {
  it('steps by calendar months across short months and year boundaries', () => {
    expect(shiftCalendarPeriod('2026-01-31', 'month', 1)).toBe('2026-02-01')
    expect(shiftCalendarPeriod('2026-03-31', 'daybook', -1)).toBe('2026-02-01')
    expect(shiftCalendarPeriod('2026-12-31', 'month', 1)).toBe('2027-01-01')
    expect(calendarDays('2028-02-15', 'month')).toHaveLength(29)
    expect(calendarDays('2026-02-15', 'month')).toHaveLength(28)
  })
  it('groups occupancy in the Theater timezone across midnight and daylight savings', () => {
    expect(calendarDateKey('2026-03-08T04:30:00Z', 'America/New_York')).toBe(
      '2026-03-07',
    )
    const overnight = {
      startsAt: '2026-03-08T04:30:00Z',
      endsAt: '2026-03-08T07:30:00Z',
    }
    expect(
      calendarEntryOnDay(overnight, '2026-03-07', 'America/New_York'),
    ).toBe(true)
    expect(
      calendarEntryOnDay(overnight, '2026-03-08', 'America/New_York'),
    ).toBe(true)
    expect(
      calendarEntryOnDay(
        { ...overnight, endsAt: '2026-03-08T05:00:00Z' },
        '2026-03-08',
        'America/New_York',
      ),
    ).toBe(false)
  })
  it('discards malformed period and view inputs without breaking the page', () => {
    expect(
      calendarSearchSchema.parse({
        calendarPeriod: '2026-02-31',
        calendarView: 'unknown',
      }),
    ).toMatchObject({ calendarPeriod: undefined, calendarView: undefined })
  })
})
