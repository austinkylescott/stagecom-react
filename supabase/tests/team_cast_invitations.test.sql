begin;
select no_plan();
insert into auth.users(id,email,raw_user_meta_data) values
('76000000-0000-0000-0000-000000000001','batch-owner@stagecom.local','{"full_name":"Owner"}'),
('76000000-0000-0000-0000-000000000002','batch-leader@stagecom.local','{"full_name":"Leader"}'),
('76000000-0000-0000-0000-000000000003','batch-a@stagecom.local','{"full_name":"Alice"}'),
('76000000-0000-0000-0000-000000000004','batch-b@stagecom.local','{"full_name":"Bob"}'),
('76000000-0000-0000-0000-000000000005','batch-c@stagecom.local','{"full_name":"Charlie"}');
select * from public.create_theater_with_owner('76000000-0000-0000-0000-000000000001','Batch Theater','batch-theater','America/New_York');
select set_config('test.theater',(select id::text from public.theaters where slug='batch-theater'),true);
insert into public.theater_memberships(theater_id,user_id,roles,status)
select current_setting('test.theater')::uuid,id,array['member']::public.theater_role[],'active' from public.profiles where id::text like '76000000%' and id<>'76000000-0000-0000-0000-000000000001';
select * from public.create_managed_event(current_setting('test.theater')::uuid,'76000000-0000-0000-0000-000000000001','Batch Event','batch-event',array[]::uuid[],'76000000-0000-0000-0000-000000000002');
select set_config('test.event',(select id::text from public.shows where slug='batch-event'),true);
insert into public.theater_teams(id,theater_id,name,owner_user_id) values
('76000000-0000-0000-0001-000000000001',current_setting('test.theater')::uuid,'First Team','76000000-0000-0000-0000-000000000003'),
('76000000-0000-0000-0001-000000000002',current_setting('test.theater')::uuid,'Second Team','76000000-0000-0000-0000-000000000003');
insert into public.team_memberships(team_id,theater_id,user_id,state,invited_by)
select team,current_setting('test.theater')::uuid,person,'accepted','76000000-0000-0000-0000-000000000002'
from unnest(array['76000000-0000-0000-0001-000000000001'::uuid,'76000000-0000-0000-0001-000000000002'::uuid]) team,
unnest(array['76000000-0000-0000-0000-000000000003'::uuid,'76000000-0000-0000-0000-000000000004'::uuid]) person;
select set_config('test.selection','[{"teamId":"76000000-0000-0000-0001-000000000001","memberIds":null},{"teamId":"76000000-0000-0000-0001-000000000002","memberIds":["76000000-0000-0000-0000-000000000003"]}]',true);
set local role authenticated;
set local "request.jwt.claim.sub"='76000000-0000-0000-0000-000000000002';
select set_config('test.review',public.review_team_cast_invitations(current_setting('test.event')::uuid,current_setting('test.selection')::jsonb)::text,true);
select is(jsonb_array_length(current_setting('test.review')::jsonb->'snapshot'->'recipients'),2,'whole Teams and overlapping subsets expand to unique named people');
select is(current_setting('test.review')::jsonb->'snapshot'->'recipients'->0->>'displayName','Alice','review names recipients');
select throws_ok($$select * from public.team_cast_reviews$$,'42501',null,'clients cannot replace stored review recipients');
set local "request.jwt.claim.sub"='76000000-0000-0000-0000-000000000003';
select throws_ok($$select public.review_team_cast_invitations(current_setting('test.event')::uuid,current_setting('test.selection')::jsonb)$$,'42501',null,'Team Owner cannot invite Cast without Event leadership');
select throws_ok($$select public.send_team_cast_invitations((current_setting('test.review')::jsonb->>'reviewId')::uuid)$$,'42501',null,'another actor cannot send a leader review');
set local role anon;
select throws_ok($$select public.get_cast_team_options(current_setting('test.event')::uuid)$$,'42501',null,'anonymous private options denied');
reset role;
insert into public.team_memberships(team_id,theater_id,user_id,state,invited_by)
values('76000000-0000-0000-0001-000000000001',current_setting('test.theater')::uuid,'76000000-0000-0000-0000-000000000005','accepted','76000000-0000-0000-0000-000000000002');
set local role authenticated;
set local "request.jwt.claim.sub"='76000000-0000-0000-0000-000000000002';
select set_config('test.refreshed',public.send_team_cast_invitations((current_setting('test.review')::jsonb->>'reviewId')::uuid)::text,true);
select is(current_setting('test.refreshed')::jsonb->>'state','refreshed','new Team Member requires refreshed review');
select is(jsonb_array_length(current_setting('test.refreshed')::jsonb->'review'->'snapshot'->'recipients'),3,'newly joined Member is named before another explicit send');
reset role;
select is((select count(*)::integer from public.show_cast where show_id=current_setting('test.event')::uuid),0,'stale send creates no invitations');
-- Fail the final invitation after earlier inserts; all effects must roll back.
create function public.test_fail_batch() returns trigger language plpgsql as $$ begin
 if new.user_id='76000000-0000-0000-0000-000000000005' and new.show_id=current_setting('test.event')::uuid then raise exception 'Injected batch failure'; end if;
 return new;
end; $$;
create trigger test_fail_batch before insert on public.show_cast for each row execute function public.test_fail_batch();
set local role authenticated;
select throws_ok($$select public.send_team_cast_invitations((current_setting('test.refreshed')::jsonb->'review'->>'reviewId')::uuid)$$,'P0001','Injected batch failure','batch fails on last recipient');
reset role;
select is((select count(*)::integer from public.show_cast where show_id=current_setting('test.event')::uuid),0,'failed batch rolls back earlier invitations');
select is((select count(*)::integer from public.activity_events where entity_id=current_setting('test.event')::uuid and action='event.cast.invited'),0,'failed batch rolls back domain events');
select is((select count(*)::integer from public.notifications where entity_id=current_setting('test.event')::uuid),0,'failed batch rolls back notifications');
drop trigger test_fail_batch on public.show_cast;
set local role authenticated;
select is(public.send_team_cast_invitations((current_setting('test.refreshed')::jsonb->'review'->>'reviewId')::uuid)->>'state','sent','same reviewed batch succeeds on retry');
select is(public.send_team_cast_invitations((current_setting('test.refreshed')::jsonb->'review'->>'reviewId')::uuid)->>'state','sent','lost-response retry returns successful receipt');
reset role;
select is((select count(*)::integer from public.show_cast where show_id=current_setting('test.event')::uuid and status='pending'),3,'every invitation remains pending');
select is((select count(*)::integer from public.notifications where entity_id=current_setting('test.event')::uuid),3,'one notification per unique recipient even after retry');
select public.respond_to_event_cast_invitation(current_setting('test.event')::uuid,'76000000-0000-0000-0000-000000000003','accepted');
set local role authenticated;
select set_config('test.second',public.review_team_cast_invitations(current_setting('test.event')::uuid,current_setting('test.selection')::jsonb)::text,true);
select is(current_setting('test.second')::jsonb->'snapshot'->'recipients'->0->>'status','accepted','accepted Cast labelled and excluded');
select is(current_setting('test.second')::jsonb->'snapshot'->'recipients'->1->>'status','pending','pending invitees labelled and excluded');
select throws_ok($$select public.send_team_cast_invitations((current_setting('test.second')::jsonb->>'reviewId')::uuid)$$,'22023',null,'empty eligible batch cannot duplicate invitations');
reset role;
-- Membership loss must refresh the review, even when a Cast record exists.
update public.team_memberships set state='left' where user_id='76000000-0000-0000-0000-000000000004';
set local role authenticated;
select is(public.send_team_cast_invitations((current_setting('test.second')::jsonb->>'reviewId')::uuid)->>'state','refreshed','departed Team membership invalidates reviewed recipients');
reset role;
update public.theater_memberships set status='inactive' where theater_id=current_setting('test.theater')::uuid and user_id='76000000-0000-0000-0000-000000000002';
set local role authenticated;
select throws_ok($$select public.send_team_cast_invitations((current_setting('test.refreshed')::jsonb->'review'->>'reviewId')::uuid)$$,'42501',null,'authority loss denies even a successful retry');
select * from finish();
rollback;
