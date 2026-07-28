create type public.availability_response as enum (
  'available',
  'unavailable',
  'uncertain'
);

create table public.show_availability_responses (
  candidate_slot_id uuid not null references public.show_candidate_slots(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response public.availability_response not null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  responded_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  last_command_id uuid not null unique,
  primary key (candidate_slot_id, user_id)
);

create index show_availability_responses_user
  on public.show_availability_responses (user_id, candidate_slot_id);

alter table public.show_availability_responses enable row level security;

create or replace function public.can_view_event_coordination(
  p_show_id uuid,
  p_actor_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    public.is_event_operational_viewer(p_show_id, p_actor_user_id)
    or public.event_cast_status_for_actor(
      p_show_id,
      p_actor_user_id
    ) = 'accepted'::public.show_cast_status;
$function$;

create or replace function public.can_view_candidate_slot_coordination(
  p_candidate_slot_id uuid,
  p_actor_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.show_candidate_slots as slot
    join public.show_occurrences as occurrence on occurrence.id = slot.occurrence_id
    where slot.id = p_candidate_slot_id
      and public.can_view_event_coordination(occurrence.show_id, p_actor_user_id)
  );
$function$;

create or replace function public.can_record_candidate_slot_availability(
  p_candidate_slot_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.show_candidate_slots as slot
    join public.show_occurrences as occurrence on occurrence.id = slot.occurrence_id
    join public.shows as show_record on show_record.id = occurrence.show_id
    join public.show_cast as cast_member
      on cast_member.show_id = show_record.id
      and cast_member.user_id = (select auth.uid())
      and cast_member.source = 'invited'::public.show_cast_source
      and cast_member.status in (
        'pending'::public.show_cast_status,
        'accepted'::public.show_cast_status
      )
    join public.theater_memberships as membership
      on membership.theater_id = show_record.theater_id
      and membership.user_id = cast_member.user_id
      and membership.status = 'active'::public.membership_status
    where slot.id = p_candidate_slot_id
  );
$function$;

create policy "availability_responses_select_collaborative"
on public.show_availability_responses
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.can_view_candidate_slot_coordination(
    candidate_slot_id,
    (select auth.uid())
  )
);

create or replace function public.record_candidate_slot_availability(
  p_candidate_slot_id uuid,
  p_actor_user_id uuid,
  p_response public.availability_response,
  p_command_id uuid,
  p_expected_version integer default null
)
returns public.show_availability_responses
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_response public.show_availability_responses%rowtype;
begin
  select show_record.* into v_show
  from public.show_candidate_slots as slot
  join public.show_occurrences as occurrence on occurrence.id = slot.occurrence_id
  join public.shows as show_record on show_record.id = occurrence.show_id
  where slot.id = p_candidate_slot_id;

  if not found then
    raise no_data_found using message = 'Candidate Slot was not found.';
  end if;

  if not exists (
    select 1
    from public.show_cast as cast_member
    join public.theater_memberships as membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = cast_member.user_id
      and membership.status = 'active'::public.membership_status
    where cast_member.show_id = v_show.id
      and cast_member.user_id = p_actor_user_id
      and cast_member.source = 'invited'::public.show_cast_source
      and cast_member.status in (
        'pending'::public.show_cast_status,
        'accepted'::public.show_cast_status
      )
  ) then
    raise insufficient_privilege
      using message = 'An active pending or accepted Cast invitation is required.';
  end if;

  select * into v_response
  from public.show_availability_responses
  where candidate_slot_id = p_candidate_slot_id
    and user_id = p_actor_user_id
  for update;

  if found and v_response.last_command_id = p_command_id then
    return v_response;
  end if;

  if not found then
    if p_expected_version is not null then
      raise object_not_in_prerequisite_state
        using message = 'Availability Response has changed. Reload before saving again.';
    end if;

    insert into public.show_availability_responses (
      candidate_slot_id,
      user_id,
      response,
      actor_user_id,
      last_command_id
    ) values (
      p_candidate_slot_id,
      p_actor_user_id,
      p_response,
      p_actor_user_id,
      p_command_id
    )
    returning * into v_response;
  else
    if p_expected_version is null or v_response.version <> p_expected_version then
      raise object_not_in_prerequisite_state
        using message = 'Availability Response has changed. Reload before saving again.';
    end if;

    update public.show_availability_responses
    set response = p_response,
        actor_user_id = p_actor_user_id,
        responded_at = now(),
        version = version + 1,
        last_command_id = p_command_id
    where candidate_slot_id = p_candidate_slot_id
      and user_id = p_actor_user_id
    returning * into v_response;
  end if;

  insert into public.activity_events (
    id,
    theater_id,
    entity_type,
    entity_id,
    actor_user_id,
    action,
    visibility,
    payload
  ) values (
    p_command_id,
    v_show.theater_id,
    'event',
    v_show.id,
    p_actor_user_id,
    'event.availability.responded',
    'self_only'::public.activity_visibility,
    jsonb_build_object(
      'candidateSlotId', p_candidate_slot_id,
      'memberUserId', p_actor_user_id,
      'response', p_response,
      'version', v_response.version
    )
  );

  return v_response;
end;
$function$;

revoke all on function public.record_candidate_slot_availability(
  uuid, uuid, public.availability_response, uuid, integer
) from public, anon, authenticated;
grant execute on function public.record_candidate_slot_availability(
  uuid, uuid, public.availability_response, uuid, integer
) to service_role;

grant select, insert, update on public.show_availability_responses
  to service_role;
grant select on public.show_availability_responses to authenticated;

create type public.occurrence_call as enum (
  'required',
  'optional',
  'not_called'
);

create table public.show_occurrence_calls (
  occurrence_id uuid not null references public.show_occurrences(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  call public.occurrence_call not null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  last_command_id uuid not null unique,
  primary key (occurrence_id, user_id),
  foreign key (show_id, user_id)
    references public.show_cast(show_id, user_id) on delete cascade
);

create index show_occurrence_calls_show_user
  on public.show_occurrence_calls (show_id, user_id, occurrence_id);

alter table public.show_occurrence_calls enable row level security;

create policy "occurrence_calls_select_collaborative"
on public.show_occurrence_calls
for select
to authenticated
using (
  public.can_view_event_coordination(
    show_id,
    (select auth.uid())
  )
);

create or replace function public.can_assign_occurrence_call(
  p_occurrence_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.show_occurrences as occurrence
    join public.shows as show_record on show_record.id = occurrence.show_id
    join public.show_leadership as leadership
      on leadership.show_id = show_record.id
      and leadership.user_id = (select auth.uid())
      and leadership.role = 'director'::public.event_leadership_role
    join public.theater_memberships as membership
      on membership.theater_id = show_record.theater_id
      and membership.user_id = leadership.user_id
      and membership.status = 'active'::public.membership_status
    where occurrence.id = p_occurrence_id
  );
$function$;

create or replace function public.set_occurrence_call(
  p_occurrence_id uuid,
  p_cast_member_user_id uuid,
  p_actor_user_id uuid,
  p_call public.occurrence_call,
  p_command_id uuid,
  p_expected_version integer default null
)
returns public.show_occurrence_calls
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_call public.show_occurrence_calls%rowtype;
begin
  select show_record.* into v_show
  from public.show_occurrences as occurrence
  join public.shows as show_record on show_record.id = occurrence.show_id
  where occurrence.id = p_occurrence_id;

  if not found then
    raise no_data_found using message = 'Occurrence was not found.';
  end if;

  if not exists (
    select 1
    from public.show_leadership as leadership
    join public.theater_memberships as membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = leadership.user_id
      and membership.status = 'active'::public.membership_status
    where leadership.show_id = v_show.id
      and leadership.user_id = p_actor_user_id
      and leadership.role = 'director'::public.event_leadership_role
  ) then
    raise insufficient_privilege
      using message = 'Active Event Director access is required to assign Occurrence Calls.';
  end if;

  if not exists (
    select 1
    from public.show_cast as cast_member
    join public.theater_memberships as membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = cast_member.user_id
      and membership.status = 'active'::public.membership_status
    where cast_member.show_id = v_show.id
      and cast_member.user_id = p_cast_member_user_id
      and cast_member.status = 'accepted'::public.show_cast_status
  ) then
    raise invalid_parameter_value
      using message = 'Occurrence Calls can be assigned only to accepted Cast Members.';
  end if;

  select * into v_call
  from public.show_occurrence_calls
  where occurrence_id = p_occurrence_id
    and user_id = p_cast_member_user_id
  for update;

  if found and v_call.last_command_id = p_command_id then
    return v_call;
  end if;

  if not found then
    if p_expected_version is not null then
      raise object_not_in_prerequisite_state
        using message = 'Occurrence Call has changed. Reload before saving again.';
    end if;

    insert into public.show_occurrence_calls (
      occurrence_id,
      show_id,
      user_id,
      call,
      actor_user_id,
      last_command_id
    ) values (
      p_occurrence_id,
      v_show.id,
      p_cast_member_user_id,
      p_call,
      p_actor_user_id,
      p_command_id
    )
    returning * into v_call;
  else
    if p_expected_version is null or v_call.version <> p_expected_version then
      raise object_not_in_prerequisite_state
        using message = 'Occurrence Call has changed. Reload before saving again.';
    end if;

    update public.show_occurrence_calls
    set call = p_call,
        actor_user_id = p_actor_user_id,
        assigned_at = now(),
        version = version + 1,
        last_command_id = p_command_id
    where occurrence_id = p_occurrence_id
      and user_id = p_cast_member_user_id
    returning * into v_call;
  end if;

  insert into public.activity_events (
    id,
    theater_id,
    entity_type,
    entity_id,
    actor_user_id,
    action,
    visibility,
    payload
  ) values (
    p_command_id,
    v_show.theater_id,
    'event',
    v_show.id,
    p_actor_user_id,
    'event.occurrence_call.assigned',
    'self_only'::public.activity_visibility,
    jsonb_build_object(
      'occurrenceId', p_occurrence_id,
      'memberUserId', p_cast_member_user_id,
      'call', p_call,
      'version', v_call.version
    )
  );

  return v_call;
end;
$function$;

revoke all on function public.set_occurrence_call(
  uuid, uuid, uuid, public.occurrence_call, uuid, integer
) from public, anon, authenticated;
grant execute on function public.set_occurrence_call(
  uuid, uuid, uuid, public.occurrence_call, uuid, integer
) to service_role;

grant select, insert, update on public.show_occurrence_calls to service_role;
grant select on public.show_occurrence_calls to authenticated;

revoke all on function public.can_view_event_coordination(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.can_view_event_coordination(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_view_candidate_slot_coordination(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.can_view_candidate_slot_coordination(uuid, uuid)
  to authenticated, service_role;

revoke all on function public.can_record_candidate_slot_availability(uuid)
  from public, anon, authenticated;
grant execute on function public.can_record_candidate_slot_availability(uuid)
  to authenticated, service_role;

revoke all on function public.can_assign_occurrence_call(uuid)
  from public, anon, authenticated;
grant execute on function public.can_assign_occurrence_call(uuid)
  to authenticated, service_role;
