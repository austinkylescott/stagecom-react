create type public.admin_invitation_status as enum (
  'pending',
  'accepted',
  'declined',
  'revoked'
);

create table public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  theater_id uuid not null references public.theaters(id) on delete cascade,
  member_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by_user_id uuid not null references public.profiles(id) on delete restrict,
  status public.admin_invitation_status not null default 'pending',
  responded_at timestamptz,
  response_command_id uuid unique,
  created_at timestamptz not null default now(),
  constraint admin_invitations_response_matches_status check (
    (status = 'pending'::public.admin_invitation_status and responded_at is null)
    or (status <> 'pending'::public.admin_invitation_status and responded_at is not null)
  )
);

create unique index admin_invitations_one_pending_member
  on public.admin_invitations (theater_id, member_user_id)
  where status = 'pending'::public.admin_invitation_status;

create index admin_invitations_member_pending
  on public.admin_invitations (member_user_id, created_at desc)
  where status = 'pending'::public.admin_invitation_status;

create or replace function public.can_respond_to_theater_admin_invitation(
  p_invitation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.admin_invitations
    where id = p_invitation_id
      and member_user_id = auth.uid()
      and status = 'pending'::public.admin_invitation_status
  );
$function$;

create or replace function public.project_admin_invitation_notification(
  p_activity_event_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.activity_events%rowtype;
  v_recipient_user_id uuid;
  v_type text;
begin
  select * into v_event from public.activity_events where id = p_activity_event_id;

  if not found or v_event.action not in (
    'theater.admin.invited',
    'theater.admin.accepted',
    'theater.admin.declined',
    'theater.admin.revoked'
  ) then
    return;
  end if;

  v_type := v_event.action;
  v_recipient_user_id := case
    when v_event.action in ('theater.admin.invited', 'theater.admin.revoked')
      then (v_event.payload ->> 'memberUserId')::uuid
    else (v_event.payload ->> 'invitedByUserId')::uuid
  end;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  ) values (
    v_recipient_user_id,
    v_type,
    'theater'::public.notification_entity,
    v_event.theater_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'adminInvitationId', v_event.entity_id,
      'theaterId', v_event.theater_id
    ),
    'admin-invitation:' || v_event.id::text
  ) on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.invite_theater_admin(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_member_user_id uuid,
  p_command_id uuid
)
returns public.admin_invitations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor public.theater_memberships%rowtype;
  v_member public.theater_memberships%rowtype;
  v_invitation public.admin_invitations%rowtype;
  v_activity_event public.activity_events%rowtype;
  v_activity_event_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));

  select * into v_activity_event from public.activity_events
  where id = p_command_id;
  if found then
    if v_activity_event.theater_id is distinct from p_theater_id
      or v_activity_event.actor_user_id is distinct from p_actor_user_id
      or v_activity_event.action <> 'theater.admin.invited'
      or (v_activity_event.payload ->> 'memberUserId')::uuid is distinct from p_member_user_id
    then
      raise unique_violation using message = 'Admin invitation command identity is already in use.';
    end if;

    select * into v_invitation from public.admin_invitations
    where id = v_activity_event.entity_id;
    return v_invitation;
  end if;

  select * into v_actor from public.theater_memberships
  where theater_id = p_theater_id and user_id = p_actor_user_id for update;
  if not found or v_actor.status <> 'active'::public.membership_status
    or not v_actor.roles && array['owner'::public.theater_role, 'admin'::public.theater_role]
  then
    raise insufficient_privilege using message = 'Active Owner or Admin access is required.';
  end if;

  select * into v_member from public.theater_memberships
  where theater_id = p_theater_id and user_id = p_member_user_id for update;
  if not found or v_member.status <> 'active'::public.membership_status then
    raise invalid_parameter_value using message = 'The invitee must be an active Theater Member.';
  end if;
  if v_member.roles && array['owner'::public.theater_role, 'admin'::public.theater_role] then
    raise unique_violation using message = 'That Theater Member already has Admin authority.';
  end if;

  select * into v_invitation from public.admin_invitations
  where theater_id = p_theater_id and member_user_id = p_member_user_id
    and status = 'pending'::public.admin_invitation_status
  for update;
  if found then return v_invitation; end if;

  insert into public.admin_invitations (theater_id, member_user_id, invited_by_user_id)
  values (p_theater_id, p_member_user_id, p_actor_user_id)
  returning * into v_invitation;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_command_id, p_theater_id, 'admin_invitation', v_invitation.id, p_actor_user_id,
    'theater.admin.invited', 'admin_only'::public.activity_visibility,
    jsonb_build_object('memberUserId', p_member_user_id, 'invitedByUserId', p_actor_user_id)
  ) returning id into v_activity_event_id;
  perform public.project_admin_invitation_notification(v_activity_event_id);
  return v_invitation;
end;
$function$;

create or replace function public.revoke_theater_admin_invitation(
  p_invitation_id uuid,
  p_actor_user_id uuid,
  p_command_id uuid
)
returns public.admin_invitations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invitation public.admin_invitations%rowtype;
  v_actor public.theater_memberships%rowtype;
  v_activity_event public.activity_events%rowtype;
  v_activity_event_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select * into v_activity_event from public.activity_events where id = p_command_id;
  if found then
    if v_activity_event.entity_id is distinct from p_invitation_id
      or v_activity_event.actor_user_id is distinct from p_actor_user_id
      or v_activity_event.action <> 'theater.admin.revoked'
    then
      raise unique_violation using message = 'Admin invitation revocation command identity is already in use.';
    end if;
    select * into v_invitation from public.admin_invitations where id = p_invitation_id;
    return v_invitation;
  end if;

  select * into v_invitation from public.admin_invitations where id = p_invitation_id for update;
  if not found then raise no_data_found using message = 'Admin Invitation was not found.'; end if;
  select * into v_actor from public.theater_memberships
  where theater_id = v_invitation.theater_id and user_id = p_actor_user_id for update;
  if not found or v_actor.status <> 'active'::public.membership_status
    or not v_actor.roles && array['owner'::public.theater_role, 'admin'::public.theater_role]
  then raise insufficient_privilege using message = 'Active Owner or Admin access is required.'; end if;
  if v_invitation.status = 'revoked'::public.admin_invitation_status then return v_invitation; end if;
  if v_invitation.status <> 'pending'::public.admin_invitation_status then
    raise object_not_in_prerequisite_state using message = 'Only a pending Admin Invitation can be revoked.';
  end if;

  update public.admin_invitations set status = 'revoked'::public.admin_invitation_status,
    responded_at = now(), response_command_id = p_command_id
  where id = p_invitation_id returning * into v_invitation;
  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_command_id, v_invitation.theater_id, 'admin_invitation', v_invitation.id, p_actor_user_id,
    'theater.admin.revoked', 'admin_only'::public.activity_visibility,
    jsonb_build_object('memberUserId', v_invitation.member_user_id, 'invitedByUserId', v_invitation.invited_by_user_id)
  ) returning id into v_activity_event_id;
  perform public.project_admin_invitation_notification(v_activity_event_id);
  return v_invitation;
end;
$function$;

create or replace function public.respond_to_theater_admin_invitation(
  p_invitation_id uuid,
  p_actor_user_id uuid,
  p_response text,
  p_command_id uuid
)
returns public.admin_invitations
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invitation public.admin_invitations%rowtype;
  v_member public.theater_memberships%rowtype;
  v_activity_event public.activity_events%rowtype;
  v_action text;
  v_activity_event_id uuid;
begin
  if p_response not in ('accepted', 'declined') then
    raise invalid_parameter_value using message = 'Admin Invitation response must be accepted or declined.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select * into v_activity_event from public.activity_events where id = p_command_id;
  if found then
    if v_activity_event.entity_id is distinct from p_invitation_id
      or v_activity_event.actor_user_id is distinct from p_actor_user_id
      or v_activity_event.action <> 'theater.admin.' || p_response
    then
      raise unique_violation using message = 'Admin invitation response command identity is already in use.';
    end if;
    select * into v_invitation from public.admin_invitations where id = p_invitation_id;
    return v_invitation;
  end if;

  select * into v_invitation from public.admin_invitations where id = p_invitation_id for update;
  if not found then raise no_data_found using message = 'Admin Invitation was not found.'; end if;
  if v_invitation.member_user_id <> p_actor_user_id then
    raise insufficient_privilege using message = 'Only the invited Theater Member can respond.';
  end if;
  if v_invitation.status = p_response::public.admin_invitation_status then return v_invitation; end if;
  if v_invitation.status <> 'pending'::public.admin_invitation_status then
    raise object_not_in_prerequisite_state using message = 'This Admin Invitation has already received a response.';
  end if;

  select * into v_member from public.theater_memberships
  where theater_id = v_invitation.theater_id and user_id = p_actor_user_id for update;
  if not found or v_member.status <> 'active'::public.membership_status then
    raise object_not_in_prerequisite_state using message = 'Only an active Theater Member can accept Admin authority.';
  end if;
  if p_response = 'accepted' and v_member.roles && array['owner'::public.theater_role, 'admin'::public.theater_role] then
    raise object_not_in_prerequisite_state using message = 'That Theater Member already has Admin authority.';
  end if;

  update public.admin_invitations set status = p_response::public.admin_invitation_status,
    responded_at = now(), response_command_id = p_command_id
  where id = p_invitation_id returning * into v_invitation;

  if p_response = 'accepted' then
    update public.theater_memberships set roles = array_append(roles, 'admin'::public.theater_role),
      membership_version = membership_version + 1
    where theater_id = v_invitation.theater_id and user_id = p_actor_user_id;
  end if;

  v_action := 'theater.admin.' || p_response;
  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_command_id, v_invitation.theater_id, 'admin_invitation', v_invitation.id, p_actor_user_id,
    v_action, 'admin_only'::public.activity_visibility,
    jsonb_build_object('memberUserId', p_actor_user_id, 'invitedByUserId', v_invitation.invited_by_user_id)
  ) returning id into v_activity_event_id;
  perform public.project_admin_invitation_notification(v_activity_event_id);
  return v_invitation;
end;
$function$;

revoke all on public.admin_invitations from anon, authenticated;
revoke all on function public.invite_theater_admin(uuid, uuid, uuid, uuid) from public;
revoke all on function public.respond_to_theater_admin_invitation(uuid, uuid, text, uuid) from public;
revoke all on function public.revoke_theater_admin_invitation(uuid, uuid, uuid) from public;
revoke all on function public.can_respond_to_theater_admin_invitation(uuid) from public;
grant execute on function public.invite_theater_admin(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.respond_to_theater_admin_invitation(uuid, uuid, text, uuid) to service_role;
grant execute on function public.revoke_theater_admin_invitation(uuid, uuid, uuid) to service_role;
grant execute on function public.can_respond_to_theater_admin_invitation(uuid) to authenticated;
