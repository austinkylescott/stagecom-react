import { createSupabaseAnonClient } from '@/server/supabase/client'
import { appError, err, ok } from '@/server/errors'
import type { Database } from '@/server/db/database.types'

type Theater = Pick<
  Database['public']['Tables']['theaters']['Row'],
  'name' | 'slug' | 'tagline' | 'city' | 'state_region'
>

// Always anonymous, including when the visitor has a Member session.
export async function getPublicProgramming(
  dependencies: { listTheaters: () => Promise<Theater[]> } = {
    listTheaters: async () => {
      const { data, error } = await createSupabaseAnonClient()
        .from('theaters')
        .select('name, slug, tagline, city, state_region')
        .eq('status', 'published')
        .order('name')
        .order('slug')
      if (error) throw error
      return data
    },
  },
) {
  try {
    const theaters = await dependencies.listTheaters()
    return ok({
      theaters: theaters.map((theater) => ({
        name: theater.name,
        slug: theater.slug,
        tagline: theater.tagline,
        location: [theater.city, theater.state_region]
          .filter(Boolean)
          .join(', '),
        href: `/theater/${theater.slug}`,
      })),
    })
  } catch {
    return err(
      appError(
        'external_service_error',
        'Public programming could not be loaded.',
      ),
    )
  }
}
