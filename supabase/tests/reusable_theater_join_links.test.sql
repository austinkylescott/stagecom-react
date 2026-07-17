begin;

select plan(23);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('30000000-0000-0000-0000-000000000001', 'join-owner@stagecom.local', '{"display_name":"Join Owner"}'),
  ('30000000-0000-0000-0000-000000000002', 'join-member-one@stagecom.local', '{"display_name":"Join Member One"}'),
  ('30000000-0000-0000-0000-000000000003', 'join-member-two@stagecom.local', '{"display_name":"Join Member Two"}'),
  ('30000000-0000-0000-0000-000000000004', 'join-member-three@stagecom.local', '{"display_name":"Join Member Three"}');

select *
from public.create_theater_with_owner(
  '30000000-0000-0000-0000-000000000001',
  'Join Link Theater',
  'join-link-theater',
  'America/New_York'
);

select lives_ok(
  $$
    select * from public.create_reusable_theater_join_link(
      (select id from public.theaters where slug = 'join-link-theater'),
      '30000000-0000-0000-0000-000000000001',
      repeat('a', 64),
      null,
      2
    )
  $$,
  'an Owner can create a use-limited Reusable Join Link'
);

select is(
  (
    select count(*)
    from public.theater_join_links
    where token_hash = repeat('a', 64)
      and max_uses = 2
      and expires_at is null
  ),
  1::bigint,
  'creation persists only the token hash and configured limits'
);

select is(
  (
    select count(*)
    from public.activity_events
    where action = 'theater.join_link.created'
  ),
  1::bigint,
  'creation emits durable Theater-local history'
);

select throws_ok(
  $$
    select * from public.create_reusable_theater_join_link(
      (select id from public.theaters where slug = 'join-link-theater'),
      '30000000-0000-0000-0000-000000000002',
      repeat('b', 64),
      null,
      null
    )
  $$,
  '42501',
  'Owner or Admin access is required.',
  'a non-manager cannot create a Reusable Join Link'
);

select results_eq(
  $$
    select result, membership_created
    from public.accept_reusable_theater_join_link(
      '30000000-0000-0000-0000-000000000002',
      repeat('a', 64)
    )
  $$,
  $$ values ('accepted'::text, true) $$,
  'a valid holder receives active membership immediately'
);

select is(
  (
    select roles
    from public.theater_memberships
    where theater_id = (select id from public.theaters where slug = 'join-link-theater')
      and user_id = '30000000-0000-0000-0000-000000000002'
  ),
  array['member']::public.theater_role[],
  'acceptance grants only base Member access'
);

select results_eq(
  $$
    select result, membership_created
    from public.accept_reusable_theater_join_link(
      '30000000-0000-0000-0000-000000000002',
      repeat('a', 64)
    )
  $$,
  $$ values ('accepted'::text, false) $$,
  'an active Member can reaccept idempotently'
);

select is(
  (select use_count from public.theater_join_links where token_hash = repeat('a', 64)),
  1,
  'an idempotent retry does not consume another use'
);

select results_eq(
  $$
    select result
    from public.accept_reusable_theater_join_link(
      '30000000-0000-0000-0000-000000000003',
      repeat('a', 64)
    )
  $$,
  $$ values ('accepted'::text) $$,
  'the final configured use is accepted'
);

select is(
  (select use_count from public.theater_join_links where token_hash = repeat('a', 64)),
  2,
  'successful acceptance atomically reaches the configured limit'
);

select results_eq(
  $$
    select result
    from public.accept_reusable_theater_join_link(
      '30000000-0000-0000-0000-000000000004',
      repeat('a', 64)
    )
  $$,
  $$ values ('exhausted'::text) $$,
  'a later holder cannot exceed the use limit'
);

select is(
  (
    select count(*)
    from public.activity_events
    where action = 'theater.join_link.exhausted'
      and entity_id = (select id from public.theater_join_links where token_hash = repeat('a', 64))
  ),
  1::bigint,
  'exhaustion emits durable history exactly once'
);

select lives_ok(
  $$
    select * from public.create_reusable_theater_join_link(
      (select id from public.theaters where slug = 'join-link-theater'),
      '30000000-0000-0000-0000-000000000001',
      repeat('c', 64),
      now() + interval '1 day',
      null
    )
  $$,
  'an expiring Reusable Join Link can be created'
);

update public.theater_join_links
set expires_at = now() - interval '1 minute'
where token_hash = repeat('c', 64);

select results_eq(
  $$
    select result
    from public.accept_reusable_theater_join_link(
      '30000000-0000-0000-0000-000000000004',
      repeat('c', 64)
    )
  $$,
  $$ values ('expired'::text) $$,
  'an expired link is rejected'
);

select lives_ok(
  $$
    select * from public.create_reusable_theater_join_link(
      (select id from public.theaters where slug = 'join-link-theater'),
      '30000000-0000-0000-0000-000000000001',
      repeat('d', 64),
      null,
      null
    )
  $$,
  'a non-expiring and unlimited Reusable Join Link can be created'
);

select ok(
  public.revoke_reusable_theater_join_link(
    (select id from public.theater_join_links where token_hash = repeat('d', 64)),
    '30000000-0000-0000-0000-000000000001'
  ),
  'an Owner can revoke a link'
);

select results_eq(
  $$
    select result
    from public.accept_reusable_theater_join_link(
      '30000000-0000-0000-0000-000000000004',
      repeat('d', 64)
    )
  $$,
  $$ values ('revoked'::text) $$,
  'a revoked link is rejected'
);

select lives_ok(
  $$
    select * from public.create_reusable_theater_join_link(
      (select id from public.theaters where slug = 'join-link-theater'),
      '30000000-0000-0000-0000-000000000001',
      repeat('e', 64),
      null,
      5
    )
  $$,
  'a link can be created for rotation'
);

select lives_ok(
  $$
    select * from public.rotate_reusable_theater_join_link(
      (select id from public.theater_join_links where token_hash = repeat('e', 64)),
      '30000000-0000-0000-0000-000000000001',
      repeat('f', 64)
    )
  $$,
  'an Owner can rotate a link'
);

select results_eq(
  $$
    select old_link.revoked_at is not null, new_link.rotated_from_id = old_link.id
    from public.theater_join_links as old_link
    join public.theater_join_links as new_link on new_link.rotated_from_id = old_link.id
    where old_link.token_hash = repeat('e', 64)
      and new_link.token_hash = repeat('f', 64)
  $$,
  $$ values (true, true) $$,
  'rotation revokes the old token and retains lineage'
);

select results_eq(
  $$
    select result
    from public.accept_reusable_theater_join_link(
      '30000000-0000-0000-0000-000000000004',
      repeat('e', 64)
    )
  $$,
  $$ values ('revoked'::text) $$,
  'a rotated token becomes unusable'
);

select is(
  (
    select count(*)
    from public.activity_events
    where action in (
      'theater.join_link.accepted',
      'theater.join_link.revoked',
      'theater.join_link.rotated'
    )
  ),
  4::bigint,
  'use, explicit revocation, and rotation remain in Theater-local history'
);

select ok(
  has_function_privilege('service_role', 'public.accept_reusable_theater_join_link(uuid, text)', 'execute')
    and not has_function_privilege('authenticated', 'public.accept_reusable_theater_join_link(uuid, text)', 'execute')
    and has_function_privilege('anon', 'public.get_reusable_theater_join_link(text)', 'execute'),
  'mutations stay service-role-only while anonymous preview is available'
);

select * from finish();
rollback;
