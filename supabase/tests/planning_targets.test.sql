begin;

select plan(67);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('73000000-0000-0000-0000-000000000001', 'availability-owner@stagecom.local', '{"full_name":"Availability Owner"}'),
  ('73000000-0000-0000-0000-000000000002', 'availability-director@stagecom.local', '{"full_name":"Availability Director"}'),
  ('73000000-0000-0000-0000-000000000003', 'availability-member@stagecom.local', '{"full_name":"Availability Member"}'),
  ('73000000-0000-0000-0000-000000000004', 'availability-pending@stagecom.local', '{"full_name":"Pending Availability Member"}');

select * from public.create_theater_with_owner(
  '73000000-0000-0000-0000-000000000001',
  'Availability Theater',
  'planning-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select
  (select id from public.theaters where slug = 'planning-theater'),
  user_id,
  array['member']::public.theater_role[],
  'active'::public.membership_status
from unnest(array[
  '73000000-0000-0000-0000-000000000002'::uuid,
  '73000000-0000-0000-0000-000000000003'::uuid,
  '73000000-0000-0000-0000-000000000004'::uuid
]) as member(user_id);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'planning-theater'),
  '73000000-0000-0000-0000-000000000001',
  'Availability Event',
  'planning-event',
  array[]::uuid[],
  '73000000-0000-0000-0000-000000000002'
);

select set_config('stagecom.test_event_id', (select id::text from public.shows where slug = 'planning-event'), true);

select * from public.save_event_operational_plan(
  current_setting('stagecom.test_event_id')::uuid,
  '73000000-0000-0000-0000-000000000001',
  2,
  1,
  jsonb_build_array(jsonb_build_object(
    'id', '73000000-0000-0000-0001-000000000001',
    'type', 'performance',
    'visibility', 'public',
    'position', 0,
    'confirmedCandidateSlotId', null,
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '73000000-0000-0000-0002-000000000001',
      'startsAt', '2026-09-10T23:30:00.000Z',
      'durationMinutes', 90,
      'localStartsAt', '2026-09-10T19:30',
      'timezoneName', 'America/New_York',
      'timezoneSource', 'manual',
      'utcOffsetMinutes', -240,
      'locationKind', 'off_site',
      'locationName', 'Community Hall',
      'offSiteApproved', true,
      'position', 0
    ))
  )),
  '[]'::jsonb
);

select * from public.invite_event_cast_member(
  current_setting('stagecom.test_event_id')::uuid,
  '73000000-0000-0000-0000-000000000002',
  '73000000-0000-0000-0000-000000000003'
);

select * from public.invite_event_cast_member(
  current_setting('stagecom.test_event_id')::uuid,
  '73000000-0000-0000-0000-000000000002',
  '73000000-0000-0000-0000-000000000004'
);


select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'planning-event'),
  '73000000-0000-0000-0000-000000000003', 'accepted'
);
insert into public.show_occurrences(id,show_id,occurrence_type,visibility,position) values('73000000-0000-0000-0001-000000000002',current_setting('stagecom.test_event_id')::uuid,'rehearsal','internal',1);
insert into public.show_candidate_slots(id,occurrence_id,starts_at,duration_minutes,local_starts_at,timezone_name,timezone_source,utc_offset_minutes,location_kind,location_name,off_site_approved,position,resource_id) values('73000000-0000-0000-0002-000000000003','73000000-0000-0000-0001-000000000002','2026-11-21T23:00Z',60,'2026-11-21T18:00','America/New_York','manual',-300,'primary_venue','Primary Venue',false,0,(select primary_venue_id from public.theaters where slug='planning-theater'));
set local role authenticated;
set local "request.jwt.claim.sub" = '73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L, %L, %L::jsonb, %L)', current_setting('stagecom.test_event_id'), 'select', '{"occurrenceId":"73000000-0000-0000-0001-000000000001","slotId":"73000000-0000-0000-0002-000000000001","expectedVersion":0}', '73000000-0000-0000-0004-000000000001'), 'Producer selects a persisted planning target');
reset role;
select is((select confirmed_candidate_slot_id from public.show_occurrences where id='73000000-0000-0000-0001-000000000001'), null::uuid, 'target selection creates no commitment');
select is((select count(*) from public.show_occurrence_calls where show_id=current_setting('stagecom.test_event_id')::uuid), 0::bigint, 'target selection creates no Calls');
select set_config('stagecom.test_target_id',(select id::text from public.show_planning_targets where show_id=current_setting('stagecom.test_event_id')::uuid),true);
select * from public.save_event_proposed_cast(current_setting('stagecom.test_event_id')::uuid,'73000000-0000-0000-0000-000000000001',array['73000000-0000-0000-0000-000000000003']::uuid[],'73000000-0000-0000-0004-000000000009');
set local role authenticated;
set local "request.jwt.claim.sub" = '73000000-0000-0000-0000-000000000002';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'call',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'userId','73000000-0000-0000-0000-000000000003','call','required','callVersion',0),'73000000-0000-0000-0004-000000000002'),'Director explicitly assigns a planning Call');
set local "request.jwt.claim.sub" = '73000000-0000-0000-0000-000000000001';
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'submit',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000003'),'22023',null,'Missing explicit confirmation blocks submission');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000004';
select throws_ok(format('select public.get_event_planning(%L)',current_setting('stagecom.test_event_id')),'42501',null,'Pending Cast cannot read planning');
set local "request.jwt.claim.sub" = '73000000-0000-0000-0000-000000000003';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',true),'73000000-0000-0000-0004-000000000004'),'Participant confirms independently of availability');
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',true),'73000000-0000-0000-0004-000000000004'),'Exact confirmation retry is idempotent');
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',false),'73000000-0000-0000-0004-000000000004'),'23505',null,'Reusing confirmation command with changed input is denied');
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'submit',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000055'),'42501',null,'Cast cannot submit a Producer plan');
set local "request.jwt.claim.sub" = '73000000-0000-0000-0000-000000000001';
select set_config('stagecom.test_unchanged_target_id',public.manage_event_planning(current_setting('stagecom.test_event_id')::uuid,'select',jsonb_build_object('occurrenceId','73000000-0000-0000-0001-000000000002','slotId','73000000-0000-0000-0002-000000000003','expectedVersion',0),'73000000-0000-0000-0004-000000000080')->>'targetId',true);
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000002';
select public.manage_event_planning(current_setting('stagecom.test_event_id')::uuid,'call',jsonb_build_object('targetId',current_setting('stagecom.test_unchanged_target_id'),'expectedVersion',1,'userId','73000000-0000-0000-0000-000000000003','call','required','callVersion',0),'73000000-0000-0000-0004-000000000081');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select public.manage_event_planning(current_setting('stagecom.test_event_id')::uuid,'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_unchanged_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',true),'73000000-0000-0000-0004-000000000082');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'submit',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000003'),'Producer submits exact revision after confirmation');
reset role;
insert into public.theater_member_capabilities(theater_id,user_id,capability) select theater_id,'73000000-0000-0000-0000-000000000002','reviewer' from public.shows where id=current_setting('stagecom.test_event_id')::uuid;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000002';
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select throws_ok(format('select public.review_proposal_revision(%L,%L,%L,null,false,%L,1)',(select proposal_revision_id from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),'73000000-0000-0000-0000-000000000001','approve','73000000-0000-0000-0004-000000000056'),'42501',null,'Owner authorship alone cannot approve their revision');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000002';
select throws_ok(format('select public.review_proposal_revision(%L,%L,%L,null,false,%L,0)',(select proposal_revision_id from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),'73000000-0000-0000-0000-000000000002','approve','73000000-0000-0000-0004-000000000057'),'55000',null,'Stale Review version rolls back commitment');
select lives_ok(format('select public.review_proposal_revision(%L,%L,%L,null,false,%L,1)',(select proposal_revision_id from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),'73000000-0000-0000-0000-000000000002','approve','73000000-0000-0000-0004-000000000005'),'Separate Reviewer approves selected plan');
select lives_ok(format('select public.review_proposal_revision(%L,%L,%L,null,false,%L,1)',(select proposal_revision_id from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),'73000000-0000-0000-0000-000000000002','approve','73000000-0000-0000-0004-000000000005'),'Exact approval retry returns the recorded decision');
select is((select confirmed_candidate_slot_id from public.show_occurrences where id='73000000-0000-0000-0001-000000000001'),'73000000-0000-0000-0002-000000000001'::uuid,'Approval commits the selected slot');

reset role;
insert into public.show_candidate_slots(id,occurrence_id,starts_at,duration_minutes,local_starts_at,timezone_name,timezone_source,utc_offset_minutes,location_kind,location_name,off_site_approved,position)
values('73000000-0000-0000-0002-000000000002','73000000-0000-0000-0001-000000000001','2026-11-23T23:00Z',90,'2026-11-23T18:00','America/New_York','manual',-300,'off_site','New Community Hall',true,1);
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'select',jsonb_build_object('occurrenceId','73000000-0000-0000-0001-000000000001','slotId','73000000-0000-0000-0002-000000000002','expectedVersion',0),'73000000-0000-0000-0004-000000000010'),'Select a replacement without invalidating current approval');
reset role;
select set_config('stagecom.test_target_id',(select id::text from public.show_planning_targets where show_id=current_setting('stagecom.test_event_id')::uuid and state='planning'),true);
select is((select confirmed_candidate_slot_id from public.show_occurrences where id='73000000-0000-0000-0001-000000000001'),'73000000-0000-0000-0002-000000000001'::uuid,'Replacement planning retains the old committed slot');
select is((select lifecycle_status::text from public.shows where id=current_setting('stagecom.test_event_id')::uuid),'approved'::text,'Replacement planning retains Operational Approval');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',true),'73000000-0000-0000-0004-000000000011'),'Participant confirms the replacement time');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000002';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'call',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'userId','73000000-0000-0000-0000-000000000003','call','optional','callVersion',1),'73000000-0000-0000-0004-000000000012'),'Director changes only the staged Call');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',1,'confirmed',true),'73000000-0000-0000-0004-000000000013'),'55000',null,'Stale Call confirmation is rejected');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'submit',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000014'),'22023',null,'Changed Call invalidates consent and viability');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',2,'confirmationVersion',1,'confirmed',true),'73000000-0000-0000-0004-000000000015'),'Participant explicitly reconfirms the changed Call');
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',0,'callVersion',2,'confirmationVersion',2,'confirmed',true),'73000000-0000-0000-0004-000000000016'),'55000',null,'Stale target version is rejected');
reset role;
update public.theater_memberships set status='inactive' where user_id='73000000-0000-0000-0000-000000000003' and theater_id=(select theater_id from public.shows where id=current_setting('stagecom.test_event_id')::uuid);
set local role authenticated;
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',2,'confirmationVersion',1,'confirmed',true),'73000000-0000-0000-0004-000000000015'),'42501',null,'Membership loss denies even a previously successful retry');
select throws_ok(format('select public.get_event_planning(%L)',current_setting('stagecom.test_event_id')),'42501',null,'Membership loss denies planning reads');
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',2,'confirmationVersion',2,'confirmed',true),'73000000-0000-0000-0004-000000000017'),'42501',null,'Membership loss denies confirmation writes');
reset role;
update public.theater_memberships set status='active' where user_id='73000000-0000-0000-0000-000000000003' and theater_id=(select theater_id from public.shows where id=current_setting('stagecom.test_event_id')::uuid);
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'submit',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000018'),'Producer submits a replacement revision');
reset role;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000002';
select lives_ok(format('select public.review_proposal_revision(%L,%L,%L,%L,false,%L,1)',(select proposal_revision_id from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),'73000000-0000-0000-0000-000000000002','deny','Keep the original','73000000-0000-0000-0004-000000000030'),'Reviewer denies only the pending replacement');
select is((select confirmed_candidate_slot_id from public.show_occurrences where id='73000000-0000-0000-0001-000000000001'),'73000000-0000-0000-0002-000000000001'::uuid,'Denial preserves the old commitment');
select is((select lifecycle_status::text from public.shows where id=current_setting('stagecom.test_event_id')::uuid),'approved'::text,'Replacement denial preserves approved lifecycle');
select is((select publication_status::text from public.shows where id=current_setting('stagecom.test_event_id')::uuid),'unpublished'::text,'Approval and denial never publish');
reset role;
update public.show_candidate_slots set location_kind='primary_venue',off_site_approved=false,resource_id=(select primary_venue_id from public.theaters where slug='planning-theater'),location_name='Primary Venue' where id='73000000-0000-0000-0002-000000000002';
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'select',jsonb_build_object('occurrenceId','73000000-0000-0000-0001-000000000001','slotId','73000000-0000-0000-0002-000000000002','expectedVersion',0),'73000000-0000-0000-0004-000000000060'),'Producer begins a venue replacement');
reset role;
select set_config('stagecom.test_target_id',(select id::text from public.show_planning_targets where show_id=current_setting('stagecom.test_event_id')::uuid and state='planning'),true);
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'hold',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000061'),'42501',null,'Cast cannot grant a hold');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'hold',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000061'),'Operator grants an exclusive planning hold');
reset role;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select ok((select hold_until between now()+interval '71 hours' and now()+interval '73 hours' from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),'Hold uses the Theater 72-hour default');
select public.expire_planning_holds(now()+interval '73 hours');
select ok(not exists(select 1 from public.show_schedule_reservations where planning_target_id=current_setting('stagecom.test_target_id')::uuid and status='active'),'Expiry releases only the planning hold');
select ok((select state='planning' from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),'Expiry does not withdraw the target');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',true),'73000000-0000-0000-0004-000000000062'),'Cast confirms the new venue target');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'submit',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000063'),'Replacement can submit after hold expiry');
reset role;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select set_config('stagecom.test_move_revision_id',(select proposal_revision_id::text from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),true);
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_unchanged_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',1,'confirmed',false),'73000000-0000-0000-0004-000000000064'),'Participant may refuse a submitted time without rewriting the snapshot');
reset role;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000002';
select throws_ok(format('select public.review_proposal_revision(%L,%L,%L,null,false,%L,1)',current_setting('stagecom.test_move_revision_id'),'73000000-0000-0000-0000-000000000002','approve','73000000-0000-0000-0004-000000000065'),'22023',null,'Current refusal on an unchanged Occurrence blocks replacement approval');
select ok((select confirmed_candidate_slot_id='73000000-0000-0000-0002-000000000001'::uuid from public.show_occurrences where id='73000000-0000-0000-0001-000000000001'),'Failed approval retains the original committed time');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_unchanged_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',2,'confirmed',true),'73000000-0000-0000-0004-000000000066'),'Participant reconfirms the pending revision');
reset role;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select throws_ok(format('select public.review_proposal_revision(%L,%L,%L,%L,true,%L,1)',current_setting('stagecom.test_move_revision_id'),'73000000-0000-0000-0000-000000000001','approve','Audited approval','73000000-0000-0000-0004-000000000067'),'42501',null,'Owner override remains disabled until configured');
update public.shows set operational_health='at_risk',operational_health_version=9 where id=current_setting('stagecom.test_event_id')::uuid;
reset role;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000002';
select lives_ok(format('select public.review_proposal_revision(%L,%L,%L,%L,false,%L,1)',current_setting('stagecom.test_move_revision_id'),'73000000-0000-0000-0000-000000000002','request_edits','Revise the plan','73000000-0000-0000-0004-000000000068'),'Reviewer requests edits only to the replacement');
select ok((select lifecycle_status='approved' and operational_health='at_risk' and operational_health_version=9 from public.shows where id=current_setting('stagecom.test_event_id')::uuid),'Request edits preserves original lifecycle and health');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'select',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',0,'occurrenceId','73000000-0000-0000-0001-000000000001','slotId','73000000-0000-0000-0002-000000000002'),'73000000-0000-0000-0004-000000000069'),'Producer can choose a fresh target after edits');
reset role;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select set_config('stagecom.test_target_id',(select id::text from public.show_planning_targets where show_id=current_setting('stagecom.test_event_id')::uuid and state='planning'),true);
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',true),'73000000-0000-0000-0004-000000000070'),'Fresh target requires fresh consent');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'submit',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000071'),'Producer submits a freshly confirmed move');
reset role;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select set_config('stagecom.test_move_revision_id',(select proposal_revision_id::text from public.show_planning_targets where id=current_setting('stagecom.test_target_id')::uuid),true);
update public.theaters set owner_self_approval_enabled=true where slug='planning-theater';
create function private.fail_sta70_booking() returns trigger language plpgsql as $$ begin if new.candidate_slot_id='73000000-0000-0000-0002-000000000002' and new.kind='approved_commitment' then raise exception 'Injected replacement booking failure'; end if; return new; end; $$;
create trigger fail_sta70_booking before insert on public.show_schedule_reservations for each row execute function private.fail_sta70_booking();
select throws_ok(format('select public.review_proposal_revision(%L,%L,%L,%L,true,%L,1)',current_setting('stagecom.test_move_revision_id'),'73000000-0000-0000-0000-000000000001','approve','Audited replacement approval','73000000-0000-0000-0004-000000000072'),'P0001',null,'Booking failure rolls back the whole authorized replacement');
select is((select confirmed_candidate_slot_id from public.show_occurrences where id='73000000-0000-0000-0001-000000000001'),'73000000-0000-0000-0002-000000000001'::uuid,'Failed booking restores the original committed slot');
select ok(exists(select 1 from public.show_schedule_reservations where show_id=current_setting('stagecom.test_event_id')::uuid and candidate_slot_id='73000000-0000-0000-0002-000000000003' and status='active'),'Failed replacement restores the unchanged active booking');
drop trigger fail_sta70_booking on public.show_schedule_reservations;
drop function private.fail_sta70_booking();
select lives_ok(format('select public.review_proposal_revision(%L,%L,%L,%L,true,%L,1)',current_setting('stagecom.test_move_revision_id'),'73000000-0000-0000-0000-000000000001','approve','Audited replacement approval','73000000-0000-0000-0004-000000000072'),'Configured reasoned Owner override atomically approves replacement');
select ok((select confirmed_candidate_slot_id='73000000-0000-0000-0002-000000000002'::uuid from public.show_occurrences where id='73000000-0000-0000-0001-000000000001'),'Successful replacement commits the new time');
select ok((select count(*)=2 from public.show_schedule_reservations where show_id=current_setting('stagecom.test_event_id')::uuid and status='active' and kind='approved_commitment'),'New and unchanged venue commitments persist together');
reset role;
select public.set_occurrence_call('73000000-0000-0000-0001-000000000002','73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000002','optional','73000000-0000-0000-0004-000000000083',1);
select public.set_occurrence_call('73000000-0000-0000-0001-000000000002','73000000-0000-0000-0000-000000000003','73000000-0000-0000-0000-000000000002','required','73000000-0000-0000-0004-000000000084',2);
select ok(not public.planning_committed_confirmation(current_setting('stagecom.test_unchanged_target_id')::uuid,'73000000-0000-0000-0000-000000000003','required'),'Existing Director Call edits cannot reuse old required consent');
select is((select version from public.show_planning_calls where target_id=current_setting('stagecom.test_unchanged_target_id')::uuid and user_id='73000000-0000-0000-0000-000000000003'),3,'Current committed Call version is synchronized to planning');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_unchanged_target_id'),'expectedVersion',1,'callVersion',3,'confirmationVersion',3,'confirmed',true),'73000000-0000-0000-0004-000000000085'),'Participant reconfirms the current committed Call');
select ok(not has_schema_privilege('authenticated','private','USAGE'),'Eligibility helpers remain outside the exposed authenticated schema');
select is((select count(*) from public.show_planning_targets where show_id=current_setting('stagecom.test_event_id')::uuid),5::bigint,'Participant target RLS works with private helper functions');
reset role;
insert into public.show_resource_requests(id,show_id,resource_type,label,quantity,position) values('73000000-0000-0000-0005-000000000001',current_setting('stagecom.test_event_id')::uuid,'staff','Lighting',1,0);
select public.invite_event_staff_member(current_setting('stagecom.test_event_id')::uuid,'73000000-0000-0000-0000-000000000001','73000000-0000-0000-0000-000000000004','73000000-0000-0000-0005-000000000001');
select public.respond_to_event_staff_invitation((select id from public.show_staff_assignments where show_id=current_setting('stagecom.test_event_id')::uuid),'73000000-0000-0000-0000-000000000004','accepted');
set local role authenticated;
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select set_config('stagecom.test_target_id',public.manage_event_planning(current_setting('stagecom.test_event_id')::uuid,'select',jsonb_build_object('occurrenceId','73000000-0000-0000-0001-000000000001','slotId','73000000-0000-0000-0002-000000000001','expectedVersion',0),'73000000-0000-0000-0004-000000000090')->>'targetId',true);
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000002';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'call',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'userId','73000000-0000-0000-0000-000000000004','call','required','callVersion',0),'73000000-0000-0000-0004-000000000091'),'Director assigns an accepted staff participant a required Call');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000003';
select public.manage_event_planning(current_setting('stagecom.test_event_id')::uuid,'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',true),'73000000-0000-0000-0004-000000000092');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select throws_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'submit',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000093'),'22023',null,'Accepted staffing coverage does not supply selected-time consent');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000004';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'confirm',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1,'callVersion',1,'confirmationVersion',0,'confirmed',true),'73000000-0000-0000-0004-000000000094'),'Accepted staff explicitly confirm separately from Cast membership');
set local "request.jwt.claim.sub"='73000000-0000-0000-0000-000000000001';
select lives_ok(format('select public.manage_event_planning(%L,%L,%L::jsonb,%L)',current_setting('stagecom.test_event_id'),'withdraw',jsonb_build_object('targetId',current_setting('stagecom.test_target_id'),'expectedVersion',1),'73000000-0000-0000-0004-000000000095'),'Producer withdraws the pending move without releasing the original booking');
set local role anon;
select throws_ok(format('select public.get_event_planning(%L)',current_setting('stagecom.test_event_id')),'42501',null,'Anonymous planning access is denied');
reset role;
select * from finish();
rollback;
