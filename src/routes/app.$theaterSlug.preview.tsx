import { createFileRoute } from '@tanstack/react-router'

import {
  PublicTheaterPage,
  getDemoTheater,
} from '@/features/first-slice/theater-page'

export const Route = createFileRoute('/app/$theaterSlug/preview')({
  component: TheaterPreviewPage,
})

function TheaterPreviewPage() {
  const { theaterSlug } = Route.useParams()

  return (
    <PublicTheaterPage mode="preview" theater={getDemoTheater(theaterSlug)} />
  )
}
