begin;
select plan(20);
insert into auth.users(id,email,raw_user_meta_data) values
('74000000-0000-0000-0000-000000000001','team-owner@stagecom.local','{"full_name":"Team Owner"}'),
('74000000-0000-0000-0000-000000000002','team-member@stagecom.local','{"full_name":"Team Member"}');
select * from public.create_theater_with_owner('74000000-0000-0000-0000-000000000001','Team Theater','team-theater','America/New_York');
insert into public.theater_memberships(theater_id,user_id,roles,status)
select id,'74000000-0000-0000-0000-000000000002',array['member']::public.theater_role[],'active' from public.theaters where slug='team-theater';
insert into auth.users(id,email,raw_user_meta_data) values
('74000000-0000-0000-0000-000000000003','team-third@stagecom.local','{"full_name":"Third Member"}'),
('74000000-0000-0000-0000-000000000004','team-fourth@stagecom.local','{"full_name":"Fourth Member"}');
insert into public.theater_memberships(theater_id,user_id,roles,status)
select t.id,p.id,array['member']::public.theater_role[],'active' from public.theaters t cross join public.profiles p where t.slug='team-theater' and p.id in ('74000000-0000-0000-0000-000000000003','74000000-0000-0000-0000-000000000004');
create function pg_temp.team_action(action text, input jsonb default '{}') returns jsonb language plpgsql as $$
begin
return public.manage_team(current_setting('stagecom.team_theater')::uuid,action,input||jsonb_build_object('teamId','74000000-0000-0000-0001-000000000001','expectedVersion',(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'->0->>'version')::integer),gen_random_uuid());
end; $$;
select set_config('stagecom.team_theater',(select id::text from public.theaters where slug='team-theater'),true);
set local role authenticated;
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000002';
select public.manage_team(current_setting('stagecom.team_theater')::uuid,'create','{"name":"Authority Team"}','74000000-0000-0000-0001-000000000001');
select public.manage_team(current_setting('stagecom.team_theater')::uuid,'invite','{"teamId":"74000000-0000-0000-0001-000000000001","memberUserId":"74000000-0000-0000-0000-000000000001","expectedVersion":1}','74000000-0000-0000-0001-000000000002');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000001';
select public.manage_team(current_setting('stagecom.team_theater')::uuid,'respond','{"teamId":"74000000-0000-0000-0001-000000000001","response":"accepted","expectedVersion":2}','74000000-0000-0000-0001-000000000003');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000002';
select lives_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'offer_admin','{"teamId":"74000000-0000-0000-0001-000000000001","memberUserId":"74000000-0000-0000-0000-000000000001","expectedVersion":3}','74000000-0000-0000-0001-000000000004')$$,'Owner offers Team Admin authority');
select is(jsonb_array_length(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'->0->'adminIds'),0,'pending delegation grants no authority');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000001';
select lives_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'respond_admin','{"teamId":"74000000-0000-0000-0001-000000000001","response":"accepted","expectedVersion":4}','74000000-0000-0000-0001-000000000005')$$,'recipient accepts Team Admin personally');
select is(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'->0->'adminIds'->>0,'74000000-0000-0000-0000-000000000001','accepted Admin appears through private read boundary');
select lives_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'rename','{"teamId":"74000000-0000-0000-0001-000000000001","name":"Renamed Team","expectedVersion":5}','74000000-0000-0000-0001-000000000006')$$,'accepted Admin administers their own Team');
select is(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'->0->>'name','Renamed Team','rename persists through query');
select throws_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'remove','{"teamId":"74000000-0000-0000-0001-000000000001","memberUserId":"74000000-0000-0000-0000-000000000002","expectedVersion":6}','74000000-0000-0000-0001-000000000007')$$,'42501',null,'Admin cannot remove accountable Owner');
select lives_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'relinquish_admin','{"teamId":"74000000-0000-0000-0001-000000000001","expectedVersion":6}','74000000-0000-0000-0001-000000000008')$$,'Admin relinquishes personally');
select throws_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'rename','{"teamId":"74000000-0000-0000-0001-000000000001","name":"Denied","expectedVersion":7}','74000000-0000-0000-0001-000000000009')$$,'42501',null,'relinquishment removes authority immediately');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000002';
select pg_temp.team_action('invite','{"memberUserId":"74000000-0000-0000-0000-000000000003"}');
select pg_temp.team_action('invite','{"memberUserId":"74000000-0000-0000-0000-000000000004"}');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000003';
select pg_temp.team_action('respond','{"response":"accepted"}');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000004';
select pg_temp.team_action('respond','{"response":"accepted"}');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000002';
select throws_ok($$select pg_temp.team_action('leave')$$,'55000',null,'Owner with several remaining Members cannot depart without successor consent');
select lives_ok($$select pg_temp.team_action('offer_transfer','{"memberUserId":"74000000-0000-0000-0000-000000000001","depart":true}')$$,'Owner chooses a successor and requests departure');
select is(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'->0->>'ownerId','74000000-0000-0000-0000-000000000002','offer keeps departing Owner accountable');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000003';
select throws_ok($$select pg_temp.team_action('respond_transfer','{"response":"accepted"}')$$,'42501',null,'another Member cannot accept chosen succession');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000001';
select lives_ok($$select pg_temp.team_action('respond_transfer','{"response":"accepted"}')$$,'successor acceptance commits transfer and departure atomically');
select is(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'->0->>'ownerId','74000000-0000-0000-0000-000000000001','chosen recipient owns Team');
select is(jsonb_array_length(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'->0->'memberIds'),3,'old Owner has departed only after acceptance');
select pg_temp.team_action('offer_transfer','{"memberUserId":"74000000-0000-0000-0000-000000000003","depart":false}');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000003';
select lives_ok($$select pg_temp.team_action('respond_transfer','{"response":"accepted"}')$$,'ownership transfer can retain old Owner as ordinary Member');
select pg_temp.team_action('remove','{"memberUserId":"74000000-0000-0000-0000-000000000004"}');
select lives_ok($$select pg_temp.team_action('leave')$$,'sole remaining Member succeeds automatically on Owner departure');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000001';
select is(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'->0->>'ownerId','74000000-0000-0000-0000-000000000001','sole remaining Member is accountable Owner');
select pg_temp.team_action('leave');
select is(jsonb_array_length(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'),0,'empty Team dissolves out of active discovery');
select * from finish();
rollback;
