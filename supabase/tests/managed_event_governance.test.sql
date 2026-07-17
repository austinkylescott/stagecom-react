begin;

select plan(16);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('30000000-0000-0000-0000-000000000001', 'owner-governance@stagecom.local', '{"full_name":"Governance Owner"}'),
  ('30000000-0000-0000-0000-000000000002', 'member-governance@stagecom.local', '{"full_name":"Governed Member"}'),
  ('30000000-0000-0000-0000-000000000003', 'outsider-governance@stagecom.local', '{"full_name":"Outside Member"}');

select * from public.create_theater_with_owner(
  '30000000-0000-0000-0000-000000000001',
  'Governed Stage',
  'governed-stage',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
values (
  (select id from public.theaters where slug = 'governed-stage'),
  '30000000-0000-0000-0000-000000000002',
  array['member']::public.theater_role[],
  'active'::public.membership_status
);

select throws_ok(
  $$ select * from public.update_theater_governance(
    (select id from public.theaters where slug = 'governed-stage'),
    '30000000-0000-0000-0000-000000000002',
    'designated_proposers', true, 96, 'Main Stage', 30, 45
  ) $$,
  '42501',
  'Owner or Admin access is required.',
  'an ordinary Member cannot update Theater governance'
);

select lives_ok(
  $$ select * from public.update_theater_governance(
    (select id from public.theaters where slug = 'governed-stage'),
    '30000000-0000-0000-0000-000000000001',
    'designated_proposers', true, 96, 'Main Stage', 30, 45
  ) $$,
  'an Owner can persist governed Event defaults'
);

select results_eq(
  $$
    select
      producer_eligibility::text,
      owner_self_approval_enabled,
      counteroffer_response_hours,
      primary_venue_name,
      setup_buffer_minutes,
      turnover_buffer_minutes
    from public.theaters
    where slug = 'governed-stage'
  $$,
  $$ values ('designated_proposers'::text, true, 96, 'Main Stage'::text, 30, 45) $$,
  'governance persists every configured value'
);

select is(
  (select count(*) from public.activity_events where action = 'theater.governance.updated'),
  1::bigint,
  'governance change emits one durable domain event'
);

select isnt(
  (select primary_venue_id from public.theaters where slug = 'governed-stage'),
  null::uuid,
  'the Primary Venue has a stable identity independent of its name'
);

select throws_ok(
  $$ select * from public.create_managed_event(
    (select id from public.theaters where slug = 'governed-stage'),
    '30000000-0000-0000-0000-000000000002',
    'Denied Event',
    'denied-event'
  ) $$,
  '42501',
  'Eligible Producer access is required.',
  'an undesignated Member cannot create an Event'
);

select lives_ok(
  $$ select public.set_theater_member_capability(
    (select id from public.theaters where slug = 'governed-stage'),
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    'proposer',
    true
  ) $$,
  'an Owner can designate an active Member as Proposer'
);

select results_eq(
  $$
    select roles::text
    from public.theater_memberships
    where theater_id = (select id from public.theaters where slug = 'governed-stage')
      and user_id = '30000000-0000-0000-0000-000000000002'
  $$,
  $$ values ('{member}'::text) $$,
  'a narrow capability does not grant Admin authority'
);

select throws_ok(
  $$ select public.set_theater_member_capability(
    (select id from public.theaters where slug = 'governed-stage'),
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    'reviewer',
    true
  ) $$,
  '22023',
  'Active Theater membership is required.',
  'capabilities require active Theater membership'
);

select lives_ok(
  $$ select * from public.create_managed_event(
    (select id from public.theaters where slug = 'governed-stage'),
    '30000000-0000-0000-0000-000000000001',
    'Summer Hamlet',
    'summer-hamlet',
    array['30000000-0000-0000-0000-000000000002']::uuid[],
    '30000000-0000-0000-0000-000000000002'
  ) $$,
  'an eligible Owner can create an Event with an eligible co-Producer and active Director'
);

select results_eq(
  $$
    select lifecycle_status::text, publication_status::text, operational_health::text
    from public.shows
    where slug = 'summer-hamlet'
  $$,
  $$ values ('draft'::text, 'unpublished'::text, 'on_track'::text) $$,
  'the Event begins as one independently-stateful durable record'
);

select results_eq(
  $$
    select user_id, role::text
    from public.show_leadership
    where show_id = (select id from public.shows where slug = 'summer-hamlet')
    order by role, user_id
  $$,
  $$ values
    ('30000000-0000-0000-0000-000000000002'::uuid, 'director'::text),
    ('30000000-0000-0000-0000-000000000001'::uuid, 'producer'::text),
    ('30000000-0000-0000-0000-000000000002'::uuid, 'producer'::text)
  $$,
  'leadership permits one Member to be both Producer and Director'
);

select is(
  (
    select count(*)
    from public.show_cast
    where show_id = (select id from public.shows where slug = 'summer-hamlet')
  ),
  0::bigint,
  'creating Event leadership never creates Cast membership'
);

select results_eq(
  $$
    select
      count(*) filter (where action = 'event.created'),
      count(*) filter (where action = 'event.role.assigned')
    from public.activity_events
    where entity_id = (select id from public.shows where slug = 'summer-hamlet')
  $$,
  $$ values (1::bigint, 3::bigint) $$,
  'Event creation and every leadership assignment emit durable domain events'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-0000-0000-000000000002';

select ok(
  public.is_show_producer((select id from public.shows where slug = 'summer-hamlet')),
  'an active eligible co-Producer has Producer authority'
);

reset role;

select public.set_theater_member_capability(
  (select id from public.theaters where slug = 'governed-stage'),
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  'proposer',
  false
);

set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-0000-0000-000000000002';

select isnt(
  public.is_show_producer((select id from public.shows where slug = 'summer-hamlet')),
  true,
  'Producer authority re-checks current Theater policy'
);

reset role;

select * from finish();
rollback;
