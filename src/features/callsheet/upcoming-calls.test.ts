import { describe, expect, it } from 'vitest'
import { callHref, upcomingCalls } from './upcoming-calls'
import type { CallsheetCommitment } from './read-model'

function commitment(
  id: string,
  actionableAt: string | null,
  kind: CallsheetCommitment['kind'] = 'occurrence_call',
): CallsheetCommitment {
  return {
    id,
    actionableAt,
    kind,
    action: 'Review call',
    relationship: 'Cast Member',
    event: { title: id, slug: id },
    theater: { title: id, slug: id },
    targetAnchor: `#occurrence-call-${id}`,
  }
}

describe('personal upcoming Calls', () => {
  it('keeps only dated future confirmed Calls across Theaters, ordered by time', () => {
    const later = commitment('harbor', '2026-10-25T19:00:00Z')
    later.relationship = 'Event staff · Stage Manager'
    const earlier = commitment('compass', '2026-10-23T19:00:00Z')
    const calls = upcomingCalls(
      [
        later,
        commitment('pending', '2026-10-22T19:00:00Z', 'cast_invitation'),
        commitment('past', '2026-09-01T19:00:00Z'),
        commitment('undated', null),
        commitment('invalid', 'invalid'),
        earlier,
      ],
      Date.parse('2026-10-05T00:00:00Z'),
    )
    expect(calls).toEqual([earlier, later])
    expect(callHref(later)).toBe(
      '/app/harbor/events/harbor#occurrence-call-harbor',
    )
  })
})
