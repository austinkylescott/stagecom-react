alter table public.show_staff_assignments
  add column resource_request_id uuid references public.show_resource_requests(id) on delete restrict,
  add column responsibility text,
  add column invited_by_user_id uuid references public.profiles(id) on delete set null,
  add column invited_at timestamptz,
  add column responded_at timestamptz,
  add column revoked_at timestamptz,
  add column revoked_by_user_id uuid references public.profiles(id) on delete set null,
  add column version integer not null default 1 check (version > 0),
  add column last_command_id uuid unique;

alter table public.show_staff_assignments
  drop constraint show_staff_assignments_status_check,
  add constraint show_staff_assignments_status_check
    check (status in ('pending', 'accepted', 'declined', 'revoked'));

update public.show_staff_assignments
set status = 'accepted',
    responsibility = coalesce(responsibility, assignment_type),
    invited_at = coalesce(invited_at, created_at),
    responded_at = coalesce(responded_at, created_at)
where status in ('assigned', 'confirmed');

update public.show_staff_assignments
set status = 'revoked',
    responsibility = coalesce(responsibility, assignment_type),
    invited_at = coalesce(invited_at, created_at),
    revoked_at = coalesce(revoked_at, created_at)
where status = 'cancelled';

alter table public.show_staff_assignments
  drop constraint show_staff_assignments_show_id_user_id_assignment_type_key;

alter table public.show_staff_assignments
  add constraint show_staff_assignments_show_member_request_key
    unique (show_id, user_id, resource_request_id);

create index show_staff_assignments_request_status
  on public.show_staff_assignments (resource_request_id, status);

create or replace function public.event_staff_coverage(
  p_show_id uuid,
  p_resource_request_id uuid
)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select count(*)::integer
  from public.show_staff_assignments
  where show_id = p_show_id
    and resource_request_id = p_resource_request_id
    and status = 'accepted';
$function$;

create or replace function public.project_event_staff_notification(p_activity_event_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.activity_events%rowtype;
  v_recipient uuid;
begin
  select * into v_event from public.activity_events where id = p_activity_event_id;
  if not found or v_event.action not in ('event.staff.invited', 'event.staff.accepted', 'event.staff.declined', 'event.staff.revoked') then return; end if;
  v_recipient := case
    when v_event.action = 'event.staff.invited' then (v_event.payload ->> 'memberUserId')::uuid
    when v_event.action = 'event.staff.revoked' then (v_event.payload ->> 'memberUserId')::uuid
    else (v_event.payload ->> 'inviterUserId')::uuid
  end;
  if v_recipient is null then return; end if;
  insert into public.notifications (user_id, type, entity_type, entity_id, payload, dedupe_key)
  values (v_recipient, v_event.action, 'show'::public.notification_entity, v_event.entity_id,
    jsonb_build_object('activityEventId', v_event.id, 'eventId', v_event.entity_id, 'theaterId', v_event.theater_id),
    'event-staff:' || v_event.id::text)
  on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.invite_event_staff_member(
  p_show_id uuid, p_actor_user_id uuid, p_member_user_id uuid, p_resource_request_id uuid
)
returns public.show_staff_assignments
language plpgsql security definer set search_path to 'public'
as $function$
declare v_show public.shows%rowtype; v_assignment public.show_staff_assignments%rowtype; v_request public.show_resource_requests%rowtype; v_activity_id uuid;
begin
  select * into v_show from public.shows where id = p_show_id for update;
  if not found then raise no_data_found using message = 'Event was not found.'; end if;
  if not exists (select 1 from public.theater_memberships where theater_id = v_show.theater_id and user_id = p_actor_user_id and status = 'active' and roles && array['owner'::public.theater_role, 'admin'::public.theater_role]) then
    raise insufficient_privilege using message = 'Active Theater Operator access is required to invite Event staff.';
  end if;
  select * into v_request from public.show_resource_requests where id = p_resource_request_id and show_id = p_show_id and resource_type = 'staff';
  if not found then raise invalid_parameter_value using message = 'A staff staffing request for this Event is required.'; end if;
  if not exists (select 1 from public.theater_memberships where theater_id = v_show.theater_id and user_id = p_member_user_id and status = 'active') then
    raise invalid_parameter_value using message = 'The invitee must be an active Theater Member.';
  end if;
  select * into v_assignment from public.show_staff_assignments where show_id = p_show_id and user_id = p_member_user_id and resource_request_id = p_resource_request_id for update;
  if found and v_assignment.status = 'pending' then return v_assignment; end if;
  if found then raise unique_violation using message = 'That Theater Member already has an Event Staff Assignment for this responsibility.'; end if;
  begin
    insert into public.show_staff_assignments (show_id, user_id, resource_request_id, responsibility, assignment_type, status, invited_by_user_id, invited_at)
    values (p_show_id, p_member_user_id, p_resource_request_id, v_request.label, 'other', 'pending', p_actor_user_id, now()) returning * into v_assignment;
  exception when unique_violation then
    select * into v_assignment from public.show_staff_assignments where show_id = p_show_id and user_id = p_member_user_id and resource_request_id = p_resource_request_id;
    if v_assignment.status = 'pending' then return v_assignment; end if;
    raise unique_violation using message = 'That Theater Member already has an Event Staff Assignment for this responsibility.';
  end;
  insert into public.activity_events (theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
  values (v_show.theater_id, 'event', p_show_id, p_actor_user_id, 'event.staff.invited', 'self_only', jsonb_build_object('assignmentId', v_assignment.id, 'memberUserId', p_member_user_id, 'responsibility', v_request.label)) returning id into v_activity_id;
  perform public.project_event_staff_notification(v_activity_id);
  return v_assignment;
end;
$function$;

create or replace function public.respond_to_event_staff_invitation(
  p_assignment_id uuid, p_actor_user_id uuid, p_response text
)
returns public.show_staff_assignments
language plpgsql security definer set search_path to 'public'
as $function$
declare v_show public.shows%rowtype; v_assignment public.show_staff_assignments%rowtype; v_activity_id uuid;
begin
  if p_response not in ('accepted', 'declined') then raise invalid_parameter_value using message = 'Event staff response must be accepted or declined.'; end if;
  select s.* into v_show from public.show_staff_assignments a join public.shows s on s.id = a.show_id where a.id = p_assignment_id;
  if not found then raise no_data_found using message = 'Event was not found.'; end if;
  select * into v_assignment from public.show_staff_assignments where id = p_assignment_id and user_id = p_actor_user_id for update;
  if not found then raise no_data_found using message = 'Event staff invitation was not found.'; end if;
  if v_assignment.status = p_response then return v_assignment; end if;
  if v_assignment.status <> 'pending' then raise object_not_in_prerequisite_state using message = 'This Event staff invitation has already received a response.'; end if;
  update public.show_staff_assignments set status = p_response, responded_at = now(), version = version + 1 where id = v_assignment.id returning * into v_assignment;
  insert into public.activity_events (theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
  values (v_show.theater_id, 'event', v_show.id, p_actor_user_id, 'event.staff.' || p_response, 'member_visible', jsonb_build_object('assignmentId', v_assignment.id, 'memberUserId', p_actor_user_id, 'inviterUserId', v_assignment.invited_by_user_id, 'responsibility', v_assignment.responsibility)) returning id into v_activity_id;
  perform public.project_event_staff_notification(v_activity_id); return v_assignment;
end;
$function$;

create or replace function public.revoke_event_staff_assignment(p_assignment_id uuid, p_actor_user_id uuid)
returns public.show_staff_assignments
language plpgsql security definer set search_path to 'public'
as $function$
declare v_assignment public.show_staff_assignments%rowtype; v_show public.shows%rowtype; v_activity_id uuid;
begin
  select a.* into v_assignment from public.show_staff_assignments a where a.id = p_assignment_id for update;
  if not found then raise no_data_found using message = 'Event Staff Assignment was not found.'; end if;
  select * into v_show from public.shows where id = v_assignment.show_id;
  if not exists (select 1 from public.theater_memberships where theater_id = v_show.theater_id and user_id = p_actor_user_id and status = 'active' and roles && array['owner'::public.theater_role, 'admin'::public.theater_role]) then raise insufficient_privilege using message = 'Active Theater Operator access is required to revoke Event staff.'; end if;
  if v_assignment.status = 'revoked' then return v_assignment; end if;
  update public.show_staff_assignments set status = 'revoked', revoked_at = now(), revoked_by_user_id = p_actor_user_id, version = version + 1 where id = p_assignment_id returning * into v_assignment;
  insert into public.activity_events (theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
  values (v_show.theater_id, 'event', v_show.id, p_actor_user_id, 'event.staff.revoked', 'member_visible', jsonb_build_object('assignmentId', v_assignment.id, 'memberUserId', v_assignment.user_id, 'responsibility', v_assignment.responsibility)) returning id into v_activity_id;
  perform public.project_event_staff_notification(v_activity_id); return v_assignment;
end;
$function$;

revoke all on function public.invite_event_staff_member(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.respond_to_event_staff_invitation(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_event_staff_assignment(uuid, uuid) from public, anon, authenticated;
grant execute on function public.invite_event_staff_member(uuid, uuid, uuid, uuid), public.respond_to_event_staff_invitation(uuid, uuid, text), public.revoke_event_staff_assignment(uuid, uuid) to service_role;
