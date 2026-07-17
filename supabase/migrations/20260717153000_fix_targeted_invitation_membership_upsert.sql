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
