begin;

select plan(18);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('84000000-0000-0000-0000-000000000001', 'admin-invitation-owner@stagecom.local', '{"full_name":"Invitation Owner"}'),
  ('84000000-0000-0000-0000-000000000002', 'admin-invitation-member@stagecom.local', '{"full_name":"Invitation Member"}'),
  ('84000000-0000-0000-0000-000000000003', 'admin-invitation-admin@stagecom.local', '{"full_name":"Existing Admin"}');

select * from public.create_theater_with_owner(
  '84000000-0000-0000-0000-000000000001',
  'Admin Invitation Theater',
  'admin-invitation-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, member_id, array['member']::public.theater_role[], 'active'::public.membership_status
from public.theaters
cross join unnest(array[
  '84000000-0000-0000-0000-000000000002'::uuid,
  '84000000-0000-0000-0000-000000000003'::uuid
]) as member(member_id)
where slug = 'admin-invitation-theater';

update public.theater_memberships
set roles = array['admin', 'member']::public.theater_role[]
where theater_id = (select id from public.theaters where slug = 'admin-invitation-theater')
  and user_id = '84000000-0000-0000-0000-000000000003';

select has_function('public', 'invite_theater_admin', array['uuid', 'uuid', 'uuid', 'uuid'], 'Admin authority is offered through one transactional command');
select has_function('public', 'respond_to_theater_admin_invitation', array['uuid', 'uuid', 'text', 'uuid'], 'Admin invitation response is one transactional command');

select lives_ok(
  $$ select * from public.invite_theater_admin(
    (select id from public.theaters where slug = 'admin-invitation-theater'),
    '84000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000002',
    '84000000-0000-0000-0001-000000000001'
  ) $$,
  'an active Owner can offer Admin authority to an active Member'
);

select is(
  (select roles @> array['admin']::public.theater_role[] from public.theater_memberships where user_id = '84000000-0000-0000-0000-000000000002'),
  false,
  'a pending Admin Invitation grants no Admin authority'
);

select is((select count(*) from public.notifications where type = 'theater.admin.invited'), 1::bigint, 'the offer projects one personal Notification from its factual event');

select lives_ok(
  $$ select * from public.invite_theater_admin(
    (select id from public.theaters where slug = 'admin-invitation-theater'),
    '84000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000002',
    '84000000-0000-0000-0001-000000000002'
  ) $$,
  'repeating a pending offer returns the existing invitation'
);

select is((select count(*) from public.admin_invitations), 1::bigint, 'only one pending Admin Invitation exists for a Member');

select lives_ok(
  $$ select * from public.revoke_theater_admin_invitation(
    (select id from public.admin_invitations where status = 'pending'),
    '84000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0001-000000000004'
  ) $$,
  'an Operator can revoke a pending Admin Invitation'
);

select is((select count(*) from public.notifications where type = 'theater.admin.revoked'), 1::bigint, 'revocation projects a factual Notification for the invited Member');

select throws_ok(
  $$ select * from public.respond_to_theater_admin_invitation(
    (select id from public.admin_invitations where status = 'revoked'),
    '84000000-0000-0000-0000-000000000002',
    'accepted',
    '84000000-0000-0000-0002-000000000003'
  ) $$,
  '55000',
  'This Admin Invitation has already received a response.',
  'a revoked invitation cannot grant stale Admin authority'
);

select lives_ok(
  $$ select * from public.invite_theater_admin(
    (select id from public.theaters where slug = 'admin-invitation-theater'),
    '84000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000002',
    '84000000-0000-0000-0001-000000000005'
  ) $$,
  'an Operator can make a fresh offer after revocation'
);

select throws_ok(
  $$ select * from public.invite_theater_admin(
    (select id from public.theaters where slug = 'admin-invitation-theater'),
    '84000000-0000-0000-0000-000000000002',
    '84000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0001-000000000003'
  ) $$,
  '42501',
  'Active Owner or Admin access is required.',
  'an ordinary Member cannot offer Admin authority'
);

select lives_ok(
  $$ select * from public.respond_to_theater_admin_invitation(
    (select id from public.admin_invitations where status = 'pending'),
    '84000000-0000-0000-0000-000000000002',
    'accepted',
    '84000000-0000-0000-0002-000000000001'
  ) $$,
  'the recipient can explicitly accept Admin authority'
);

select is(
  (select roles @> array['admin']::public.theater_role[] from public.theater_memberships where user_id = '84000000-0000-0000-0000-000000000002'),
  true,
  'acceptance grants Admin authority'
);

select is((select count(*) from public.notifications where type = 'theater.admin.accepted'), 1::bigint, 'acceptance projects one factual Notification for the inviter');

select lives_ok(
  $$ select * from public.respond_to_theater_admin_invitation(
    (select id from public.admin_invitations where status = 'accepted'),
    '84000000-0000-0000-0000-000000000002',
    'accepted',
    '84000000-0000-0000-0002-000000000001'
  ) $$,
  'retrying the same accepted response is idempotent'
);

select is((select count(*) from public.activity_events where action = 'theater.admin.accepted'), 1::bigint, 'idempotent acceptance records one factual Theater history event');

select throws_ok(
  $$ select * from public.respond_to_theater_admin_invitation(
    (select id from public.admin_invitations where status = 'accepted'),
    '84000000-0000-0000-0000-000000000002',
    'declined',
    '84000000-0000-0000-0002-000000000002'
  ) $$,
  '55000',
  'This Admin Invitation has already received a response.',
  'a decided invitation cannot grant or remove authority through a stale response'
);

select * from finish();
rollback;
