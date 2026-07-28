begin;

select plan(16);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('71000000-0000-0000-0000-000000000001', 'cast-owner@stagecom.local', '{"full_name":"Cast Owner"}'),
  ('71000000-0000-0000-0000-000000000002', 'cast-director@stagecom.local', '{"full_name":"Cast Director"}'),
  ('71000000-0000-0000-0000-000000000003', 'cast-accepted@stagecom.local', '{"full_name":"Accepted Member"}'),
  ('71000000-0000-0000-0000-000000000004', 'cast-pending@stagecom.local', '{"full_name":"Pending Member"}'),
  ('71000000-0000-0000-0000-000000000005', 'cast-declined@stagecom.local', '{"full_name":"Declined Member"}');

select * from public.create_theater_with_owner(
  '71000000-0000-0000-0000-000000000001',
  'Casting Theater',
  'casting-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select
  (select id from public.theaters where slug = 'casting-theater'),
  user_id,
  array['member']::public.theater_role[],
  'active'::public.membership_status
from unnest(array[
  '71000000-0000-0000-0000-000000000002'::uuid,
  '71000000-0000-0000-0000-000000000003'::uuid,
  '71000000-0000-0000-0000-000000000004'::uuid,
  '71000000-0000-0000-0000-000000000005'::uuid
]) as member(user_id);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'casting-theater'),
  '71000000-0000-0000-0000-000000000001',
  'Private Cast Event',
  'private-cast-event',
  array[]::uuid[],
  '71000000-0000-0000-0000-000000000002'
);

select is(
  (
    select count(*)
    from public.show_cast
    where show_id = (select id from public.shows where slug = 'private-cast-event')
  ),
  0::bigint,
  'Producer and Director assignments do not imply Cast membership'
);

select lives_ok(
  $$
    select * from public.invite_event_cast_member(
      (select id from public.shows where slug = 'private-cast-event'),
      '71000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000003'
    )
  $$,
  'an active Director can invite an active Theater Member'
);

select lives_ok(
  $$
    select * from public.invite_event_cast_member(
      (select id from public.shows where slug = 'private-cast-event'),
      '71000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000004'
    )
  $$,
  'the Director can create a second private invitation'
);

select lives_ok(
  $$
    select * from public.invite_event_cast_member(
      (select id from public.shows where slug = 'private-cast-event'),
      '71000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000005'
    )
  $$,
  'the Director can invite another active Member independently'
);

select lives_ok(
  $$
    select * from public.invite_event_cast_member(
      (select id from public.shows where slug = 'private-cast-event'),
      '71000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000004'
    )
  $$,
  'retrying the same pending invitation is idempotent'
);

select is(
  (
    select count(*)
    from public.activity_events
    where entity_id = (select id from public.shows where slug = 'private-cast-event')
      and action = 'event.cast.invited'
  ),
  3::bigint,
  'each invitation emits one durable factual domain event'
);

select is(
  (
    select count(*)
    from public.notifications
    where type = 'event.cast.invited'
  ),
  3::bigint,
  'invitation notifications are projected from invitation events'
);

select lives_ok(
  $$
    select public.project_event_cast_invitation_notification(id)
    from public.activity_events
    where action = 'event.cast.invited'
  $$,
  'notification projection is safe to retry'
);

select is(
  (select count(*) from public.notifications where type = 'event.cast.invited'),
  3::bigint,
  'notification dedupe keys preserve one notification per invitation event'
);

select throws_ok(
  $$
    select * from public.invite_event_cast_member(
      (select id from public.shows where slug = 'private-cast-event'),
      '71000000-0000-0000-0000-000000000005',
      '71000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  'Active Event leader access is required to invite Cast Members.',
  'an ordinary Theater Member cannot invite Cast Members'
);

select lives_ok(
  $$
    select * from public.respond_to_event_cast_invitation(
      (select id from public.shows where slug = 'private-cast-event'),
      '71000000-0000-0000-0000-000000000003',
      'accepted'
    )
  $$,
  'an invitee can explicitly accept participation'
);

select lives_ok(
  $$
    select * from public.respond_to_event_cast_invitation(
      (select id from public.shows where slug = 'private-cast-event'),
      '71000000-0000-0000-0000-000000000005',
      'declined'
    )
  $$,
  'another invitee can explicitly decline participation'
);

select lives_ok(
  $$
    select * from public.respond_to_event_cast_invitation(
      (select id from public.shows where slug = 'private-cast-event'),
      '71000000-0000-0000-0000-000000000003',
      'accepted'
    )
  $$,
  'retrying the same participation response is idempotent'
);

select is(
  (
    select count(*)
    from public.activity_events
    where entity_id = (select id from public.shows where slug = 'private-cast-event')
      and action = 'event.cast.accepted'
  ),
  1::bigint,
  'an idempotent acceptance emits one response event'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '71000000-0000-0000-0000-000000000004';

select results_eq(
  $$
    select status::text
    from public.show_cast
    where show_id = (select id from public.shows where slug = 'private-cast-event')
    order by status::text
  $$,
  $$ values ('accepted'::text), ('pending'::text) $$,
  'a pending invitee sees only their invitation and confirmed Cast Members'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '71000000-0000-0000-0000-000000000003';

select results_eq(
  $$
    select status::text
    from public.show_cast
    where show_id = (select id from public.shows where slug = 'private-cast-event')
    order by status::text
  $$,
  $$ values ('accepted'::text), ('declined'::text), ('pending'::text) $$,
  'an accepted Cast Member sees the collaborative roster statuses'
);

reset role;

select * from finish();
rollback;
