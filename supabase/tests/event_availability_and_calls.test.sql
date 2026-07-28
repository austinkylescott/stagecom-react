begin;

select plan(24);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('72000000-0000-0000-0000-000000000001', 'availability-owner@stagecom.local', '{"full_name":"Availability Owner"}'),
  ('72000000-0000-0000-0000-000000000002', 'availability-director@stagecom.local', '{"full_name":"Availability Director"}'),
  ('72000000-0000-0000-0000-000000000003', 'availability-member@stagecom.local', '{"full_name":"Availability Member"}'),
  ('72000000-0000-0000-0000-000000000004', 'availability-pending@stagecom.local', '{"full_name":"Pending Availability Member"}');

select * from public.create_theater_with_owner(
  '72000000-0000-0000-0000-000000000001',
  'Availability Theater',
  'availability-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select
  (select id from public.theaters where slug = 'availability-theater'),
  user_id,
  array['member']::public.theater_role[],
  'active'::public.membership_status
from unnest(array[
  '72000000-0000-0000-0000-000000000002'::uuid,
  '72000000-0000-0000-0000-000000000003'::uuid,
  '72000000-0000-0000-0000-000000000004'::uuid
]) as member(user_id);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'availability-theater'),
  '72000000-0000-0000-0000-000000000001',
  'Availability Event',
  'availability-event',
  array[]::uuid[],
  '72000000-0000-0000-0000-000000000002'
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'availability-event'),
  '72000000-0000-0000-0000-000000000001',
  2,
  1,
  jsonb_build_array(jsonb_build_object(
    'id', '72000000-0000-0000-0001-000000000001',
    'type', 'performance',
    'visibility', 'public',
    'position', 0,
    'confirmedCandidateSlotId', null,
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '72000000-0000-0000-0002-000000000001',
      'startsAt', '2026-09-10T23:30:00.000Z',
      'durationMinutes', 90,
      'localStartsAt', '2026-09-10T19:30',
      'timezoneName', 'America/New_York',
      'timezoneSource', 'manual',
      'utcOffsetMinutes', -240,
      'locationKind', 'off_site',
      'locationName', 'Community Hall',
      'offSiteApproved', true,
      'position', 0
    ))
  )),
  '[]'::jsonb
);

select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'availability-event'),
  '72000000-0000-0000-0000-000000000002',
  '72000000-0000-0000-0000-000000000003'
);

select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'availability-event'),
  '72000000-0000-0000-0000-000000000002',
  '72000000-0000-0000-0000-000000000004'
);

select lives_ok(
  $$
    select * from public.record_candidate_slot_availability(
      '72000000-0000-0000-0002-000000000001',
      '72000000-0000-0000-0000-000000000003',
      'available',
      '72000000-0000-0000-0003-000000000001',
      null
    )
  $$,
  'a pending invited Member records availability independently'
);

select is(
  (
    select status::text
    from public.show_cast
    where show_id = (select id from public.shows where slug = 'availability-event')
      and user_id = '72000000-0000-0000-0000-000000000003'
  ),
  'pending',
  'slot availability never accepts Event participation'
);

select results_eq(
  $$
    select response::text, actor_user_id, version
    from public.show_availability_responses
    where candidate_slot_id = '72000000-0000-0000-0002-000000000001'
  $$,
  $$ values ('available'::text, '72000000-0000-0000-0000-000000000003'::uuid, 1) $$,
  'availability stores one response with its actor and version'
);

select is(
  (
    select count(*)
    from public.activity_events
    where id = '72000000-0000-0000-0003-000000000001'
      and action = 'event.availability.responded'
  ),
  1::bigint,
  'availability emits one durable domain event using the command identity'
);

select lives_ok(
  $$
    select * from public.record_candidate_slot_availability(
      '72000000-0000-0000-0002-000000000001',
      '72000000-0000-0000-0000-000000000003',
      'available',
      '72000000-0000-0000-0003-000000000001',
      null
    )
  $$,
  'retrying the same availability command is idempotent'
);

select is(
  (
    select count(*)
    from public.activity_events
    where entity_id = (select id from public.shows where slug = 'availability-event')
      and action = 'event.availability.responded'
  ),
  1::bigint,
  'an availability retry does not duplicate its domain event'
);

select lives_ok(
  $$
    select * from public.record_candidate_slot_availability(
      '72000000-0000-0000-0002-000000000001',
      '72000000-0000-0000-0000-000000000003',
      'uncertain',
      '72000000-0000-0000-0003-000000000002',
      1
    )
  $$,
  'the invited Member can revise current availability'
);

select results_eq(
  $$
    select response::text, version
    from public.show_availability_responses
    where candidate_slot_id = '72000000-0000-0000-0002-000000000001'
      and user_id = '72000000-0000-0000-0000-000000000003'
  $$,
  $$ values ('uncertain'::text, 2) $$,
  'a revision replaces the one response and advances its version'
);

select is(
  (
    select count(*)
    from public.activity_events
    where entity_id = (select id from public.shows where slug = 'availability-event')
      and action = 'event.availability.responded'
  ),
  2::bigint,
  'each logical Availability Response change emits one event'
);

select throws_ok(
  $$
    select * from public.record_candidate_slot_availability(
      '72000000-0000-0000-0002-000000000001',
      '72000000-0000-0000-0000-000000000003',
      'unavailable',
      '72000000-0000-0000-0003-000000000003',
      1
    )
  $$,
  '55000',
  'Availability Response has changed. Reload before saving again.',
  'a stale availability revision returns a conflict instead of overwriting'
);

select lives_ok(
  $$
    select * from public.respond_to_event_cast_invitation(
      (select id from public.shows where slug = 'availability-event'),
      '72000000-0000-0000-0000-000000000003',
      'accepted'
    )
  $$,
  'the Member separately accepts Event participation'
);

select is(
  (
    select response::text
    from public.show_availability_responses
    where candidate_slot_id = '72000000-0000-0000-0002-000000000001'
      and user_id = '72000000-0000-0000-0000-000000000003'
  ),
  'uncertain',
  'participation acceptance does not change existing availability'
);

select lives_ok(
  $$
    select * from public.set_occurrence_call(
      '72000000-0000-0000-0001-000000000001',
      '72000000-0000-0000-0000-000000000003',
      '72000000-0000-0000-0000-000000000002',
      'required',
      '72000000-0000-0000-0004-000000000001',
      null
    )
  $$,
  'the Director assigns a required Occurrence Call to accepted Cast'
);

select results_eq(
  $$
    select call::text, actor_user_id, version
    from public.show_occurrence_calls
    where occurrence_id = '72000000-0000-0000-0001-000000000001'
      and user_id = '72000000-0000-0000-0000-000000000003'
  $$,
  $$ values ('required'::text, '72000000-0000-0000-0000-000000000002'::uuid, 1) $$,
  'required calls are distinguishable and retain actor and version facts'
);

select lives_ok(
  $$
    select * from public.set_occurrence_call(
      '72000000-0000-0000-0001-000000000001',
      '72000000-0000-0000-0000-000000000003',
      '72000000-0000-0000-0000-000000000002',
      'required',
      '72000000-0000-0000-0004-000000000001',
      null
    )
  $$,
  'retrying the same Occurrence Call command is idempotent'
);

select is(
  (
    select count(*)
    from public.activity_events
    where entity_id = (select id from public.shows where slug = 'availability-event')
      and action = 'event.occurrence_call.assigned'
  ),
  1::bigint,
  'an Occurrence Call retry does not duplicate its domain event'
);

select lives_ok(
  $$
    select * from public.set_occurrence_call(
      '72000000-0000-0000-0001-000000000001',
      '72000000-0000-0000-0000-000000000003',
      '72000000-0000-0000-0000-000000000002',
      'optional',
      '72000000-0000-0000-0004-000000000002',
      1
    )
  $$,
  'the Director can revise an Occurrence Call'
);

select results_eq(
  $$
    select call::text, version
    from public.show_occurrence_calls
    where occurrence_id = '72000000-0000-0000-0001-000000000001'
      and user_id = '72000000-0000-0000-0000-000000000003'
  $$,
  $$ values ('optional'::text, 2) $$,
  'optional calls remain distinguishable from required calls'
);

select throws_ok(
  $$
    select * from public.set_occurrence_call(
      '72000000-0000-0000-0001-000000000001',
      '72000000-0000-0000-0000-000000000003',
      '72000000-0000-0000-0000-000000000002',
      'not_called',
      '72000000-0000-0000-0004-000000000003',
      1
    )
  $$,
  '55000',
  'Occurrence Call has changed. Reload before saving again.',
  'a stale Occurrence Call edit returns a conflict'
);

select throws_ok(
  $$
    select * from public.set_occurrence_call(
      '72000000-0000-0000-0001-000000000001',
      '72000000-0000-0000-0000-000000000003',
      '72000000-0000-0000-0000-000000000001',
      'required',
      '72000000-0000-0000-0004-000000000004',
      2
    )
  $$,
  '42501',
  'Active Event Director access is required to assign Occurrence Calls.',
  'a Producer who is not the Director cannot assign Occurrence Calls'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000004';

select is(
  (select count(*) from public.show_availability_responses),
  0::bigint,
  'a pending invitee cannot see another Member availability'
);

select is(
  (select count(*) from public.show_occurrence_calls),
  0::bigint,
  'a pending invitee cannot see Occurrence Calls'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000003';

select is(
  (select count(*) from public.show_availability_responses),
  1::bigint,
  'an accepted Cast Member sees the collaborative availability matrix'
);

select is(
  (select count(*) from public.show_occurrence_calls),
  1::bigint,
  'an accepted Cast Member sees Occurrence Calls'
);

reset role;

select * from finish();
rollback;
