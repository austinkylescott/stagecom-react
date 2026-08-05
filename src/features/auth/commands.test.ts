import { describe, expect, it, vi } from 'vitest'

import { signInAsDemoPersona } from './commands'

import type { DemoSignInDependencies } from './commands'

describe('signInAsDemoPersona', () => {
  it('rejects persona access unless demo mode is enabled', async () => {
    const dependencies = createDependencies({ enabled: false })

    const result = await signInAsDemoPersona({ persona: 'owner' }, dependencies)

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'forbidden',
        message: 'Demo access is not enabled.',
      }),
    })
    expect(dependencies.signIn).not.toHaveBeenCalled()
  })

  it('stores the seeded persona session and returns its landing path', async () => {
    const dependencies = createDependencies()

    const result = await signInAsDemoPersona(
      { persona: 'newcomer' },
      dependencies,
    )

    expect(dependencies.signIn).toHaveBeenCalledWith({
      email: 'newcomer@demo.stagecom.test',
      password: 'configured-demo-password',
    })
    expect(dependencies.setSession).toHaveBeenCalledWith({
      accessToken: 'access-token',
      expiresAt: 2_000_000_000,
      refreshToken: 'refresh-token',
    })
    expect(result).toEqual({
      ok: true,
      data: {
        path: '/join-link/stagecom-demo-active-join-token-2026',
        persona: 'newcomer',
      },
    })
  })

  it('reports stale or missing seeded Auth users without setting cookies', async () => {
    const dependencies = createDependencies({ signInResult: null })

    const result = await signInAsDemoPersona({ persona: 'admin' }, dependencies)

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: 'external_service_error',
        message: expect.stringContaining('Reseed the demo environment'),
      }),
    })
    expect(dependencies.setSession).not.toHaveBeenCalled()
  })
})

function createDependencies({
  enabled = true,
  signInResult = {
    accessToken: 'access-token',
    expiresAt: 2_000_000_000,
    refreshToken: 'refresh-token',
  },
}: {
  enabled?: boolean
  signInResult?: Awaited<ReturnType<DemoSignInDependencies['signIn']>>
} = {}): DemoSignInDependencies {
  return {
    enabled,
    password: 'configured-demo-password',
    setSession: vi.fn(),
    signIn: vi.fn().mockResolvedValue(signInResult),
  }
}
