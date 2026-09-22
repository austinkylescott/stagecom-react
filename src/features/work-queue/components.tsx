import type { WorkQueueItem } from './read-model'

export function WorkQueue({ items }: { items: WorkQueueItem[] }) {
  return (
    <section aria-labelledby="work-queue" className="mt-8">
      <h2 id="work-queue" className="text-2xl font-extrabold">
        Work Queue
      </h2>
      <p className="mt-2 text-[var(--sea-ink-soft)]">
        Shared decisions you can resolve. Open an item to act on its current
        state.
      </p>
      {items.length ? (
        <ol className="mt-5 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="island-shell rounded-lg p-5">
              <p className="text-sm font-semibold text-[var(--sea-ink-soft)]">
                {item.theaterName}
                {item.eventTitle ? ` · ${item.eventTitle}` : ''}
              </p>
              <a
                href={item.href}
                className="mt-2 inline-block text-lg font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {item.label}
              </a>
              <p className="mt-2 text-sm">
                {item.relationship} · {item.priorityReason}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="island-shell mt-5 rounded-lg p-5">
          No decisions are ready for you right now.
        </p>
      )}
    </section>
  )
}
