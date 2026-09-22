import type { WorkQueueItem } from './read-model'

export function WorkQueue({
  items,
  previewCount,
}: {
  items: WorkQueueItem[]
  previewCount?: number
}) {
  return (
    <section aria-labelledby="work-queue" className="mt-8">
      <h2 id="work-queue" className="text-2xl font-extrabold">
        Work Queue
      </h2>
      <p className="mt-2 text-[var(--sea-ink-soft)]">
        Shared decisions you can resolve, highest priority first. Open an item
        to act on its current state.
      </p>
      {items.length ? (
        <ol className="mt-5 grid gap-3">
          {items.slice(0, previewCount).map((item) => (
            <WorkQueueRow key={item.id} item={item} />
          ))}
        </ol>
      ) : (
        <p className="island-shell mt-5 rounded-lg p-4">
          No decisions are ready for you right now.
        </p>
      )}
      {previewCount !== undefined && items.length > previewCount ? (
        <details className="mt-3">
          <summary className="cursor-pointer py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">
            Show {items.length - previewCount} more decisions
          </summary>
          <ol start={previewCount + 1} className="mt-3 grid gap-3">
            {items.slice(previewCount).map((item) => (
              <WorkQueueRow key={item.id} item={item} />
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  )
}

function WorkQueueRow({ item }: { item: WorkQueueItem }) {
  return (
    <li key={item.id} className="island-shell rounded-lg p-4">
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
  )
}
