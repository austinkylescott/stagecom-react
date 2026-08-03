begin;

select plan(19);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('76000000-0000-0000-0000-000000000001', 'completion-owner@stagecom.local', '{"full_name":"Completion Owner"}'),
  ('76000000-0000-0000-0000-000000000002', 'completion-member@stagecom.local', '{"full_name":"Completion Member"}');

select * from public.create_theater_with_owner(
  '76000000-0000-0000-0000-000000000001',
  'Completion Theater',
  'completion-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, '76000000-0000-0000-0000-000000000002',
  array['member']::public.theater_role[], 'active'::public.membership_status
from public.theaters where slug = 'completion-theater';

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'completion-theater'),
  '76000000-0000-0000-0000-000000000001',
  'Owner Completed Event',
  'owner-completed-event',
  array[]::uuid[],
  null
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'owner-completed-event'),
  '76000000-0000-0000-0000-000000000001',
  1,
  1,
  jsonb_build_array(
    jsonb_build_object(
      'id', '76000000-0000-0000-0001-000000000001',
      'type', 'rehearsal',
      'visibility', 'internal',
      'position', 0,
      'confirmedCandidateSlotId', '76000000-0000-0000-0002-000000000001',
      'candidateSlots', jsonb_build_array(jsonb_build_object(
        'id', '76000000-0000-0000-0002-000000000001',
        'startsAt', '2026-10-10T20:00:00Z',
        'durationMinutes', 60,
        'localStartsAt', '2026-10-10T16:00',
        'timezoneName', 'America/New_York',
        'timezoneSource', 'manual',
        'utcOffsetMinutes', -240,
        'locationKind', 'off_site',
        'locationName', 'Rehearsal Room',
        'offSiteApproved', true,
        'position', 0
      ))
    ),
    jsonb_build_object(
      'id', '76000000-0000-0000-0001-000000000002',
      'type', 'performance',
      'visibility', 'public',
      'position', 1,
      'confirmedCandidateSlotId', '76000000-0000-0000-0002-000000000002',
      'candidateSlots', jsonb_build_array(jsonb_build_object(
        'id', '76000000-0000-0000-0002-000000000002',
        'startsAt', '2026-10-10T23:30:00Z',
        'durationMinutes', 90,
        'localStartsAt', '2026-10-10T19:30',
        'timezoneName', 'America/New_York',
        'timezoneSource', 'manual',
        'utcOffsetMinutes', -240,
        'locationKind', 'off_site',
        'locationName', 'Completion Stage',
        'offSiteApproved', true,
        'position', 0
      ))
    )
  ),
  '[]'::jsonb
);

insert into public.show_cast (show_id, user_id, source, status)
select id, '76000000-0000-0000-0000-000000000002', 'invited', 'accepted'
from public.shows where slug = 'owner-completed-event';

insert into public.show_proposal_revisions (
  id, show_id, revision_number, decision_state, submitted_by, command_id, snapshot
)
select
  '76000000-0000-0000-0003-000000000001', id, 1, 'approved',
  '76000000-0000-0000-0000-000000000001',
  '76000000-0000-0000-0004-000000000001', '{}'::jsonb
from public.shows where slug = 'owner-completed-event';

insert into public.show_proposal_decisions (
  proposal_revision_id, action, actor_user_id, revision_version, command_id
) values (
  '76000000-0000-0000-0003-000000000001', 'approve',
  '76000000-0000-0000-0000-000000000001', 1,
  '76000000-0000-0000-0004-000000000002'
);

update public.shows
set status = 'approved', is_public_listed = true,
    operational_health = 'at_risk',
    approved_proposal_revision_id = '76000000-0000-0000-0003-000000000001'
where slug = 'owner-completed-event';

select has_function(
  'public', 'complete_event', array['uuid', 'uuid', 'uuid', 'timestamp with time zone'],
  'the authorized completion transition is exposed'
);
select has_function(
  'public', 'complete_due_events', array['timestamp with time zone', 'uuid'],
  'completion has a schedulable maintenance entry point'
);

select throws_ok(
  format(
    'select public.complete_event(%L, %L, %L, %L)',
    (select id from public.shows where slug = 'owner-completed-event'),
    '76000000-0000-0000-0000-000000000002',
    '76000000-0000-0000-0005-000000000001',
    '2026-10-11T01:00:00Z'
  ),
  '42501', null,
  'an ordinary Member cannot complete an Event'
);

select throws_ok(
  format(
    'select public.complete_event(%L, %L, %L, %L)',
    (select id from public.shows where slug = 'owner-completed-event'),
    '76000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0005-000000000002',
    '2026-10-11T00:59:59Z'
  ),
  '55000', null,
  'the Event is ineligible before its final Confirmed Slot ends'
);

select lives_ok(
  format(
    'select public.complete_event(%L, %L, %L, %L)',
    (select id from public.shows where slug = 'owner-completed-event'),
    '76000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0005-000000000003',
    '2026-10-11T01:00:00Z'
  ),
  'the Event completes exactly when its final Confirmed Slot has ended'
);

select results_eq(
  $$ select lifecycle_status::text, completed_at from public.shows where slug = 'owner-completed-event' $$,
  $$ values ('completed'::text, '2026-10-11T01:00:00Z'::timestamptz) $$,
  'completion records the supplied deterministic clock instant'
);

select results_eq(
  $$ select publication_status::text, operational_health::text, approved_proposal_revision_id
     from public.shows where slug = 'owner-completed-event' $$,
  $$ values ('published'::text, 'at_risk'::text, '76000000-0000-0000-0003-000000000001'::uuid) $$,
  'completion preserves Publication, operational health, and Operational Approval'
);

select results_eq(
  $$ select
       (select count(*) from public.show_cast where show_id = show.id),
       (select count(*) from public.show_proposal_revisions where show_id = show.id),
       (select count(*) from public.show_proposal_decisions decision
          join public.show_proposal_revisions revision on revision.id = decision.proposal_revision_id
          where revision.show_id = show.id)
     from public.shows show where slug = 'owner-completed-event' $$,
  $$ values (1::bigint, 1::bigint, 1::bigint) $$,
  'completion preserves cast and decision history'
);

select results_eq(
  $$ select count(*), (array_agg(actor_user_id))[1]
     from public.activity_events
     where entity_id = (select id from public.shows where slug = 'owner-completed-event')
       and action = 'event.completed' $$,
  $$ values (1::bigint, '76000000-0000-0000-0000-000000000001'::uuid) $$,
  'completion emits one factual domain event with the authorized actor'
);

select is(
  (select payload ->> 'finalConfirmedSlotEndsAt'
   from public.activity_events
   where entity_id = (select id from public.shows where slug = 'owner-completed-event')
     and action = 'event.completed'),
  '2026-10-11T01:00:00+00:00',
  'the completion fact records the canonical final-slot end instant'
);

select lives_ok(
  format(
    'select public.complete_event(%L, %L, %L, %L)',
    (select id from public.shows where slug = 'owner-completed-event'),
    '76000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0000-000000000001',
    '2026-10-11T02:00:00Z'
  ),
  'repeating completion is safe even with a different command identity'
);

select results_eq(
  $$ select completed_at,
       (select count(*) from public.activity_events
        where entity_id = show.id and action = 'event.completed')
     from public.shows show where slug = 'owner-completed-event' $$,
  $$ values ('2026-10-11T01:00:00Z'::timestamptz, 1::bigint) $$,
  'retries preserve one logical state change and domain event'
);

select results_eq(
  $$ select local_starts_at, timezone_name, utc_offset_minutes
     from public.show_candidate_slots
     where id = '76000000-0000-0000-0002-000000000002' $$,
  $$ values ('2026-10-10T19:30'::timestamp, 'America/New_York'::text, -240::integer) $$,
  'completion preserves Theater-local display provenance alongside the canonical instant'
);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'completion-theater'),
  '76000000-0000-0000-0000-000000000001',
  'Maintenance Completed Event',
  'maintenance-completed-event',
  array[]::uuid[], null
);
select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'maintenance-completed-event'),
  '76000000-0000-0000-0000-000000000001', 1, 1,
  jsonb_build_array(jsonb_build_object(
    'id', '76000000-0000-0000-0001-000000000003', 'type', 'performance',
    'visibility', 'public', 'position', 0,
    'confirmedCandidateSlotId', '76000000-0000-0000-0002-000000000003',
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '76000000-0000-0000-0002-000000000003',
      'startsAt', '2026-11-01T00:00:00Z', 'durationMinutes', 60,
      'localStartsAt', '2026-10-31T20:00', 'timezoneName', 'America/New_York',
      'timezoneSource', 'manual', 'utcOffsetMinutes', -240,
      'locationKind', 'off_site', 'locationName', 'Maintenance Stage',
      'offSiteApproved', true, 'position', 0
    ))
  )), '[]'::jsonb
);
update public.shows set status = 'approved'
where slug = 'maintenance-completed-event';

select is(
  public.complete_due_events('2026-11-01T00:59:59Z', null), 0,
  'maintenance does not complete the Event before the final end instant'
);
select is(
  public.complete_due_events('2026-11-01T01:00:00Z', null), 1,
  'maintenance completes the Event at the final end instant'
);
select is(
  (select lifecycle_status::text from public.shows where slug = 'maintenance-completed-event'),
  'completed',
  'maintenance uses the same completion transition'
);
select is(
  public.complete_due_events('2026-11-01T02:00:00Z', null), 0,
  'maintenance completion is repeatable'
);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'completion-theater'),
  '76000000-0000-0000-0000-000000000001',
  'No Confirmed Slot Event', 'no-confirmed-slot-event', array[]::uuid[], null
);
update public.shows set status = 'approved' where slug = 'no-confirmed-slot-event';
select throws_ok(
  format(
    'select public.complete_event(%L, %L, %L, %L)',
    (select id from public.shows where slug = 'no-confirmed-slot-event'),
    '76000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0005-000000000004',
    '2027-01-01T00:00:00Z'
  ),
  '55000', null,
  'an approved Event without a Confirmed Slot is ineligible'
);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'completion-theater'),
  '76000000-0000-0000-0000-000000000001',
  'Cancelled Event', 'cancelled-event', array[]::uuid[], null
);
update public.shows set status = 'cancelled' where slug = 'cancelled-event';
select throws_ok(
  format(
    'select public.complete_event(%L, %L, %L, %L)',
    (select id from public.shows where slug = 'cancelled-event'),
    '76000000-0000-0000-0000-000000000001',
    '76000000-0000-0000-0005-000000000005',
    '2027-01-01T00:00:00Z'
  ),
  '55000', null,
  'a cancelled Event cannot be completed'
);

select * from finish();
rollback;
