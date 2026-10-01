begin;

select plan(26);

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

select set_config('stagecom.test_event_id', (select id::text from public.shows where slug = 'availability-event'), true);

select * from public.save_event_operational_plan(
  current_setting('stagecom.test_event_id')::uuid,
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
  current_setting('stagecom.test_event_id')::uuid,
  '72000000-0000-0000-0000-000000000002',
  '72000000-0000-0000-0000-000000000003'
);

select * from public.invite_event_cast_member(
  current_setting('stagecom.test_event_id')::uuid,
  '72000000-0000-0000-0000-000000000002',
  '72000000-0000-0000-0000-000000000004'
);


select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'availability-event'),
  '72000000-0000-0000-0000-000000000003', 'accepted'
);
set local role authenticated;
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000002';
select lives_ok($$select public.open_availability_poll(
  '72000000-0000-0000-0001-000000000001', array['72000000-0000-0000-0002-000000000001']::uuid[],
  array['72000000-0000-0000-0000-000000000003']::uuid[], '72000000-0000-0000-0004-000000000001')$$,
  'Director opens a poll for selected accepted Cast');
select lives_ok($$select public.open_availability_poll(
  '72000000-0000-0000-0001-000000000001', array['72000000-0000-0000-0002-000000000001']::uuid[],
  array['72000000-0000-0000-0000-000000000003']::uuid[], '72000000-0000-0000-0004-000000000001')$$,
  'opening retry is idempotent');
select throws_ok($$select public.open_availability_poll(
  '72000000-0000-0000-0001-000000000001', array['72000000-0000-0000-0002-000000000001']::uuid[],
  array['72000000-0000-0000-0000-000000000003']::uuid[], '72000000-0000-0000-0004-000000000002')$$,
  '23505', null, 'only one poll can be open per Occurrence');
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000004';
select is(jsonb_array_length(public.get_availability_polls(current_setting('stagecom.test_event_id')::uuid)->'polls'), 0, 'pending invitees cannot read polls');
select throws_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{}', false, 0, '72000000-0000-0000-0005-000000000001')$$,
  '42501', null, 'pending invitees cannot write');
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000003';
select throws_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{}', true, 0, '72000000-0000-0000-0005-000000000002')$$,
  '22023', null, 'incomplete submissions are rejected');
select throws_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{"72000000-0000-0000-0002-000000000001":null}', true, 0, '72000000-0000-0000-0005-000000000099')$$,
  '22023', null, 'JSON null is not an Availability answer');
select lives_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{"72000000-0000-0000-0002-000000000001":"uncertain"}', false, 0, '72000000-0000-0000-0005-000000000003')$$,
  'selected Cast can save a private editing draft');
select is((public.get_availability_polls(current_setting('stagecom.test_event_id')::uuid)#>'{polls,0,respondents,0,submitted}')::text, 'null', 'draft is not a submitted answer');
select lives_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{"72000000-0000-0000-0002-000000000001":"available"}', true, 1, '72000000-0000-0000-0005-000000000004')$$,
  'complete submission is atomic');
select throws_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{"72000000-0000-0000-0002-000000000001":"unavailable"}', true, 1, '72000000-0000-0000-0005-000000000005')$$,
  '55000', null, 'stale resubmission cannot overwrite');
select lives_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{"72000000-0000-0000-0002-000000000001":"unavailable"}', true, 2, '72000000-0000-0000-0005-000000000006')$$,
  'open poll permits resubmission');
select is(public.get_availability_polls(current_setting('stagecom.test_event_id')::uuid)#>>'{polls,0,respondents,0,submitted,72000000-0000-0000-0002-000000000001}', 'unavailable', 'resubmission replaces only the submitted set');
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000002';
select lives_ok($$select public.close_availability_poll('72000000-0000-0000-0004-000000000001', '72000000-0000-0000-0006-000000000001')$$, 'Director explicitly closes poll');
select lives_ok($$select public.close_availability_poll('72000000-0000-0000-0004-000000000001', '72000000-0000-0000-0006-000000000001')$$, 'close retry is safe');
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000003';
select throws_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{"72000000-0000-0000-0002-000000000001":"available"}', true, 3, '72000000-0000-0000-0005-000000000007')$$,
  '55000', null, 'closure before submit rejects edits');
select lives_ok($$select public.save_availability_poll_answers('72000000-0000-0000-0004-000000000001', '{"72000000-0000-0000-0002-000000000001":"unavailable"}', true, 2, '72000000-0000-0000-0005-000000000006')$$,
  'retry of committed submission succeeds after closure');

reset role;
insert into public.show_staff_assignments(show_id, user_id, assignment_type, status, responsibility)
select id, '72000000-0000-0000-0000-000000000004', 'tech', 'accepted', 'Sound' from public.shows where slug = 'availability-event';
insert into public.show_staff_assignments(show_id, user_id, assignment_type, status, responsibility)
select id, '72000000-0000-0000-0000-000000000003', 'tech', 'accepted', 'Lights' from public.shows where slug = 'availability-event';
set local role authenticated;
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000004';
select is(jsonb_array_length(public.get_availability_polls(current_setting('stagecom.test_event_id')::uuid)->'polls'), 0, 'accepted staff without accepted Cast cannot read poll answers');
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000003';
select is(jsonb_array_length(public.get_availability_polls(current_setting('stagecom.test_event_id')::uuid)->'polls'), 1, 'independent accepted Cast relationship remains eligible for staff');
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000002';
select lives_ok($$select public.open_availability_poll(
  '72000000-0000-0000-0001-000000000001', array['72000000-0000-0000-0002-000000000001']::uuid[],
  array['72000000-0000-0000-0000-000000000003']::uuid[], '72000000-0000-0000-0004-000000000003')$$,
  'a new poll may open after explicit closure');
select lives_ok($$select public.open_availability_poll(
  '72000000-0000-0000-0001-000000000001', array['72000000-0000-0000-0002-000000000001']::uuid[],
  array['72000000-0000-0000-0000-000000000003']::uuid[], '72000000-0000-0000-0004-000000000004', '72000000-0000-0000-0004-000000000003')$$,
  'replacement cancels its predecessor atomically');
select is(public.get_availability_polls(current_setting('stagecom.test_event_id')::uuid)#>>'{polls,0,respondents,0,submitted}', null, 'replacement does not inherit submitted answers');
select is((select count(*) from public.show_availability_polls where state = 'cancelled'), 1::bigint, 'cancelled history is retained');
-- RLS never lets leaders read another respondent's private draft directly.
select is((select count(*) from public.show_poll_responses), 0::bigint, 'leadership cannot directly read private response rows');
reset role;
update public.show_cast set status = 'removed' where show_id = current_setting('stagecom.test_event_id')::uuid and user_id = '72000000-0000-0000-0000-000000000003';
set local role authenticated;
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000003';
select is(jsonb_array_length(public.get_availability_polls(current_setting('stagecom.test_event_id')::uuid)->'polls'), 0, 'loss of accepted Cast removes historical poll access');
set local "request.jwt.claim.sub" = '72000000-0000-0000-0000-000000000002';
select is(public.get_availability_polls(current_setting('stagecom.test_event_id')::uuid)#>>'{polls,0,respondents,0,eligible}', 'false', 'leadership sees ineligible respondents for exclusion from totals');

select * from finish();
rollback;
