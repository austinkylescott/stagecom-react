import { describe, expect, it } from 'vitest'

import { appError } from '@/server/errors'

import { getWorkspaceErrorState } from './error-state'

describe('getWorkspaceErrorState', () => {
  it('gives a safe next action for forbidden destinations without repeating private details', () => {
    expect(
      getWorkspaceErrorState(appError('forbidden', 'Secret Theater')),
    ).toEqual(
      expect.objectContaining({
        title: 'This destination is not available to you',
      }),
    )
  })

  it('gives a recovery path for unexpected failures', () => {
    expect(getWorkspaceErrorState(new Error('network failure'))).toEqual(
      expect.objectContaining({ title: 'Your workspace is still safe' }),
    )
  })
})
