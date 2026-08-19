import { describe, expect, it } from 'vitest'

import { normalizeNextPath, resolvePostAuthPath } from './redirects'

describe('normalizeNextPath', () => {
  it('allows app and onboarding routes', () => {
    expect(normalizeNextPath('/app/main-stage')).toBe('/app/main-stage')
    expect(normalizeNextPath('/onboarding/theater')).toBe('/onboarding/theater')
  })

  it('rejects absolute, auth, and unknown routes', () => {
    expect(normalizeNextPath('https://evil.example/app')).toBeUndefined()
    expect(normalizeNextPath('//evil.example/app')).toBeUndefined()
    expect(normalizeNextPath('/login')).toBeUndefined()
    expect(normalizeNextPath('/dev/components')).toBeUndefined()
  })
})

describe('resolvePostAuthPath', () => {
  it('prioritizes invite intent', () => {
    expect(
      resolvePostAuthPath({
        hasProfile: true,
        inviteToken: 'invite-token',
        next: '/app/main-stage',
      }),
    ).toBe('/join/invite-token')
  })

  it('requires profile before next', () => {
    expect(
      resolvePostAuthPath({
        hasProfile: false,
        next: '/app/main-stage',
      }),
    ).toBe('/complete-profile')
  })

  it('uses safe next before onboarding fallbacks', () => {
    expect(
      resolvePostAuthPath({
        draftTheaterSlug: 'draft-stage',
        hasProfile: true,
        next: '/app/main-stage',
      }),
    ).toBe('/app/main-stage')
  })

  it('uses Callsheet as the established-person fallback', () => {
    expect(
      resolvePostAuthPath({
        draftTheaterSlug: 'draft-stage',
        hasProfile: true,
      }),
    ).toBe('/onboarding/theater')

    expect(resolvePostAuthPath({ hasProfile: true })).toBe('/app/callsheet')
  })
})
