import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from '@tanstack/react-router'

import { getWorkspaceErrorState } from './error-state'

export function WorkspaceErrorState({ error }: { error: unknown }) {
  const state = getWorkspaceErrorState(error)

  return (
    <main aria-live="polite" className="page-wrap py-6">
      <Card className=" px-6 py-7 sm:px-8 gap-0">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          {state.eyebrow}
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground sm:text-2xl">
          {state.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {state.description}
        </p>
        <Button asChild variant="default" className="mt-6">
          <Link to="/app/callsheet">Return to Callsheet</Link>
        </Button>
      </Card>
    </main>
  )
}

export function WorkspaceLoadingState() {
  return (
    <main aria-live="polite" className="page-wrap py-6">
      <Card className=" px-6 py-7 sm:px-8 gap-0">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          Loading workspace
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground sm:text-2xl">
          Preparing your Callsheet
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Your personal workspace will open shortly. You do not need to take any
          action.
        </p>
      </Card>
    </main>
  )
}
