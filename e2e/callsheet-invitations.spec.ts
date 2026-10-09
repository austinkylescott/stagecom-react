import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import type { Database } from '../src/server/db/database.types'
import { waitForReactHandler } from './support/hydration'
import { createInvitationFixture } from '../src/features/callsheet/testing/invitation-fixture'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const local = /^http:\/\/(localhost|127\.0\.0\.1):/.test(
  env.VITE_SUPABASE_URL ?? '',
)
const baseline = process.env.STA77_CAPTURE_BASELINE === '1'

for (const width of [1280, 390]) {
  for (const kind of ['Admin', 'ownership', 'Staff'] as const) {
    test(`${kind} invitee reviews and responds at ${width}px while confirmed Calls persist`, async ({
      page,
    }) => {
      test.skip(!local, 'Disposable fixture writes require local Supabase.')
      const admin = createClient<Database>(
        env.VITE_SUPABASE_URL!,
        env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } },
      )
      const fixture = await createInvitationFixture(admin)
      try {
        const actor = createClient<Database>(
          env.VITE_SUPABASE_URL!,
          env.VITE_SUPABASE_ANON_KEY!,
          { auth: { persistSession: false } },
        )
        const session = await actor.auth.signInWithPassword({
          email: fixture.email,
          password: fixture.password,
        })
        expect(session.error).toBeNull()
        await page.context().addCookies([
          {
            name: 'stagecom-access-token',
            value: session.data.session!.access_token,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
          },
        ])
        await page.setViewportSize({ width, height: 844 })
        await page.goto('/app/callsheet')
        const title =
          kind === 'Admin'
            ? 'Admin authority invitation'
            : kind === 'ownership'
              ? 'Theater ownership transfer'
              : 'Opening Night'
        const invitation = page
          .getByRole('region', { name: 'Response needed' })
          .getByRole('article')
          .filter({ hasText: title })
        const calls = page.getByRole('region', { name: 'Confirmed Calls' })
        await expect(invitation).toBeVisible()
        await expect(calls.getByText('Confirmed Rehearsal Event')).toBeVisible()
        await waitForReactHandler(
          invitation.getByRole('button').first(),
          'onClick',
        )
        if (!baseline) {
          await expect(invitation).toContainText(
            kind === 'Admin'
              ? 'Acceptance grants Admin authority'
              : kind === 'ownership'
                ? 'Acceptance makes you the Theater Owner'
                : 'Acceptance confirms your Event staff responsibility: Front of house',
          )
          await invitation.getByText('Review invitation details').focus()
          await page.keyboard.press('Enter')
          await expect(invitation).toContainText(
            `${kind === 'ownership' ? 'Proposed' : 'Invited'} by Alex Rivera`,
          )
          await expect(invitation).toContainText('Offered:')
          if (kind === 'ownership')
            await expect(invitation).toContainText(
              'former Owner becomes a Theater Member',
            )
          await expect(invitation).not.toContainText('Private operator note')
          await expect(invitation).not.toContainText('Studio')
          // Reviewing is read-only: reload still offers the decision.
          await page.reload()
          await expect(invitation).toBeVisible()
          await waitForReactHandler(
            invitation.getByRole('button').first(),
            'onClick',
          )
          await invitation.getByText('Review invitation details').click()
        }
        await page.screenshot({
          path: `docs/design/sta-77/${baseline ? 'before' : 'after'}-${kind.toLowerCase()}-${width}.png`,
          fullPage: true,
        })
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        if (baseline) return
        const acceptName =
          kind === 'Admin'
            ? 'Accept Admin authority'
            : kind === 'ownership'
              ? 'Accept Theater ownership'
              : 'Accept staff assignment'
        const response = width === 390 ? 'declined' : 'accepted'
        const button = invitation.getByRole('button', {
          name: response === 'accepted' ? acceptName : 'Decline',
          exact: true,
        })
        await waitForReactHandler(button, 'onClick')
        await button.click()
        const subject =
          kind === 'Admin'
            ? 'Admin authority'
            : kind === 'ownership'
              ? 'Theater ownership transfer'
              : 'Event staff assignment'
        await expect(
          page
            .getByRole('status')
            .filter({ hasText: `${subject} ${response}.` }),
        ).toBeVisible()
        await expect(invitation).toHaveCount(0)
        await page.reload()
        await expect(invitation).toHaveCount(0)
        await expect(calls.getByText('Confirmed Rehearsal Event')).toBeVisible()
        // Observe actual authority through the authenticated Theater read.
        const membership = await actor
          .from('theater_memberships')
          .select('roles')
          .eq('theater_id', fixture.theaterId)
          .eq('user_id', fixture.recipientId)
          .single()
        expect(membership.error).toBeNull()
        if (kind !== 'Staff')
          expect(membership.data!.roles).toContain(
            response === 'declined'
              ? 'member'
              : kind === 'Admin'
                ? 'admin'
                : 'owner',
          )
        if (kind === 'Staff' && response === 'accepted') {
          await page.goto(`/app/${fixture.theaterSlug}/events/invited-event`)
          await expect(
            page.getByText('Event staff member', { exact: true }).first(),
          ).toBeVisible()
        }
      } finally {
        await fixture.cleanup()
      }
    })
  }
}

for (const kind of ['Admin', 'ownership', 'Staff'] as const) {
  test(`${kind} stale offer rejects a response and leaves the error actionable`, async ({
    page,
  }) => {
    test.skip(!local || baseline, 'Requires a local Supabase response journey.')
    const admin = createClient<Database>(
      env.VITE_SUPABASE_URL!,
      env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const fixture = await createInvitationFixture(admin)
    try {
      const actor = createClient<Database>(
        env.VITE_SUPABASE_URL!,
        env.VITE_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } },
      )
      const session = await actor.auth.signInWithPassword({
        email: fixture.email,
        password: fixture.password,
      })
      expect(session.error).toBeNull()
      await page.context().addCookies([
        {
          name: 'stagecom-access-token',
          value: session.data.session!.access_token,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          sameSite: 'Lax',
        },
      ])
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto('/app/callsheet')
      const title =
        kind === 'Admin'
          ? 'Admin authority invitation'
          : kind === 'ownership'
            ? 'Theater ownership transfer'
            : 'Opening Night'
      const invitation = page
        .getByRole('region', { name: 'Response needed' })
        .getByRole('article')
        .filter({ hasText: title })
      const accept = invitation.getByRole('button').first()
      await waitForReactHandler(accept, 'onClick')
      // A second session resolves the offer after this page has loaded it.
      const revoked =
        kind === 'Admin'
          ? await admin.rpc('respond_to_theater_admin_invitation', {
              p_actor_user_id: fixture.recipientId,
              p_command_id: crypto.randomUUID(),
              p_invitation_id: fixture.adminInvitation.id,
              p_response: 'declined',
            })
          : kind === 'ownership'
            ? await admin.rpc('respond_to_theater_ownership_transfer', {
                p_actor_user_id: fixture.recipientId,
                p_command_id: crypto.randomUUID(),
                p_transfer_id: fixture.transfer.id,
                p_response: 'declined',
              })
            : await admin.rpc('revoke_event_staff_assignment', {
                p_actor_user_id: fixture.ownerId,
                p_assignment_id: fixture.staffId,
              })
      expect(revoked.error).toBeNull()
      await accept.click()
      await expect(invitation.getByRole('alert')).toBeVisible()
      await expect(accept).toBeEnabled()
      await expect(
        invitation.getByRole('button', { name: 'Decline' }),
      ).toBeEnabled()
      await expect(
        page
          .getByRole('region', { name: 'Confirmed Calls' })
          .getByText('Confirmed Rehearsal Event'),
      ).toBeVisible()
      await page.reload()
      await expect(invitation).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })
}
