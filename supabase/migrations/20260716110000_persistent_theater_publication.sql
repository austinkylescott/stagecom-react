alter table public.theaters
  alter column tagline drop not null,
  alter column timezone drop not null,
  alter column timezone drop default,
  alter column street drop not null,
  alter column city drop not null,
  alter column state_region drop not null,
  alter column postal_code drop not null,
  alter column country drop not null;

alter table public.theaters
  drop constraint if exists theaters_tagline_not_blank,
  drop constraint if exists theaters_timezone_not_blank,
  drop constraint if exists theaters_street_not_blank,
  drop constraint if exists theaters_city_not_blank,
  drop constraint if exists theaters_state_region_not_blank,
  drop constraint if exists theaters_postal_code_not_blank,
  drop constraint if exists theaters_country_not_blank;

update public.theaters
set timezone_source = 'inferred'::timezone_source
where nullif(btrim(timezone), '') is not null
  and timezone_source = 'unknown'::timezone_source;

alter table public.theaters
  add constraint theaters_published_identity_complete check (
    status <> 'published'::theater_status
    or (
      nullif(btrim(name), '') is not null
      and nullif(btrim(slug), '') is not null
      and nullif(btrim(tagline), '') is not null
      and nullif(btrim(timezone), '') is not null
      and timezone_source <> 'unknown'::timezone_source
      and nullif(btrim(street), '') is not null
      and nullif(btrim(city), '') is not null
      and nullif(btrim(state_region), '') is not null
      and nullif(btrim(postal_code), '') is not null
      and nullif(btrim(country), '') is not null
    )
  );

with ranked_home_memberships as (
  select
    membership.theater_id,
    membership.user_id,
    row_number() over (
      partition by membership.user_id
      order by
        (profile.home_theater_id = membership.theater_id) desc,
        membership.created_at,
        membership.theater_id
    ) as home_position
  from public.theater_memberships as membership
  join public.profiles as profile on profile.id = membership.user_id
  where membership.is_home = true
    and membership.status = 'active'::membership_status
)
update public.theater_memberships as membership
set is_home = false
from ranked_home_memberships as ranked
where membership.theater_id = ranked.theater_id
  and membership.user_id = ranked.user_id
  and ranked.home_position > 1;

create unique index theater_memberships_one_home_per_user
  on public.theater_memberships (user_id)
  where is_home = true and status = 'active'::membership_status;

create or replace function public.create_theater_with_owner(
  p_actor_user_id uuid,
  p_name text,
  p_slug text,
  p_timezone text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  status theater_status,
  created boolean
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_theater public.theaters%rowtype;
  v_is_home boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_actor_user_id::text, 0));

  select theater.*
  into v_theater
  from public.theaters as theater
  where theater.slug = p_slug;

  if found then
    if exists (
      select 1
      from public.theater_memberships as membership
      where membership.theater_id = v_theater.id
        and membership.user_id = p_actor_user_id
        and membership.status = 'active'::membership_status
        and 'owner'::theater_role = any(membership.roles)
    ) then
      return query
      select v_theater.id, v_theater.name, v_theater.slug, v_theater.status, false;
      return;
    end if;

    raise unique_violation using message = 'Theater slug is already in use.';
  end if;

  v_is_home := not exists (
    select 1
    from public.theater_memberships as membership
    where membership.user_id = p_actor_user_id
      and membership.status = 'active'::membership_status
  );

  insert into public.theaters (
    name,
    slug,
    timezone,
    timezone_source,
    status
  )
  values (
    btrim(p_name),
    btrim(p_slug),
    nullif(btrim(p_timezone), ''),
    case
      when nullif(btrim(p_timezone), '') is null then 'unknown'::timezone_source
      else 'manual'::timezone_source
    end,
    'draft'::theater_status
  )
  returning * into v_theater;

  insert into public.theater_memberships (
    theater_id,
    user_id,
    roles,
    status,
    is_home
  )
  values (
    v_theater.id,
    p_actor_user_id,
    array['owner']::theater_role[],
    'active'::membership_status,
    v_is_home
  );

  if v_is_home then
    update public.profiles
    set home_theater_id = v_theater.id
    where profiles.id = p_actor_user_id;
  end if;

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
    v_theater.id,
    'theater',
    v_theater.id,
    p_actor_user_id,
    'theater.created',
    'member_visible'::activity_visibility,
    jsonb_build_object('name', v_theater.name, 'slug', v_theater.slug)
  );

  return query
  select v_theater.id, v_theater.name, v_theater.slug, v_theater.status, true;
end;
$function$;

revoke all on function public.create_theater_with_owner(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_theater_with_owner(uuid, text, text, text)
  to service_role;

create or replace function public.update_theater_setup(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_changes jsonb
)
returns setof public.theaters
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_theater public.theaters%rowtype;
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

  update public.theaters
  set
    name = case when p_changes ? 'name' then btrim(p_changes ->> 'name') else name end,
    slug = case when p_changes ? 'slug' then btrim(p_changes ->> 'slug') else slug end,
    tagline = case when p_changes ? 'tagline' then nullif(btrim(p_changes ->> 'tagline'), '') else tagline end,
    timezone = case when p_changes ? 'timezone' then nullif(btrim(p_changes ->> 'timezone'), '') else timezone end,
    timezone_source = case
      when p_changes ? 'timezone' and nullif(btrim(p_changes ->> 'timezone'), '') is null
        then 'unknown'::timezone_source
      when p_changes ? 'timezone' then 'manual'::timezone_source
      else timezone_source
    end,
    street = case when p_changes ? 'street' then nullif(btrim(p_changes ->> 'street'), '') else street end,
    city = case when p_changes ? 'city' then nullif(btrim(p_changes ->> 'city'), '') else city end,
    state_region = case when p_changes ? 'stateRegion' then nullif(btrim(p_changes ->> 'stateRegion'), '') else state_region end,
    postal_code = case when p_changes ? 'postalCode' then nullif(btrim(p_changes ->> 'postalCode'), '') else postal_code end,
    country = case when p_changes ? 'country' then nullif(btrim(p_changes ->> 'country'), '') else country end,
    website_url = case when p_changes ? 'websiteUrl' then nullif(btrim(p_changes ->> 'websiteUrl'), '') else website_url end,
    social_links = case when p_changes ? 'socialLinks' then p_changes -> 'socialLinks' else social_links end
  where theaters.id = p_theater_id
  returning * into v_theater;

  if not found then
    return;
  end if;

  return next v_theater;
end;
$function$;

revoke all on function public.update_theater_setup(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.update_theater_setup(uuid, uuid, jsonb)
  to service_role;

create or replace function public.publish_theater(
  p_theater_id uuid,
  p_actor_user_id uuid
)
returns setof public.theaters
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_theater public.theaters%rowtype;
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

  select theater.*
  into v_theater
  from public.theaters as theater
  where theater.id = p_theater_id
  for update;

  if not found then
    return;
  end if;

  if v_theater.status = 'archived'::theater_status then
    raise check_violation using message = 'Archived Theaters cannot be published.';
  end if;

  if v_theater.status <> 'published'::theater_status then
    update public.theaters
    set
      status = 'published'::theater_status,
      published_at = now()
    where theaters.id = p_theater_id
    returning * into v_theater;

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
      v_theater.id,
      'theater',
      v_theater.id,
      p_actor_user_id,
      'theater.published',
      'member_visible'::activity_visibility,
      jsonb_build_object('slug', v_theater.slug)
    );
  end if;

  return next v_theater;
end;
$function$;

revoke all on function public.publish_theater(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.publish_theater(uuid, uuid)
  to service_role;

create or replace function public.set_default_theater(
  p_theater_id uuid,
  p_user_id uuid
)
returns setof public.theaters
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_theater public.theaters%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_user_id
      and membership.status = 'active'::membership_status
  ) then
    raise insufficient_privilege using message = 'Active Theater membership is required.';
  end if;

  update public.theater_memberships
  set is_home = false
  where theater_memberships.user_id = p_user_id
    and theater_memberships.status = 'active'::membership_status
    and theater_memberships.is_home = true;

  update public.theater_memberships
  set is_home = true
  where theater_memberships.user_id = p_user_id
    and theater_memberships.theater_id = p_theater_id
    and theater_memberships.status = 'active'::membership_status;

  update public.profiles
  set home_theater_id = p_theater_id
  where profiles.id = p_user_id;

  select theater.*
  into v_theater
  from public.theaters as theater
  where theater.id = p_theater_id;

  return next v_theater;
end;
$function$;

revoke all on function public.set_default_theater(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_default_theater(uuid, uuid)
  to service_role;
