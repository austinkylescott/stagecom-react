create type public.proposal_decision_state as enum (
  'pending',
  'changes_requested',
  'counteroffered',
  'approved',
  'denied'
);

create table public.show_proposed_cast (
  show_id uuid not null references public.shows(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selected_by uuid not null references public.profiles(id) on delete restrict,
  selected_at timestamptz not null default now(),
  primary key (show_id, user_id),
  foreign key (show_id, user_id)
    references public.show_cast(show_id, user_id) on delete cascade
);

create table public.show_proposal_revisions (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  decision_state public.proposal_decision_state not null default 'pending',
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  command_id uuid not null unique,
  snapshot jsonb not null,
  unique (show_id, revision_number)
);

create index show_proposal_revisions_show_submitted
  on public.show_proposal_revisions (show_id, revision_number desc);

alter table public.show_proposed_cast enable row level security;
alter table public.show_proposal_revisions enable row level security;

create policy "show_proposed_cast_select_operational"
on public.show_proposed_cast
for select
to authenticated
using (
  public.is_event_operational_viewer(show_id, (select auth.uid()))
  or public.event_cast_status_for_actor(show_id, (select auth.uid())) = 'accepted'
);

create policy "show_proposal_revisions_select_operational"
on public.show_proposal_revisions
for select
to authenticated
using (public.is_event_operational_viewer(show_id, (select auth.uid())));

create or replace function public.prevent_proposal_revision_mutation()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  -- Preserve aggregate ownership: deleting a parent Event or Theater may
  -- cascade its complete history, while direct revision mutation is rejected.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  raise object_not_in_prerequisite_state
    using message = 'Submitted Proposal Revisions are immutable.';
end;
$function$;

create trigger trg_show_proposal_revisions_immutable
  before update or delete on public.show_proposal_revisions
  for each row execute procedure public.prevent_proposal_revision_mutation();

create or replace function public.save_event_proposed_cast(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_cast_user_ids uuid[],
  p_command_id uuid
)
returns uuid[]
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_selected_count integer;
begin
  if exists (
    select 1 from public.activity_events
    where id = p_command_id
      and entity_id = p_show_id
      and action = 'event.proposed_cast.updated'
  ) then
    return array(
      select user_id from public.show_proposed_cast
      where show_id = p_show_id order by user_id
    );
  end if;

  select * into v_show from public.shows where id = p_show_id for update;
  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if v_show.lifecycle_status <> 'draft'::public.show_lifecycle_status then
    raise object_not_in_prerequisite_state
      using message = 'The Proposed Cast is editable only while the Event is a draft.';
  end if;

  if not public.is_eligible_event_producer(v_show.theater_id, p_actor_user_id)
    or not exists (
      select 1 from public.show_leadership
      where show_id = p_show_id
        and user_id = p_actor_user_id
        and role = 'producer'::public.event_leadership_role
    )
  then
    raise insufficient_privilege using message = 'Eligible Event Producer access is required.';
  end if;

  if p_cast_user_ids is null
    or cardinality(p_cast_user_ids) > 500
    or cardinality(p_cast_user_ids) <> (
      select count(distinct user_id) from unnest(p_cast_user_ids) as selected(user_id)
    )
  then
    raise invalid_parameter_value using message = 'Proposed Cast identifiers must be a unique array.';
  end if;

  select count(*) into v_selected_count
  from unnest(p_cast_user_ids) as selected(user_id)
  join public.show_cast as cast_member
    on cast_member.show_id = p_show_id
    and cast_member.user_id = selected.user_id
    and cast_member.status = 'accepted'::public.show_cast_status
  join public.theater_memberships as membership
    on membership.theater_id = v_show.theater_id
    and membership.user_id = selected.user_id
    and membership.status = 'active'::public.membership_status;

  if v_selected_count <> cardinality(p_cast_user_ids) then
    raise invalid_parameter_value
      using message = 'Only accepted active Cast Members may be selected for the Proposed Cast.';
  end if;

  delete from public.show_proposed_cast where show_id = p_show_id;

  insert into public.show_proposed_cast (show_id, user_id, selected_by)
  select p_show_id, selected.user_id, p_actor_user_id
  from unnest(p_cast_user_ids) as selected(user_id);

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_command_id,
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.proposed_cast.updated',
    'member_visible'::public.activity_visibility,
    jsonb_build_object('castMemberUserIds', to_jsonb(p_cast_user_ids))
  );

  return array(select unnest(p_cast_user_ids) order by 1);
end;
$function$;

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
  v_revision public.show_proposal_revisions%rowtype;
  v_revision_number integer;
  v_blockers jsonb := '[]'::jsonb;
  v_occurrence record;
  v_required_missing jsonb;
  v_available_count integer;
  v_conflict record;
  v_snapshot jsonb;
begin
  select * into v_revision
  from public.show_proposal_revisions
  where command_id = p_command_id;
  if found then
    if v_revision.show_id <> p_show_id or v_revision.submitted_by <> p_actor_user_id then
      raise unique_violation using message = 'Submission command identity is already in use.';
    end if;
    return v_revision;
  end if;

  select * into v_show from public.shows where id = p_show_id for update;
  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;
  select * into v_theater from public.theaters where id = v_show.theater_id;

  if v_show.lifecycle_status <> 'draft'::public.show_lifecycle_status then
    raise object_not_in_prerequisite_state
      using message = 'Only a draft Event can be submitted.';
  end if;

  if not public.is_eligible_event_producer(v_show.theater_id, p_actor_user_id)
    or not exists (
      select 1 from public.show_leadership
      where show_id = p_show_id
        and user_id = p_actor_user_id
        and role = 'producer'::public.event_leadership_role
    )
  then
    raise insufficient_privilege using message = 'Eligible Event Producer access is required.';
  end if;

  if v_show.minimum_viable_cast is null or v_show.target_cast_size is null then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'cast_thresholds_missing',
      'message', 'Declare the target cast size and Minimum Viable Cast.'
    ));
  end if;

  if not exists (select 1 from public.show_proposed_cast where show_id = p_show_id) then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'proposed_cast_empty',
      'message', 'Select at least one accepted Cast Member for the Proposed Cast.'
    ));
  end if;

  if exists (
    select 1
    from public.show_proposed_cast selected
    left join public.show_cast cast_member
      on cast_member.show_id = selected.show_id and cast_member.user_id = selected.user_id
    left join public.theater_memberships membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = selected.user_id
      and membership.status = 'active'::public.membership_status
    where selected.show_id = p_show_id
      and (cast_member.status <> 'accepted'::public.show_cast_status or membership.user_id is null)
  ) then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'proposed_cast_ineligible',
      'message', 'Remove Cast Members who are no longer accepted active Theater Members.'
    ));
  end if;

  if not exists (
    select 1 from public.show_occurrences
    where show_id = p_show_id and occurrence_type = 'performance'::public.occurrence_type
  ) then
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
      'code', 'performance_missing',
      'message', 'Add at least one Performance Occurrence.'
    ));
  end if;

  for v_occurrence in
    select occurrence.*, slot.starts_at, slot.duration_minutes, slot.location_kind,
      slot.resource_id, slot.location_name
    from public.show_occurrences occurrence
    left join public.show_candidate_slots slot
      on slot.id = occurrence.confirmed_candidate_slot_id
    where occurrence.show_id = p_show_id
    order by occurrence.position
  loop
    if v_occurrence.confirmed_candidate_slot_id is null then
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code', 'confirmed_slot_missing',
        'occurrenceId', v_occurrence.id,
        'message', format('Choose a Confirmed Slot for Occurrence %s.', v_occurrence.position + 1)
      ));
      continue;
    end if;

    if exists (
      select 1 from public.show_proposed_cast selected
      where selected.show_id = p_show_id
        and not exists (
          select 1 from public.show_occurrence_calls call_record
          where call_record.occurrence_id = v_occurrence.id
            and call_record.user_id = selected.user_id
        )
    ) then
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code', 'occurrence_calls_incomplete',
        'occurrenceId', v_occurrence.id,
        'message', format('Assign every Proposed Cast Member a Call for Occurrence %s.', v_occurrence.position + 1)
      ));
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'userId', call_record.user_id,
      'reason', coalesce(response.response::text, 'no_response')
    ) order by call_record.user_id), '[]'::jsonb)
    into v_required_missing
    from public.show_occurrence_calls call_record
    join public.show_proposed_cast selected
      on selected.show_id = p_show_id and selected.user_id = call_record.user_id
    left join public.show_availability_responses response
      on response.candidate_slot_id = v_occurrence.confirmed_candidate_slot_id
      and response.user_id = call_record.user_id
    where call_record.occurrence_id = v_occurrence.id
      and call_record.call = 'required'::public.occurrence_call
      and response.response is distinct from 'available'::public.availability_response;

    if jsonb_array_length(v_required_missing) > 0 then
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'code', 'required_cast_unconfirmed',
        'occurrenceId', v_occurrence.id,
        'members', v_required_missing,
        'message', format('Every required Cast Member must be available for Occurrence %s.', v_occurrence.position + 1)
      ));
    end if;

    if v_occurrence.occurrence_type = 'performance'::public.occurrence_type then
      select count(*) into v_available_count
      from public.show_occurrence_calls call_record
      join public.show_proposed_cast selected
        on selected.show_id = p_show_id and selected.user_id = call_record.user_id
      join public.show_availability_responses response
        on response.candidate_slot_id = v_occurrence.confirmed_candidate_slot_id
        and response.user_id = call_record.user_id
        and response.response = 'available'::public.availability_response
      where call_record.occurrence_id = v_occurrence.id
        and call_record.call <> 'not_called'::public.occurrence_call;

      if v_available_count < coalesce(v_show.minimum_viable_cast, 1) then
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'code', 'minimum_viable_cast_unmet',
          'occurrenceId', v_occurrence.id,
          'availableCount', v_available_count,
          'minimumViableCast', v_show.minimum_viable_cast,
          'message', format('Occurrence %s has %s available called Cast Members; %s are required.', v_occurrence.position + 1, v_available_count, v_show.minimum_viable_cast)
        ));
      end if;
    end if;

    if v_occurrence.location_kind = 'primary_venue'::public.slot_location_kind then
      select other_show.id as show_id, other_occurrence.id as occurrence_id
      into v_conflict
      from public.show_occurrences other_occurrence
      join public.shows other_show on other_show.id = other_occurrence.show_id
      join public.show_candidate_slots other_slot
        on other_slot.id = other_occurrence.confirmed_candidate_slot_id
      where other_show.theater_id = v_show.theater_id
        and other_show.id <> p_show_id
        and other_show.lifecycle_status = 'approved'::public.show_lifecycle_status
        and other_slot.location_kind = 'primary_venue'::public.slot_location_kind
        and tstzrange(
          v_occurrence.starts_at - make_interval(mins => v_theater.setup_buffer_minutes),
          v_occurrence.starts_at + make_interval(mins => v_occurrence.duration_minutes + v_theater.turnover_buffer_minutes),
          '[)'
        ) && tstzrange(
          other_slot.starts_at - make_interval(mins => v_theater.setup_buffer_minutes),
          other_slot.starts_at + make_interval(mins => other_slot.duration_minutes + v_theater.turnover_buffer_minutes),
          '[)'
        )
      limit 1;

      if found then
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'code', 'primary_venue_conflict',
          'occurrenceId', v_occurrence.id,
          'conflictingEventId', v_conflict.show_id,
          'conflictingOccurrenceId', v_conflict.occurrence_id,
          'message', format('Occurrence %s conflicts with an approved Primary Venue commitment including setup and turnover buffer.', v_occurrence.position + 1)
        ));
      end if;
    end if;
  end loop;

  if jsonb_array_length(v_blockers) > 0 then
    raise invalid_parameter_value
      using message = 'The Proposal Revision is blocked.', detail = v_blockers::text;
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_revision_number
  from public.show_proposal_revisions where show_id = p_show_id;

  v_snapshot := jsonb_build_object(
    'eventId', p_show_id,
    'leadership', (select coalesce(jsonb_agg(jsonb_build_object('userId', user_id, 'role', role) order by role, user_id), '[]'::jsonb) from public.show_leadership where show_id = p_show_id),
    'proposedCastUserIds', (select coalesce(jsonb_agg(user_id order by user_id), '[]'::jsonb) from public.show_proposed_cast where show_id = p_show_id),
    'targetCastSize', v_show.target_cast_size,
    'minimumViableCast', v_show.minimum_viable_cast,
    'occurrences', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', occurrence.id,
        'type', occurrence.occurrence_type,
        'visibility', occurrence.visibility,
        'position', occurrence.position,
        'confirmedSlot', jsonb_build_object(
          'candidateSlotId', slot.id,
          'startsAt', slot.starts_at,
          'durationMinutes', slot.duration_minutes,
          'localStartsAt', slot.local_starts_at,
          'timezoneName', slot.timezone_name,
          'timezoneSource', slot.timezone_source,
          'utcOffsetMinutes', slot.utc_offset_minutes,
          'locationKind', slot.location_kind,
          'resourceId', slot.resource_id,
          'locationName', slot.location_name,
          'offSiteApproved', slot.off_site_approved
        ),
        'calls', (select coalesce(jsonb_agg(jsonb_build_object('userId', calls.user_id, 'call', calls.call) order by calls.user_id), '[]'::jsonb) from public.show_occurrence_calls calls where calls.occurrence_id = occurrence.id),
        'viability', jsonb_build_object(
          'availableCalledCastCount', (select count(*) from public.show_occurrence_calls calls join public.show_proposed_cast selected on selected.show_id = p_show_id and selected.user_id = calls.user_id join public.show_availability_responses response on response.candidate_slot_id = slot.id and response.user_id = calls.user_id and response.response = 'available' where calls.occurrence_id = occurrence.id and calls.call <> 'not_called'),
          'minimumViableCast', v_show.minimum_viable_cast
        )
      ) order by occurrence.position), '[]'::jsonb)
      from public.show_occurrences occurrence
      join public.show_candidate_slots slot on slot.id = occurrence.confirmed_candidate_slot_id
      where occurrence.show_id = p_show_id
    ),
    'resourceRequests', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'type', resource_type, 'label', label, 'quantity', quantity, 'position', position) order by position), '[]'::jsonb) from public.show_resource_requests where show_id = p_show_id)
  );

  insert into public.show_proposal_revisions (
    show_id, revision_number, submitted_by, command_id, snapshot
  ) values (
    p_show_id, v_revision_number, p_actor_user_id, p_command_id, v_snapshot
  ) returning * into v_revision;

  update public.shows
  set status = 'pending_review'::public.show_status,
      lifecycle_status = 'in_review'::public.show_lifecycle_status,
      updated_at = now()
  where id = p_show_id;

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.proposal_revision.submitted',
    'member_visible'::public.activity_visibility,
    jsonb_build_object('eventId', p_show_id, 'proposalRevisionId', v_revision.id, 'revisionNumber', v_revision_number, 'commandId', p_command_id)
  );

  return v_revision;
end;
$function$;

revoke all on function public.save_event_proposed_cast(uuid, uuid, uuid[], uuid)
  from public, anon, authenticated;
revoke all on function public.submit_event_proposal_revision(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.save_event_proposed_cast(uuid, uuid, uuid[], uuid)
  to service_role;
grant execute on function public.submit_event_proposal_revision(uuid, uuid, uuid)
  to service_role;

grant select, insert, delete on public.show_proposed_cast to service_role;
grant select, insert on public.show_proposal_revisions to service_role;
grant select on public.show_proposed_cast, public.show_proposal_revisions to authenticated;
