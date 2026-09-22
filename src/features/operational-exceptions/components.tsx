import type { OperationalException } from './read-model'

export function OperationalExceptions({
  items,
}: {
  items: OperationalException[]
}) {
  return (
    <section aria-labelledby="operational-exceptions" className="mt-8">
      <h2 id="operational-exceptions" className="text-2xl font-extrabold">
        Operational Exceptions
      </h2>
      <p className="mt-2 text-[var(--sea-ink-soft)]">
        Conditions to monitor. Responsibility and available actions remain with
        the underlying Event.
      </p>
      {items.length ? (
        <ol className="mt-5 grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="island-shell rounded-lg p-5">
              <p className="text-sm font-semibold text-[var(--sea-ink-soft)]">
                {item.theaterName} · {item.eventTitle}
              </p>
              <h3 className="mt-2 text-lg font-bold">{item.label}</h3>
              <p className="mt-2">{item.reason}</p>
              <p className="mt-2 text-sm font-semibold">
                {item.urgency === 'urgent' ? 'Urgent' : 'Watch-only'} ·{' '}
                {item.urgencyReason}
              </p>
              {item.deadlineAt ? (
                <p className="mt-1 text-sm">
                  Deadline:{' '}
                  <time dateTime={item.deadlineAt}>
                    {new Date(item.deadlineAt)
                      .toISOString()
                      .replace('T', ' ')
                      .replace('.000Z', ' UTC')}
                  </time>
                </p>
              ) : null}
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-3 inline-block font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  View Event context
                  <span className="sr-only">
                    {' '}
                    for {item.eventTitle}: {item.label}
                  </span>
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="island-shell mt-5 rounded-lg p-5">
          No Operational Exceptions to monitor right now.
        </p>
      )}
    </section>
  )
}
