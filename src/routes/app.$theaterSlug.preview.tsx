import { createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'

import { PublicTheaterPage } from '@/features/first-slice/theater-page'
import {
  getTheaterPreviewFn,
  publishTheaterFn,
} from '@/features/theaters/server-functions'

export const Route = createFileRoute('/app/$theaterSlug/preview')({
  loader: async ({ params }) => {
    const result = await getTheaterPreviewFn({
      data: { theaterSlug: params.theaterSlug },
    })

    if (!result.ok) {
      if (result.error.code === 'not_found') {
        throw notFound()
      }

      throw result.error
    }

    return result.data.theater
  },
  component: TheaterPreviewPage,
})

function TheaterPreviewPage() {
  const theater = Route.useLoaderData()
  const { theater: workspaceTheater } = Route.useRouteContext()
  const [error, setError] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  return (
    <>
      <PublicTheaterPage
        mode="preview"
        previewAction={
          <button
            className="rounded-md bg-[var(--theater-ink)] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            disabled={isPublishing}
            onClick={async () => {
              setError(null)
              setIsPublishing(true)

              try {
                const result = await publishTheaterFn({
                  data: { theaterId: workspaceTheater.id },
                })

                if (!result.ok) {
                  setError(result.error.message)
                  return
                }

                window.location.assign(`/theater/${result.data.slug}`)
              } finally {
                setIsPublishing(false)
              }
            }}
            type="button"
          >
            {isPublishing ? 'Publishing…' : 'Publish Theater'}
          </button>
        }
        theater={theater}
      />
      {error ? (
        <p className="page-wrap pb-8 text-sm font-semibold text-red-800">
          {error}
        </p>
      ) : null}
    </>
  )
}
