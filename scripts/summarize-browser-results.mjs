import { appendFileSync, readFileSync } from 'node:fs'

const purposes = {
  'acceptance.spec.ts':
    'Authentication, onboarding and governed Theater invitations',
  'availability-polls.spec.ts':
    'Explicit Cast availability and authorized poll responses',
  'callsheet-workspace.spec.ts':
    'Personal commitments and role-appropriate workspace entry',
  'event-cancellation.spec.ts':
    'Cancellation, resource release and recoverable automatic completion',
  'event-cast-invitations.spec.ts':
    'Consented Cast invitations, private disclosure and atomic batches',
  'event-portfolio.spec.ts': 'Event filtering within authorized Theater scope',
  'event-publication-milestone.spec.ts':
    'One complete multi-person Event from creation to public admission',
  'home.spec.ts': 'Public homepage and unauthenticated route protection',
  'managed-event-governance.spec.ts':
    'Operator control of Producer eligibility and explicit Event roles',
  'neutral-review-journey.spec.ts':
    'Cross-workspace navigation, roles, viewports and recoverable Notifications',
  'planning-confirmations.spec.ts':
    'Persistent planning, Review and atomic replacement',
  'proposal-revisions.spec.ts':
    'Immutable Review, Counteroffers, Cast loss and Member deactivation',
  'public-programming.spec.ts':
    'Anonymous publication boundaries and sign-in return context',
  'reusable-join-links.spec.ts':
    'Revocation, exhaustion and exactly-once membership acceptance',
  'team-authority.spec.ts':
    'Consented Team authority and accountable ownership recovery',
  'teams.spec.ts':
    'Independent Team membership, invitations and departure races',
  'theater-calendar.spec.ts':
    'Persistent Calendar periods, private disclosure and Event return context',
  'theater-navigation.spec.ts':
    'Recognizable Theater and Event destinations for each role',
}
const report = JSON.parse(
  readFileSync('playwright-report/results.json', 'utf8'),
)
const rows = []
const text = (value) =>
  String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
function walk(suite) {
  for (const spec of suite.specs ?? []) {
    const file = spec.file.split('/').at(-1)
    for (const test of spec.tests) {
      const result = test.results.at(-1)
      rows.push(
        `| ${text(spec.title)} | ${text(purposes[file] ?? file)} | ${result?.status ?? test.status} | ${((result?.duration ?? 0) / 1000).toFixed(1)}s |`,
      )
    }
  }
  for (const child of suite.suites ?? []) walk(child)
}
for (const suite of report.suites) walk(suite)
const { expected, unexpected, skipped, flaky, duration } = report.stats
const summary = `## Browser verification\n\n${expected} passed; ${unexpected} failed; ${skipped} skipped; ${flaky} flaky. Browser time: ${(duration / 1000).toFixed(1)}s.\n\n| What was checked | Why it matters | Result | Time |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
else console.log(summary)
