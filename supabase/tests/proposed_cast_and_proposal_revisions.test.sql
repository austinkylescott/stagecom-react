begin;

select plan(24);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('73000000-0000-0000-0000-000000000001', 'proposal-owner@stagecom.local', '{"full_name":"Proposal Owner"}'),
  ('73000000-0000-0000-0000-000000000002', 'proposal-director@stagecom.local', '{"full_name":"Proposal Director"}'),
  ('73000000-0000-0000-0000-000000000003', 'proposal-cast-one@stagecom.local', '{"full_name":"Proposal Cast One"}'),
  ('73000000-0000-0000-0000-000000000004', 'proposal-cast-two@stagecom.local', '{"full_name":"Proposal Cast Two"}'),
  ('73000000-0000-0000-0000-000000000005', 'proposal-pending@stagecom.local', '{"full_name":"Proposal Pending"}');

select * from public.create_theater_with_owner(
  '73000000-0000-0000-0000-000000000001',
  'Proposal Theater',
  'proposal-theater',
  'America/New_York'
);

update public.theaters
set setup_buffer_minutes = 30,
    turnover_buffer_minutes = 30,
    primary_venue_name = 'Proposal Stage'
where slug = 'proposal-theater';

insert into public.theater_memberships (theater_id, user_id, roles, status)
select
  (select id from public.theaters where slug = 'proposal-theater'),
  user_id,
  array['member']::public.theater_role[],
  'active'::public.membership_status
from unnest(array[
  '73000000-0000-0000-0000-000000000002'::uuid,
  '73000000-0000-0000-0000-000000000003'::uuid,
  '73000000-0000-0000-0000-000000000004'::uuid,
  '73000000-0000-0000-0000-000000000005'::uuid
]) as member(user_id);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'proposal-theater'),
  '73000000-0000-0000-0000-000000000001',
  'Proposal Event',
  'proposal-event',
  array[]::uuid[],
  '73000000-0000-0000-0000-000000000002'
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'proposal-event'),
  '73000000-0000-0000-0000-000000000001',
  2,
  2,
  jsonb_build_array(jsonb_build_object(
    'id', '73000000-0000-0000-0001-000000000001',
    'type', 'performance',
    'visibility', 'public',
    'position', 0,
    'confirmedCandidateSlotId', '73000000-0000-0000-0002-000000000001',
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '73000000-0000-0000-0002-000000000001',
      'startsAt', '2026-10-10T23:30:00.000Z',
      'durationMinutes', 90,
      'localStartsAt', '2026-10-10T19:30',
      'timezoneName', 'America/New_York',
      'timezoneSource', 'manual',
      'utcOffsetMinutes', -240,
      'locationKind', 'primary_venue',
      'resourceId', (select primary_venue_id from public.theaters where slug = 'proposal-theater'),
      'locationName', 'Proposal Stage',
      'offSiteApproved', false,
      'position', 0
    ))
  )),
  jsonb_build_array(jsonb_build_object(
    'id', '73000000-0000-0000-0005-000000000001',
    'type', 'equipment',
    'label', 'Projector',
    'quantity', 1,
    'position', 0
  ))
);

select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'proposal-event'),
  '73000000-0000-0000-0000-000000000002',
  '73000000-0000-0000-0000-000000000003'
);
select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'proposal-event'),
  '73000000-0000-0000-0000-000000000002',
  '73000000-0000-0000-0000-000000000004'
);
select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'proposal-event'),
  '73000000-0000-0000-0000-000000000002',
  '73000000-0000-0000-0000-000000000005'
);

select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'proposal-event'),
  '73000000-0000-0000-0000-000000000003',
  'accepted'
);
select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'proposal-event'),
  '73000000-0000-0000-0000-000000000004',
  'accepted'
);

select throws_ok(
  format(
    'select public.save_event_proposed_cast(%L, %L, %L::uuid[], %L)',
    (select id from public.shows where slug = 'proposal-event'),
    '73000000-0000-0000-0000-000000000001',
    array['73000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-000000000005'],
    '73000000-0000-0000-0006-000000000001'
  ),
  '22023',
  'Only accepted active Cast Members may be selected for the Proposed Cast.',
  'pending invitations cannot enter the Proposed Cast'
);

select lives_ok(
  format(
    'select public.save_event_proposed_cast(%L, %L, %L::uuid[], %L)',
    (select id from public.shows where slug = 'proposal-event'),
    '73000000-0000-0000-0000-000000000001',
    array['73000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-000000000004'],
    '73000000-0000-0000-0006-000000000002'
  ),
  'a Producer deliberately selects accepted Cast Members'
);

select is(
  (select count(*) from public.show_proposed_cast where show_id = (select id from public.shows where slug = 'proposal-event')),
  2::bigint,
  'the working Proposed Cast stores only the selected accepted Members'
);

select lives_ok(
  format(
    'select public.save_event_proposed_cast(%L, %L, %L::uuid[], %L)',
    (select id from public.shows where slug = 'proposal-event'),
    '73000000-0000-0000-0000-000000000001',
    array['73000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-000000000004'],
    '73000000-0000-0000-0006-000000000002'
  ),
  'retrying Proposed Cast selection is idempotent'
);

select is(
  (select count(*) from public.activity_events where id = '73000000-0000-0000-0006-000000000002'),
  1::bigint,
  'the Proposed Cast retry emits one domain event'
);

select * from public.set_occurrence_call(
  '73000000-0000-0000-0001-000000000001',
  '73000000-0000-0000-0000-000000000003',
  '73000000-0000-0000-0000-000000000002',
  'required',
  '73000000-0000-0000-0007-000000000001',
  null
);
select * from public.set_occurrence_call(
  '73000000-0000-0000-0001-000000000001',
  '73000000-0000-0000-0000-000000000004',
  '73000000-0000-0000-0000-000000000002',
  'optional',
  '73000000-0000-0000-0007-000000000002',
  null
);

select * from public.record_candidate_slot_availability(
  '73000000-0000-0000-0002-000000000001',
  '73000000-0000-0000-0000-000000000003',
  'available',
  '73000000-0000-0000-0008-000000000001',
  null
);
select * from public.record_candidate_slot_availability(
  '73000000-0000-0000-0002-000000000001',
  '73000000-0000-0000-0000-000000000004',
  'uncertain',
  '73000000-0000-0000-0008-000000000002',
  null
);

select throws_ok(
  format(
    'select public.submit_event_proposal_revision(%L, %L, %L)',
    (select id from public.shows where slug = 'proposal-event'),
    '73000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0009-000000000001'
  ),
  '22023',
  'The Proposal Revision is blocked.',
  'submission blocks when a Performance misses Minimum Viable Cast'
);

select is(
  (select count(*) from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'proposal-event')),
  0::bigint,
  'failed validation writes no Proposal Revision'
);

select is(
  (select lifecycle_status::text from public.shows where slug = 'proposal-event'),
  'draft',
  'failed validation leaves the working Event draft unchanged'
);

select * from public.record_candidate_slot_availability(
  '73000000-0000-0000-0002-000000000001',
  '73000000-0000-0000-0000-000000000004',
  'available',
  '73000000-0000-0000-0008-000000000003',
  1
);

select lives_ok(
  format(
    'select public.submit_event_proposal_revision(%L, %L, %L)',
    (select id from public.shows where slug = 'proposal-event'),
    '73000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0009-000000000002'
  ),
  'a viable plan submits one immutable Proposal Revision'
);

select results_eq(
  $$
    select revision_number, decision_state::text
    from public.show_proposal_revisions
    where show_id = (select id from public.shows where slug = 'proposal-event')
  $$,
  $$ values (1, 'pending'::text) $$,
  'the first submitted revision is numbered one and pending review'
);

select is(
  (select lifecycle_status::text from public.shows where slug = 'proposal-event'),
  'in_review',
  'successful submission moves the Event into review'
);

select is(
  (select snapshot ->> 'minimumViableCast' from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'proposal-event')),
  '2',
  'the immutable snapshot includes viability thresholds'
);

select is(
  jsonb_array_length((select snapshot -> 'occurrences' from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'proposal-event'))),
  1,
  'the snapshot includes Occurrences, Confirmed Slots, Calls, locations, visibility, and viability'
);

select is(
  jsonb_array_length((select snapshot -> 'leadership' from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'proposal-event'))),
  2,
  'the snapshot includes current leadership'
);

select is(
  jsonb_array_length((select snapshot -> 'resourceRequests' from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'proposal-event'))),
  1,
  'the snapshot includes requested resources'
);

select is(
  (select count(*) from public.activity_events where action = 'event.proposal_revision.submitted' and payload ->> 'commandId' = '73000000-0000-0000-0009-000000000002'),
  1::bigint,
  'submission emits one durable domain event'
);

select lives_ok(
  format(
    'select public.submit_event_proposal_revision(%L, %L, %L)',
    (select id from public.shows where slug = 'proposal-event'),
    '73000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0009-000000000002'
  ),
  'retrying the same submission returns the original revision'
);

select is(
  (select count(*) from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'proposal-event')),
  1::bigint,
  'a retried logical submission cannot duplicate a revision'
);

select throws_ok(
  $$
    update public.show_proposal_revisions
    set snapshot = '{}'::jsonb
    where show_id = (select id from public.shows where slug = 'proposal-event')
  $$,
  '55000',
  'Submitted Proposal Revisions are immutable.',
  'submitted snapshots cannot be updated'
);

select throws_ok(
  $$
    delete from public.show_proposal_revisions
    where show_id = (select id from public.shows where slug = 'proposal-event')
  $$,
  '55000',
  'Submitted Proposal Revisions are immutable.',
  'submitted snapshots cannot be deleted'
);

update public.shows
set status = 'draft'::public.show_status
where slug = 'proposal-event';

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'proposal-theater'),
  '73000000-0000-0000-0000-000000000001',
  'Approved Venue Event',
  'approved-venue-event',
  array[]::uuid[],
  null
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'approved-venue-event'),
  '73000000-0000-0000-0000-000000000001',
  1,
  1,
  jsonb_build_array(jsonb_build_object(
    'id', '73000000-0000-0000-0011-000000000001',
    'type', 'performance',
    'visibility', 'public',
    'position', 0,
    'confirmedCandidateSlotId', '73000000-0000-0000-0012-000000000001',
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '73000000-0000-0000-0012-000000000001',
      'startsAt', '2026-10-11T01:20:00.000Z',
      'durationMinutes', 60,
      'localStartsAt', '2026-10-10T21:20',
      'timezoneName', 'America/New_York',
      'timezoneSource', 'manual',
      'utcOffsetMinutes', -240,
      'locationKind', 'primary_venue',
      'resourceId', (select primary_venue_id from public.theaters where slug = 'proposal-theater'),
      'locationName', 'Proposal Stage',
      'offSiteApproved', false,
      'position', 0
    ))
  )),
  '[]'::jsonb
);

update public.shows
set status = 'approved'::public.show_status
where slug = 'approved-venue-event';

select throws_ok(
  format(
    'select public.submit_event_proposal_revision(%L, %L, %L)',
    (select id from public.shows where slug = 'proposal-event'),
    '73000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0009-000000000003'
  ),
  '22023',
  'The Proposal Revision is blocked.',
  'setup and turnover buffer block a Primary Venue conflict'
);

select is(
  (select count(*) from public.show_proposal_revisions where show_id = (select id from public.shows where slug = 'proposal-event')),
  1::bigint,
  'a venue-conflicted submission does not consume a revision number'
);

update public.show_candidate_slots
set location_kind = 'off_site'::public.slot_location_kind,
    resource_id = null,
    location_name = 'Community Hall',
    off_site_approved = true
where id = '73000000-0000-0000-0002-000000000001';

select lives_ok(
  format(
    'select public.submit_event_proposal_revision(%L, %L, %L)',
    (select id from public.shows where slug = 'proposal-event'),
    '73000000-0000-0000-0000-000000000001',
    '73000000-0000-0000-0009-000000000004'
  ),
  'an approved off-site location does not reserve the Primary Venue and receives the next revision number'
);

select results_eq(
  $$
    select revision_number
    from public.show_proposal_revisions
    where show_id = (select id from public.shows where slug = 'proposal-event')
    order by revision_number
  $$,
  $$ values (1), (2) $$,
  'later successful submissions advance the monotonic revision number without gaps from failed attempts'
);

select * from finish();
rollback;
