update public.theater_invites
set role = 'member'::theater_role
where role <> 'member'::theater_role;

alter table public.theater_invites
  drop constraint if exists theater_invites_targeted_member_only,
  add constraint theater_invites_targeted_member_only
    check (role = 'member'::theater_role),
  drop constraint if exists theater_invites_token_hash_format,
  add constraint theater_invites_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$');

create or replace function public.create_targeted_theater_invitation(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_email text,
  p_token_hash text,
  p_expires_at timestamptz default null
)
returns table (
  id uuid,
  theater_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invitation public.theater_invites%rowtype;
begin
  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
      and (
        'owner'::theater_role = any(membership.roles)
        or 'admin'::theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  if nullif(btrim(p_email), '') is null then
    raise check_violation using message = 'Invitation email is required.';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise check_violation using message = 'Invitation token hash is invalid.';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise check_violation using message = 'Invitation expiry must be in the future.';
  end if;

  insert into public.theater_invites (
    theater_id,
    email,
    role,
    token_hash,
    invited_by_user_id,
    expires_at
  )
  values (
    p_theater_id,
    lower(btrim(p_email)),
    'member'::theater_role,
    p_token_hash,
    p_actor_user_id,
    coalesce(p_expires_at, now() + interval '14 days')
  )
  returning * into v_invitation;

  insert into public.activity_events (
    theater_id,
    entity_type,
    entity_id,
    actor_user_id,
    action,
    visibility,
    payload
  )
  values (
    v_invitation.theater_id,
    'theater_invitation',
    v_invitation.id,
    p_actor_user_id,
    'theater.invitation.created',
    'admin_only'::activity_visibility,
    jsonb_build_object(
      'email', v_invitation.email,
      'expiresAt', v_invitation.expires_at
    )
  );

  return query
  select v_invitation.id, v_invitation.theater_id, v_invitation.expires_at;
end;
$function$;

revoke all on function public.create_targeted_theater_invitation(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_targeted_theater_invitation(uuid, uuid, text, text, timestamptz)
  to service_role;

create or replace function public.revoke_targeted_theater_invitation(
  p_invitation_id uuid,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invitation public.theater_invites%rowtype;
begin
  select invitation.*
  into v_invitation
  from public.theater_invites as invitation
  where invitation.id = p_invitation_id
  for update;

  if not found then
    return false;
  end if;

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_invitation.theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
      and (
        'owner'::theater_role = any(membership.roles)
        or 'admin'::theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  if v_invitation.status <> 'pending'::invite_status then
    return false;
  end if;

  update public.theater_invites
  set status = 'revoked'::invite_status
  where theater_invites.id = v_invitation.id;

  insert into public.activity_events (
    theater_id,
    entity_type,
    entity_id,
    actor_user_id,
    action,
    visibility,
    payload
  )
  values (
    v_invitation.theater_id,
    'theater_invitation',
    v_invitation.id,
    p_actor_user_id,
    'theater.invitation.revoked',
    'admin_only'::activity_visibility,
    jsonb_build_object('email', v_invitation.email)
  );

  return true;
end;
$function$;

revoke all on function public.revoke_targeted_theater_invitation(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.revoke_targeted_theater_invitation(uuid, uuid)
  to service_role;

create or replace function public.accept_targeted_theater_invitation(
  p_actor_user_id uuid,
  p_actor_email text,
  p_token_hash text
)
returns table (
  result text,
  accepted_at timestamptz,
  membership_created boolean,
  theater_id uuid,
  theater_name text,
  theater_slug text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invitation public.theater_invites%rowtype;
  v_theater public.theaters%rowtype;
  v_is_home boolean;
  v_membership_created boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_token_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_actor_user_id::text, 0));

  select invitation.*
  into v_invitation
  from public.theater_invites as invitation
  where invitation.token_hash = p_token_hash
  for update;

  if not found then
    return query select 'invalid'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    return;
  end if;

  select theater.*
  into v_theater
  from public.theaters as theater
  where theater.id = v_invitation.theater_id;

  if v_invitation.status = 'accepted'::invite_status then
    if v_invitation.accepted_by_user_id = p_actor_user_id
      and lower(v_invitation.email) = lower(btrim(p_actor_email)) then
      return query
      select
        'accepted'::text,
        v_invitation.accepted_at,
        false,
        v_theater.id,
        v_theater.name,
        v_theater.slug;
    else
      return query select 'consumed'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    end if;
    return;
  end if;

  if v_invitation.status = 'revoked'::invite_status then
    return query select 'revoked'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    return;
  end if;

  if v_invitation.status = 'expired'::invite_status
    or v_invitation.expires_at <= now() then
    update public.theater_invites
    set status = 'expired'::invite_status
    where theater_invites.id = v_invitation.id
      and theater_invites.status = 'pending'::invite_status;

    return query select 'expired'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    return;
  end if;

  if lower(v_invitation.email) <> lower(btrim(p_actor_email)) then
    return query select 'wrong_email'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    return;
  end if;

  select not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_invitation.theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
  )
  into v_membership_created;

  select not exists (
    select 1
    from public.theater_memberships as membership
    where membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
  )
  into v_is_home;

  insert into public.theater_memberships (
    theater_id,
    user_id,
    roles,
    status,
    is_home
  )
  values (
    v_invitation.theater_id,
    p_actor_user_id,
    array['member']::theater_role[],
    'active'::membership_status,
    v_is_home
  )
  on conflict on constraint theater_memberships_pkey do update
  set
    roles = case
      when theater_memberships.status = 'inactive'::membership_status
        then array['member']::theater_role[]
      else theater_memberships.roles
    end,
    status = 'active'::membership_status,
    is_home = case
      when theater_memberships.status = 'inactive'::membership_status
        then v_is_home
      else theater_memberships.is_home
    end;

  if v_is_home then
    update public.profiles
    set home_theater_id = v_invitation.theater_id
    where profiles.id = p_actor_user_id;
  end if;

  update public.theater_invites
  set
    status = 'accepted'::invite_status,
    accepted_by_user_id = p_actor_user_id,
    accepted_at = now()
  where theater_invites.id = v_invitation.id
  returning * into v_invitation;

  insert into public.activity_events (
    theater_id,
    entity_type,
    entity_id,
    actor_user_id,
    action,
    visibility,
    payload
  )
  values (
    v_invitation.theater_id,
    'theater_invitation',
    v_invitation.id,
    p_actor_user_id,
    'theater.invitation.accepted',
    'member_visible'::activity_visibility,
    jsonb_build_object(
      'membershipActivated', v_membership_created,
      'userId', p_actor_user_id
    )
  );

  return query
  select
    'accepted'::text,
    v_invitation.accepted_at,
    v_membership_created,
    v_theater.id,
    v_theater.name,
    v_theater.slug;
end;
$function$;

revoke all on function public.accept_targeted_theater_invitation(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.accept_targeted_theater_invitation(uuid, text, text)
  to service_role;

create or replace function public.get_targeted_theater_invitation(
  p_token_hash text
)
returns table (
  result text,
  theater_name text
)
language sql
security definer
stable
set search_path to 'public'
as $function$
  select
    case
      when invitation.id is null then 'invalid'
      when invitation.status = 'pending'::invite_status and invitation.expires_at <= now() then 'expired'
      else invitation.status::text
    end as result,
    case
      when invitation.status = 'pending'::invite_status and invitation.expires_at > now()
        then theater.name
      else null
    end as theater_name
  from (select 1) as singleton
  left join public.theater_invites as invitation
    on invitation.token_hash = p_token_hash
  left join public.theaters as theater
    on theater.id = invitation.theater_id;
$function$;

revoke all on function public.get_targeted_theater_invitation(text)
  from public, anon, authenticated;
grant execute on function public.get_targeted_theater_invitation(text)
  to service_role;

create or replace function public.list_targeted_theater_invitations(
  p_theater_id uuid,
  p_actor_user_id uuid
)
returns table (
  id uuid,
  email text,
  status invite_status,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path to 'public'
as $function$
begin
  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
      and (
        'owner'::theater_role = any(membership.roles)
        or 'admin'::theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  return query
  select
    invitation.id,
    invitation.email,
    case
      when invitation.status = 'pending'::invite_status and invitation.expires_at <= now()
        then 'expired'::invite_status
      else invitation.status
    end,
    invitation.expires_at,
    invitation.accepted_at,
    invitation.created_at
  from public.theater_invites as invitation
  where invitation.theater_id = p_theater_id
  order by invitation.created_at desc;
end;
$function$;

revoke all on function public.list_targeted_theater_invitations(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.list_targeted_theater_invitations(uuid, uuid)
  to service_role;
