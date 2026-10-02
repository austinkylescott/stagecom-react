# Availability poll approval packet (STA-69)

The local implementation is ready for maintainer presentation review. Standards
and Spec reviews have no outstanding findings, including the final delivery delta.

## Walkthrough

Open <http://localhost:3100/login>. The preview is running against local Supabase.
The owned demo dataset contains one open poll with two options and two respondents.
Parker Producer has submitted Available / Uncertain. Morgan Member has saved only
an Available answer for the first option as a private draft.

1. Choose **Event Producer**, open **A Midsummer Night's Dream**, then **Cast &
   Team**. Review the option selection, fixed-poll explanation, named responses,
   missing response and totals. Option selection and the open poll both use the
   Theater time zone (America/New_York).
2. In a separate browser session choose **Theater Member**. Callsheet has
   **Respond to availability poll** alongside the existing confirmed Call. Follow
   the action; Morgan's private draft is restored, while comparison still says
   Morgan has not submitted.
3. Answer the second option and submit. Return to Callsheet: the poll action is
   cleared and the confirmed Call remains. Resubmit from the Event, then inspect
   the new submitted answers as Producer after reloading.
4. As Producer, close the poll explicitly. Member controls become disabled after
   refresh; submitted history remains. To try replacement instead, select options
   and respondents in the replacement form while the poll is still open.

These are disposable local demo records. `npm run demo:seed` restores the initial
story and clears only owned demo polls. The walkthrough mutates those records;
reload the other session to inspect committed changes.

## Captured presentation

Desktop leader view at a 1280px viewport:

![Leader poll selection and comparison](availability-poll-evidence/leader-1280.png)

Member private draft at a 390px viewport with mobile/touch browser emulation:

![Member private draft](availability-poll-evidence/member-390.png)

Member Callsheet at a 390px viewport:

![Poll action and confirmed Call](availability-poll-evidence/callsheet-390.png)

Screenshots were visually inspected. Automated checks cover 360/390/1280px widths,
keyboard focus and activation, recovery and persistence. They do not establish
physical-device software-keyboard behavior or substitute for your presentation
approval. Branding remains a separate later gate.

## Remote integration plan

Read-only Supabase inspection identified hosted project **stagecom**
(`obufimjayisdhkjjxhfd`). Its 60 migration version/name entries match the repository
exactly; no remote-only entries exist. This verifies migration history, not the
absence of out-of-band schema edits. Supabase Preview on PR #65 was skipped and
there is no separate PR preview branch.

The maintainer explicitly approved remote application. The Supabase CLI dry run
confirmed `20261001221258_availability_polls.sql` was the only pending migration,
and `db push --linked --yes` applied that exact committed file successfully on
2026-10-02 UTC. The history entry retains version `20261001221258` and name
`availability_polls`.

Post-application verification confirmed:

- All four poll tables have RLS; the three authenticated SELECT policies match
  the committed authorization and private-draft rules. The command receipts
  table intentionally has no client policy.
- All seven poll functions use an empty search path, deny `anon` execution, and
  grant execution to `authenticated` for application-authorized operations.
- The partial unique index enforces one open poll per Occurrence, the Occurrence
  foreign key restricts deletion to protect history, and the NULL-answer guard
  is installed.
- An unrelated authenticated identity gets no polls, no Callsheet actions, no
  direct response rows and no respondent eligibility in a rolled-back read probe.
- Hosted public-schema generated types match the committed public-schema types
  structurally. Generator-only PostgREST metadata and the excluded GraphQL schema
  are not application-schema differences.

The security advisor reports seven intentional
[authenticated SECURITY DEFINER APIs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
and one informational
[RLS-without-policy notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
for default-deny command receipts. Existing notices (public extensions, 36
anonymous SECURITY DEFINER functions, leaked-password protection) were present
before this migration and remain outside STA-69. See Supabase's
[extension guidance](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[anonymous-function guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The database integration is complete. Application deployment and an authorized
hosted browser smoke test remain part of the normal release process; they were
not included in the migration approval. No remote seed was run. The discovered
project has not been established as a dedicated disposable demo target.

The application code can be rolled back while retaining new tables and submitted
history; do not drop those tables as an application rollback.
