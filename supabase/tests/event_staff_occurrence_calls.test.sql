begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('75000000-0000-0000-0000-000000000001', 'staff-call-owner@stagecom.local', '{"full_name":"Call Owner"}'),
  ('75000000-0000-0000-0000-000000000002', 'staff-call-director@stagecom.local', '{"full_name":"Call Director"}'),
  ('75000000-0000-0000-0000-000000000003', 'staff-call-member@stagecom.local', '{"full_name":"Call Staff"}');
select * from public.create_theater_with_owner('75000000-0000-0000-0000-000000000001', 'Call Staff Theater', 'call-staff-theater', 'America/New_York');
insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, member_id, array['member']::public.theater_role[], 'active'::public.membership_status
from public.theaters cross join unnest(array['75000000-0000-0000-0000-000000000002'::uuid, '75000000-0000-0000-0000-000000000003'::uuid]) member(member_id) where slug = 'call-staff-theater';
select * from public.create_managed_event((select id from public.theaters where slug = 'call-staff-theater'), '75000000-0000-0000-0000-000000000001', 'Call Staff Event', 'call-staff-event');
insert into public.show_leadership (show_id, user_id, role)
values ((select id from public.shows where slug = 'call-staff-event'), '75000000-0000-0000-0000-000000000002', 'director');
insert into public.show_resource_requests (id, show_id, resource_type, label, quantity, position) values ('76000000-0000-0000-0000-000000000001', (select id from public.shows where slug = 'call-staff-event'), 'staff', 'Stage manager', 1, 0);
select * from public.invite_event_staff_member((select id from public.shows where slug = 'call-staff-event'), '75000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000003', '76000000-0000-0000-0000-000000000001');
select * from public.respond_to_event_staff_invitation((select id from public.show_staff_assignments), '75000000-0000-0000-0000-000000000003', 'accepted');
insert into public.show_occurrences (id, show_id, occurrence_type, visibility, position) values ('77000000-0000-0000-0000-000000000001', (select id from public.shows where slug = 'call-staff-event'), 'rehearsal', 'internal', 0);

select lives_ok($$ select * from public.set_occurrence_call('77000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000003', '75000000-0000-0000-0000-000000000002', 'required', '78000000-0000-0000-0000-000000000001') $$, 'a Director can call accepted Event staff without Cast membership');
select is((select count(*) from public.show_cast where show_id = (select id from public.shows where slug = 'call-staff-event') and user_id = '75000000-0000-0000-0000-000000000003'), 0::bigint, 'a staff Call does not create Cast membership');
select is((select call::text from public.show_occurrence_calls where user_id = '75000000-0000-0000-0000-000000000003'), 'required', 'the staff Call records its expectation');
select lives_ok($$ select * from public.set_occurrence_call('77000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000003', '75000000-0000-0000-0000-000000000002', 'not_called', '78000000-0000-0000-0000-000000000002', 1) $$, 'a Director can update an accepted staff Call to not called');
select * from public.revoke_event_staff_assignment((select id from public.show_staff_assignments), '75000000-0000-0000-0000-000000000001');
select throws_ok($$ select * from public.set_occurrence_call('77000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000003', '75000000-0000-0000-0000-000000000002', 'required', '78000000-0000-0000-0000-000000000003', 2) $$, '22023', 'Occurrence Calls can be assigned only to accepted Cast Members or Event staff.', 'revoked staff cannot receive future Calls');
select * from finish();
rollback;
