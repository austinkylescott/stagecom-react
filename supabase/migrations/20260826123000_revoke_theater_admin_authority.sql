create or replace function public.remove_theater_admin(
  p_theater_id uuid,
  p_member_user_id uuid,
  p_actor_user_id uuid,
  p_command_id uuid
)
returns public.theater_memberships
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor public.theater_memberships%rowtype;
  v_member public.theater_memberships%rowtype;
  v_existing_event public.activity_events%rowtype;
begin
  -- A repeated request returns the original durable result without creating a
  -- second history fact. The advisory lock also serializes simultaneous retries.
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));

  select * into v_existing_event
  from public.activity_events as activity
  where activity.id = p_command_id;

  if found then
    if v_existing_event.theater_id is distinct from p_theater_id
      or v_existing_event.entity_id is distinct from p_member_user_id
      or v_existing_event.actor_user_id is distinct from p_actor_user_id
      or v_existing_event.action <> 'theater.admin.removed'
    then
      raise unique_violation
        using message = 'Admin removal command identity is already in use.';
    end if;

    select * into v_member
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_member_user_id;
    return v_member;
  end if;

  -- Lock both relationships in a stable order so reciprocal concurrent
  -- relinquishment cannot deadlock or restore authority after removal.
  perform 1
  from public.theater_memberships as membership
  where membership.theater_id = p_theater_id
    and membership.user_id in (p_actor_user_id, p_member_user_id)
  order by membership.user_id
  for update;

  select * into v_actor
  from public.theater_memberships as membership
  where membership.theater_id = p_theater_id
    and membership.user_id = p_actor_user_id;

  if not found
    or v_actor.status <> 'active'::public.membership_status
    or not v_actor.roles && array[
      'owner'::public.theater_role,
      'admin'::public.theater_role
    ]
  then
    raise insufficient_privilege
      using message = 'Active Owner or Admin access is required.';
  end if;

  select * into v_member
  from public.theater_memberships as membership
  where membership.theater_id = p_theater_id
    and membership.user_id = p_member_user_id;

  if not found then
    raise no_data_found using message = 'Theater membership was not found.';
  end if;

  if 'owner'::public.theater_role = any(v_member.roles) then
    raise insufficient_privilege
      using message = 'Owner authority can only change through an accepted ownership transfer.';
  end if;

  if v_member.status <> 'active'::public.membership_status
    or not 'admin'::public.theater_role = any(v_member.roles)
  then
    raise object_not_in_prerequisite_state
      using message = 'Only a current Admin can relinquish Admin authority.';
  end if;

  update public.theater_memberships as membership
  set roles = array_remove(membership.roles, 'admin'::public.theater_role),
      membership_version = membership.membership_version + 1
  where membership.theater_id = p_theater_id
    and membership.user_id = p_member_user_id
  returning * into v_member;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload
  ) values (
    p_command_id,
    p_theater_id,
    'theater_membership',
    p_member_user_id,
    p_actor_user_id,
    'theater.admin.removed',
    'admin_only'::public.activity_visibility,
    jsonb_build_object(
      'memberUserId', p_member_user_id,
      'membershipVersion', v_member.membership_version
    )
  );

  return v_member;
end;
$function$;

revoke all on function public.remove_theater_admin(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.remove_theater_admin(uuid, uuid, uuid, uuid)
  to service_role;
