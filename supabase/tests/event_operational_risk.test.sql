begin;

select plan(21);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('77000000-0000-0000-0000-000000000001', 'risk-owner@stagecom.local', '{"full_name":"Risk Owner"}'),
  ('77000000-0000-0000-0000-000000000002', 'risk-director@stagecom.local', '{"full_name":"Risk Director"}'),
  ('77000000-0000-0000-0000-000000000003', 'risk-cast@stagecom.local', '{"full_name":"Risk Cast"}');

select * from public.create_theater_with_owner(
  '77000000-0000-0000-0000-000000000001',
  'Risk Theater',
  'risk-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, member.user_id, array['member']::public.theater_role[],
  'active'::public.membership_status
from public.theaters
cross join unnest(array[
  '77000000-0000-0000-0000-000000000002'::uuid,
  '77000000-0000-0000-0000-000000000003'::uuid
]) as member(user_id)
where slug = 'risk-theater';

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'risk-theater'),
  '77000000-0000-0000-0000-000000000001',
  'Published Risk Event',
  'published-risk-event',
  array[]::uuid[],
  '77000000-0000-0000-0000-000000000002'
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'published-risk-event'),
  '77000000-0000-0000-0000-000000000001',
  1,
  1,
  jsonb_build_array(jsonb_build_object(
    'id', '77000000-0000-0000-0001-000000000001',
    'type', 'performance',
    'visibility', 'public',
    'position', 0,
    'confirmedCandidateSlotId', '77000000-0000-0000-0002-000000000001',
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '77000000-0000-0000-0002-000000000001',
      'startsAt', '2026-10-10T23:30:00Z',
      'durationMinutes', 90,
      'localStartsAt', '2026-10-10T19:30',
      'timezoneName', 'America/New_York',
      'timezoneSource', 'manual',
      'utcOffsetMinutes', -240,
      'locationKind', 'off_site',
      'locationName', 'Risk Stage',
      'offSiteApproved', true,
      'position', 0
    ))
  )),
  '[]'::jsonb
);

select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'published-risk-event'),
  '77000000-0000-0000-0000-000000000002',
  '77000000-0000-0000-0000-000000000003'
);
select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'published-risk-event'),
  '77000000-0000-0000-0000-000000000003',
  'accepted'
);
select * from public.set_occurrence_call(
  '77000000-0000-0000-0001-000000000001',
  '77000000-0000-0000-0000-000000000003',
  '77000000-0000-0000-0000-000000000002',
  'required',
  '77000000-0000-0000-0003-000000000001',
  null
);
select * from public.record_candidate_slot_availability(
  '77000000-0000-0000-0002-000000000001',
  '77000000-0000-0000-0000-000000000003',
  'available',
  '77000000-0000-0000-0003-000000000002',
  null
);
select * from public.save_event_proposed_cast(
  (select id from public.shows where slug = 'published-risk-event'),
  '77000000-0000-0000-0000-000000000001',
  array['77000000-0000-0000-0000-000000000003'::uuid],
  '77000000-0000-0000-0003-000000000003'
);
select * from public.submit_event_proposal_revision(
  (select id from public.shows where slug = 'published-risk-event'),
  '77000000-0000-0000-0000-000000000001',
  '77000000-0000-0000-0003-000000000004'
);

update public.show_proposal_revisions
set decision_state = 'approved', decision_version = 2
where show_id = (select id from public.shows where slug = 'published-risk-event');

update public.shows
set status = 'approved'::public.show_status,
    lifecycle_status = 'approved'::public.show_lifecycle_status,
    approved_proposal_revision_id = (
      select id from public.show_proposal_revisions
      where show_id = (select id from public.shows where slug = 'published-risk-event')
    )
where slug = 'published-risk-event';

update public.shows
set publication_status = 'published'::public.show_publication_status
where slug = 'published-risk-event';

select has_function(
  'public', 'withdraw_from_event_cast', array['uuid', 'uuid', 'uuid', 'integer'],
  'Cast withdrawal is exposed as one transactional command'
);
select has_function(
  'public', 'manage_at_risk_event',
  array['uuid', 'uuid', 'event_risk_management_action', 'text', 'uuid', 'integer'],
  'At Risk management uses one centralized action command'
);

select lives_ok(
  format(
    'select public.withdraw_from_event_cast(%L, %L, %L, 1)',
    (select id from public.shows where slug = 'published-risk-event'),
    '77000000-0000-0000-0000-000000000003',
    '77000000-0000-0000-0004-000000000001'
  ),
  'an accepted Cast Member can withdraw transactionally'
);

select results_eq(
  $$ select lifecycle_status::text, publication_status::text,
       operational_health::text, operational_health_version
     from public.shows where slug = 'published-risk-event' $$,
  $$ values ('approved'::text, 'published'::text, 'at_risk'::text, 2) $$,
  'withdrawal marks health At Risk without changing approval or Publication'
);

select is(
  (select count(*) from public.activity_events
   where entity_id = (select id from public.shows where slug = 'published-risk-event')
     and action = 'event.operational_health.at_risk'),
  1::bigint,
  'the health transition emits one domain event'
);

select is(
  (select payload -> 'reasons' -> 0 ->> 'code'
   from public.activity_events
   where entity_id = (select id from public.shows where slug = 'published-risk-event')
     and action = 'event.operational_health.at_risk'),
  'minimum_viable_cast_unmet',
  'the domain fact explains the violated Minimum Viable Cast'
);

select results_eq(
  $$ select count(*), count(distinct user_id::text || ':' || dedupe_key)
     from public.notifications
     where entity_id = (select id from public.shows where slug = 'published-risk-event')
       and type = 'event.operational_health.at_risk' $$,
  $$ values (2::bigint, 2::bigint) $$,
  'management and remaining leadership receive deduplicated risk alerts'
);

select lives_ok(
  format(
    'select public.withdraw_from_event_cast(%L, %L, %L, 1)',
    (select id from public.shows where slug = 'published-risk-event'),
    '77000000-0000-0000-0000-000000000003',
    '77000000-0000-0000-0004-000000000001'
  ),
  'retrying the same withdrawal command is idempotent'
);

select is(
  (select count(*) from public.activity_events
   where entity_id = (select id from public.shows where slug = 'published-risk-event')
     and action = 'event.operational_health.at_risk'),
  1::bigint,
  'a retry does not emit another risk transition'
);

select throws_ok(
  format(
    'select public.manage_at_risk_event(%L, %L, %L, %L, %L, 1)',
    (select id from public.shows where slug = 'published-risk-event'),
    '77000000-0000-0000-0000-000000000001',
    'allow',
    'Proceed with an understudy plan.',
    '77000000-0000-0000-0004-000000000002'
  ),
  '55000', null,
  'a stale management decision returns a transactional conflict'
);

select lives_ok(
  format(
    'select public.manage_at_risk_event(%L, %L, %L, %L, %L, 2)',
    (select id from public.shows where slug = 'published-risk-event'),
    '77000000-0000-0000-0000-000000000001',
    'allow',
    'Proceed with an understudy plan.',
    '77000000-0000-0000-0004-000000000003'
  ),
  'Owner can explicitly allow continuation with a reason'
);

select results_eq(
  $$ select operational_health::text, operational_health_version,
       at_risk_continuation_allowed
     from public.shows where slug = 'published-risk-event' $$,
  $$ values ('at_risk'::text, 3, true) $$,
  'allowing continuation does not erase At Risk health'
);

select results_eq(
  $$ select action::text, reason from public.show_risk_management_decisions
     where show_id = (select id from public.shows where slug = 'published-risk-event') $$,
  $$ values ('allow'::text, 'Proceed with an understudy plan.'::text) $$,
  'the continuation decision preserves its audited reason'
);

select is(
  (select count(*) from public.activity_events
   where entity_id = (select id from public.shows where slug = 'published-risk-event')
     and action = 'event.operational_health.at_risk'),
  1::bigint,
  'allowing continuation preserves the original At Risk history'
);

select lives_ok(
  format(
    'select public.manage_at_risk_event(%L, %L, %L, %L, %L, 3)',
    (select id from public.shows where slug = 'published-risk-event'),
    '77000000-0000-0000-0000-000000000001',
    'reschedule',
    'The confirmed Performance needs a safer date.',
    '77000000-0000-0000-0004-000000000004'
  ),
  'management can explicitly return an At Risk Event to rescheduling'
);

select results_eq(
  $$ select lifecycle_status::text, publication_status::text,
       approved_proposal_revision_id, operational_health::text
     from public.shows where slug = 'published-risk-event' $$,
  $$ values ('draft'::text, 'unpublished'::text, null::uuid, 'at_risk'::text) $$,
  'rescheduling invalidates current approval and returns to draft without silently editing commitments'
);

select is(
  (select decision_state::text from public.show_proposal_revisions
   where show_id = (select id from public.shows where slug = 'published-risk-event')),
  'approved',
  'the prior approved Proposal decision remains historical fact'
);

select is(
  (select count(*) from public.show_risk_management_decisions
   where show_id = (select id from public.shows where slug = 'published-risk-event')),
  2::bigint,
  'At Risk management history preserves allow and reschedule decisions'
);

select throws_ok(
  format(
    'select public.manage_at_risk_event(%L, %L, %L, %L, %L, 4)',
    (select id from public.shows where slug = 'published-risk-event'),
    '77000000-0000-0000-0000-000000000003',
    'cancel',
    'Cast cannot cancel the Event.',
    '77000000-0000-0000-0004-000000000005'
  ),
  '42501', null,
  'Cast cannot perform Owner or Admin risk management actions'
);

select is(
  (select count(*) from public.activity_events
   where entity_id = (select id from public.shows where slug = 'published-risk-event')
     and action = 'event.cast.withdrawn'),
  1::bigint,
  'the withdrawal itself is one durable domain fact'
);

select is(
  (select count(*) from public.notifications
   where entity_id = (select id from public.shows where slug = 'published-risk-event')
     and type = 'event.operational_health.at_risk'),
  2::bigint,
  'reevaluation and management actions do not duplicate risk notifications'
);

select * from finish();
rollback;
