begin;
select plan(13);
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
select set_config('stagecom.team_theater',(select id::text from public.theaters where slug='team-theater'),true);
insert into public.theater_teams(id,theater_id,name,owner_user_id)
select ('74000000-0000-0000-0002-00000000000'||n)::uuid,current_setting('stagecom.team_theater')::uuid,'Recovery '||n,'74000000-0000-0000-0000-000000000002' from generate_series(1,4) n;
insert into public.team_memberships(team_id,theater_id,user_id,state,invited_by,joined_at)
select t.id,t.theater_id,'74000000-0000-0000-0000-000000000002','accepted','74000000-0000-0000-0000-000000000002','2026-01-01' from public.theater_teams t where t.theater_id=current_setting('stagecom.team_theater')::uuid;
insert into public.team_memberships(team_id,theater_id,user_id,state,invited_by,joined_at)
select t.id,t.theater_id,p.id,'accepted','74000000-0000-0000-0000-000000000002','2026-02-01' from public.theater_teams t cross join public.profiles p where t.theater_id=current_setting('stagecom.team_theater')::uuid and p.id in ('74000000-0000-0000-0000-000000000003','74000000-0000-0000-0000-000000000004') and (right(t.id::text,1) in ('1','2') and right(p.id::text,1) in ('3','4') or right(t.id::text,1)='4' and right(p.id::text,1)='3');
set local role authenticated;
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000002';
select lives_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'offer_recovery','{"teamId":"74000000-0000-0000-0002-000000000001","memberUserId":"74000000-0000-0000-0000-000000000004","expectedVersion":1}',gen_random_uuid())$$,'Owner persists a chosen recovery offer');
savepoint offered;
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000004';
select lives_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'respond_recovery','{"teamId":"74000000-0000-0000-0002-000000000001","response":"accepted","expectedVersion":2}',gen_random_uuid())$$,'chosen replacement consents before becoming recovery nominee');
savepoint chosen;
reset role;
update public.theater_memberships set status='inactive' where theater_id=current_setting('stagecom.team_theater')::uuid and user_id='74000000-0000-0000-0000-000000000002';
set local role authenticated;
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000003';
select is((select t->>'ownerId' from jsonb_array_elements(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams') t where t->>'name'='Recovery 1'),'74000000-0000-0000-0000-000000000004','consenting chosen replacement takes priority over tenure');
select is((select t->>'ownerId' from jsonb_array_elements(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams') t where t->>'name'='Recovery 2'),'74000000-0000-0000-0000-000000000003','equal tenure falls back deterministically to ascending UUID');
select is((select t->>'ownerId' from jsonb_array_elements(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams') t where t->>'name'='Recovery 4'),'74000000-0000-0000-0000-000000000003','sole remaining Member owns recovered Team');
select is(jsonb_array_length(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams'),3,'Team with no eligible Members is dissolved');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000002';
select throws_ok($$select public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)$$,'42501',null,'lost Theater access denies Team reads');
reset role;
select is((select state from public.team_memberships where team_id='74000000-0000-0000-0002-000000000001' and user_id='74000000-0000-0000-0000-000000000002'),'left','membership loss preserves ended Team fact');
select is((select count(*)::integer from public.activity_events where theater_id=current_setting('stagecom.team_theater')::uuid and action in ('team.ownership_recovered','team.dissolved')),4,'recovery and dissolution leave factual domain events');
rollback to savepoint chosen;
reset role;
update public.theater_memberships set status='inactive' where theater_id=current_setting('stagecom.team_theater')::uuid and user_id='74000000-0000-0000-0000-000000000004';
set local role authenticated;
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000003';
select is((select t->'recovery' from jsonb_array_elements(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams') t where t->>'name'='Recovery 1'),'null'::jsonb,'lost nominee invalidates persisted selection');
reset role;
update public.theater_memberships set status='inactive' where theater_id=current_setting('stagecom.team_theater')::uuid and user_id='74000000-0000-0000-0000-000000000002';
set local role authenticated;
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000003';
select is((select t->>'ownerId' from jsonb_array_elements(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams') t where t->>'name'='Recovery 1'),'74000000-0000-0000-0000-000000000003','ineligible chosen nominee falls back to eligible tenure');
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000004';
select throws_ok($$select public.manage_team(current_setting('stagecom.team_theater')::uuid,'respond_recovery','{"teamId":"74000000-0000-0000-0002-000000000001","response":"accepted","expectedVersion":3}',gen_random_uuid())$$,'42501',null,'lost nominee cannot replay consent');
rollback to savepoint offered;
reset role;
update public.theater_memberships set status='inactive' where theater_id=current_setting('stagecom.team_theater')::uuid and user_id='74000000-0000-0000-0000-000000000002';
set local role authenticated;
set local "request.jwt.claim.sub"='74000000-0000-0000-0000-000000000003';
select is((select t->>'ownerId' from jsonb_array_elements(public.get_team_workspace(current_setting('stagecom.team_theater')::uuid)->'teams') t where t->>'name'='Recovery 1'),'74000000-0000-0000-0000-000000000003','pending nomination grants no recovery priority without consent');
select * from finish();
rollback;
