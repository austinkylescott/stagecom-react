// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  operationalConditions,
  operationalScenarios,
} from '../scenario-contract'
import { CalendarSurface } from './operational-workspaces-prototype'

afterEach(cleanup)

describe('CalendarSurface', () => {
  it('starts the month-planning scenario in Month and lets a keyboard-reachable control change views', () => {
    const scenario = operationalScenarios.find(
      ({ id }) => id === 'admin-calendar-month-planning',
    )

    if (!scenario) {
      throw new Error('Expected the Admin month-planning scenario.')
    }

    const conditions = scenario.conditions['calendar-occupancy'].map((id) => ({
      classification: 'calendar-occupancy' as const,
      expectedResolution: operationalConditions[id].expectedResolution,
      id,
      label: operationalConditions[id].label,
    }))

    render(
      <CalendarSurface
        conditions={conditions}
        isPhone={false}
        personal={false}
        scenario={scenario}
      />,
    )

    expect(
      screen
        .getByRole('button', { name: 'Month' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Week' }))
    expect(
      screen.getByRole('button', { name: 'Week' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
