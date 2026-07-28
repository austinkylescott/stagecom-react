create type public.occurrence_type as enum ('rehearsal', 'performance');
create type public.occurrence_visibility as enum ('public', 'internal');
create type public.slot_location_kind as enum ('primary_venue', 'off_site');
create type public.event_resource_type as enum ('staff', 'equipment', 'other');

alter table public.shows
  add column target_cast_size integer,
  add column minimum_viable_cast integer,
  add constraint shows_target_cast_size_check
    check (target_cast_size is null or target_cast_size between 1 and 500),
  add constraint shows_minimum_viable_cast_check
    check (minimum_viable_cast is null or minimum_viable_cast between 1 and 500),
  add constraint shows_cast_threshold_check
    check (
      target_cast_size is null
      or minimum_viable_cast is null
      or minimum_viable_cast <= target_cast_size
    );

update public.shows
set target_cast_size = cast_max,
    minimum_viable_cast = cast_min
where cast_max is not null or cast_min is not null;

alter table public.show_occurrences
  alter column starts_at drop not null,
  add column occurrence_type public.occurrence_type not null default 'performance',
  add column visibility public.occurrence_visibility not null default 'public',
  add column position integer not null default 0 check (position >= 0),
  add column updated_at timestamptz not null default now(),
  add constraint show_occurrences_show_position_unique
    unique (show_id, position) deferrable initially deferred;

create table public.show_candidate_slots (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.show_occurrences(id) on delete cascade,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 1440),
  local_starts_at timestamp without time zone not null,
  timezone_name text not null check (nullif(btrim(timezone_name), '') is not null),
  timezone_source public.timezone_source not null default 'manual',
  utc_offset_minutes integer not null check (utc_offset_minutes between -840 and 840),
  location_kind public.slot_location_kind not null,
  resource_id uuid,
  location_name text not null check (nullif(btrim(location_name), '') is not null),
  off_site_approved boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint show_candidate_slots_location_check check (
    (
      location_kind = 'primary_venue'
      and resource_id is not null
      and off_site_approved = false
    )
    or (
      location_kind = 'off_site'
      and resource_id is null
      and off_site_approved = true
    )
  ),
  constraint show_candidate_slots_occurrence_position_unique
    unique (occurrence_id, position) deferrable initially deferred
);

create index show_candidate_slots_occurrence_start
  on public.show_candidate_slots (occurrence_id, starts_at);
create index show_candidate_slots_resource_start
  on public.show_candidate_slots (resource_id, starts_at)
  where resource_id is not null;

alter table public.show_occurrences
  add column confirmed_candidate_slot_id uuid
    references public.show_candidate_slots(id) on delete set null;

create table public.show_resource_requests (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  resource_type public.event_resource_type not null,
  label text not null check (nullif(btrim(label), '') is not null),
  quantity integer not null default 1 check (quantity between 1 and 500),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint show_resource_requests_show_position_unique
    unique (show_id, position) deferrable initially deferred
);

create index show_resource_requests_show
  on public.show_resource_requests (show_id, position);

insert into public.show_candidate_slots (
  occurrence_id,
  starts_at,
  duration_minutes,
  local_starts_at,
  timezone_name,
  timezone_source,
  utc_offset_minutes,
  location_kind,
  resource_id,
  location_name,
  position
)
select
  occurrence.id,
  occurrence.starts_at,
  greatest(
    15,
    least(
      1440,
      coalesce(
        extract(epoch from (occurrence.ends_at - occurrence.starts_at))::integer / 60,
        60
      )
    )
  ),
  occurrence.starts_at at time zone 'UTC',
  'UTC',
  'unknown'::public.timezone_source,
  0,
  'primary_venue'::public.slot_location_kind,
  theater.primary_venue_id,
  coalesce(theater.primary_venue_name, theater.name),
  0
from public.show_occurrences as occurrence
join public.shows as show on show.id = occurrence.show_id
join public.theaters as theater on theater.id = show.theater_id
where occurrence.starts_at is not null;

update public.show_occurrences as occurrence
set confirmed_candidate_slot_id = slot.id
from public.show_candidate_slots as slot
where slot.occurrence_id = occurrence.id;

create trigger trg_show_occurrences_updated
  before update on public.show_occurrences
  for each row execute procedure public.set_timestamp();

create trigger trg_show_candidate_slots_updated
  before update on public.show_candidate_slots
  for each row execute procedure public.set_timestamp();

create trigger trg_show_resource_requests_updated
  before update on public.show_resource_requests
  for each row execute procedure public.set_timestamp();

alter table public.show_candidate_slots enable row level security;
alter table public.show_resource_requests enable row level security;

create policy "show_candidate_slots_select_visible"
on public.show_candidate_slots
for select
to authenticated
using (
  exists (
    select 1
    from public.show_occurrences as occurrence
    where occurrence.id = occurrence_id
      and public.can_view_show(occurrence.show_id)
  )
);

create policy "show_resource_requests_select_visible"
on public.show_resource_requests
for select
to authenticated
using (public.can_view_show(show_id));

create or replace function public.save_event_operational_plan(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_target_cast_size integer,
  p_minimum_viable_cast integer,
  p_occurrences jsonb,
  p_resource_requests jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_occurrence jsonb;
  v_slot jsonb;
  v_resource jsonb;
  v_occurrence_id uuid;
  v_slot_id uuid;
  v_confirmed_slot_id uuid;
  v_occurrence_ids uuid[] := array[]::uuid[];
  v_slot_ids uuid[] := array[]::uuid[];
  v_resource_ids uuid[] := array[]::uuid[];
  v_occurrence_count integer := 0;
  v_slot_count integer := 0;
  v_resource_count integer := 0;
begin
  select * into v_show
  from public.shows
  where id = p_show_id
  for update;

  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if v_show.lifecycle_status <> 'draft'::public.show_lifecycle_status then
    raise object_not_in_prerequisite_state
      using message = 'The operational plan is editable only while the Event is a draft.';
  end if;

  if not public.is_eligible_event_producer(v_show.theater_id, p_actor_user_id)
    or not exists (
      select 1
      from public.show_leadership as leadership
      where leadership.show_id = p_show_id
        and leadership.user_id = p_actor_user_id
        and leadership.role = 'producer'::public.event_leadership_role
    )
  then
    raise insufficient_privilege using message = 'Eligible Event Producer access is required.';
  end if;

  if p_target_cast_size is null
    or p_minimum_viable_cast is null
    or p_target_cast_size not between 1 and 500
    or p_minimum_viable_cast not between 1 and 500
    or p_minimum_viable_cast > p_target_cast_size
  then
    raise invalid_parameter_value
      using message = 'Minimum Viable Cast must be no greater than the target cast size.';
  end if;

  if jsonb_typeof(p_occurrences) <> 'array'
    or jsonb_typeof(p_resource_requests) <> 'array'
  then
    raise invalid_parameter_value using message = 'Operational plan collections must be arrays.';
  end if;

  if jsonb_array_length(p_occurrences) > 100
    or jsonb_array_length(p_resource_requests) > 100
  then
    raise invalid_parameter_value using message = 'The operational plan is too large.';
  end if;

  update public.shows
  set target_cast_size = p_target_cast_size,
      minimum_viable_cast = p_minimum_viable_cast,
      updated_at = now()
  where id = p_show_id;

  update public.show_occurrences
  set confirmed_candidate_slot_id = null
  where show_id = p_show_id;

  for v_occurrence in select value from jsonb_array_elements(p_occurrences)
  loop
    v_occurrence_id := (v_occurrence ->> 'id')::uuid;

    if v_occurrence_id = any(v_occurrence_ids) then
      raise invalid_parameter_value using message = 'Occurrence identifiers must be unique.';
    end if;

    if exists (
      select 1 from public.show_occurrences
      where id = v_occurrence_id and show_id <> p_show_id
    ) then
      raise insufficient_privilege using message = 'Occurrence does not belong to this Event.';
    end if;

    v_occurrence_ids := array_append(v_occurrence_ids, v_occurrence_id);
    v_occurrence_count := v_occurrence_count + 1;

    insert into public.show_occurrences (
      id, show_id, starts_at, ends_at, occurrence_type, visibility, position, status
    ) values (
      v_occurrence_id,
      p_show_id,
      null,
      null,
      (v_occurrence ->> 'type')::public.occurrence_type,
      (v_occurrence ->> 'visibility')::public.occurrence_visibility,
      (v_occurrence ->> 'position')::integer,
      'scheduled'::public.show_occurrence_status
    )
    on conflict (id) do update set
      occurrence_type = excluded.occurrence_type,
      visibility = excluded.visibility,
      position = excluded.position,
      status = 'scheduled'::public.show_occurrence_status;

    if jsonb_typeof(v_occurrence -> 'candidateSlots') <> 'array'
      or jsonb_array_length(v_occurrence -> 'candidateSlots') > 100
    then
      raise invalid_parameter_value using message = 'Candidate Slots must be an array of at most 100 items.';
    end if;

    for v_slot in select value from jsonb_array_elements(v_occurrence -> 'candidateSlots')
    loop
      v_slot_id := (v_slot ->> 'id')::uuid;

      if v_slot_id = any(v_slot_ids) then
        raise invalid_parameter_value using message = 'Candidate Slot identifiers must be unique.';
      end if;

      if exists (
        select 1
        from public.show_candidate_slots as existing_slot
        join public.show_occurrences as existing_occurrence
          on existing_occurrence.id = existing_slot.occurrence_id
        where existing_slot.id = v_slot_id
          and existing_occurrence.show_id <> p_show_id
      ) then
        raise insufficient_privilege using message = 'Candidate Slot does not belong to this Event.';
      end if;

      if (v_slot ->> 'durationMinutes')::integer not between 15 and 1440 then
        raise invalid_parameter_value using message = 'Slot duration must be between 15 minutes and 24 hours.';
      end if;

      if (v_slot ->> 'locationKind') = 'primary_venue' then
        if (v_slot ->> 'resourceId')::uuid <> (
          select primary_venue_id from public.theaters where id = v_show.theater_id
        ) then
          raise invalid_parameter_value using message = 'Primary Venue identity is invalid.';
        end if;
      elsif (v_slot ->> 'locationKind') = 'off_site' then
        if coalesce((v_slot ->> 'offSiteApproved')::boolean, false) = false then
          raise invalid_parameter_value using message = 'Off-site locations must be explicitly approved.';
        end if;
      else
        raise invalid_parameter_value using message = 'Candidate Slot location is invalid.';
      end if;

      v_slot_ids := array_append(v_slot_ids, v_slot_id);
      v_slot_count := v_slot_count + 1;

      insert into public.show_candidate_slots (
        id,
        occurrence_id,
        starts_at,
        duration_minutes,
        local_starts_at,
        timezone_name,
        timezone_source,
        utc_offset_minutes,
        location_kind,
        resource_id,
        location_name,
        off_site_approved,
        position
      ) values (
        v_slot_id,
        v_occurrence_id,
        (v_slot ->> 'startsAt')::timestamptz,
        (v_slot ->> 'durationMinutes')::integer,
        (v_slot ->> 'localStartsAt')::timestamp,
        btrim(v_slot ->> 'timezoneName'),
        coalesce((v_slot ->> 'timezoneSource')::public.timezone_source, 'manual'),
        (v_slot ->> 'utcOffsetMinutes')::integer,
        (v_slot ->> 'locationKind')::public.slot_location_kind,
        case
          when (v_slot ->> 'locationKind') = 'primary_venue'
            then (v_slot ->> 'resourceId')::uuid
          else null
        end,
        btrim(v_slot ->> 'locationName'),
        case
          when (v_slot ->> 'locationKind') = 'off_site' then true
          else false
        end,
        (v_slot ->> 'position')::integer
      )
      on conflict (id) do update set
        occurrence_id = excluded.occurrence_id,
        starts_at = excluded.starts_at,
        duration_minutes = excluded.duration_minutes,
        local_starts_at = excluded.local_starts_at,
        timezone_name = excluded.timezone_name,
        timezone_source = excluded.timezone_source,
        utc_offset_minutes = excluded.utc_offset_minutes,
        location_kind = excluded.location_kind,
        resource_id = excluded.resource_id,
        location_name = excluded.location_name,
        off_site_approved = excluded.off_site_approved,
        position = excluded.position;
    end loop;

    v_confirmed_slot_id := nullif(v_occurrence ->> 'confirmedCandidateSlotId', '')::uuid;

    if v_confirmed_slot_id is not null and not exists (
      select 1
      from jsonb_array_elements(v_occurrence -> 'candidateSlots') as candidate
      where candidate ->> 'id' = v_confirmed_slot_id::text
    ) then
      raise invalid_parameter_value
        using message = 'Confirmed Slot must be one of the Occurrence Candidate Slots.';
    end if;

    update public.show_occurrences as occurrence
    set confirmed_candidate_slot_id = v_confirmed_slot_id,
        starts_at = slot.starts_at,
        ends_at = slot.starts_at + make_interval(mins => slot.duration_minutes)
    from public.show_candidate_slots as slot
    where occurrence.id = v_occurrence_id
      and slot.id = v_confirmed_slot_id;
  end loop;

  delete from public.show_candidate_slots as slot
  using public.show_occurrences as occurrence
  where slot.occurrence_id = occurrence.id
    and occurrence.show_id = p_show_id
    and not (slot.id = any(v_slot_ids));

  delete from public.show_occurrences
  where show_id = p_show_id
    and not (id = any(v_occurrence_ids));

  for v_resource in select value from jsonb_array_elements(p_resource_requests)
  loop
    v_slot_id := (v_resource ->> 'id')::uuid;

    if v_slot_id = any(v_resource_ids) then
      raise invalid_parameter_value using message = 'Resource Request identifiers must be unique.';
    end if;

    if exists (
      select 1 from public.show_resource_requests
      where id = v_slot_id and show_id <> p_show_id
    ) then
      raise insufficient_privilege using message = 'Resource Request does not belong to this Event.';
    end if;

    v_resource_ids := array_append(v_resource_ids, v_slot_id);
    v_resource_count := v_resource_count + 1;

    insert into public.show_resource_requests (
      id, show_id, resource_type, label, quantity, position
    ) values (
      v_slot_id,
      p_show_id,
      (v_resource ->> 'type')::public.event_resource_type,
      btrim(v_resource ->> 'label'),
      (v_resource ->> 'quantity')::integer,
      (v_resource ->> 'position')::integer
    )
    on conflict (id) do update set
      resource_type = excluded.resource_type,
      label = excluded.label,
      quantity = excluded.quantity,
      position = excluded.position;
  end loop;

  delete from public.show_resource_requests
  where show_id = p_show_id
    and not (id = any(v_resource_ids));

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.operational_plan.updated',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'targetCastSize', p_target_cast_size,
      'minimumViableCast', p_minimum_viable_cast,
      'occurrenceCount', v_occurrence_count,
      'candidateSlotCount', v_slot_count,
      'resourceRequestCount', v_resource_count
    )
  );

  return jsonb_build_object(
    'eventId', p_show_id,
    'occurrenceCount', v_occurrence_count,
    'candidateSlotCount', v_slot_count,
    'resourceRequestCount', v_resource_count
  );
exception
  when invalid_text_representation or not_null_violation or check_violation or unique_violation then
    raise invalid_parameter_value using message = 'The operational plan contains invalid values.';
end;
$function$;

revoke all on function public.save_event_operational_plan(
  uuid, uuid, integer, integer, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.save_event_operational_plan(
  uuid, uuid, integer, integer, jsonb, jsonb
) to service_role;

grant select, insert, update, delete
on public.show_candidate_slots, public.show_resource_requests
to service_role;

-- RLS already defines which Events an authenticated actor may see. Make the
-- matching table privileges explicit so clean local resets do not depend on
-- project-level default grants that may exist in the hosted development DB.
grant select on public.shows to authenticated;
grant select on public.show_candidate_slots, public.show_resource_requests
to authenticated;
