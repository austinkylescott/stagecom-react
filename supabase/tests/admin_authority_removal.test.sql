begin;

select plan(18);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('85000000-0000-0000-0000-000000000001', 'authority-owner@stagecom.local', '{"full_name":"Authority Owner"}'),
  ('85000000-0000-0000-0000-000000000002', 'authority-admin-one@stagecom.local', '{"full_name":"Authority Admin One"}'),
  ('85000000-0000-0000-0000-000000000003', 'authority-admin-two@stagecom.local', '{"full_name":"Authority Admin Two"}'),
  ('85000000-0000-0000-0000-000000000004', 'authority-member@stagecom.local', '{"full_name":"Authority Member"}'),
  ('85000000-0000-0000-0000-000000000005', 'authority-admin-three@stagecom.local', '{"full_name":"Authority Admin Three"}');

select * from public.create_theater_with_owner(
  '85000000-0000-0000-0000-000000000001',
  'Admin Authority Theater',
  'admin-authority-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, member_id, array['admin', 'member']::public.theater_role[], 'active'::public.membership_status
from public.theaters
cross join unnest(array[
  '85000000-0000-0000-0000-000000000002'::uuid,
  '85000000-0000-0000-0000-000000000003'::uuid,
  '85000000-0000-0000-0000-000000000005'::uuid
]) as member(member_id)
where slug = 'admin-authority-theater';

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, '85000000-0000-0000-0000-000000000004'::uuid,
  array['member']::public.theater_role[], 'active'::public.membership_status
from public.theaters where slug = 'admin-authority-theater';

select has_function('public', 'remove_theater_admin', array['uuid', 'uuid', 'uuid', 'uuid'], 'Admin authority removal is one transactional command');

select lives_ok(
  $$ select * from public.remove_theater_admin(
    (select id from public.theaters where slug = 'admin-authority-theater'),
    '85000000-0000-0000-0000-000000000003',
    '85000000-0000-0000-0000-000000000001',
    '85000000-0000-0000-0001-000000000001'
  ) $$,
  'an Owner can remove a current Admin'
);

select is(
  (select status from public.theater_memberships where user_id = '85000000-0000-0000-0000-000000000003'),
  'active'::public.membership_status,
  'removing Admin authority preserves base Theater membership'
);

select is(
  (select roles @> array['admin']::public.theater_role[] from public.theater_memberships where user_id = '85000000-0000-0000-0000-000000000003'),
  false,
  'removed Admin authority takes effect immediately'
);

select is(
  (select roles @> array['member']::public.theater_role[] from public.theater_memberships where user_id = '85000000-0000-0000-0000-000000000003'),
  true,
  'removal retains the Member relationship'
);

select is(
  (select count(*) from public.activity_events where action = 'theater.admin.removed'),
  1::bigint,
  'removal records one factual Theater history event'
);

select is(
  (select actor_user_id from public.activity_events where action = 'theater.admin.removed'),
  '85000000-0000-0000-0000-000000000001'::uuid,
  'history records who removed Admin authority'
);

select ok(
  (select created_at is not null from public.activity_events where action = 'theater.admin.removed'),
  'history records when Admin authority was removed'
);

select lives_ok(
  $$ select * from public.remove_theater_admin(
    (select id from public.theaters where slug = 'admin-authority-theater'),
    '85000000-0000-0000-0000-000000000003',
    '85000000-0000-0000-0000-000000000001',
    '85000000-0000-0000-0001-000000000001'
  ) $$,
  'retrying the same removal command returns the durable result'
);

select is(
  (select count(*) from public.activity_events where action = 'theater.admin.removed'),
  1::bigint,
  'a retry does not duplicate Admin removal history'
);

select throws_ok(
  $$ select * from public.remove_theater_admin(
    (select id from public.theaters where slug = 'admin-authority-theater'),
    '85000000-0000-0000-0000-000000000001',
    '85000000-0000-0000-0000-000000000002',
    '85000000-0000-0000-0001-000000000002'
  ) $$,
  '42501',
  'Owner authority can only change through an accepted ownership transfer.',
  'Admin management cannot alter the Owner relationship'
);

select lives_ok(
  $$ select * from public.remove_theater_admin(
    (select id from public.theaters where slug = 'admin-authority-theater'),
    '85000000-0000-0000-0000-000000000005',
    '85000000-0000-0000-0000-000000000002',
    '85000000-0000-0000-0001-000000000003'
  ) $$,
  'an Admin can remove a peer Admin'
);

select is(
  (select roles @> array['admin']::public.theater_role[] from public.theater_memberships where user_id = '85000000-0000-0000-0000-000000000005'),
  false,
  'peer removal immediately removes the target Admin authority'
);

select lives_ok(
  $$ select * from public.remove_theater_admin(
    (select id from public.theaters where slug = 'admin-authority-theater'),
    '85000000-0000-0000-0000-000000000002',
    '85000000-0000-0000-0000-000000000002',
    '85000000-0000-0000-0001-000000000004'
  ) $$,
  'an Admin can relinquish their own Admin authority'
);

select is(
  (select roles @> array['admin']::public.theater_role[] from public.theater_memberships where user_id = '85000000-0000-0000-0000-000000000002'),
  false,
  'self-removal takes effect immediately'
);

select throws_ok(
  $$ select * from public.remove_theater_admin(
    (select id from public.theaters where slug = 'admin-authority-theater'),
    '85000000-0000-0000-0000-000000000001',
    '85000000-0000-0000-0000-000000000004',
    '85000000-0000-0000-0001-000000000005'
  ) $$,
  '42501',
  'Active Owner or Admin access is required.',
  'a base Member cannot alter Owner authority'
);

select throws_ok(
  $$ select * from public.remove_theater_admin(
    (select id from public.theaters where slug = 'admin-authority-theater'),
    '85000000-0000-0000-0000-000000000003',
    '85000000-0000-0000-0000-000000000001',
    '85000000-0000-0000-0001-000000000006'
  ) $$,
  '55000',
  'Only a current Admin can relinquish Admin authority.',
  'a second command cannot restore stale authority or create duplicate history'
);

select is(
  (select count(*) from public.activity_events where action = 'theater.admin.removed'),
  3::bigint,
  'distinct successful removals each record exactly one history event'
);

select * from finish();
rollback;
