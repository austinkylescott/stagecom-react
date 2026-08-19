import { describe, expect, it } from 'vitest'

import { operationalScenarios } from './scenario-contract'

describe('operational-workspaces scenario contract', () => {
  it('makes month planning a desktop-first Operator Calendar scenario', () => {
    const scenario = operationalScenarios.find(
      ({ id }) => id === 'admin-calendar-month-planning',
    )

    expect(scenario).toMatchObject({
      allowedStartingSurfaces: ['callsheet'],
      calendarView: 'month',
      navigationPath: ['callsheet', 'theater-calendar'],
      personas: ['admin'],
      primaryViewport: 'desktop',
    })
    expect(scenario?.calendarDisclosure.theaterCalendar).toContain(
      'full authorized occupancy',
    )
  })

  it('keeps the pending Cast invitation a phone-first personal commitment', () => {
    const scenario = operationalScenarios.find(
      ({ id }) => id === 'cast-invitation-awaits-theater-member',
    )

    expect(scenario).toMatchObject({
      allowedStartingSurfaces: ['callsheet'],
      primaryViewport: 'phone',
    })
    expect(scenario?.conditions['personal-commitment']).toEqual([
      'cast-invitation-awaits-response',
    ])
    expect(scenario?.forbiddenDisclosures).toContain(
      'Candidate Slots, Calls, and accepted-Cast information before acceptance',
    )
  })
})
