begin;

select plan(13);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('61000000-0000-0000-0000-000000000001', 'plan-owner@stagecom.local', '{"full_name":"Plan Owner"}'),
  ('61000000-0000-0000-0000-000000000002', 'plan-member@stagecom.local', '{"full_name":"Plan Member"}');

select * from public.create_theater_with_owner(
  '61000000-0000-0000-0000-000000000001',
  'Plan Theater',
  'plan-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
values (
  (select id from public.theaters where slug = 'plan-theater'),
  '61000000-0000-0000-0000-000000000002',
  array['member']::public.theater_role[],
  'active'::public.membership_status
);

select * from public.update_theater_governance(
  (select id from public.theaters where slug = 'plan-theater'),
  '61000000-0000-0000-0000-000000000001',
  'all_members',
  false,
  72,
  'Main Stage',
  0,
  0
);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'plan-theater'),
  '61000000-0000-0000-0000-000000000001',
  'Candidate Plan',
  'candidate-plan'
);

select lives_ok(
  $$
    select public.save_event_operational_plan(
      (select id from public.shows where slug = 'candidate-plan'),
      '61000000-0000-0000-0000-000000000001',
      8,
      5,
      jsonb_build_array(
        jsonb_build_object(
          'id', '62000000-0000-0000-0000-000000000001',
          'type', 'rehearsal',
          'visibility', 'internal',
          'position', 0,
          'confirmedCandidateSlotId', null,
          'candidateSlots', jsonb_build_array(
            jsonb_build_object(
              'id', '63000000-0000-0000-0000-000000000001',
              'startsAt', '2026-08-01T22:00:00Z',
              'localStartsAt', '2026-08-01T18:00',
              'timezoneName', 'America/New_York',
              'timezoneSource', 'manual',
              'utcOffsetMinutes', -240,
              'durationMinutes', 120,
              'locationKind', 'off_site',
              'locationName', 'Community Hall',
              'offSiteApproved', true,
              'position', 0
            )
          )
        ),
        jsonb_build_object(
          'id', '62000000-0000-0000-0000-000000000002',
          'type', 'performance',
          'visibility', 'public',
          'position', 1,
          'confirmedCandidateSlotId', '63000000-0000-0000-0000-000000000002',
          'candidateSlots', jsonb_build_array(
            jsonb_build_object(
              'id', '63000000-0000-0000-0000-000000000002',
              'startsAt', '2026-08-02T23:30:00Z',
              'localStartsAt', '2026-08-02T19:30',
              'timezoneName', 'America/New_York',
              'timezoneSource', 'manual',
              'utcOffsetMinutes', -240,
              'durationMinutes', 90,
              'locationKind', 'primary_venue',
              'resourceId', (select primary_venue_id from public.theaters where slug = 'plan-theater'),
              'locationName', 'Main Stage',
              'offSiteApproved', false,
              'position', 0
            ),
            jsonb_build_object(
              'id', '63000000-0000-0000-0000-000000000003',
              'startsAt', '2026-08-03T23:30:00Z',
              'localStartsAt', '2026-08-03T19:30',
              'timezoneName', 'America/New_York',
              'timezoneSource', 'manual',
              'utcOffsetMinutes', -240,
              'durationMinutes', 90,
              'locationKind', 'off_site',
              'locationName', 'Library Auditorium',
              'offSiteApproved', true,
              'position', 1
            )
          )
        )
      ),
      jsonb_build_array(
        jsonb_build_object(
          'id', '64000000-0000-0000-0000-000000000001',
          'type', 'staff',
          'label', 'Lighting operator',
          'quantity', 1,
          'position', 0
        ),
        jsonb_build_object(
          'id', '64000000-0000-0000-0000-000000000002',
          'type', 'equipment',
          'label', 'Wireless microphones',
          'quantity', 4,
          'position', 1
        )
      )
    )
  $$,
  'a Producer can save Occurrences, Candidate Slots, a Confirmed Slot, and requested resources'
);

select results_eq(
  $$
    select target_cast_size, minimum_viable_cast
    from public.shows
    where slug = 'candidate-plan'
  $$,
  $$ values (8, 5) $$,
  'target and Minimum Viable Cast persist independently'
);

select results_eq(
  $$
    select occurrence_type::text, visibility::text, position
    from public.show_occurrences
    where show_id = (select id from public.shows where slug = 'candidate-plan')
    order by position
  $$,
  $$ values
    ('rehearsal'::text, 'internal'::text, 0),
    ('performance'::text, 'public'::text, 1)
  $$,
  'Rehearsal and Performance Occurrences keep explicit visibility and order'
);

select results_eq(
  $$
    select
      slot.starts_at,
      slot.duration_minutes,
      slot.local_starts_at,
      slot.timezone_name,
      slot.utc_offset_minutes
    from public.show_candidate_slots as slot
    where slot.id = '63000000-0000-0000-0000-000000000002'
  $$,
  $$ values (
    '2026-08-02T23:30:00Z'::timestamptz,
    90,
    '2026-08-02T19:30'::timestamp,
    'America/New_York'::text,
    -240
  ) $$,
  'a Candidate Slot persists the canonical instant, duration, local time, timezone, and offset'
);

select results_eq(
  $$
    select location_kind::text, resource_id is not null, off_site_approved
    from public.show_candidate_slots
    where id in (
      '63000000-0000-0000-0000-000000000001',
      '63000000-0000-0000-0000-000000000002'
    )
    order by location_kind
  $$,
  $$ values
    ('off_site'::text, false, true),
    ('primary_venue'::text, true, false)
  $$,
  'approved plain-text off-site use is distinct from Primary Venue resource use'
);

select is(
  (
    select confirmed_candidate_slot_id
    from public.show_occurrences
    where id = '62000000-0000-0000-0000-000000000002'
  ),
  '63000000-0000-0000-0000-000000000002'::uuid,
  'an Occurrence may identify one of its Candidate Slots as Confirmed'
);

select results_eq(
  $$
    select resource_type::text, label, quantity
    from public.show_resource_requests
    where show_id = (select id from public.shows where slug = 'candidate-plan')
    order by position
  $$,
  $$ values
    ('staff'::text, 'Lighting operator'::text, 1),
    ('equipment'::text, 'Wireless microphones'::text, 4)
  $$,
  'staff and equipment requests persist as explicit limited-resource needs'
);

select is(
  (
    select count(*)
    from public.activity_events
    where entity_id = (select id from public.shows where slug = 'candidate-plan')
      and action = 'event.operational_plan.updated'
  ),
  1::bigint,
  'an operational-plan save emits one durable factual domain event'
);

select throws_ok(
  $$
    select public.save_event_operational_plan(
      (select id from public.shows where slug = 'candidate-plan'),
      '61000000-0000-0000-0000-000000000002',
      8,
      5,
      '[]'::jsonb,
      '[]'::jsonb
    )
  $$,
  '42501',
  'Eligible Event Producer access is required.',
  'an ordinary Member cannot edit another Producer operational plan'
);

select throws_ok(
  $$
    select public.save_event_operational_plan(
      (select id from public.shows where slug = 'candidate-plan'),
      '61000000-0000-0000-0000-000000000001',
      4,
      5,
      '[]'::jsonb,
      '[]'::jsonb
    )
  $$,
  '22023',
  'Minimum Viable Cast must be no greater than the target cast size.',
  'an impossible cast threshold is rejected transactionally'
);

select throws_ok(
  $$
    select public.save_event_operational_plan(
      (select id from public.shows where slug = 'candidate-plan'),
      '61000000-0000-0000-0000-000000000001',
      8,
      5,
      jsonb_build_array(
        jsonb_build_object(
          'id', '62000000-0000-0000-0000-000000000002',
          'type', 'performance',
          'visibility', 'public',
          'position', 0,
          'confirmedCandidateSlotId', null,
          'candidateSlots', jsonb_build_array(
            jsonb_build_object(
              'id', '63000000-0000-0000-0000-000000000002',
              'startsAt', '2026-08-02T23:30:00Z',
              'localStartsAt', '2026-08-02T19:30',
              'timezoneName', 'America/New_York',
              'timezoneSource', 'manual',
              'utcOffsetMinutes', -240,
              'durationMinutes', 10,
              'locationKind', 'primary_venue',
              'resourceId', (select primary_venue_id from public.theaters where slug = 'plan-theater'),
              'locationName', 'Main Stage',
              'offSiteApproved', false,
              'position', 0
            )
          )
        )
      ),
      '[]'::jsonb
    )
  $$,
  '22023',
  'Slot duration must be between 15 minutes and 24 hours.',
  'an invalid Candidate Slot duration is rejected transactionally'
);

select lives_ok(
  $$
    select public.save_event_operational_plan(
      (select id from public.shows where slug = 'candidate-plan'),
      '61000000-0000-0000-0000-000000000001',
      8,
      5,
      jsonb_build_array(
        jsonb_build_object(
          'id', '62000000-0000-0000-0000-000000000002',
          'type', 'performance',
          'visibility', 'internal',
          'position', 0,
          'confirmedCandidateSlotId', null,
          'candidateSlots', jsonb_build_array(
            jsonb_build_object(
              'id', '63000000-0000-0000-0000-000000000003',
              'startsAt', '2026-08-03T23:30:00Z',
              'localStartsAt', '2026-08-03T19:30',
              'timezoneName', 'America/New_York',
              'timezoneSource', 'manual',
              'utcOffsetMinutes', -240,
              'durationMinutes', 105,
              'locationKind', 'off_site',
              'locationName', 'Library Auditorium',
              'offSiteApproved', true,
              'position', 0
            )
          )
        ),
        jsonb_build_object(
          'id', '62000000-0000-0000-0000-000000000001',
          'type', 'rehearsal',
          'visibility', 'internal',
          'position', 1,
          'confirmedCandidateSlotId', null,
          'candidateSlots', '[]'::jsonb
        )
      ),
      '[]'::jsonb
    )
  $$,
  'a Producer can edit, reorder, and remove nested plan records in one save'
);

select results_eq(
  $$
    select
      (select count(*) from public.show_occurrences where show_id = show.id),
      (
        select count(*)
        from public.show_candidate_slots as slot
        join public.show_occurrences as occurrence on occurrence.id = slot.occurrence_id
        where occurrence.show_id = show.id
      ),
      (select count(*) from public.show_resource_requests where show_id = show.id)
    from public.shows as show
    where show.slug = 'candidate-plan'
  $$,
  $$ values (2::bigint, 1::bigint, 0::bigint) $$,
  'omitted Candidate Slots and resource requests are removed without replacing the Event'
);

select * from finish();
rollback;
