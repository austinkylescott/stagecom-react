begin;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('73000000-0000-0000-0000-000000000001', 'staff-owner@stagecom.local', '{"full_name":"Staff Owner"}'),
  ('73000000-0000-0000-0000-000000000002', 'staff-member@stagecom.local', '{"full_name":"Staff Member"}'),
  ('73000000-0000-0000-0000-000000000003', 'staff-other@stagecom.local', '{"full_name":"Other Member"}');

select * from public.create_theater_with_owner('73000000-0000-0000-0000-000000000001', 'Staff Theater', 'staff-theater', 'America/New_York');
insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, member_id, array['member']::public.theater_role[], 'active'::public.membership_status
from public.theaters cross join unnest(array['73000000-0000-0000-0000-000000000002'::uuid, '73000000-0000-0000-0000-000000000003'::uuid]) member(member_id)
where slug = 'staff-theater';
select * from public.create_managed_event((select id from public.theaters where slug = 'staff-theater'), '73000000-0000-0000-0000-000000000001', 'Staff Event', 'staff-event');
insert into public.show_resource_requests (id, show_id, resource_type, label, quantity, position)
values ('74000000-0000-0000-0000-000000000001', (select id from public.shows where slug = 'staff-event'), 'staff', 'Lighting operator', 2, 0);

select lives_ok($$ select * from public.invite_event_staff_member((select id from public.shows where slug = 'staff-event'), '73000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000001') $$, 'an Operator can invite an active Member to a requested staff responsibility');
select is((select status::text from public.show_staff_assignments), 'pending', 'an invitation is pending and does not create coverage');
select is((select public.event_staff_coverage((select id from public.shows where slug = 'staff-event'), '74000000-0000-0000-0000-000000000001')), 0, 'pending invitations do not count toward staffing coverage');
select lives_ok($$ select * from public.invite_event_staff_member((select id from public.shows where slug = 'staff-event'), '73000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-000000000001') $$, 'retrying a pending invitation is idempotent');
select is((select count(*) from public.activity_events where action = 'event.staff.invited'), 1::bigint, 'idempotent invitation emits one factual Event history record');
select is((select count(*) from public.notifications where type = 'event.staff.invited'), 1::bigint, 'notification is projected from the invitation domain event');
select lives_ok($$ select * from public.respond_to_event_staff_invitation((select id from public.show_staff_assignments), '73000000-0000-0000-0000-000000000002', 'accepted') $$, 'the invited Member can accept');
select is((select public.event_staff_coverage((select id from public.shows where slug = 'staff-event'), '74000000-0000-0000-0000-000000000001')), 1, 'only an accepted assignment counts toward coverage');
select lives_ok($$ select * from public.respond_to_event_staff_invitation((select id from public.show_staff_assignments), '73000000-0000-0000-0000-000000000002', 'accepted') $$, 'retrying an acceptance is idempotent');
select is((select count(*) from public.activity_events where action = 'event.staff.accepted'), 1::bigint, 'idempotent acceptance emits one factual Event history record');
select lives_ok($$ select * from public.revoke_event_staff_assignment((select id from public.show_staff_assignments), '73000000-0000-0000-0000-000000000001') $$, 'an Operator can revoke an accepted assignment');
select is((select public.event_staff_coverage((select id from public.shows where slug = 'staff-event'), '74000000-0000-0000-0000-000000000001')), 0, 'revocation returns the staffing need to unresolved coverage');

select * from finish();
rollback;
