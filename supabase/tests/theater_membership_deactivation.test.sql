begin;

select plan(14);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('78000000-0000-0000-0000-000000000001', 'deactivation-owner@stagecom.local', '{"full_name":"Deactivation Owner"}'),
  ('78000000-0000-0000-0000-000000000002', 'deactivation-member@stagecom.local', '{"full_name":"Deactivation Member"}');

select * from public.create_theater_with_owner(
  '78000000-0000-0000-0000-000000000001',
  'Deactivation Theater',
  'deactivation-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id,
  '78000000-0000-0000-0000-000000000002',
  array['member']::public.theater_role[],
  'active'::public.membership_status
from public.theaters
where slug = 'deactivation-theater';

insert into public.theater_member_capabilities (
  theater_id, user_id, capability, granted_by_user_id
)
select id,
  '78000000-0000-0000-0000-000000000002',
  capability,
  '78000000-0000-0000-0000-000000000001'
from public.theaters
cross join unnest(array[
  'proposer'::public.theater_capability,
  'reviewer'::public.theater_capability
]) as granted(capability)
where slug = 'deactivation-theater';

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'deactivation-theater'),
  '78000000-0000-0000-0000-000000000001',
  'Member History Event',
  'member-history-event',
  array[]::uuid[],
  '78000000-0000-0000-0000-000000000002'
);

select * from public.save_event_operational_plan(
  (select id from public.shows where slug = 'member-history-event'),
  '78000000-0000-0000-0000-000000000001',
  1,
  1,
  jsonb_build_array(jsonb_build_object(
    'id', '78000000-0000-0000-0001-000000000001',
    'type', 'performance',
    'visibility', 'public',
    'position', 0,
    'confirmedCandidateSlotId', '78000000-0000-0000-0002-000000000001',
    'candidateSlots', jsonb_build_array(jsonb_build_object(
      'id', '78000000-0000-0000-0002-000000000001',
      'startsAt', '2026-10-10T23:30:00Z',
      'durationMinutes', 90,
      'localStartsAt', '2026-10-10T19:30',
      'timezoneName', 'America/New_York',
      'timezoneSource', 'manual',
      'utcOffsetMinutes', -240,
      'locationKind', 'off_site',
      'locationName', 'History Stage',
      'offSiteApproved', true,
      'position', 0
    ))
  )),
  '[]'::jsonb
);

select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'member-history-event'),
  '78000000-0000-0000-0000-000000000002',
  '78000000-0000-0000-0000-000000000002'
);
select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'member-history-event'),
  '78000000-0000-0000-0000-000000000002',
  'accepted'
);
select * from public.set_occurrence_call(
  '78000000-0000-0000-0001-000000000001',
  '78000000-0000-0000-0000-000000000002',
  '78000000-0000-0000-0000-000000000002',
  'required',
  '78000000-0000-0000-0003-000000000001',
  null
);
select * from public.record_candidate_slot_availability(
  '78000000-0000-0000-0002-000000000001',
  '78000000-0000-0000-0000-000000000002',
  'available',
  '78000000-0000-0000-0003-000000000002',
  null
);
select * from public.save_event_proposed_cast(
  (select id from public.shows where slug = 'member-history-event'),
  '78000000-0000-0000-0000-000000000001',
  array['78000000-0000-0000-0000-000000000002'::uuid],
  '78000000-0000-0000-0003-000000000003'
);
select * from public.submit_event_proposal_revision(
  (select id from public.shows where slug = 'member-history-event'),
  '78000000-0000-0000-0000-000000000001',
  '78000000-0000-0000-0003-000000000004'
);

update public.show_proposal_revisions
set decision_state = 'approved', decision_version = 2
where show_id = (select id from public.shows where slug = 'member-history-event');

update public.shows
set status = 'approved'::public.show_status,
    lifecycle_status = 'approved'::public.show_lifecycle_status,
    publication_status = 'published'::public.show_publication_status,
    approved_proposal_revision_id = (
      select id from public.show_proposal_revisions
      where show_id = (select id from public.shows where slug = 'member-history-event')
    )
where slug = 'member-history-event';

insert into public.show_public_content_revisions (
  id, show_id, revision_number, title, description,
  admission_price_cents, sales_channel, last_command_id,
  created_by_user_id, updated_by_user_id, published_at
)
select
  '78000000-0000-0000-0004-000000000001', id, 1,
  'Member History Event', 'A published historical record.',
  0, 'no_advance_ticketing',
  '78000000-0000-0000-0004-000000000002',
  '78000000-0000-0000-0000-000000000001',
  '78000000-0000-0000-0000-000000000001',
  '2026-09-01T12:00:00Z'
from public.shows where slug = 'member-history-event';

update public.shows
set publication_status = 'published'::public.show_publication_status,
    published_public_content_revision_id = '78000000-0000-0000-0004-000000000001'
where slug = 'member-history-event';

insert into public.show_public_content_credits (
  revision_id, user_id, display_name, is_publicly_credited, position
) values (
  '78000000-0000-0000-0004-000000000001',
  '78000000-0000-0000-0000-000000000002',
  'Deactivation Member', true, 0
);

select has_function(
  'public',
  'deactivate_theater_membership',
  array['uuid', 'uuid', 'uuid', 'uuid', 'integer'],
  'Theater membership deactivation is exposed as one transactional command'
);

select lives_ok(
  format(
    'select * from public.deactivate_theater_membership(%L, %L, %L, %L, 1)',
    (select id from public.theaters where slug = 'deactivation-theater'),
    '78000000-0000-0000-0000-000000000002',
    '78000000-0000-0000-0000-000000000001',
    '78000000-0000-0000-0005-000000000001'
  ),
  'an active Owner can deactivate a Theater Member transactionally'
);

select is(
  (select count(*)
   from public.theater_member_capabilities
   where theater_id = (select id from public.theaters where slug = 'deactivation-theater')
     and user_id = '78000000-0000-0000-0000-000000000002'),
  0::bigint,
  'deactivation ends current Proposer and Reviewer capabilities'
);

select is(
  (select count(*)
   from public.show_leadership as leadership
   join public.shows as event on event.id = leadership.show_id
   where event.theater_id = (select id from public.theaters where slug = 'deactivation-theater')
     and leadership.user_id = '78000000-0000-0000-0000-000000000002'),
  0::bigint,
  'deactivation ends current Producer and Director assignments'
);

select results_eq(
  $$ select cast_member.status::text,
       (select count(*) from public.show_proposed_cast as proposed
        where proposed.show_id = cast_member.show_id
          and proposed.user_id = cast_member.user_id)
     from public.show_cast as cast_member
     join public.shows as event on event.id = cast_member.show_id
     where event.slug = 'member-history-event'
       and cast_member.user_id = '78000000-0000-0000-0000-000000000002' $$,
  $$ values ('removed'::text, 0::bigint) $$,
  'deactivation ends active Cast and current Proposed Cast assignments'
);

select results_eq(
  $$ select lifecycle_status::text, publication_status::text,
       operational_health::text
     from public.shows where slug = 'member-history-event' $$,
  $$ values ('approved'::text, 'published'::text, 'at_risk'::text) $$,
  'every affected approved Event is reevaluated without cancellation or unpublication'
);

select results_eq(
  $$ select actor_user_id, payload ->> 'cause'
     from public.activity_events
     where entity_id = (select id from public.shows where slug = 'member-history-event')
       and action = 'event.operational_health.at_risk' $$,
  $$ values (
       '78000000-0000-0000-0000-000000000001'::uuid,
       'membership_deactivated'::text
     ) $$,
  'membership deactivation reuses the centralized At Risk fact with its actor and cause'
);

select results_eq(
  $$ select revision.decision_state::text,
       revision.snapshot -> 'proposedCastUserIds' ->> 0,
       credit.display_name,
       credit.is_publicly_credited
     from public.show_proposal_revisions as revision
     join public.show_public_content_revisions as content
       on content.show_id = revision.show_id
     join public.show_public_content_credits as credit
       on credit.revision_id = content.id
     where revision.show_id = (select id from public.shows where slug = 'member-history-event') $$,
  $$ values (
       'approved'::text,
       '78000000-0000-0000-0000-000000000002'::text,
       'Deactivation Member'::text,
       true
     ) $$,
  'immutable Proposal history and published credit facts retain the deactivated person'
);

select lives_ok(
  format(
    'select * from public.deactivate_theater_membership(%L, %L, %L, %L, 1)',
    (select id from public.theaters where slug = 'deactivation-theater'),
    '78000000-0000-0000-0000-000000000002',
    '78000000-0000-0000-0000-000000000001',
    '78000000-0000-0000-0005-000000000001'
  ),
  'retrying the same membership-deactivation command is idempotent'
);

select throws_ok(
  format(
    'select * from public.deactivate_theater_membership(%L, %L, %L, %L, 1)',
    (select id from public.theaters where slug = 'deactivation-theater'),
    '78000000-0000-0000-0000-000000000002',
    '78000000-0000-0000-0000-000000000001',
    '78000000-0000-0000-0005-000000000002'
  ),
  '55000', null,
  'a stale membership version is rejected transactionally'
);

select throws_ok(
  format(
    'select * from public.deactivate_theater_membership(%L, %L, %L, %L, 1)',
    (select id from public.theaters where slug = 'deactivation-theater'),
    '78000000-0000-0000-0000-000000000001',
    '78000000-0000-0000-0000-000000000001',
    '78000000-0000-0000-0005-000000000003'
  ),
  '23514', null,
  'the last active Owner cannot be deactivated'
);

select throws_ok(
  format(
    'select * from public.deactivate_theater_membership(%L, %L, %L, %L, 1)',
    (select id from public.theaters where slug = 'deactivation-theater'),
    '78000000-0000-0000-0000-000000000001',
    '78000000-0000-0000-0000-000000000002',
    '78000000-0000-0000-0005-000000000004'
  ),
  '42501', null,
  'inactive Members cannot deactivate Theater membership'
);

select results_eq(
  $$ select action, count(*)
     from public.activity_events
     where theater_id = (select id from public.theaters where slug = 'deactivation-theater')
       and action in (
         'theater.membership.deactivated',
         'event.leadership.ended',
         'event.cast.removed'
       )
     group by action order by action $$,
  $$ values
       ('event.cast.removed'::text, 1::bigint),
       ('event.leadership.ended'::text, 1::bigint),
       ('theater.membership.deactivated'::text, 1::bigint) $$,
  'deactivation and each downstream assignment effect emit durable Theater-local facts'
);

select results_eq(
  $$ select count(*), count(distinct user_id::text || ':' || dedupe_key)
     from public.notifications
     where user_id = '78000000-0000-0000-0000-000000000002'
       and type = 'theater.membership.deactivated' $$,
  $$ values (1::bigint, 1::bigint) $$,
  'the deactivated Member receives one deduplicated notification across retries'
);

select * from finish();
rollback;
