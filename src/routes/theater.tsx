import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/theater')({
  component: PublicTheaterLayout,
})

function PublicTheaterLayout() {
  return <Outlet />
}
