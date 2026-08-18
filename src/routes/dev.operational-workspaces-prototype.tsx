import { createFileRoute } from '@tanstack/react-router'

import {
  OperationalWorkspacesPrototype,
  validateOperationalPrototypeSearch,
} from '@/features/operational-workspaces/components/operational-workspaces-prototype'

export const Route = createFileRoute('/dev/operational-workspaces-prototype')({
  validateSearch: validateOperationalPrototypeSearch,
  component: OperationalWorkspacesPrototypeRoute,
})

function OperationalWorkspacesPrototypeRoute() {
  return <OperationalWorkspacesPrototype search={Route.useSearch()} />
}
