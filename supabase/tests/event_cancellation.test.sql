begin;

select plan(22);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('78000000-0000-0000-0000-000000000001', 'cancellation-owner@stagecom.local', '{"full_name":"Cancellation Owner"}'),
  ('78000000-0000-0000-0000-000000000002', 'cancellation-producer@stagecom.local', '{"full_name":"Cancellation Producer"}'),
  ('78000000-0000-0000-0000-000000000003', 'cancellation-member@stagecom.local', '{"full_name":"Cancellation Member"}'),
  ('78000000-0000-0000-0000-000000000004', 'cancellation-inactive-admin@stagecom.local', '{"full_name":"Cancellation Inactive Admin"}');

select * from public.create_theater_with_owner(
  '78000000-0000-0000-0000-000000000001',
  'Cancellation Theater',
  'cancellation-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, member.user_id, array['member']::public.theater_role[],
  'active'::public.membership_status
from public.theaters
cross join unnest(array[
  '78000000-0000-0000-0000-000000000002'::uuid,
  '78000000-0000-0000-0000-000000000003'::uuid
]) as member(user_id)
where slug = 'cancellation-theater';

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, '78000000-0000-0000-0000-000000000004',
  array['admin']::public.theater_role[], 'inactive'::public.membership_status
from public.theaters where slug = 'cancellation-theater';

update public.theaters
set producer_eligibility = 'all_members'::public.producer_eligibility_policy
where slug = 'cancellation-theater';

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'cancellation-theater'),
  '78000000-0000-0000-0000-000000000001',
  'Cancellation Event',
  'cancellation-event',
  array['78000000-0000-0000-0000-000000000002'::uuid],
  null
);

select has_function(
  'public', 'request_event_cancellation',
  array['uuid', 'uuid', 'text', 'uuid', 'timestamp with time zone'],
  'a Producer cancellation-request transition is exposed'
);

select lives_ok(
  format(
    'select public.request_event_cancellation(%L, %L, %L, %L, %L)',
    (select id from public.shows where slug = 'cancellation-event'),
    '78000000-0000-0000-0000-000000000002',
    'The Producer recommends cancellation.',
    '78000000-0000-0000-0004-000000000001',
    '2026-10-01T16:00:00Z'
  ),
  'an active Producer can request cancellation'
);

select is(
  (select lifecycle_status::text from public.shows where slug = 'cancellation-event'),
  'draft',
  'requesting cancellation does not cancel the Event'
);

select results_eq(
  $$ select reason, requested_at
     from public.show_cancellation_requests
     where show_id = (select id from public.shows where slug = 'cancellation-event') $$,
  $$ values ('The Producer recommends cancellation.'::text,
       '2026-10-01T16:00:00Z'::timestamptz) $$,
  'the cancellation request is a durable fact'
);

select is(
  (select count(*) from public.activity_events
   where entity_id = (select id from public.shows where slug = 'cancellation-event')
     and action = 'event.cancellation.requested'),
  1::bigint,
  'the request emits one explicit domain event'
);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'cancellation-theater'),
  '78000000-0000-0000-0000-000000000001',
  'Published Cancellation Event',
  'published-cancellation-event',
  array['78000000-0000-0000-0000-000000000002'::uuid],
  null
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'published-cancellation-event'),
  '78000000-0000-0000-0000-000000000001',
  1,
  1,
  jsonb_build_array(
    jsonb_build_object(
      'id', '78000000-0000-0000-0001-000000000001',
      'type', 'performance',
      'visibility', 'public',
      'position', 0,
      'confirmedCandidateSlotId', '78000000-0000-0000-0002-000000000001',
      'candidateSlots', jsonb_build_array(jsonb_build_object(
        'id', '78000000-0000-0000-0002-000000000001',
        'startsAt', '2026-09-01T23:30:00Z',
        'durationMinutes', 90,
        'localStartsAt', '2026-09-01T19:30',
        'timezoneName', 'America/New_York',
        'timezoneSource', 'manual',
        'utcOffsetMinutes', -240,
        'locationKind', 'off_site',
        'locationName', 'Past Stage',
        'offSiteApproved', true,
        'position', 0
      ))
    ),
    jsonb_build_object(
      'id', '78000000-0000-0000-0001-000000000002',
      'type', 'performance',
      'visibility', 'public',
      'position', 1,
      'confirmedCandidateSlotId', '78000000-0000-0000-0002-000000000002',
      'candidateSlots', jsonb_build_array(jsonb_build_object(
        'id', '78000000-0000-0000-0002-000000000002',
        'startsAt', '2026-11-01T00:30:00Z',
        'durationMinutes', 90,
        'localStartsAt', '2026-10-31T20:30',
        'timezoneName', 'America/New_York',
        'timezoneSource', 'manual',
        'utcOffsetMinutes', -240,
        'locationKind', 'primary_venue',
        'resourceId', (select primary_venue_id from public.theaters where slug = 'cancellation-theater'),
        'locationName', 'Cancellation Theater',
        'offSiteApproved', false,
        'position', 0
      ))
    ),
    jsonb_build_object(
      'id', '78000000-0000-0000-0001-000000000003',
      'type', 'rehearsal',
      'visibility', 'internal',
      'position', 2,
      'confirmedCandidateSlotId', null,
      'candidateSlots', jsonb_build_array(jsonb_build_object(
        'id', '78000000-0000-0000-0002-000000000003',
        'startsAt', '2026-11-02T18:00:00Z',
        'durationMinutes', 60,
        'localStartsAt', '2026-11-02T13:00',
        'timezoneName', 'America/New_York',
        'timezoneSource', 'manual',
        'utcOffsetMinutes', -300,
        'locationKind', 'primary_venue',
        'resourceId', (select primary_venue_id from public.theaters where slug = 'cancellation-theater'),
        'locationName', 'Cancellation Theater',
        'offSiteApproved', false,
        'position', 0
      ))
    )
  ),
  '[]'::jsonb
);

insert into public.show_cast (show_id, user_id, source, status)
select id, '78000000-0000-0000-0000-000000000003', 'invited', 'accepted'
from public.shows where slug = 'published-cancellation-event';

insert into public.show_proposal_revisions (
  id, show_id, revision_number, decision_state, decision_version,
  submitted_by, command_id, snapshot
)
select
  '78000000-0000-0000-0003-000000000001', id, 1, 'approved', 2,
  '78000000-0000-0000-0000-000000000002',
  '78000000-0000-0000-0004-000000000002', '{}'::jsonb
from public.shows where slug = 'published-cancellation-event';

insert into public.show_proposal_decisions (
  proposal_revision_id, action, actor_user_id, revision_version, command_id
) values (
  '78000000-0000-0000-0003-000000000001', 'approve',
  '78000000-0000-0000-0000-000000000001', 1,
  '78000000-0000-0000-0004-000000000003'
);

insert into public.show_public_content_revisions (
  id, show_id, revision_number, title, description, admission_price_cents,
  sales_channel, external_url, last_command_id, created_by_user_id,
  updated_by_user_id, published_at
)
select
  '78000000-0000-0000-0003-000000000002', id, 1,
  'Published Cancellation Event', 'The public description remains factual.',
  2500, 'external', 'https://tickets.example/cancellation',
  '78000000-0000-0000-0004-000000000004',
  '78000000-0000-0000-0000-000000000002',
  '78000000-0000-0000-0000-000000000001', '2026-09-15T16:00:00Z'
from public.shows where slug = 'published-cancellation-event';

insert into public.show_public_occurrence_snapshots (
  revision_id, occurrence_id, starts_at, duration_minutes, local_starts_at,
  timezone_name, utc_offset_minutes, location_name, position
) values (
  '78000000-0000-0000-0003-000000000002',
  '78000000-0000-0000-0001-000000000002',
  '2026-11-01T00:30:00Z', 90, '2026-10-31T20:30',
  'America/New_York', -240, 'Cancellation Theater', 0
);

update public.theaters
set status = 'published', published_at = '2026-09-15T16:00:00Z',
    tagline = 'Cancellation notices you can trust',
    street = '1 Stage Street', city = 'New York', state_region = 'NY',
    postal_code = '10001', country = 'US'
where slug = 'cancellation-theater';

update public.shows
set status = 'approved', lifecycle_status = 'approved',
    publication_status = 'published', is_public_listed = true,
    approved_proposal_revision_id = '78000000-0000-0000-0003-000000000001',
    published_public_content_revision_id = '78000000-0000-0000-0003-000000000002'
where slug = 'published-cancellation-event';

insert into public.show_schedule_reservations (
  theater_id, resource_id, show_id, occurrence_id, candidate_slot_id,
  proposal_revision_id, kind, reserved_during
)
select
  show.theater_id, theater.primary_venue_id, show.id,
  '78000000-0000-0000-0001-000000000002',
  '78000000-0000-0000-0002-000000000002',
  '78000000-0000-0000-0003-000000000001',
  'approved_commitment', tstzrange('2026-11-01T00:30:00Z', '2026-11-01T02:00:00Z', '[)')
from public.shows as show
join public.theaters as theater on theater.id = show.theater_id
where show.slug = 'published-cancellation-event';

insert into public.show_counteroffers (
  id, proposal_revision_id, occurrence_id, candidate_slot_id,
  actor_user_id, response_deadline, command_id
) values (
  '78000000-0000-0000-0003-000000000003',
  '78000000-0000-0000-0003-000000000001',
  '78000000-0000-0000-0001-000000000003',
  '78000000-0000-0000-0002-000000000003',
  '78000000-0000-0000-0000-000000000001',
  '2026-10-15T16:00:00Z',
  '78000000-0000-0000-0004-000000000005'
);

insert into public.show_schedule_reservations (
  theater_id, resource_id, show_id, occurrence_id, candidate_slot_id,
  counteroffer_id, kind, reserved_during
)
select
  show.theater_id, theater.primary_venue_id, show.id,
  '78000000-0000-0000-0001-000000000003',
  '78000000-0000-0000-0002-000000000003',
  '78000000-0000-0000-0003-000000000003',
  'counteroffer_hold', tstzrange('2026-11-02T18:00:00Z', '2026-11-02T19:00:00Z', '[)')
from public.shows as show
join public.theaters as theater on theater.id = show.theater_id
where show.slug = 'published-cancellation-event';

select has_function(
  'public', 'cancel_event',
  array['uuid', 'uuid', 'text', 'uuid', 'show_lifecycle_status', 'timestamp with time zone'],
  'the authorized cancellation transition is exposed'
);

select throws_ok(
  format(
    'select public.cancel_event(%L, %L, %L, %L, %L, %L)',
    (select id from public.shows where slug = 'published-cancellation-event'),
    '78000000-0000-0000-0000-000000000003', 'Member cannot cancel.',
    '78000000-0000-0000-0004-000000000006', 'approved', '2026-10-01T17:00:00Z'
  ),
  '42501', null,
  'an ordinary Member cannot cancel an Event'
);

select throws_ok(
  format(
    'select public.cancel_event(%L, %L, %L, %L, %L, %L)',
    (select id from public.shows where slug = 'published-cancellation-event'),
    '78000000-0000-0000-0000-000000000004', 'Inactive Admin cannot cancel.',
    '78000000-0000-0000-0004-000000000010', 'approved', '2026-10-01T17:00:00Z'
  ),
  '42501', null,
  'an inactive Admin cannot cancel an Event'
);

select throws_ok(
  format(
    'select public.cancel_event(%L, %L, %L, %L, %L, %L)',
    (select id from public.shows where slug = 'published-cancellation-event'),
    '78000000-0000-0000-0000-000000000001', 'The stale client cannot cancel.',
    '78000000-0000-0000-0004-000000000007', 'draft', '2026-10-01T17:00:00Z'
  ),
  '55000', null,
  'a stale lifecycle expectation receives a typed conflict'
);

select lives_ok(
  format(
    'select public.cancel_event(%L, %L, %L, %L, %L, %L)',
    (select id from public.shows where slug = 'published-cancellation-event'),
    '78000000-0000-0000-0000-000000000001', 'Management confirmed cancellation.',
    '78000000-0000-0000-0004-000000000008', 'approved', '2026-10-01T17:00:00Z'
  ),
  'an active Owner can cancel an Event'
);

select results_eq(
  $$ select lifecycle_status::text, publication_status::text, cancelled_at,
       approved_proposal_revision_id, published_public_content_revision_id
     from public.shows where slug = 'published-cancellation-event' $$,
  $$ values ('cancelled'::text, 'published'::text, '2026-10-01T17:00:00Z'::timestamptz,
       '78000000-0000-0000-0003-000000000001'::uuid,
       '78000000-0000-0000-0003-000000000002'::uuid) $$,
  'cancellation preserves Publication and approved historical references'
);

select results_eq(
  $$ select id, status::text from public.show_occurrences
     where show_id = (select id from public.shows where slug = 'published-cancellation-event')
     order by position $$,
  $$ values
       ('78000000-0000-0000-0001-000000000001'::uuid, 'scheduled'::text),
       ('78000000-0000-0000-0001-000000000002'::uuid, 'cancelled'::text),
       ('78000000-0000-0000-0001-000000000003'::uuid, 'cancelled'::text) $$,
  'only future Occurrences are marked cancelled'
);

select is(
  (select count(*) from public.show_schedule_reservations
   where show_id = (select id from public.shows where slug = 'published-cancellation-event')
     and status = 'active'),
  0::bigint,
  'future confirmed reservations and Counteroffer holds are released'
);

select is(
  (select state::text from public.show_counteroffers
   where id = '78000000-0000-0000-0003-000000000003'),
  'cancelled',
  'a pending Counteroffer is closed when its Event is cancelled'
);

select results_eq(
  $$ select
       (select count(*) from public.show_proposal_revisions where show_id = show.id),
       (select count(*) from public.show_proposal_decisions decision
          join public.show_proposal_revisions revision on revision.id = decision.proposal_revision_id
          where revision.show_id = show.id),
       (select count(*) from public.show_cast where show_id = show.id)
     from public.shows show where slug = 'published-cancellation-event' $$,
  $$ values (1::bigint, 1::bigint, 1::bigint) $$,
  'cancellation preserves Proposal Revisions, decisions, and cast credits'
);

select results_eq(
  $$ select count(*), (array_agg(actor_user_id))[1]
     from public.activity_events
     where entity_id = (select id from public.shows where slug = 'published-cancellation-event')
       and action = 'event.cancelled' $$,
  $$ values (1::bigint, '78000000-0000-0000-0000-000000000001'::uuid) $$,
  'cancellation emits one logical domain event with the authorized actor'
);

select is(
  (select count(*) from public.notifications
   where entity_id = (select id from public.shows where slug = 'published-cancellation-event')
     and type = 'event.cancelled'),
  2::bigint,
  'leadership and accepted Cast receive deduplicated cancellation notifications'
);

select lives_ok(
  format(
    'select public.cancel_event(%L, %L, %L, %L, %L, %L)',
    (select id from public.shows where slug = 'published-cancellation-event'),
    '78000000-0000-0000-0000-000000000001', 'Management confirmed cancellation.',
    '78000000-0000-0000-0004-000000000008', 'approved', '2026-10-01T17:00:00Z'
  ),
  'retrying the same cancellation command is safe'
);

select results_eq(
  $$ select
       (select count(*) from public.activity_events where entity_id = show.id and action = 'event.cancelled'),
       (select count(*) from public.notifications where entity_id = show.id and type = 'event.cancelled')
     from public.shows show where slug = 'published-cancellation-event' $$,
  $$ values (1::bigint, 2::bigint) $$,
  'a retry does not duplicate the cancellation event or notifications'
);

select is(
  (public.get_published_event('cancellation-theater', 'published-cancellation-event')
    -> 'event' ->> 'lifecycleStatus'),
  'cancelled',
  'a formerly published Event remains anonymously visible as cancelled'
);

select lives_ok(
  format(
    'select public.cancel_event(%L, %L, %L, %L, %L, %L)',
    (select id from public.shows where slug = 'cancellation-event'),
    '78000000-0000-0000-0000-000000000001', 'Cancel the unpublished draft.',
    '78000000-0000-0000-0004-000000000009', 'draft', '2026-10-01T18:00:00Z'
  ),
  'management can cancel an unpublished Event'
);

select is(
  public.get_published_event('cancellation-theater', 'cancellation-event'),
  null,
  'an unpublished cancelled Event remains unavailable anonymously'
);

select * from finish();
rollback;
