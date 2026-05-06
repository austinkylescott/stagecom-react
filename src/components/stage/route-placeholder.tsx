type RoutePlaceholderProps = {
  eyebrow: string
  title: string
  description: string
  details?: Array<[string, string]>
}

export function RoutePlaceholder({
  eyebrow,
  title,
  description,
  details = [],
}: RoutePlaceholderProps) {
  return (
    <main className="page-wrap py-10 sm:py-14">
      <section className="island-shell rounded-lg px-6 py-7 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          {eyebrow}
        </p>
        <h1 className="display-title mt-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)]">
          {description}
        </p>
        {details.length > 0 ? (
          <dl className="mt-7 grid gap-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div
                className="rounded-md border border-[var(--line)] bg-[var(--chip-bg)] px-4 py-3"
                key={label}
              >
                <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--kicker)]">
                  {label}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--sea-ink)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>
    </main>
  )
}
