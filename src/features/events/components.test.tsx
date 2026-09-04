// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EventWorkspaceNavigation } from './components'

afterEach(cleanup)

describe('Event workspace navigation', () => {
  it('exposes only authorized sections as keyboard-reachable fragment links', () => {
    const onSectionSelect = vi.fn()

    render(
      <EventWorkspaceNavigation
        activeSection="overview"
        onSectionSelect={onSectionSelect}
        sections={[
          { label: 'Overview', target: '#overview' },
          { label: 'History', target: '#history' },
        ]}
      />,
    )

    const history = screen.getByRole('link', { name: 'History' })
    expect(history).toHaveProperty('hash', '#history')
    expect(history).toHaveProperty('tabIndex', 0)
    expect(screen.queryByRole('link', { name: 'Review' })).toBeNull()

    fireEvent.click(history)
    expect(onSectionSelect).toHaveBeenCalledWith('history')
    expect(
      screen
        .getByRole('link', { name: 'Overview' })
        .getAttribute('aria-current'),
    ).toBe('page')
  })
})
