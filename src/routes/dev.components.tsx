import { createFileRoute } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Image,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Settings,
  Theater,
  Upload,
  UserRound,
} from 'lucide-react'

export const Route = createFileRoute('/dev/components')({
  component: DevComponentsPage,
})

function DevComponentsPage() {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
          Development
        </p>
        <h1 className="display-title mt-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Stagecom component baseline
        </h1>
      </header>

      <div className="grid gap-6">
        <Section title="Tokens">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Swatch name="Ink" value="--ink" hex="#263130" />
            <Swatch name="Paper" value="--paper" hex="#fbf6ec" />
            <Swatch name="Theater" value="--theater" hex="#82bfb6" />
            <Swatch name="Event" value="--event" hex="#eaa542" />
            <Swatch name="Performer" value="--performer" hex="#c76056" />
            <Swatch name="Cream" value="--cream" hex="#f8ecd8" />
            <Swatch name="Theater soft" value="--theater-soft" hex="#dcefeb" />
            <Swatch name="Event soft" value="--event-soft" hex="#f7dfb3" />
          </div>
        </Section>

        <Section title="Typography">
          <div className="grid gap-4">
            <div>
              <p className="type-caption text-[var(--kicker)]">Display</p>
              <p className="type-page-title mt-2 text-[var(--sea-ink)]">
                Civic poster, calm operator
              </p>
            </div>
            <p className="type-body max-w-3xl text-[var(--sea-ink-soft)]">
              Body text uses Public Sans for dense operational screens, while
              Cubano carries Stagecom identity and first-viewport moments.
            </p>
            <p className="type-mono-small text-[var(--sea-ink-soft)]">
              type-mono-small / src/server/db/database.types.ts
            </p>
          </div>
        </Section>

        <Section title="Shape And Shadows">
          <div className="grid gap-4 sm:grid-cols-3">
            <TokenBlock label="Radius small" value="--radius-sm" />
            <TokenBlock label="Radius medium" value="--radius-md" />
            <TokenBlock label="Hard shadow" value="--shadow-hard-md" />
          </div>
        </Section>

        <Section title="Buttons And Links">
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-md bg-[var(--event)] px-4 py-3 font-extrabold text-[var(--event-ink)] transition hover:-translate-y-0.5">
              Create Event <Plus className="size-4" />
            </button>
            <button className="inline-flex items-center gap-2 rounded-md border border-[var(--chip-line)] bg-[var(--theater-soft)] px-4 py-3 font-extrabold text-[var(--theater-ink)]">
              Settings <Settings className="size-4" />
            </button>
            <a className="inline-flex items-center gap-2 px-1 py-3 font-extrabold no-underline">
              View public page <ArrowRight className="size-4" />
            </a>
          </div>
        </Section>

        <Section title="Form Controls">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Theater name" value="Main Stage Theater" />
            <Field label="Public slug" value="main-stage-theater" />
            <Field label="Website URL" value="https://example.com" />
            <label className="grid gap-2 text-sm font-bold text-[var(--sea-ink)]">
              Event type
              <select className="rounded-md border border-[var(--line)] bg-white px-4 py-3 font-medium outline-none focus:border-[var(--lagoon-deep)]">
                <option>Show</option>
                <option>Practice</option>
                <option>Audition</option>
              </select>
            </label>
          </div>
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            Slug is already in use. Choose a unique public URL.
          </div>
        </Section>

        <Section title="Cards And Panels">
          <div className="grid gap-4 lg:grid-cols-3">
            <MetricCard label="Draft events" value="4" />
            <MetricCard label="Open invites" value="7" />
            <MetricCard label="Ready to publish" value="2" />
          </div>
        </Section>

        <Section title="Event Governance And State">
          <div className="grid gap-4 lg:grid-cols-3">
            <MetricCard label="Lifecycle" value="Draft" />
            <MetricCard label="Publication" value="Unpublished" />
            <MetricCard label="Operational health" value="On track" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Field label="Primary Venue" value="Main Stage" />
            <label className="grid gap-2 text-sm font-bold text-[var(--sea-ink)]">
              Producer eligibility
              <select className="rounded-md border border-[var(--line)] bg-white px-4 py-3 font-medium outline-none focus:border-[var(--lagoon-deep)]">
                <option>All active Members</option>
                <option>Designated Proposers</option>
                <option>Owners and Admins only</option>
              </select>
            </label>
          </div>
        </Section>

        <Section title="Alerts">
          <div className="grid gap-3">
            <Alert tone="success" text="Theater profile autosaved." />
            <Alert tone="warning" text="Address is required before publish." />
            <Alert tone="error" text="Invite email does not match this user." />
          </div>
        </Section>

        <Section title="Empty And Loading">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--chip-bg)] px-5 py-8 text-center">
              <CalendarDays className="mx-auto size-7 text-[var(--event)]" />
              <h3 className="mt-3 text-xl font-extrabold text-[var(--sea-ink)]">
                Events coming soon
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--sea-ink-soft)]">
                Published events appear here once the theater adds upcoming
                programming.
              </p>
            </div>
            <div className="flex min-h-44 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-strong)]">
              <div className="flex items-center gap-3 font-extrabold text-[var(--sea-ink)]">
                <Loader2 className="size-5 animate-spin text-[var(--event)]" />
                Loading callsheet
              </div>
            </div>
          </div>
        </Section>

        <Section title="Auth Card">
          <div className="max-w-lg rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-6 py-6">
            <Mail className="size-7 text-[var(--theater)]" />
            <h2 className="display-title mt-4 text-3xl font-bold text-[var(--sea-ink)]">
              Sign in to Stagecom
            </h2>
            <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">
              Use a magic link to return to your callsheet.
            </p>
            <div className="mt-5 grid gap-3">
              <Field label="Email address" value="operator@example.com" />
              <button className="rounded-md bg-[var(--theater-ink)] px-4 py-3 font-extrabold text-white">
                Send magic link
              </button>
            </div>
          </div>
        </Section>

        <Section title="Onboarding Choice">
          <div className="grid gap-4 md:grid-cols-2">
            <ChoiceCard
              icon={<Theater className="size-6" />}
              text="Create a draft theater, complete the publish gate, and preview the public home."
              title="Create theater"
            />
            <ChoiceCard
              icon={<UserRound className="size-6" />}
              text="Join through an invite link from a theater owner or admin."
              title="Join theater"
            />
          </div>
        </Section>

        <Section title="Setup Stepper And Address">
          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <ol className="rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] p-4">
              {['Identity', 'Address', 'Branding', 'Publish'].map(
                (step, index) => (
                  <li
                    className="flex items-center gap-3 py-3 font-bold text-[var(--sea-ink)]"
                    key={step}
                  >
                    <span className="grid size-8 place-items-center rounded-md bg-[var(--theater)] text-sm font-extrabold text-[var(--theater-ink)]">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ),
              )}
            </ol>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Street" value="123 Main Street" />
              <Field label="City" value="Austin" />
              <Field label="State / region" value="TX" />
              <Field label="Postal code" value="78701" />
            </div>
          </div>
        </Section>

        <Section title="Logo Upload And Publish Gate">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--chip-bg)] px-5 py-6">
              <Image className="size-8 text-[var(--theater)]" />
              <h3 className="mt-4 text-xl font-extrabold text-[var(--sea-ink)]">
                Theater logo
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
                Uploads will use theater-scoped storage paths.
              </p>
              <button className="mt-5 inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-3 font-extrabold">
                Upload <Upload className="size-4" />
              </button>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-6">
              <h3 className="text-xl font-extrabold text-[var(--sea-ink)]">
                Publish gate
              </h3>
              <div className="mt-4 grid gap-3">
                {['Name', 'Tagline', 'Address', 'Slug', 'Timezone'].map(
                  (item, index) => (
                    <div className="flex items-center gap-2" key={item}>
                      <CheckCircle2
                        className={
                          index < 4
                            ? 'size-5 text-[var(--theater-ink)]'
                            : 'size-5 text-[var(--sea-ink-soft)] opacity-35'
                        }
                      />
                      <span className="font-semibold text-[var(--sea-ink)]">
                        {item}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Admin Preview Bar And Public Header">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--sea-ink)]">
                Preview mode
              </p>
              <div className="flex gap-2">
                <button className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-bold">
                  Edit
                </button>
                <button className="rounded-md bg-[var(--event)] px-3 py-2 text-sm font-bold text-[var(--event-ink)]">
                  Publish
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-strong)]">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-7">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--kicker)]">
                  Theater
                </p>
                <h2 className="display-title mt-4 text-4xl font-bold text-[var(--sea-ink)]">
                  Main Stage Theater
                </h2>
                <p className="mt-4 max-w-xl text-lg leading-8 text-[var(--sea-ink-soft)]">
                  A community stage for bold performances and organized
                  productions.
                </p>
              </div>
              <div className="border-t border-[var(--line)] bg-[var(--chip-bg)] p-7 lg:border-l lg:border-t-0">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 size-5 text-[var(--performer)]" />
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
                      Location
                    </h3>
                    <p className="mt-2 font-semibold text-[var(--sea-ink)]">
                      123 Main Street, Austin, TX 78701
                    </p>
                    <p className="text-sm text-[var(--sea-ink-soft)]">
                      United States
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </main>
  )
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <section className="island-shell rounded-lg px-5 py-5 sm:px-6">
      <h2 className="mb-5 text-xl font-extrabold text-[var(--sea-ink)]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Swatch({
  hex,
  name,
  value,
}: {
  hex: string
  name: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4">
      <div
        className="h-16 rounded-md border border-[var(--line)]"
        style={{ background: `var(${value})` }}
      />
      <p className="mt-3 font-extrabold text-[var(--sea-ink)]">{name}</p>
      <p className="text-sm text-[var(--sea-ink-soft)]">
        {value} / {hex}
      </p>
    </div>
  )
}

function TokenBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-4 shadow-hard-sm">
      <p className="font-extrabold text-[var(--sea-ink)]">{label}</p>
      <p className="type-mono-small mt-2 text-[var(--sea-ink-soft)]">{value}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[var(--sea-ink)]">
      {label}
      <input
        className="rounded-md border border-[var(--line)] bg-white px-4 py-3 font-medium outline-none focus:border-[var(--lagoon-deep)]"
        defaultValue={value}
      />
    </label>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-5 py-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--kicker)]">
        {label}
      </p>
      <p className="mt-2 text-4xl font-extrabold text-[var(--sea-ink)]">
        {value}
      </p>
    </div>
  )
}

function Alert({
  text,
  tone,
}: {
  text: string
  tone: 'error' | 'success' | 'warning'
}) {
  const Icon =
    tone === 'success'
      ? CheckCircle2
      : tone === 'warning'
        ? Clock3
        : AlertCircle
  const color =
    tone === 'success'
      ? 'text-[var(--theater-ink)]'
      : tone === 'warning'
        ? 'text-[var(--event-ink)]'
        : 'text-[var(--performer-ink)]'

  return (
    <div className="flex items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3">
      <Icon className={`size-5 ${color}`} />
      <p className="font-semibold text-[var(--sea-ink)]">{text}</p>
    </div>
  )
}

function ChoiceCard({
  icon,
  text,
  title,
}: {
  icon: React.ReactNode
  text: string
  title: string
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-6 py-6 transition hover:-translate-y-0.5">
      <div className="text-[var(--performer)]">{icon}</div>
      <h3 className="mt-4 text-2xl font-extrabold text-[var(--sea-ink)]">
        {title}
      </h3>
      <p className="mt-3 leading-7 text-[var(--sea-ink-soft)]">{text}</p>
    </div>
  )
}
