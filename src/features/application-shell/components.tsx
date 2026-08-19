import { Link } from '@tanstack/react-router'

import { getWorkspaceErrorState } from './error-state'

export function WorkspaceErrorState({ error }: { error: unknown }) {
  const state = getWorkspaceErrorState(error)

  return (
    <main aria-live="polite" className="page-wrap py-10 sm:py-14">
      <section className="island-shell rounded-lg px-6 py-7 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          {state.eyebrow}
        </p>
        <h1 className="display-title mt-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          {state.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)]">
          {state.description}
        </p>
        <Link
          className="mt-6 inline-flex rounded-md bg-[var(--sea-ink)] px-4 py-3 text-sm font-extrabold text-white no-underline focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/35"
          to="/app/callsheet"
        >
          Return to Callsheet
        </Link>
      </section>
    </main>
  )
}

export function WorkspaceLoadingState() {
  return (
    <main aria-live="polite" className="page-wrap py-10 sm:py-14">
      <section className="island-shell rounded-lg px-6 py-7 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Loading workspace
        </p>
        <h1 className="display-title mt-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Preparing your Callsheet
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)]">
          Your personal workspace will open shortly. You do not need to take any
          action.
        </p>
      </section>
    </main>
  )
}
