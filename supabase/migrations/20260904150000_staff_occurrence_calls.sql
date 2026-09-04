-- An Occurrence Call belongs to an accepted participant. Cast and Event staff
-- are distinct relationships, so Calls cannot retain a cast-only foreign key.
alter table public.show_occurrence_calls
  drop constraint show_occurrence_calls_show_id_user_id_fkey;

create or replace function public.can_view_show(p_show_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select exists (
    select 1 from public.shows s where s.id = p_show_id and (
      public.is_show_publicly_visible(s.id) or public.is_show_producer(s.id) or public.is_theater_staff(s.theater_id)
      or exists (select 1 from public.show_cast c where c.show_id = s.id and c.user_id = auth.uid() and c.status in ('pending'::public.show_cast_status, 'accepted'::public.show_cast_status))
      or exists (select 1 from public.show_staff_assignments a join public.theater_memberships m on m.theater_id = s.theater_id and m.user_id = a.user_id and m.status = 'active'::public.membership_status where a.show_id = s.id and a.user_id = auth.uid() and a.status = 'accepted')
    )
  );
$function$;

drop policy if exists "occurrence_calls_select_collaborative" on public.show_occurrence_calls;
create policy "occurrence_calls_select_collaborative"
on public.show_occurrence_calls for select to authenticated using (
  public.can_view_event_coordination(show_id, (select auth.uid()))
  or (user_id = (select auth.uid()) and exists (
    select 1 from public.show_staff_assignments a join public.shows s on s.id = a.show_id join public.theater_memberships m on m.theater_id = s.theater_id and m.user_id = a.user_id and m.status = 'active'::public.membership_status
    where a.show_id = show_occurrence_calls.show_id and a.user_id = (select auth.uid()) and a.status = 'accepted'
  ))
);

create or replace function public.event_staff_coverage(p_show_id uuid, p_resource_request_id uuid)
returns integer language sql stable security definer set search_path to 'public'
as $function$
  select count(*)::integer from public.show_staff_assignments a
  join public.shows s on s.id = a.show_id
  join public.theater_memberships m on m.theater_id = s.theater_id and m.user_id = a.user_id and m.status = 'active'::public.membership_status
  where a.show_id = p_show_id and a.resource_request_id = p_resource_request_id and a.status = 'accepted';
$function$;

drop function public.set_occurrence_call(
  uuid, uuid, uuid, public.occurrence_call, uuid, integer
);

create or replace function public.set_occurrence_call(
  p_occurrence_id uuid,
  p_participant_user_id uuid,
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
    from public.theater_memberships as membership
    where membership.theater_id = v_show.theater_id
      and membership.user_id = p_participant_user_id
      and membership.status = 'active'::public.membership_status
  ) or not (
    exists (
      select 1 from public.show_cast as cast_member
      where cast_member.show_id = v_show.id
        and cast_member.user_id = p_participant_user_id
        and cast_member.status = 'accepted'::public.show_cast_status
    )
    or exists (
      select 1 from public.show_staff_assignments as assignment
      where assignment.show_id = v_show.id
        and assignment.user_id = p_participant_user_id
        and assignment.status = 'accepted'
    )
  ) then
    raise invalid_parameter_value
      using message = 'Occurrence Calls can be assigned only to accepted Cast Members or Event staff.';
  end if;

  select * into v_call
  from public.show_occurrence_calls
  where occurrence_id = p_occurrence_id and user_id = p_participant_user_id
  for update;

  if found and v_call.last_command_id = p_command_id then return v_call; end if;
  if not found then
    if p_expected_version is not null then
      raise object_not_in_prerequisite_state using message = 'Occurrence Call has changed. Reload before saving again.';
    end if;
    insert into public.show_occurrence_calls (occurrence_id, show_id, user_id, call, actor_user_id, last_command_id)
    values (p_occurrence_id, v_show.id, p_participant_user_id, p_call, p_actor_user_id, p_command_id)
    returning * into v_call;
  else
    if p_expected_version is null or v_call.version <> p_expected_version then
      raise object_not_in_prerequisite_state using message = 'Occurrence Call has changed. Reload before saving again.';
    end if;
    update public.show_occurrence_calls set call = p_call, actor_user_id = p_actor_user_id, assigned_at = now(), version = version + 1, last_command_id = p_command_id
    where occurrence_id = p_occurrence_id and user_id = p_participant_user_id
    returning * into v_call;
  end if;

  insert into public.activity_events (id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
  values (p_command_id, v_show.theater_id, 'event', v_show.id, p_actor_user_id, 'event.occurrence_call.assigned', 'self_only'::public.activity_visibility,
    jsonb_build_object('occurrenceId', p_occurrence_id, 'memberUserId', p_participant_user_id, 'call', p_call, 'version', v_call.version));
  return v_call;
end;
$function$;

revoke all on function public.set_occurrence_call(
  uuid, uuid, uuid, public.occurrence_call, uuid, integer
) from public, anon, authenticated;
grant execute on function public.set_occurrence_call(
  uuid, uuid, uuid, public.occurrence_call, uuid, integer
) to service_role;
