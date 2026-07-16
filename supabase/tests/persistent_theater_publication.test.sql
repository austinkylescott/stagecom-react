begin;

select plan(24);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'owner@stagecom.local', '{"display_name":"Local Owner"}'),
  ('10000000-0000-0000-0000-000000000002', 'member@stagecom.local', '{"display_name":"Local Member"}');

select throws_ok(
  $$ select * from public.create_theater_with_owner(
    '10000000-0000-0000-0000-000000000099',
    'Rollback Theater',
    'rollback-theater',
    null
  ) $$,
  '23503',
  'insert or update on table "theater_memberships" violates foreign key constraint "theater_memberships_user_id_fkey"',
  'Theater creation fails when its Owner membership cannot be created'
);

select results_eq(
  $$
    select
      (select count(*) from public.theaters where slug = 'rollback-theater'),
      (select count(*) from public.theater_memberships where user_id = '10000000-0000-0000-0000-000000000099'),
      (select count(*) from public.activity_events where action = 'theater.created' and payload ->> 'slug' = 'rollback-theater')
  $$,
  $$ values (0::bigint, 0::bigint, 0::bigint) $$,
  'failed Theater creation rolls back the Theater, Owner membership, and creation event atomically'
);

select lives_ok(
  $$ select * from public.create_theater_with_owner(
    '10000000-0000-0000-0000-000000000001',
    'First Local Theater',
    'first-local-theater',
    null
  ) $$,
  'a Theater can be created with its Owner'
);

select is(
  (select count(*) from public.theaters where slug = 'first-local-theater'),
  1::bigint,
  'Theater creation persists one Theater'
);

select is(
  (
    select count(*)
    from public.theater_memberships
    where user_id = '10000000-0000-0000-0000-000000000001'
      and theater_id = (select id from public.theaters where slug = 'first-local-theater')
      and status = 'active'
      and roles = array['owner']::public.theater_role[]
      and is_home = true
  ),
  1::bigint,
  'Theater creation persists one active Owner membership as the first default'
);

select is(
  (
    select count(*)
    from public.activity_events
    where action = 'theater.created'
      and entity_id = (select id from public.theaters where slug = 'first-local-theater')
  ),
  1::bigint,
  'Theater creation emits one durable creation event'
);

select lives_ok(
  $$ select * from public.create_theater_with_owner(
    '10000000-0000-0000-0000-000000000001',
    'First Local Theater',
    'first-local-theater',
    null
  ) $$,
  'retrying Theater creation succeeds'
);

select results_eq(
  $$
    select
      (select count(*) from public.theaters where slug = 'first-local-theater'),
      (select count(*) from public.theater_memberships where theater_id = (select id from public.theaters where slug = 'first-local-theater')),
      (select count(*) from public.activity_events where action = 'theater.created' and entity_id = (select id from public.theaters where slug = 'first-local-theater'))
  $$,
  $$ values (1::bigint, 1::bigint, 1::bigint) $$,
  'retrying Theater creation does not duplicate durable records'
);

select lives_ok(
  $$ select * from public.create_theater_with_owner(
    '10000000-0000-0000-0000-000000000001',
    'Second Local Theater',
    'second-local-theater',
    'America/New_York'
  ) $$,
  'an Owner can create a second Theater'
);

select is(
  (
    select count(*)
    from public.theater_memberships
    where user_id = '10000000-0000-0000-0000-000000000001'
      and status = 'active'
      and is_home = true
  ),
  1::bigint,
  'creating multiple Theaters leaves exactly one default membership'
);

select lives_ok(
  $$ select * from public.set_default_theater(
    (select id from public.theaters where slug = 'second-local-theater'),
    '10000000-0000-0000-0000-000000000001'
  ) $$,
  'the default Theater can be changed'
);

select results_eq(
  $$
    select theater.slug
    from public.theater_memberships as membership
    join public.theaters as theater on theater.id = membership.theater_id
    where membership.user_id = '10000000-0000-0000-0000-000000000001'
      and membership.status = 'active'
      and membership.is_home = true
  $$,
  $$ values ('second-local-theater'::text) $$,
  'default selection leaves the selected Theater as the only active default'
);

select results_eq(
  $$
    select theater.slug
    from public.profiles as profile
    join public.theaters as theater on theater.id = profile.home_theater_id
    where profile.id = '10000000-0000-0000-0000-000000000001'
  $$,
  $$ values ('second-local-theater'::text) $$,
  'default selection synchronizes the Member profile'
);

select throws_ok(
  $$ select * from public.publish_theater(
    (select id from public.theaters where slug = 'first-local-theater'),
    '10000000-0000-0000-0000-000000000001'
  ) $$,
  '23514',
  'new row for relation "theaters" violates check constraint "theaters_published_identity_complete"',
  'Publication rejects an incomplete public identity'
);

select lives_ok(
  $$ select * from public.update_theater_setup(
    (select id from public.theaters where slug = 'first-local-theater'),
    '10000000-0000-0000-0000-000000000001',
    '{
      "tagline":"A local Theater for acceptance testing",
      "timezone":"America/New_York",
      "street":"123 Stage Street",
      "city":"Brooklyn",
      "stateRegion":"NY",
      "postalCode":"11201",
      "country":"US"
    }'
  ) $$,
  'an Owner can complete the Theater public identity'
);

select lives_ok(
  $$ select * from public.publish_theater(
    (select id from public.theaters where slug = 'first-local-theater'),
    '10000000-0000-0000-0000-000000000001'
  ) $$,
  'a complete Theater can be published'
);

select results_eq(
  $$ select status::text from public.theaters where slug = 'first-local-theater' $$,
  $$ values ('published'::text) $$,
  'Publication persists the published status'
);

select lives_ok(
  $$ select * from public.publish_theater(
    (select id from public.theaters where slug = 'first-local-theater'),
    '10000000-0000-0000-0000-000000000001'
  ) $$,
  'retrying Publication succeeds'
);

select is(
  (
    select count(*)
    from public.activity_events
    where action = 'theater.published'
      and entity_id = (select id from public.theaters where slug = 'first-local-theater')
  ),
  1::bigint,
  'Publication emits one durable event across retries'
);

set local role anon;

select results_eq(
  $$ select slug from public.theaters order by slug $$,
  $$ values ('first-local-theater'::text) $$,
  'anonymous access returns published Theaters only'
);

reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-0000-0000-000000000001';

select is(
  (
    select count(*)
    from public.theater_memberships
    where user_id = '10000000-0000-0000-0000-000000000001'
  ),
  2::bigint,
  'an authenticated Member can read their active Theater memberships'
);

reset role;

select ok(
  has_column_privilege('anon', 'public.theaters', 'name', 'select')
    and has_column_privilege('anon', 'public.theaters', 'slug', 'select')
    and not has_column_privilege('anon', 'public.theaters', 'created_at', 'select'),
  'anonymous access is limited to approved public Theater columns'
);

select ok(
  has_column_privilege('authenticated', 'public.theater_memberships', 'roles', 'select')
    and not has_column_privilege('anon', 'public.theater_memberships', 'roles', 'select'),
  'membership reads are available to authenticated Members only'
);

select ok(
  has_function_privilege('service_role', 'public.create_theater_with_owner(uuid, text, text, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.create_theater_with_owner(uuid, text, text, text)', 'execute')
    and not has_function_privilege('anon', 'public.create_theater_with_owner(uuid, text, text, text)', 'execute'),
  'privileged transaction functions are executable only by the service role'
);

select * from finish();
rollback;
