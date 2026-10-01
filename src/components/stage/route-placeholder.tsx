import { Card } from '@/components/ui/card'

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
    <main className="page-wrap py-6">
      <Card className=" px-6 py-7 sm:px-8 gap-0">
        <p className="text-xs font-medium tracking-normal text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="display-title mt-3 text-2xl font-medium text-foreground sm:text-2xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
        {details.length > 0 ? (
          <dl className="mt-7 grid gap-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div
                className="rounded-md border border-border bg-muted px-4 py-3"
                key={label}
              >
                <dt className="text-xs font-semibold tracking-normal text-muted-foreground">
                  {label}
                </dt>
                <dd className="mt-1 font-semibold text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Card>
    </main>
  )
}
