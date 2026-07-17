create table public.theater_join_links (
  id uuid primary key default gen_random_uuid(),
  theater_id uuid not null references public.theaters(id) on delete cascade,
  token_hash text not null unique,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  revoked_at timestamptz,
  rotated_from_id uuid unique references public.theater_join_links(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint theater_join_links_token_hash_format
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint theater_join_links_positive_max_uses
    check (max_uses is null or max_uses > 0),
  constraint theater_join_links_valid_use_count
    check (use_count >= 0 and (max_uses is null or use_count <= max_uses))
);

create index theater_join_links_theater_id_created_at_idx
  on public.theater_join_links(theater_id, created_at desc);

alter table public.theater_join_links enable row level security;

create policy "Theater managers can read join link metadata"
  on public.theater_join_links
  for select
  to authenticated
  using (public.is_theater_admin(theater_id) or public.is_theater_owner(theater_id));

revoke all on table public.theater_join_links from anon, authenticated;
grant select (id, theater_id) on table public.theater_join_links to authenticated;
grant all on table public.theater_join_links to service_role;

create or replace function public.create_reusable_theater_join_link(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz default null,
  p_max_uses integer default null
)
returns table (
  id uuid,
  theater_id uuid,
  expires_at timestamptz,
  max_uses integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_link public.theater_join_links%rowtype;
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

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise check_violation using message = 'Reusable Join Link token hash is invalid.';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise check_violation using message = 'Reusable Join Link expiry must be in the future.';
  end if;

  if p_max_uses is not null and p_max_uses <= 0 then
    raise check_violation using message = 'Reusable Join Link maximum uses must be positive.';
  end if;

  insert into public.theater_join_links (
    theater_id,
    token_hash,
    created_by_user_id,
    expires_at,
    max_uses
  )
  values (
    p_theater_id,
    p_token_hash,
    p_actor_user_id,
    p_expires_at,
    p_max_uses
  )
  returning * into v_link;

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
    v_link.theater_id,
    'theater_join_link',
    v_link.id,
    p_actor_user_id,
    'theater.join_link.created',
    'admin_only'::activity_visibility,
    jsonb_build_object(
      'expiresAt', v_link.expires_at,
      'maxUses', v_link.max_uses
    )
  );

  return query
  select
    v_link.id,
    v_link.theater_id,
    v_link.expires_at,
    v_link.max_uses,
    v_link.created_at;
end;
$function$;

create or replace function public.revoke_reusable_theater_join_link(
  p_join_link_id uuid,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_link public.theater_join_links%rowtype;
begin
  select link.*
  into v_link
  from public.theater_join_links as link
  where link.id = p_join_link_id
  for update;

  if not found then
    return false;
  end if;

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_link.theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
      and (
        'owner'::theater_role = any(membership.roles)
        or 'admin'::theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  if v_link.revoked_at is not null then
    return false;
  end if;

  update public.theater_join_links
  set revoked_at = now(),
      updated_at = now()
  where theater_join_links.id = v_link.id
  returning * into v_link;

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
    v_link.theater_id,
    'theater_join_link',
    v_link.id,
    p_actor_user_id,
    'theater.join_link.revoked',
    'admin_only'::activity_visibility,
    '{}'::jsonb
  );

  return true;
end;
$function$;

create or replace function public.rotate_reusable_theater_join_link(
  p_join_link_id uuid,
  p_actor_user_id uuid,
  p_token_hash text
)
returns table (
  id uuid,
  theater_id uuid,
  expires_at timestamptz,
  max_uses integer,
  rotated_from_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_old_link public.theater_join_links%rowtype;
  v_new_link public.theater_join_links%rowtype;
begin
  select link.*
  into v_old_link
  from public.theater_join_links as link
  where link.id = p_join_link_id
  for update;

  if not found then
    raise no_data_found using message = 'Reusable Join Link was not found.';
  end if;

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_old_link.theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
      and (
        'owner'::theater_role = any(membership.roles)
        or 'admin'::theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  if v_old_link.revoked_at is not null then
    raise check_violation using message = 'Only an active Reusable Join Link can be rotated.';
  end if;

  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise check_violation using message = 'Reusable Join Link token hash is invalid.';
  end if;

  update public.theater_join_links
  set revoked_at = now(),
      updated_at = now()
  where theater_join_links.id = v_old_link.id;

  insert into public.theater_join_links (
    theater_id,
    token_hash,
    created_by_user_id,
    expires_at,
    max_uses,
    rotated_from_id
  )
  values (
    v_old_link.theater_id,
    p_token_hash,
    p_actor_user_id,
    v_old_link.expires_at,
    v_old_link.max_uses,
    v_old_link.id
  )
  returning * into v_new_link;

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
    v_new_link.theater_id,
    'theater_join_link',
    v_new_link.id,
    p_actor_user_id,
    'theater.join_link.rotated',
    'admin_only'::activity_visibility,
    jsonb_build_object('rotatedFromId', v_old_link.id)
  );

  return query
  select
    v_new_link.id,
    v_new_link.theater_id,
    v_new_link.expires_at,
    v_new_link.max_uses,
    v_new_link.rotated_from_id,
    v_new_link.created_at;
end;
$function$;

create or replace function public.accept_reusable_theater_join_link(
  p_actor_user_id uuid,
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
  v_link public.theater_join_links%rowtype;
  v_theater public.theaters%rowtype;
  v_is_home boolean;
  v_accepted_at timestamptz := now();
begin
  perform pg_advisory_xact_lock(hashtextextended(p_token_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_actor_user_id::text, 0));

  select link.*
  into v_link
  from public.theater_join_links as link
  where link.token_hash = p_token_hash
  for update;

  if not found then
    return query select 'invalid'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    return;
  end if;

  select theater.*
  into v_theater
  from public.theaters as theater
  where theater.id = v_link.theater_id;

  if v_link.revoked_at is not null then
    return query select 'revoked'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    return;
  end if;

  if v_link.expires_at is not null and v_link.expires_at <= now() then
    return query select 'expired'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    return;
  end if;

  if exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_link.theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
  ) then
    return query
    select
      'accepted'::text,
      v_accepted_at,
      false,
      v_theater.id,
      v_theater.name,
      v_theater.slug;
    return;
  end if;

  if v_link.max_uses is not null and v_link.use_count >= v_link.max_uses then
    return query select 'exhausted'::text, null::timestamptz, false, null::uuid, null::text, null::text;
    return;
  end if;

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
    v_link.theater_id,
    p_actor_user_id,
    array['member']::theater_role[],
    'active'::membership_status,
    v_is_home
  )
  on conflict on constraint theater_memberships_pkey do update
  set
    roles = array['member']::theater_role[],
    status = 'active'::membership_status,
    is_home = v_is_home;

  if v_is_home then
    update public.profiles
    set home_theater_id = v_link.theater_id
    where profiles.id = p_actor_user_id;
  end if;

  update public.theater_join_links
  set use_count = use_count + 1,
      updated_at = v_accepted_at
  where theater_join_links.id = v_link.id
  returning * into v_link;

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
    v_link.theater_id,
    'theater_join_link',
    v_link.id,
    p_actor_user_id,
    'theater.join_link.accepted',
    'member_visible'::activity_visibility,
    jsonb_build_object(
      'membershipActivated', true,
      'userId', p_actor_user_id,
      'useCount', v_link.use_count
    )
  );

  if v_link.max_uses is not null and v_link.use_count = v_link.max_uses then
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
      v_link.theater_id,
      'theater_join_link',
      v_link.id,
      p_actor_user_id,
      'theater.join_link.exhausted',
      'admin_only'::activity_visibility,
      jsonb_build_object('maxUses', v_link.max_uses)
    );
  end if;

  return query
  select
    'accepted'::text,
    v_accepted_at,
    true,
    v_theater.id,
    v_theater.name,
    v_theater.slug;
end;
$function$;

create or replace function public.get_reusable_theater_join_link(
  p_token_hash text
)
returns table (
  result text,
  theater_name text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    case
      when link.id is null then 'invalid'
      when link.revoked_at is not null then 'revoked'
      when link.expires_at is not null and link.expires_at <= now() then 'expired'
      when link.max_uses is not null and link.use_count >= link.max_uses then 'exhausted'
      else 'active'
    end,
    case
      when link.id is not null then theater.name
      else null
    end
  from (values (1)) as singleton(value)
  left join public.theater_join_links as link on link.token_hash = p_token_hash
  left join public.theaters as theater on theater.id = link.theater_id;
$function$;

create or replace function public.list_reusable_theater_join_links(
  p_theater_id uuid,
  p_actor_user_id uuid
)
returns table (
  id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  max_uses integer,
  use_count integer,
  revoked_at timestamptz,
  rotated_from_id uuid,
  status text
)
language plpgsql
security definer
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
    link.id,
    link.created_at,
    link.expires_at,
    link.max_uses,
    link.use_count,
    link.revoked_at,
    link.rotated_from_id,
    case
      when link.revoked_at is not null then 'revoked'
      when link.expires_at is not null and link.expires_at <= now() then 'expired'
      when link.max_uses is not null and link.use_count >= link.max_uses then 'exhausted'
      else 'active'
    end
  from public.theater_join_links as link
  where link.theater_id = p_theater_id
  order by link.created_at desc;
end;
$function$;

revoke all on function public.create_reusable_theater_join_link(uuid, uuid, text, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.revoke_reusable_theater_join_link(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.rotate_reusable_theater_join_link(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.accept_reusable_theater_join_link(uuid, text)
  from public, anon, authenticated;
revoke all on function public.list_reusable_theater_join_links(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.get_reusable_theater_join_link(text)
  from public, anon, authenticated;

grant execute on function public.create_reusable_theater_join_link(uuid, uuid, text, timestamptz, integer)
  to service_role;
grant execute on function public.revoke_reusable_theater_join_link(uuid, uuid)
  to service_role;
grant execute on function public.rotate_reusable_theater_join_link(uuid, uuid, text)
  to service_role;
grant execute on function public.accept_reusable_theater_join_link(uuid, text)
  to service_role;
grant execute on function public.list_reusable_theater_join_links(uuid, uuid)
  to service_role;
grant execute on function public.get_reusable_theater_join_link(text)
  to anon, authenticated, service_role;
