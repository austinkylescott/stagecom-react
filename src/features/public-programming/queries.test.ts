import { expect, it } from 'vitest'
import { getPublicProgramming } from './queries'

it('discovers published Theater destinations without exposing private fields', async () => {
  const result = await getPublicProgramming({
    listTheaters: async () => [
      {
        name: 'North Star',
        slug: 'north-star',
        tagline: 'Live theater',
        city: 'New Haven',
        state_region: 'CT',
      },
    ],
  })
  expect(result).toEqual({
    ok: true,
    data: {
      theaters: [
        {
          name: 'North Star',
          slug: 'north-star',
          tagline: 'Live theater',
          location: 'New Haven, CT',
          href: '/theater/north-star',
        },
      ],
    },
  })
})
