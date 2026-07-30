create extension if not exists btree_gist;

create type public.proposal_counteroffer_state as enum (
  'pending',
  'accepted',
  'declined',
  'expired'
);

create type public.proposal_counteroffer_response as enum ('accept', 'decline');
create type public.schedule_reservation_kind as enum (
  'counteroffer_hold',
  'approved_commitment'
);
create type public.schedule_reservation_status as enum ('active', 'released');

create table public.show_counteroffers (
  id uuid primary key default gen_random_uuid(),
  proposal_revision_id uuid not null
    references public.show_proposal_revisions(id) on delete cascade,
  occurrence_id uuid not null references public.show_occurrences(id) on delete cascade,
  candidate_slot_id uuid not null references public.show_candidate_slots(id) on delete restrict,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  response_deadline timestamptz not null,
  state public.proposal_counteroffer_state not null default 'pending',
  command_id uuid not null unique,
  response_command_id uuid unique,
  responded_by_user_id uuid references public.profiles(id) on delete restrict,
  responded_at timestamptz,
  resulting_proposal_revision_id uuid
    references public.show_proposal_revisions(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint show_counteroffers_deadline_check check (response_deadline > created_at),
  constraint show_counteroffers_response_check check (
    (state = 'pending' and response_command_id is null and responded_at is null)
    or
    (state <> 'pending' and responded_at is not null)
  )
);

create unique index show_counteroffers_one_pending_revision
  on public.show_counteroffers (proposal_revision_id)
  where state = 'pending';
create index show_counteroffers_pending_deadline
  on public.show_counteroffers (response_deadline)
  where state = 'pending';

create table public.show_availability_requests (
  counteroffer_id uuid not null references public.show_counteroffers(id) on delete cascade,
  candidate_slot_id uuid not null references public.show_candidate_slots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  closed_at timestamptz,
  primary key (counteroffer_id, user_id)
);

create index show_availability_requests_user_open
  on public.show_availability_requests (user_id, requested_at)
  where responded_at is null and closed_at is null;

create table public.show_schedule_reservations (
  id uuid primary key default gen_random_uuid(),
  theater_id uuid not null references public.theaters(id) on delete cascade,
  resource_id uuid not null,
  show_id uuid not null references public.shows(id) on delete cascade,
  occurrence_id uuid not null references public.show_occurrences(id) on delete cascade,
  candidate_slot_id uuid not null references public.show_candidate_slots(id) on delete restrict,
  counteroffer_id uuid unique references public.show_counteroffers(id) on delete cascade,
  proposal_revision_id uuid references public.show_proposal_revisions(id) on delete cascade,
  kind public.schedule_reservation_kind not null,
  status public.schedule_reservation_status not null default 'active',
  reserved_during tstzrange not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  constraint show_schedule_reservations_reference_check check (
    (kind = 'counteroffer_hold' and counteroffer_id is not null and proposal_revision_id is null)
    or
    (kind = 'approved_commitment' and counteroffer_id is null and proposal_revision_id is not null)
  ),
  constraint show_schedule_reservations_release_check check (
    (status = 'active' and released_at is null)
    or
    (status = 'released' and released_at is not null)
  ),
  constraint show_schedule_reservations_nonempty_check check (not isempty(reserved_during)),
  exclude using gist (
    theater_id with =,
    resource_id with =,
    reserved_during with &&
  ) where (status = 'active')
);

create unique index show_schedule_approved_occurrence
  on public.show_schedule_reservations (proposal_revision_id, occurrence_id)
  where kind = 'approved_commitment';

insert into public.show_schedule_reservations (
  theater_id, resource_id, show_id, occurrence_id, candidate_slot_id,
  proposal_revision_id, kind, reserved_during, created_at
)
select
  show_record.theater_id,
  (slot ->> 'resourceId')::uuid,
  show_record.id,
  (occurrence ->> 'id')::uuid,
  (slot ->> 'candidateSlotId')::uuid,
  revision.id,
  'approved_commitment'::public.schedule_reservation_kind,
  tstzrange(
    (slot ->> 'startsAt')::timestamptz
      - make_interval(mins => theater.setup_buffer_minutes),
    (slot ->> 'startsAt')::timestamptz
      + make_interval(
          mins => (slot ->> 'durationMinutes')::integer
            + theater.turnover_buffer_minutes
        ),
    '[)'
  ),
  revision.submitted_at
from public.shows show_record
join public.show_proposal_revisions revision
  on revision.id = show_record.approved_proposal_revision_id
join public.theaters theater on theater.id = show_record.theater_id
cross join lateral jsonb_array_elements(revision.snapshot -> 'occurrences') occurrence
cross join lateral (select occurrence -> 'confirmedSlot' as slot) offered
where slot ->> 'locationKind' = 'primary_venue';

alter table public.show_counteroffers enable row level security;
alter table public.show_availability_requests enable row level security;
alter table public.show_schedule_reservations enable row level security;

create policy "show_counteroffers_select_collaborators"
on public.show_counteroffers
for select
to authenticated
using (
  exists (
    select 1
    from public.show_proposal_revisions revision
    where revision.id = proposal_revision_id
      and (
        public.is_event_operational_viewer(revision.show_id, (select auth.uid()))
        or exists (
          select 1 from public.show_proposed_cast proposed
          where proposed.show_id = revision.show_id
            and proposed.user_id = (select auth.uid())
        )
      )
  )
);

create policy "show_availability_requests_select_own_or_operational"
on public.show_availability_requests
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.show_counteroffers counteroffer
    join public.show_proposal_revisions revision
      on revision.id = counteroffer.proposal_revision_id
    where counteroffer.id = counteroffer_id
      and public.is_event_operational_viewer(revision.show_id, (select auth.uid()))
  )
);

create policy "show_schedule_reservations_select_operational"
on public.show_schedule_reservations
for select
to authenticated
using (public.is_event_operational_viewer(show_id, (select auth.uid())));

create or replace function public.mark_counteroffer_availability_responded()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  update public.show_availability_requests request
  set responded_at = new.responded_at
  where request.candidate_slot_id = new.candidate_slot_id
    and request.user_id = new.user_id
    and request.closed_at is null;
  return new;
end;
$function$;

create trigger trg_mark_counteroffer_availability_responded
  after insert or update on public.show_availability_responses
  for each row execute procedure public.mark_counteroffer_availability_responded();

create or replace function public.project_counteroffer_notifications(
  p_activity_event_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.activity_events%rowtype;
  v_counteroffer public.show_counteroffers%rowtype;
  v_revision public.show_proposal_revisions%rowtype;
begin
  select * into v_event from public.activity_events where id = p_activity_event_id;
  if not found or v_event.action <> 'event.proposal_counteroffer.issued' then
    return;
  end if;

  select * into v_counteroffer
  from public.show_counteroffers
  where id = (v_event.payload ->> 'counterofferId')::uuid;
  select * into v_revision
  from public.show_proposal_revisions where id = v_counteroffer.proposal_revision_id;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  )
  select
    request.user_id,
    'event.counteroffer.availability_requested',
    'show'::public.notification_entity,
    v_revision.show_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'candidateSlotId', v_counteroffer.candidate_slot_id,
      'counterofferId', v_counteroffer.id,
      'eventId', v_revision.show_id,
      'responseDeadline', v_counteroffer.response_deadline,
      'theaterId', v_event.theater_id
    ),
    'counteroffer-availability:' || v_counteroffer.id::text
  from public.show_availability_requests request
  where request.counteroffer_id = v_counteroffer.id
  on conflict (user_id, dedupe_key) do nothing;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  )
  select
    leadership.user_id,
    'event.proposal_counteroffer.issued',
    'show'::public.notification_entity,
    v_revision.show_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'candidateSlotId', v_counteroffer.candidate_slot_id,
      'counterofferId', v_counteroffer.id,
      'eventId', v_revision.show_id,
      'responseDeadline', v_counteroffer.response_deadline,
      'theaterId', v_event.theater_id
    ),
    'counteroffer-issued:' || v_counteroffer.id::text
  from public.show_leadership leadership
  where leadership.show_id = v_revision.show_id
    and leadership.role = 'producer'::public.event_leadership_role
    and leadership.user_id <> v_counteroffer.actor_user_id
  on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.expire_proposal_counteroffers(
  p_now timestamptz default now(),
  p_show_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_offer public.show_counteroffers%rowtype;
  v_revision public.show_proposal_revisions%rowtype;
  v_show public.shows%rowtype;
  v_expired_count integer := 0;
  v_activity_event_id uuid;
begin
  for v_offer in
    select counteroffer.*
    from public.show_counteroffers counteroffer
    join public.show_proposal_revisions revision
      on revision.id = counteroffer.proposal_revision_id
    where counteroffer.state = 'pending'::public.proposal_counteroffer_state
      and counteroffer.response_deadline <= p_now
      and (p_show_id is null or revision.show_id = p_show_id)
    order by counteroffer.response_deadline, counteroffer.id
    for update of counteroffer skip locked
  loop
    select * into v_revision
    from public.show_proposal_revisions
    where id = v_offer.proposal_revision_id
    for update;
    select * into v_show from public.shows where id = v_revision.show_id;

    update public.show_counteroffers
    set state = 'expired'::public.proposal_counteroffer_state,
        responded_at = p_now
    where id = v_offer.id;

    update public.show_schedule_reservations
    set status = 'released'::public.schedule_reservation_status,
        released_at = p_now
    where counteroffer_id = v_offer.id
      and status = 'active'::public.schedule_reservation_status;

    update public.show_availability_requests
    set closed_at = p_now
    where counteroffer_id = v_offer.id and closed_at is null;

    update public.show_proposal_revisions
    set decision_state = 'pending'::public.proposal_decision_state,
        decision_version = decision_version + 1
    where id = v_revision.id
      and decision_state = 'counteroffered'::public.proposal_decision_state;

    insert into public.activity_events (
      theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
    ) values (
      v_show.theater_id, 'event', v_show.id, null,
      'event.proposal_counteroffer.expired',
      'member_visible'::public.activity_visibility,
      jsonb_build_object(
        'counterofferId', v_offer.id,
        'proposalRevisionId', v_offer.proposal_revision_id,
        'responseDeadline', v_offer.response_deadline
      )
    ) returning id into v_activity_event_id;

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$function$;

create or replace function public.issue_proposal_counteroffer(
  p_proposal_revision_id uuid,
  p_occurrence_id uuid,
  p_actor_user_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_local_starts_at timestamp without time zone,
  p_timezone_name text,
  p_timezone_source public.timezone_source,
  p_utc_offset_minutes integer,
  p_location_kind public.slot_location_kind,
  p_location_name text,
  p_command_id uuid,
  p_expected_version integer,
  p_response_deadline timestamptz default null,
  p_now timestamptz default now()
)
returns public.show_counteroffers
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_revision public.show_proposal_revisions%rowtype;
  v_show public.shows%rowtype;
  v_theater public.theaters%rowtype;
  v_membership public.theater_memberships%rowtype;
  v_counteroffer public.show_counteroffers%rowtype;
  v_candidate_slot public.show_candidate_slots%rowtype;
  v_deadline timestamptz;
  v_is_reviewer boolean;
  v_activity_event_id uuid;
  v_position integer;
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_actor_user_id then
    raise insufficient_privilege using message = 'The authenticated Reviewer identity is required.';
  end if;

  select * into v_counteroffer
  from public.show_counteroffers where command_id = p_command_id;
  if found then
    if v_counteroffer.proposal_revision_id <> p_proposal_revision_id
      or v_counteroffer.actor_user_id <> p_actor_user_id
    then
      raise unique_violation using message = 'Counteroffer command identity is already in use.';
    end if;
    return v_counteroffer;
  end if;

  perform public.expire_proposal_counteroffers(p_now, null);

  select * into v_revision
  from public.show_proposal_revisions
  where id = p_proposal_revision_id
  for update;
  if not found then
    raise no_data_found using message = 'Proposal Revision was not found.';
  end if;
  select * into v_show from public.shows where id = v_revision.show_id for update;
  select * into v_theater from public.theaters where id = v_show.theater_id for update;

  select * into v_membership
  from public.theater_memberships
  where theater_id = v_show.theater_id
    and user_id = p_actor_user_id
    and status = 'active'::public.membership_status;
  if not found then
    raise insufficient_privilege using message = 'Current active Reviewer membership is required.';
  end if;

  v_is_reviewer := 'owner'::public.theater_role = any(v_membership.roles)
    or 'admin'::public.theater_role = any(v_membership.roles)
    or exists (
      select 1 from public.theater_member_capabilities capability
      where capability.theater_id = v_show.theater_id
        and capability.user_id = p_actor_user_id
        and capability.capability = 'reviewer'::public.theater_capability
    );
  if not v_is_reviewer then
    raise insufficient_privilege using message = 'Current Reviewer authority is required.';
  end if;
  if v_revision.submitted_by = p_actor_user_id then
    raise insufficient_privilege using message = 'A Proposal Revision author cannot Counteroffer their own revision.';
  end if;
  if v_revision.decision_state <> 'pending'::public.proposal_decision_state then
    raise object_not_in_prerequisite_state using message = 'This Proposal Revision is not awaiting review.';
  end if;
  if p_expected_version is null or p_expected_version <> v_revision.decision_version then
    raise object_not_in_prerequisite_state using message = 'The Proposal Revision changed before this Counteroffer was saved.';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_revision.snapshot -> 'occurrences') occurrence
    where occurrence ->> 'id' = p_occurrence_id::text
  ) then
    raise invalid_parameter_value using message = 'The target Occurrence is not part of this Proposal Revision.';
  end if;
  if p_duration_minutes not between 15 and 1440
    or nullif(btrim(p_timezone_name), '') is null
    or p_utc_offset_minutes not between -840 and 840
  then
    raise invalid_parameter_value using message = 'The offered slot is invalid.';
  end if;

  v_deadline := coalesce(
    p_response_deadline,
    p_now + make_interval(hours => v_theater.counteroffer_response_hours)
  );
  if v_deadline <= p_now
    or v_deadline > p_now + interval '720 hours'
  then
    raise invalid_parameter_value using message = 'The Counteroffer deadline must be within the next 720 hours.';
  end if;

  select slot.* into v_candidate_slot
  from public.show_candidate_slots slot
  where slot.occurrence_id = p_occurrence_id
    and slot.starts_at = p_starts_at
    and slot.duration_minutes = p_duration_minutes
    and slot.location_kind = p_location_kind
    and (
      (p_location_kind = 'primary_venue' and slot.resource_id = v_theater.primary_venue_id)
      or
      (p_location_kind = 'off_site' and slot.resource_id is null and slot.location_name = btrim(p_location_name))
    )
  limit 1;

  if not found then
    select coalesce(max(position), -1) + 1 into v_position
    from public.show_candidate_slots where occurrence_id = p_occurrence_id;
    insert into public.show_candidate_slots (
      occurrence_id, starts_at, duration_minutes, local_starts_at,
      timezone_name, timezone_source, utc_offset_minutes, location_kind,
      resource_id, location_name, off_site_approved, position
    ) values (
      p_occurrence_id, p_starts_at, p_duration_minutes, p_local_starts_at,
      btrim(p_timezone_name), p_timezone_source, p_utc_offset_minutes, p_location_kind,
      case when p_location_kind = 'primary_venue' then v_theater.primary_venue_id else null end,
      case when p_location_kind = 'primary_venue'
        then coalesce(v_theater.primary_venue_name, v_theater.name)
        else btrim(p_location_name)
      end,
      p_location_kind = 'off_site', v_position
    ) returning * into v_candidate_slot;
  end if;

  insert into public.show_counteroffers (
    proposal_revision_id, occurrence_id, candidate_slot_id, actor_user_id,
    response_deadline, command_id, created_at
  ) values (
    v_revision.id, p_occurrence_id, v_candidate_slot.id, p_actor_user_id,
    v_deadline, p_command_id, p_now
  ) returning * into v_counteroffer;

  if p_location_kind = 'primary_venue' then
    begin
      insert into public.show_schedule_reservations (
        theater_id, resource_id, show_id, occurrence_id, candidate_slot_id,
        counteroffer_id, kind, reserved_during, created_at
      ) values (
        v_show.theater_id, v_theater.primary_venue_id, v_show.id,
        p_occurrence_id, v_candidate_slot.id, v_counteroffer.id,
        'counteroffer_hold'::public.schedule_reservation_kind,
        tstzrange(
          p_starts_at - make_interval(mins => v_theater.setup_buffer_minutes),
          p_starts_at + make_interval(mins => p_duration_minutes + v_theater.turnover_buffer_minutes),
          '[)'
        ),
        p_now
      );
    exception when exclusion_violation then
      raise object_not_in_prerequisite_state
        using message = 'The Primary Venue is already reserved during this buffered time.';
    end;
  end if;

  insert into public.show_availability_requests (
    counteroffer_id, candidate_slot_id, user_id, requested_at
  )
  select v_counteroffer.id, v_candidate_slot.id, proposed.user_id, p_now
  from public.show_proposed_cast proposed
  where proposed.show_id = v_show.id
    and not exists (
      select 1 from public.show_availability_responses response
      where response.candidate_slot_id = v_candidate_slot.id
        and response.user_id = proposed.user_id
    );

  update public.show_proposal_revisions
  set decision_state = 'counteroffered'::public.proposal_decision_state,
      decision_version = decision_version + 1
  where id = v_revision.id;

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload, created_at
  ) values (
    v_show.theater_id, 'event', v_show.id, p_actor_user_id,
    'event.proposal_counteroffer.issued',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'candidateSlotId', v_candidate_slot.id,
      'counterofferId', v_counteroffer.id,
      'proposalRevisionId', v_revision.id,
      'responseDeadline', v_deadline,
      'commandId', p_command_id
    ),
    p_now
  ) returning id into v_activity_event_id;
  perform public.project_counteroffer_notifications(v_activity_event_id);

  return v_counteroffer;
end;
$function$;

alter function public.submit_event_proposal_revision(uuid, uuid, uuid)
  rename to submit_event_proposal_revision_without_reservations;

create or replace function public.submit_event_proposal_revision(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_command_id uuid
)
returns public.show_proposal_revisions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_theater public.theaters%rowtype;
  v_occurrence record;
  v_conflict public.show_schedule_reservations%rowtype;
begin
  perform public.expire_proposal_counteroffers(now(), null);

  select * into v_show from public.shows where id = p_show_id;
  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;
  select * into v_theater from public.theaters where id = v_show.theater_id for update;

  for v_occurrence in
    select occurrence.id, slot.id as candidate_slot_id, slot.starts_at,
      slot.duration_minutes, slot.resource_id
    from public.show_occurrences occurrence
    join public.show_candidate_slots slot on slot.id = occurrence.confirmed_candidate_slot_id
    where occurrence.show_id = p_show_id
      and slot.location_kind = 'primary_venue'::public.slot_location_kind
  loop
    select * into v_conflict
    from public.show_schedule_reservations reservation
    where reservation.theater_id = v_show.theater_id
      and reservation.resource_id = v_occurrence.resource_id
      and reservation.status = 'active'::public.schedule_reservation_status
      and reservation.show_id <> p_show_id
      and reservation.reserved_during && tstzrange(
        v_occurrence.starts_at - make_interval(mins => v_theater.setup_buffer_minutes),
        v_occurrence.starts_at + make_interval(mins => v_occurrence.duration_minutes + v_theater.turnover_buffer_minutes),
        '[)'
      )
    limit 1;
    if found then
      raise invalid_parameter_value
        using message = 'The Proposal Revision is blocked.',
          detail = jsonb_build_array(jsonb_build_object(
            'code', 'primary_venue_conflict',
            'occurrenceId', v_occurrence.id,
            'conflictingEventId', v_conflict.show_id,
            'message', 'The Confirmed Slot conflicts with an active Primary Venue reservation including setup and turnover buffer.'
          ))::text;
    end if;
  end loop;

  return public.submit_event_proposal_revision_without_reservations(
    p_show_id, p_actor_user_id, p_command_id
  );
end;
$function$;

create or replace function public.respond_to_proposal_counteroffer(
  p_counteroffer_id uuid,
  p_actor_user_id uuid,
  p_response public.proposal_counteroffer_response,
  p_command_id uuid,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_offer public.show_counteroffers%rowtype;
  v_revision public.show_proposal_revisions%rowtype;
  v_show public.shows%rowtype;
  v_occurrence public.show_occurrences%rowtype;
  v_slot public.show_candidate_slots%rowtype;
  v_new_revision public.show_proposal_revisions%rowtype;
  v_blockers jsonb := '[]'::jsonb;
  v_required_missing jsonb;
  v_available_count integer;
begin
  if auth.role() <> 'service_role' then
    raise insufficient_privilege using message = 'Counteroffer responses require the app service role.';
  end if;

  select * into v_offer from public.show_counteroffers where id = p_counteroffer_id;
  if not found then
    raise no_data_found using message = 'Counteroffer was not found.';
  end if;
  if v_offer.response_command_id = p_command_id then
    select * into v_new_revision
    from public.show_proposal_revisions where id = v_offer.resulting_proposal_revision_id;
    return jsonb_build_object(
      'counterofferId', v_offer.id,
      'response', case when v_offer.state = 'accepted' then 'accept' else 'decline' end,
      'respondedAt', v_offer.responded_at,
      'proposalRevision', case when v_new_revision.id is null then null else to_jsonb(v_new_revision) end
    );
  elsif v_offer.response_command_id is not null then
    raise unique_violation using message = 'This Counteroffer already has a different response.';
  end if;

  perform public.expire_proposal_counteroffers(p_now, null);
  select * into v_offer from public.show_counteroffers where id = p_counteroffer_id for update;
  if v_offer.state <> 'pending'::public.proposal_counteroffer_state then
    raise object_not_in_prerequisite_state using message = 'This Counteroffer is no longer awaiting a response.';
  end if;

  select * into v_revision from public.show_proposal_revisions
  where id = v_offer.proposal_revision_id for update;
  select * into v_show from public.shows where id = v_revision.show_id for update;
  select * into v_occurrence from public.show_occurrences where id = v_offer.occurrence_id;
  select * into v_slot from public.show_candidate_slots where id = v_offer.candidate_slot_id;

  if not public.is_eligible_event_producer(v_show.theater_id, p_actor_user_id)
    or not exists (
      select 1 from public.show_leadership leadership
      where leadership.show_id = v_show.id
        and leadership.user_id = p_actor_user_id
        and leadership.role = 'producer'::public.event_leadership_role
    )
  then
    raise insufficient_privilege using message = 'Current Event Producer access is required.';
  end if;

  if p_response = 'accept'::public.proposal_counteroffer_response then
    select coalesce(jsonb_agg(jsonb_build_object(
      'userId', call_record.user_id,
      'reason', coalesce(response.response::text, 'no_response')
    ) order by call_record.user_id), '[]'::jsonb)
    into v_required_missing
    from public.show_occurrence_calls call_record
    join public.show_proposed_cast proposed
      on proposed.show_id = v_show.id and proposed.user_id = call_record.user_id
    left join public.show_availability_responses response
      on response.candidate_slot_id = v_slot.id and response.user_id = call_record.user_id
    where call_record.occurrence_id = v_occurrence.id
      and call_record.call = 'required'::public.occurrence_call
      and response.response is distinct from 'available'::public.availability_response;

    if jsonb_array_length(v_required_missing) > 0 then
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code', 'required_cast_unconfirmed',
        'occurrenceId', v_occurrence.id,
        'members', v_required_missing,
        'message', 'Every required Cast Member must be available for the offered slot.'
      ));
    end if;

    if v_occurrence.occurrence_type = 'performance'::public.occurrence_type then
      select count(*) into v_available_count
      from public.show_occurrence_calls call_record
      join public.show_proposed_cast proposed
        on proposed.show_id = v_show.id and proposed.user_id = call_record.user_id
      join public.show_availability_responses response
        on response.candidate_slot_id = v_slot.id
        and response.user_id = call_record.user_id
        and response.response = 'available'::public.availability_response
      where call_record.occurrence_id = v_occurrence.id
        and call_record.call <> 'not_called'::public.occurrence_call;
      if v_available_count < v_show.minimum_viable_cast then
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'code', 'minimum_viable_cast_unmet',
          'occurrenceId', v_occurrence.id,
          'availableCount', v_available_count,
          'minimumViableCast', v_show.minimum_viable_cast,
          'message', format('The offered slot has %s available called Cast Members; %s are required.', v_available_count, v_show.minimum_viable_cast)
        ));
      end if;
    end if;

    if jsonb_array_length(v_blockers) > 0 then
      raise invalid_parameter_value
        using message = 'Counteroffer acceptance is blocked.', detail = v_blockers::text;
    end if;

    update public.show_occurrences
    set confirmed_candidate_slot_id = v_slot.id,
        starts_at = v_slot.starts_at,
        ends_at = v_slot.starts_at + make_interval(mins => v_slot.duration_minutes)
    where id = v_occurrence.id;
    update public.shows
    set status = 'draft'::public.show_status,
        lifecycle_status = 'draft'::public.show_lifecycle_status,
        updated_at = p_now
    where id = v_show.id;
  end if;

  update public.show_counteroffers
  set state = case p_response
        when 'accept'::public.proposal_counteroffer_response then 'accepted'::public.proposal_counteroffer_state
        else 'declined'::public.proposal_counteroffer_state
      end,
      response_command_id = p_command_id,
      responded_by_user_id = p_actor_user_id,
      responded_at = p_now
  where id = v_offer.id;
  update public.show_schedule_reservations
  set status = 'released'::public.schedule_reservation_status,
      released_at = p_now
  where counteroffer_id = v_offer.id and status = 'active'::public.schedule_reservation_status;
  update public.show_availability_requests
  set closed_at = p_now where counteroffer_id = v_offer.id and closed_at is null;

  if p_response = 'decline'::public.proposal_counteroffer_response then
    update public.show_proposal_revisions
    set decision_state = 'pending'::public.proposal_decision_state,
        decision_version = decision_version + 1
    where id = v_revision.id and decision_state = 'counteroffered'::public.proposal_decision_state;
  else
    v_new_revision := public.submit_event_proposal_revision(
      v_show.id, p_actor_user_id, p_command_id
    );
    update public.show_counteroffers
    set resulting_proposal_revision_id = v_new_revision.id
    where id = v_offer.id;
  end if;

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload, created_at
  ) values (
    v_show.theater_id, 'event', v_show.id, p_actor_user_id,
    case when p_response = 'accept'::public.proposal_counteroffer_response
      then 'event.proposal_counteroffer.accepted'
      else 'event.proposal_counteroffer.declined'
    end,
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'counterofferId', v_offer.id,
      'proposalRevisionId', v_offer.proposal_revision_id,
      'resultingProposalRevisionId', v_new_revision.id,
      'commandId', p_command_id
    ),
    p_now
  );

  return jsonb_build_object(
    'counterofferId', v_offer.id,
    'response', p_response,
    'respondedAt', p_now,
    'proposalRevision', case when v_new_revision.id is null then null else to_jsonb(v_new_revision) end
  );
end;
$function$;

create or replace function public.reserve_approved_proposal_commitments()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_revision public.show_proposal_revisions%rowtype;
  v_show public.shows%rowtype;
  v_theater public.theaters%rowtype;
  v_occurrence jsonb;
  v_slot jsonb;
begin
  if new.action <> 'approve'::public.proposal_review_action then
    return new;
  end if;
  select * into v_revision from public.show_proposal_revisions
  where id = new.proposal_revision_id;
  select * into v_show from public.shows where id = v_revision.show_id;
  select * into v_theater from public.theaters where id = v_show.theater_id for update;

  for v_occurrence in select value from jsonb_array_elements(v_revision.snapshot -> 'occurrences')
  loop
    v_slot := v_occurrence -> 'confirmedSlot';
    if v_slot ->> 'locationKind' = 'primary_venue' then
      begin
        insert into public.show_schedule_reservations (
          theater_id, resource_id, show_id, occurrence_id, candidate_slot_id,
          proposal_revision_id, kind, reserved_during
        ) values (
          v_show.theater_id, (v_slot ->> 'resourceId')::uuid, v_show.id,
          (v_occurrence ->> 'id')::uuid, (v_slot ->> 'candidateSlotId')::uuid,
          v_revision.id, 'approved_commitment'::public.schedule_reservation_kind,
          tstzrange(
            (v_slot ->> 'startsAt')::timestamptz - make_interval(mins => v_theater.setup_buffer_minutes),
            (v_slot ->> 'startsAt')::timestamptz + make_interval(mins => (v_slot ->> 'durationMinutes')::integer + v_theater.turnover_buffer_minutes),
            '[)'
          )
        );
      exception when exclusion_violation then
        raise object_not_in_prerequisite_state
          using message = 'The Primary Venue is already reserved during this buffered time.';
      end;
    end if;
  end loop;
  return new;
end;
$function$;

create trigger trg_reserve_approved_proposal_commitments
  before insert on public.show_proposal_decisions
  for each row execute procedure public.reserve_approved_proposal_commitments();

create or replace function public.release_invalidated_approved_commitments()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if old.approved_proposal_revision_id is not null
    and new.approved_proposal_revision_id is null
  then
    update public.show_schedule_reservations
    set status = 'released'::public.schedule_reservation_status,
        released_at = now()
    where proposal_revision_id = old.approved_proposal_revision_id
      and status = 'active'::public.schedule_reservation_status;
  end if;
  return new;
end;
$function$;

create trigger trg_release_invalidated_approved_commitments
  after update of approved_proposal_revision_id on public.shows
  for each row execute procedure public.release_invalidated_approved_commitments();

create or replace function public.can_respond_to_proposal_counteroffer(
  p_counteroffer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.show_counteroffers counteroffer
    join public.show_proposal_revisions revision
      on revision.id = counteroffer.proposal_revision_id
    join public.shows show_record on show_record.id = revision.show_id
    join public.show_leadership leadership
      on leadership.show_id = show_record.id
      and leadership.user_id = (select auth.uid())
      and leadership.role = 'producer'::public.event_leadership_role
    where counteroffer.id = p_counteroffer_id
      and public.is_eligible_event_producer(
        show_record.theater_id,
        (select auth.uid())
      )
  );
$function$;

revoke all on function public.issue_proposal_counteroffer(
  uuid, uuid, uuid, timestamptz, integer, timestamp without time zone,
  text, public.timezone_source, integer, public.slot_location_kind, text,
  uuid, integer, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.issue_proposal_counteroffer(
  uuid, uuid, uuid, timestamptz, integer, timestamp without time zone,
  text, public.timezone_source, integer, public.slot_location_kind, text,
  uuid, integer, timestamptz, timestamptz
) to authenticated, service_role;

revoke all on function public.respond_to_proposal_counteroffer(
  uuid, uuid, public.proposal_counteroffer_response, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.respond_to_proposal_counteroffer(
  uuid, uuid, public.proposal_counteroffer_response, uuid, timestamptz
) to service_role;

revoke all on function public.expire_proposal_counteroffers(timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.expire_proposal_counteroffers(timestamptz, uuid)
  to service_role;

revoke all on function public.can_respond_to_proposal_counteroffer(uuid)
  from public, anon, authenticated;
grant execute on function public.can_respond_to_proposal_counteroffer(uuid)
  to authenticated, service_role;

revoke all on function public.submit_event_proposal_revision_without_reservations(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.submit_event_proposal_revision(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.submit_event_proposal_revision(uuid, uuid, uuid)
  to service_role;

grant select on public.show_counteroffers, public.show_availability_requests,
  public.show_schedule_reservations to authenticated;
grant select, insert, update, delete on public.show_counteroffers,
  public.show_availability_requests, public.show_schedule_reservations to service_role;
