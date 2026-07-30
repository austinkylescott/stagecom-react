begin;

select plan(31);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('74000000-0000-0000-0000-000000000001', 'counteroffer-owner@stagecom.local', '{"full_name":"Counteroffer Owner"}'),
  ('74000000-0000-0000-0000-000000000002', 'counteroffer-director@stagecom.local', '{"full_name":"Counteroffer Director"}'),
  ('74000000-0000-0000-0000-000000000003', 'counteroffer-cast@stagecom.local', '{"full_name":"Counteroffer Cast"}'),
  ('74000000-0000-0000-0000-000000000004', 'counteroffer-reviewer@stagecom.local', '{"full_name":"Counteroffer Reviewer"}');

select * from public.create_theater_with_owner(
  '74000000-0000-0000-0000-000000000001',
  'Counteroffer Theater',
  'counteroffer-theater',
  'America/New_York'
);

update public.theaters
set setup_buffer_minutes = 30,
    turnover_buffer_minutes = 30,
    primary_venue_name = 'Counteroffer Stage'
where slug = 'counteroffer-theater';

insert into public.theater_memberships (theater_id, user_id, roles, status)
select
  (select id from public.theaters where slug = 'counteroffer-theater'),
  user_id,
  array['member']::public.theater_role[],
  'active'::public.membership_status
from unnest(array[
  '74000000-0000-0000-0000-000000000002'::uuid,
  '74000000-0000-0000-0000-000000000003'::uuid,
  '74000000-0000-0000-0000-000000000004'::uuid
]) as member(user_id);

insert into public.theater_member_capabilities (theater_id, user_id, capability, granted_by_user_id)
select id, '74000000-0000-0000-0000-000000000004', 'reviewer',
  '74000000-0000-0000-0000-000000000001'
from public.theaters where slug = 'counteroffer-theater';

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'counteroffer-theater'),
  '74000000-0000-0000-0000-000000000001',
  'Counteroffer Event',
  'counteroffer-event',
  array[]::uuid[],
  '74000000-0000-0000-0000-000000000002'
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'counteroffer-event'),
  '74000000-0000-0000-0000-000000000001',
  1,
  1,
  jsonb_build_array(jsonb_build_object(
    'id', '74000000-0000-0000-0001-000000000001',
    'type', 'performance',
    'visibility', 'public',
    'position', 0,
    'confirmedCandidateSlotId', '74000000-0000-0000-0002-000000000001',
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '74000000-0000-0000-0002-000000000001',
      'startsAt', '2026-10-10T23:30:00.000Z',
      'durationMinutes', 90,
      'localStartsAt', '2026-10-10T19:30',
      'timezoneName', 'America/New_York',
      'timezoneSource', 'manual',
      'utcOffsetMinutes', -240,
      'locationKind', 'primary_venue',
      'resourceId', (select primary_venue_id from public.theaters where slug = 'counteroffer-theater'),
      'locationName', 'Counteroffer Stage',
      'offSiteApproved', false,
      'position', 0
    ))
  )),
  '[]'::jsonb
);

select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'counteroffer-event'),
  '74000000-0000-0000-0000-000000000002',
  '74000000-0000-0000-0000-000000000003'
);
select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'counteroffer-event'),
  '74000000-0000-0000-0000-000000000003',
  'accepted'
);
select * from public.save_event_proposed_cast(
  (select id from public.shows where slug = 'counteroffer-event'),
  '74000000-0000-0000-0000-000000000001',
  array['74000000-0000-0000-0000-000000000003']::uuid[],
  '74000000-0000-0000-0006-000000000001'
);
select * from public.set_occurrence_call(
  '74000000-0000-0000-0001-000000000001',
  '74000000-0000-0000-0000-000000000003',
  '74000000-0000-0000-0000-000000000002',
  'required',
  '74000000-0000-0000-0007-000000000001',
  null
);
select * from public.record_candidate_slot_availability(
  '74000000-0000-0000-0002-000000000001',
  '74000000-0000-0000-0000-000000000003',
  'available',
  '74000000-0000-0000-0008-000000000001',
  null
);
select * from public.submit_event_proposal_revision(
  (select id from public.shows where slug = 'counteroffer-event'),
  '74000000-0000-0000-0000-000000000001',
  '74000000-0000-0000-0009-000000000001'
);

select lives_ok(
  format(
    'select public.issue_proposal_counteroffer(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
    (select id from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'counteroffer-event')),
    '74000000-0000-0000-0001-000000000001',
    '74000000-0000-0000-0000-000000000004',
    '2026-10-12T23:30:00Z', 90, '2026-10-12T19:30', 'America/New_York',
    'manual', -240, 'primary_venue', 'Counteroffer Stage',
    '74000000-0000-0000-0011-000000000001', 1, null
  ),
  'a Reviewer issues one exact Counteroffer using the default deadline'
);

select is(
  (select response_deadline from public.show_counteroffers where command_id = '74000000-0000-0000-0011-000000000001'),
  transaction_timestamp() + interval '72 hours',
  'the Theater default response window determines the deadline'
);

select results_eq(
  $$ select state::text, actor_user_id, occurrence_id
     from public.show_counteroffers
     where command_id = '74000000-0000-0000-0011-000000000001' $$,
  $$ values ('pending'::text, '74000000-0000-0000-0000-000000000004'::uuid,
     '74000000-0000-0000-0001-000000000001'::uuid) $$,
  'the Counteroffer identifies its author and target Occurrence'
);

select is(
  (select decision_state::text from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'counteroffer-event')),
  'counteroffered',
  'issuing the Counteroffer records the target revision state'
);

select is(
  (select count(*) from public.show_schedule_reservations where status = 'active'),
  1::bigint,
  'a Primary Venue Counteroffer acquires one active hold'
);

select is(
  (select count(*) from public.show_availability_requests),
  1::bigint,
  'the unevaluated offered slot requests availability from the entire Proposed Cast'
);

select is(
  (select count(*) from public.notifications where type = 'event.counteroffer.availability_requested'),
  1::bigint,
  'the availability request projects one in-app notification'
);

select is(
  (select count(*) from public.activity_events where action = 'event.proposal_counteroffer.issued'),
  1::bigint,
  'Counteroffer creation emits one durable domain event'
);

select throws_ok(
  format(
    'select public.respond_to_proposal_counteroffer(%L, %L, %L, %L, %L)',
    (select id from public.show_counteroffers where command_id = '74000000-0000-0000-0011-000000000001'),
    '74000000-0000-0000-0000-000000000001', 'accept',
    '74000000-0000-0000-0011-000000000002', '2026-07-29T18:00:00Z'
  ),
  '22023',
  'Counteroffer acceptance is blocked.',
  'acceptance waits for required participation and Minimum Viable Cast'
);

select * from public.record_candidate_slot_availability(
  (select candidate_slot_id from public.show_counteroffers where command_id = '74000000-0000-0000-0011-000000000001'),
  '74000000-0000-0000-0000-000000000003',
  'available',
  '74000000-0000-0000-0011-000000000003',
  null
);

select lives_ok(
  format(
    'select public.respond_to_proposal_counteroffer(%L, %L, %L, %L, %L)',
    (select id from public.show_counteroffers where command_id = '74000000-0000-0000-0011-000000000001'),
    '74000000-0000-0000-0000-000000000001', 'accept',
    '74000000-0000-0000-0011-000000000004', '2026-07-29T18:00:00Z'
  ),
  'a Producer explicitly accepts a viable Counteroffer'
);

select is(
  (select state::text from public.show_counteroffers where command_id = '74000000-0000-0000-0011-000000000001'),
  'accepted',
  'acceptance explicitly ends the offer'
);

select is(
  (select count(*) from public.show_schedule_reservations where status = 'active'),
  0::bigint,
  'acceptance releases the temporary hold'
);

select results_eq(
  $$ select revision_number, decision_state::text
     from public.show_proposal_revisions
     where show_id = (select id from public.shows where slug = 'counteroffer-event')
     order by revision_number $$,
  $$ values (1, 'counteroffered'::text), (2, 'pending'::text) $$,
  'acceptance preserves the target revision and submits a new pending revision'
);

select is(
  (select confirmed_candidate_slot_id from public.show_occurrences where id = '74000000-0000-0000-0001-000000000001'),
  (select candidate_slot_id from public.show_counteroffers where command_id = '74000000-0000-0000-0011-000000000001'),
  'acceptance updates the working plan to the offered slot'
);

select is(
  (select lifecycle_status::text from public.shows where slug = 'counteroffer-event'),
  'in_review',
  'Counteroffer acceptance neither approves nor publishes the Event'
);

select lives_ok(
  format(
    'select public.review_proposal_revision(%L, %L, %L, %L, %L, %L, %L)',
    (select id from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'counteroffer-event') and revision_number = 2),
    '74000000-0000-0000-0000-000000000004', 'approve', '', false,
    '74000000-0000-0000-0011-000000000005', 1
  ),
  'the new Proposal Revision can receive a separate Operational Approval'
);

select is(
  (select count(*) from public.show_schedule_reservations where status = 'active' and kind = 'approved_commitment'),
  1::bigint,
  'approval acquires one exclusive Primary Venue commitment'
);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'counteroffer-theater'),
  '74000000-0000-0000-0000-000000000001',
  'Competing Event',
  'competing-counteroffer-event',
  array[]::uuid[],
  '74000000-0000-0000-0000-000000000002'
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'competing-counteroffer-event'),
  '74000000-0000-0000-0000-000000000001',
  1, 1,
  jsonb_build_array(jsonb_build_object(
    'id', '74000000-0000-0000-0001-000000000002',
    'type', 'performance', 'visibility', 'public', 'position', 0,
    'confirmedCandidateSlotId', '74000000-0000-0000-0002-000000000002',
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '74000000-0000-0000-0002-000000000002',
      'startsAt', '2026-10-20T23:30:00Z', 'durationMinutes', 90,
      'localStartsAt', '2026-10-20T19:30', 'timezoneName', 'America/New_York',
      'timezoneSource', 'manual', 'utcOffsetMinutes', -240,
      'locationKind', 'off_site', 'resourceId', null,
      'locationName', 'Community Hall', 'offSiteApproved', true, 'position', 0
    ))
  )),
  '[]'::jsonb
);
select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'competing-counteroffer-event'),
  '74000000-0000-0000-0000-000000000002',
  '74000000-0000-0000-0000-000000000003'
);
select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'competing-counteroffer-event'),
  '74000000-0000-0000-0000-000000000003', 'accepted'
);
select * from public.save_event_proposed_cast(
  (select id from public.shows where slug = 'competing-counteroffer-event'),
  '74000000-0000-0000-0000-000000000001',
  array['74000000-0000-0000-0000-000000000003']::uuid[],
  '74000000-0000-0000-0012-000000000001'
);
select * from public.set_occurrence_call(
  '74000000-0000-0000-0001-000000000002',
  '74000000-0000-0000-0000-000000000003',
  '74000000-0000-0000-0000-000000000002', 'required',
  '74000000-0000-0000-0012-000000000002', null
);
select * from public.record_candidate_slot_availability(
  '74000000-0000-0000-0002-000000000002',
  '74000000-0000-0000-0000-000000000003', 'available',
  '74000000-0000-0000-0012-000000000003', null
);
select * from public.submit_event_proposal_revision(
  (select id from public.shows where slug = 'competing-counteroffer-event'),
  '74000000-0000-0000-0000-000000000001',
  '74000000-0000-0000-0012-000000000004'
);

select throws_ok(
  format(
    'select public.issue_proposal_counteroffer(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
    (select id from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'competing-counteroffer-event')),
    '74000000-0000-0000-0001-000000000002',
    '74000000-0000-0000-0000-000000000004',
    '2026-10-13T00:00:00Z', 60, '2026-10-12T20:00', 'America/New_York',
    'manual', -240, 'primary_venue', 'Counteroffer Stage',
    '74000000-0000-0000-0012-000000000005', 1, null, '2026-07-29T18:00:00Z'
  ),
  '55000',
  'The Primary Venue is already reserved during this buffered time.',
  'an approved buffered Primary Venue commitment rejects a competing hold'
);

select lives_ok(
  format(
    'select public.issue_proposal_counteroffer(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
    (select id from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'competing-counteroffer-event')),
    '74000000-0000-0000-0001-000000000002',
    '74000000-0000-0000-0000-000000000004',
    '2026-10-13T00:00:00Z', 60, '2026-10-12T20:00', 'America/New_York',
    'manual', -240, 'off_site', 'Community Hall',
    '74000000-0000-0000-0012-000000000006', 1, '2026-07-31T18:00:00Z', '2026-07-29T18:00:00Z'
  ),
  'an off-site Counteroffer does not reserve the Primary Venue'
);

select is(
  (select response_deadline from public.show_counteroffers where command_id = '74000000-0000-0000-0012-000000000006'),
  '2026-07-31T18:00:00Z'::timestamptz,
  'a Reviewer may explicitly override the response deadline'
);

select is(
  (select count(*) from public.show_schedule_reservations where status = 'active'),
  1::bigint,
  'off-site slots add no reservation alongside the approved commitment'
);

select lives_ok(
  format(
    'select public.respond_to_proposal_counteroffer(%L, %L, %L, %L, %L)',
    (select id from public.show_counteroffers where command_id = '74000000-0000-0000-0012-000000000006'),
    '74000000-0000-0000-0000-000000000001', 'decline',
    '74000000-0000-0000-0012-000000000007', '2026-07-30T18:00:00Z'
  ),
  'a Producer explicitly declines a Counteroffer'
);

select is(
  (select decision_state::text from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'competing-counteroffer-event')),
  'pending',
  'decline returns the target Proposal Revision to review'
);

select lives_ok(
  format(
    'select public.issue_proposal_counteroffer(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
    (select id from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'competing-counteroffer-event')),
    '74000000-0000-0000-0001-000000000002',
    '74000000-0000-0000-0000-000000000004',
    '2026-10-20T23:30:00Z', 60, '2026-10-20T19:30', 'America/New_York',
    'manual', -240, 'primary_venue', 'Counteroffer Stage',
    '74000000-0000-0000-0012-000000000008', 3, '2026-07-31T18:00:00Z', '2026-07-30T18:00:00Z'
  ),
  'a later Counteroffer acquires a non-conflicting hold'
);

select lives_ok(
  format(
    'select public.issue_proposal_counteroffer(%L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L, %L)',
    (select id from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'competing-counteroffer-event')),
    '74000000-0000-0000-0001-000000000002',
    '74000000-0000-0000-0000-000000000004',
    '2026-10-21T23:30:00Z', 60, '2026-10-21T19:30', 'America/New_York',
    'manual', -240, 'off_site', 'Community Hall',
    '74000000-0000-0000-0012-000000000009', 5, '2026-08-02T18:00:00Z', '2026-08-01T18:00:00Z'
  ),
  'a normal review action expires an earlier due Counteroffer before continuing'
);

select is(
  (select state::text from public.show_counteroffers where command_id = '74000000-0000-0000-0012-000000000008'),
  'expired',
  'normal actions use the same expiration transition'
);

select is(
  public.expire_proposal_counteroffers('2026-08-03T18:00:00Z', null),
  1,
  'the schedulable maintenance entry point expires one due offer'
);

select is(
  (select state::text from public.show_counteroffers where command_id = '74000000-0000-0000-0012-000000000009'),
  'expired',
  'expiration records expiry rather than a denial'
);

select is(
  (select count(*) from public.show_schedule_reservations where status = 'active' and kind = 'counteroffer_hold'),
  0::bigint,
  'expiration releases the temporary hold'
);

select is(
  (select count(*) from public.activity_events where action = 'event.proposal_revision.denied' and entity_id = (select id from public.shows where slug = 'competing-counteroffer-event')),
  0::bigint,
  'expiration never records a denial'
);

select is(
  public.expire_proposal_counteroffers('2026-08-03T18:00:00Z', null),
  0,
  'expiration is idempotent under a deterministic test clock'
);

select * from finish();
rollback;
