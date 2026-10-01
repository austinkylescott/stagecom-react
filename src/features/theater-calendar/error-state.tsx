import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getWorkspaceErrorState } from '@/features/application-shell/error-state'

export function CalendarErrorState({ error }: { error: unknown }) {
  const state = getWorkspaceErrorState(error)
  return (
    <main className="page-wrap py-6" aria-live="polite">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold">{state.title}</h1>
        <p>{state.description}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => window.location.reload()}>
            Retry Calendar
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/callsheet">Return to Callsheet</Link>
          </Button>
        </div>
      </Card>
    </main>
  )
}
