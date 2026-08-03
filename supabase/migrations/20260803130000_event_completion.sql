alter table public.shows
  add column completed_at timestamptz;

create or replace function private.transition_event_to_completed(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_command_id uuid,
  p_now timestamptz,
  p_raise_if_ineligible boolean
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_final_confirmed_slot_ends_at timestamptz;
begin
  select * into v_show
  from public.shows
  where id = p_show_id
  for update;

  if not found then
    if p_raise_if_ineligible then
      raise no_data_found using message = 'Event was not found.';
    end if;
    return false;
  end if;

  if v_show.lifecycle_status = 'completed'::public.show_lifecycle_status then
    return false;
  end if;

  if v_show.lifecycle_status <> 'approved'::public.show_lifecycle_status then
    if p_raise_if_ineligible then
      raise object_not_in_prerequisite_state
        using message = 'Only an approved, non-cancelled Event can be completed.';
    end if;
    return false;
  end if;

  select max(slot.starts_at + make_interval(mins => slot.duration_minutes))
  into v_final_confirmed_slot_ends_at
  from public.show_occurrences as occurrence
  join public.show_candidate_slots as slot
    on slot.id = occurrence.confirmed_candidate_slot_id
  where occurrence.show_id = p_show_id;

  if v_final_confirmed_slot_ends_at is null then
    if p_raise_if_ineligible then
      raise object_not_in_prerequisite_state
        using message = 'At least one Confirmed Slot is required before completion.';
    end if;
    return false;
  end if;

  if v_final_confirmed_slot_ends_at > p_now then
    if p_raise_if_ineligible then
      raise object_not_in_prerequisite_state
        using message = 'The final Confirmed Slot has not ended yet.';
    end if;
    return false;
  end if;

  update public.shows
  set lifecycle_status = 'completed'::public.show_lifecycle_status,
      completed_at = p_now,
      updated_at = p_now
  where id = p_show_id;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload, created_at
  ) values (
    coalesce(p_command_id, gen_random_uuid()),
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.completed',
    'member_visible'::public.activity_visibility,
    jsonb_strip_nulls(jsonb_build_object(
      'commandId', p_command_id,
      'completedAt', p_now,
      'finalConfirmedSlotEndsAt', v_final_confirmed_slot_ends_at
    )),
    p_now
  );

  return true;
end;
$function$;

create or replace function public.complete_event(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_command_id uuid,
  p_now timestamptz default now()
)
returns public.shows
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
begin
  select * into v_show
  from public.shows
  where id = p_show_id;

  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_show.theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::public.membership_status
      and membership.roles && array[
        'owner'::public.theater_role,
        'admin'::public.theater_role
      ]
  ) then
    raise insufficient_privilege
      using message = 'Owner or Admin access is required to complete an Event.';
  end if;

  perform private.transition_event_to_completed(
    p_show_id,
    p_actor_user_id,
    p_command_id,
    p_now,
    true
  );

  select * into v_show from public.shows where id = p_show_id;
  return v_show;
end;
$function$;

create or replace function public.complete_due_events(
  p_now timestamptz default now(),
  p_show_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show_id uuid;
  v_completed_count integer := 0;
begin
  for v_show_id in
    select show.id
    from public.shows as show
    where show.lifecycle_status = 'approved'::public.show_lifecycle_status
      and (p_show_id is null or show.id = p_show_id)
      and exists (
        select 1
        from public.show_occurrences as occurrence
        join public.show_candidate_slots as slot
          on slot.id = occurrence.confirmed_candidate_slot_id
        where occurrence.show_id = show.id
      )
      and not exists (
        select 1
        from public.show_occurrences as occurrence
        join public.show_candidate_slots as slot
          on slot.id = occurrence.confirmed_candidate_slot_id
        where occurrence.show_id = show.id
          and slot.starts_at + make_interval(mins => slot.duration_minutes) > p_now
      )
    order by show.id
    for update of show skip locked
  loop
    if private.transition_event_to_completed(
      v_show_id,
      null,
      null,
      p_now,
      false
    ) then
      v_completed_count := v_completed_count + 1;
    end if;
  end loop;

  return v_completed_count;
end;
$function$;

create or replace function public.is_show_publicly_visible(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.shows as show
    join public.theaters as theater on theater.id = show.theater_id
    where show.id = p_show_id
      and theater.status = 'published'::public.theater_status
      and show.status = 'approved'::public.show_status
      and show.is_public_listed = true
      and show.lifecycle_status in (
        'approved'::public.show_lifecycle_status,
        'completed'::public.show_lifecycle_status
      )
      and show.publication_status = 'published'::public.show_publication_status
      and show.published_public_content_revision_id is not null
  );
$function$;

revoke all on function private.transition_event_to_completed(
  uuid, uuid, uuid, timestamptz, boolean
) from public, anon, authenticated, service_role;

revoke all on function public.complete_event(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.complete_event(uuid, uuid, uuid, timestamptz)
  to service_role;

revoke all on function public.complete_due_events(timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_due_events(timestamptz, uuid)
  to service_role;
