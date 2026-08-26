begin;

select plan(22);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('86000000-0000-0000-0000-000000000001', 'ownership-owner@stagecom.local', '{"full_name":"Current Owner"}'),
  ('86000000-0000-0000-0000-000000000002', 'ownership-successor@stagecom.local', '{"full_name":"Successor"}'),
  ('86000000-0000-0000-0000-000000000003', 'ownership-member@stagecom.local', '{"full_name":"Other Member"}'),
  ('86000000-0000-0000-0000-000000000004', 'ownership-admin@stagecom.local', '{"full_name":"Admin"}');

select * from public.create_theater_with_owner(
  '86000000-0000-0000-0000-000000000001',
  'Ownership Transfer Theater',
  'ownership-transfer-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, member_id, array['member']::public.theater_role[], 'active'::public.membership_status
from public.theaters
cross join unnest(array[
  '86000000-0000-0000-0000-000000000002'::uuid,
  '86000000-0000-0000-0000-000000000003'::uuid,
  '86000000-0000-0000-0000-000000000004'::uuid
]) as member(member_id)
where slug = 'ownership-transfer-theater';

update public.theater_memberships
set roles = array['admin', 'member']::public.theater_role[]
where theater_id = (select id from public.theaters where slug = 'ownership-transfer-theater')
  and user_id = '86000000-0000-0000-0000-000000000004';

select has_function('public', 'propose_theater_ownership_transfer', array['uuid', 'uuid', 'uuid', 'public.theater_role', 'uuid'], 'Ownership transfer proposal is a transactional command');
select has_function('public', 'respond_to_theater_ownership_transfer', array['uuid', 'uuid', 'text', 'uuid'], 'Ownership transfer response is a transactional command');

select lives_ok(
  $$ select * from public.propose_theater_ownership_transfer(
    (select id from public.theaters where slug = 'ownership-transfer-theater'),
    '86000000-0000-0000-0000-000000000001',
    '86000000-0000-0000-0000-000000000002',
    'admin',
    '86000000-0000-0000-0001-000000000001'
  ) $$,
  'the current Owner can propose transfer to an active Theater Member'
);

select is(
  (select roles @> array['owner']::public.theater_role[] from public.theater_memberships where user_id = '86000000-0000-0000-0000-000000000001'),
  true,
  'the current Owner retains authority while transfer is pending'
);

select is(
  (select roles @> array['owner']::public.theater_role[] from public.theater_memberships where user_id = '86000000-0000-0000-0000-000000000002'),
  false,
  'the proposed successor receives no early authority'
);

select is((select count(*) from public.notifications where type = 'theater.ownership.proposed'), 1::bigint, 'the proposal projects one personal Notification for its successor');

select throws_ok(
  $$ select * from public.propose_theater_ownership_transfer(
    (select id from public.theaters where slug = 'ownership-transfer-theater'),
    '86000000-0000-0000-0000-000000000004',
    '86000000-0000-0000-0000-000000000003',
    'admin',
    '86000000-0000-0000-0001-000000000002'
  ) $$,
  '42501',
  'Only the current Owner can propose an ownership transfer.',
  'an Admin cannot propose ownership transfer'
);

select lives_ok(
  $$ select * from public.respond_to_theater_ownership_transfer(
    (select id from public.theater_ownership_transfers where status = 'pending'),
    '86000000-0000-0000-0000-000000000002',
    'declined',
    '86000000-0000-0000-0002-000000000001'
  ) $$,
  'the proposed successor can decline without gaining authority'
);

select is((select count(*) from public.notifications where type = 'theater.ownership.declined'), 1::bigint, 'decline projects one factual Notification for the current Owner');

select lives_ok(
  $$ select * from public.propose_theater_ownership_transfer(
    (select id from public.theaters where slug = 'ownership-transfer-theater'),
    '86000000-0000-0000-0000-000000000001',
    '86000000-0000-0000-0000-000000000002',
    'member',
    '86000000-0000-0000-0001-000000000003'
  ) $$,
  'the Owner can make a new proposal after a decline'
);

select lives_ok(
  $$ select * from public.respond_to_theater_ownership_transfer(
    (select id from public.theater_ownership_transfers where status = 'pending'),
    '86000000-0000-0000-0000-000000000002',
    'accepted',
    '86000000-0000-0000-0002-000000000002'
  ) $$,
  'acceptance atomically transfers ownership'
);

select is(
  (select user_id from public.theater_memberships where theater_id = (select id from public.theaters where slug = 'ownership-transfer-theater') and status = 'active' and roles @> array['owner']::public.theater_role[]),
  '86000000-0000-0000-0000-000000000002'::uuid,
  'the successor is the single active Owner'
);

select is(
  (select roles from public.theater_memberships where user_id = '86000000-0000-0000-0000-000000000001'),
  array['member']::public.theater_role[],
  'acceptance applies the selected former-Owner Member outcome'
);

select is((select count(*) from public.notifications where type = 'theater.ownership.accepted'), 1::bigint, 'acceptance projects one factual Notification for the former Owner');

select lives_ok(
  $$ select * from public.respond_to_theater_ownership_transfer(
    (select id from public.theater_ownership_transfers where status = 'accepted'),
    '86000000-0000-0000-0000-000000000002',
    'accepted',
    '86000000-0000-0000-0002-000000000002'
  ) $$,
  'retrying an accepted transfer response is idempotent'
);

select is((select count(*) from public.activity_events where action = 'theater.ownership.accepted'), 1::bigint, 'idempotent acceptance records one factual transfer history event');

select lives_ok(
  $$ select * from public.propose_theater_ownership_transfer(
    (select id from public.theaters where slug = 'ownership-transfer-theater'),
    '86000000-0000-0000-0000-000000000002',
    '86000000-0000-0000-0000-000000000004',
    'admin',
    '86000000-0000-0000-0001-000000000004'
  ) $$,
  'the new Owner can propose transfer to an active Admin'
);

select lives_ok(
  $$ select * from public.respond_to_theater_ownership_transfer(
    (select id from public.theater_ownership_transfers where status = 'pending'),
    '86000000-0000-0000-0000-000000000004',
    'declined',
    '86000000-0000-0000-0002-000000000003'
  ) $$,
  'an active Admin successor can decline ownership'
);

select is(
  (select roles @> array['admin']::public.theater_role[] from public.theater_memberships where user_id = '86000000-0000-0000-0000-000000000004'),
  true,
  'declining ownership preserves the successor’s existing Admin authority'
);

select throws_ok(
  $$ update public.theater_memberships
    set roles = array['owner', 'member']::public.theater_role[]
    where theater_id = (select id from public.theaters where slug = 'ownership-transfer-theater')
      and user_id = '86000000-0000-0000-0000-000000000003' $$,
  '23505',
  'duplicate key value violates unique constraint "theater_memberships_one_active_owner"',
  'the data model prevents concurrent commands from creating multiple active Owners'
);

select throws_ok(
  $$ update public.theater_memberships
    set roles = array['member']::public.theater_role[]
    where theater_id = (select id from public.theaters where slug = 'ownership-transfer-theater')
      and user_id = '86000000-0000-0000-0000-000000000002';
    set constraints theater_memberships_exactly_one_active_owner immediate $$,
  '23514',
  'A Theater must have exactly one active Owner.',
  'the data model prevents a Theater from committing with zero active Owners'
);

select is((select count(*) from public.activity_events where action in ('theater.ownership.proposed', 'theater.ownership.declined', 'theater.ownership.accepted')), 6::bigint, 'proposals, declines, and acceptance are factual Theater history');

select * from finish();
rollback;
