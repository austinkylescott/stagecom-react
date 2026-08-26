import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$theaterSlug/settings/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/$theaterSlug/settings/public-presence',
      params,
    })
  },
})
