create type public.producer_eligibility_policy as enum (
  'all_members',
  'designated_proposers',
  'admins_only'
);

create type public.theater_capability as enum ('proposer', 'reviewer');
create type public.event_leadership_role as enum ('producer', 'director');

alter table public.theaters
  add column producer_eligibility public.producer_eligibility_policy not null
    default 'admins_only'::public.producer_eligibility_policy,
  add column owner_self_approval_enabled boolean not null default false,
  add column counteroffer_response_hours integer not null default 72,
  add column primary_venue_name text,
  add column setup_buffer_minutes integer not null default 0,
  add column turnover_buffer_minutes integer not null default 0,
  add constraint theaters_counteroffer_response_hours_check
    check (counteroffer_response_hours between 1 and 720),
  add constraint theaters_primary_venue_name_check
    check (primary_venue_name is null or nullif(btrim(primary_venue_name), '') is not null),
  add constraint theaters_setup_buffer_minutes_check
    check (setup_buffer_minutes between 0 and 1440),
  add constraint theaters_turnover_buffer_minutes_check
    check (turnover_buffer_minutes between 0 and 1440);

create table public.theater_member_capabilities (
  theater_id uuid not null references public.theaters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  capability public.theater_capability not null,
  granted_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (theater_id, user_id, capability)
);

create index idx_theater_member_capabilities_user
  on public.theater_member_capabilities (user_id, theater_id);

create table public.show_leadership (
  show_id uuid not null references public.shows(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role public.event_leadership_role not null,
  assigned_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (show_id, user_id, role)
);

create unique index show_leadership_one_director
  on public.show_leadership (show_id)
  where role = 'director'::public.event_leadership_role;

insert into public.show_leadership (show_id, user_id, role, assigned_by_user_id, created_at)
select
  role.show_id,
  role.user_id,
  'producer'::public.event_leadership_role,
  show.created_by_user_id,
  role.created_at
from public.show_roles as role
join public.shows as show on show.id = role.show_id
where role.role = 'producer'::public.show_role
on conflict do nothing;

create or replace function public.is_eligible_event_producer(
  p_theater_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.theater_memberships as membership
    join public.theaters as theater on theater.id = membership.theater_id
    where membership.theater_id = p_theater_id
      and membership.user_id = p_user_id
      and membership.status = 'active'::public.membership_status
      and (
        'owner'::public.theater_role = any(membership.roles)
        or 'admin'::public.theater_role = any(membership.roles)
        or theater.producer_eligibility = 'all_members'::public.producer_eligibility_policy
        or (
          theater.producer_eligibility = 'designated_proposers'::public.producer_eligibility_policy
          and exists (
            select 1
            from public.theater_member_capabilities as capability
            where capability.theater_id = p_theater_id
              and capability.user_id = p_user_id
              and capability.capability = 'proposer'::public.theater_capability
          )
        )
      )
  );
$function$;

create or replace function public.is_show_leader(
  p_show_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.show_leadership as leadership
    where leadership.show_id = p_show_id
      and leadership.user_id = p_user_id
  );
$function$;

create or replace function public.is_show_producer(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.show_leadership as leadership
    where leadership.show_id = p_show_id
      and leadership.user_id = auth.uid()
      and leadership.role = 'producer'::public.event_leadership_role
  ) or exists (
    select 1
    from public.show_roles as role
    where role.show_id = p_show_id
      and role.user_id = auth.uid()
      and role.role = 'producer'::public.show_role
  );
$function$;

create or replace function public.can_view_show(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.shows as show
    where show.id = p_show_id
      and (
        public.is_show_publicly_visible(show.id)
        or public.is_show_leader(show.id)
        or public.is_theater_staff(show.theater_id)
        or exists (
          select 1
          from public.show_cast as cast_member
          where cast_member.show_id = show.id
            and cast_member.user_id = auth.uid()
            and cast_member.status in (
              'pending'::public.show_cast_status,
              'accepted'::public.show_cast_status
            )
        )
      )
  );
$function$;

create or replace function public.update_theater_governance(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_producer_eligibility public.producer_eligibility_policy,
  p_owner_self_approval_enabled boolean,
  p_counteroffer_response_hours integer,
  p_primary_venue_name text,
  p_setup_buffer_minutes integer,
  p_turnover_buffer_minutes integer
)
returns setof public.theaters
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_before public.theaters%rowtype;
  v_after public.theaters%rowtype;
begin
  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::public.membership_status
      and (
        'owner'::public.theater_role = any(membership.roles)
        or 'admin'::public.theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  select * into v_before
  from public.theaters
  where id = p_theater_id
  for update;

  if not found then
    return;
  end if;

  update public.theaters
  set
    producer_eligibility = p_producer_eligibility,
    owner_self_approval_enabled = p_owner_self_approval_enabled,
    counteroffer_response_hours = p_counteroffer_response_hours,
    primary_venue_name = nullif(btrim(p_primary_venue_name), ''),
    setup_buffer_minutes = p_setup_buffer_minutes,
    turnover_buffer_minutes = p_turnover_buffer_minutes
  where id = p_theater_id
  returning * into v_after;

  if row(
    v_before.producer_eligibility,
    v_before.owner_self_approval_enabled,
    v_before.counteroffer_response_hours,
    v_before.primary_venue_name,
    v_before.setup_buffer_minutes,
    v_before.turnover_buffer_minutes
  ) is distinct from row(
    v_after.producer_eligibility,
    v_after.owner_self_approval_enabled,
    v_after.counteroffer_response_hours,
    v_after.primary_venue_name,
    v_after.setup_buffer_minutes,
    v_after.turnover_buffer_minutes
  ) then
    insert into public.activity_events (
      theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
    ) values (
      p_theater_id,
      'theater',
      p_theater_id,
      p_actor_user_id,
      'theater.governance.updated',
      'member_visible'::public.activity_visibility,
      jsonb_build_object(
        'producerEligibility', v_after.producer_eligibility,
        'ownerSelfApprovalEnabled', v_after.owner_self_approval_enabled,
        'counterofferResponseHours', v_after.counteroffer_response_hours,
        'primaryVenueName', v_after.primary_venue_name,
        'setupBufferMinutes', v_after.setup_buffer_minutes,
        'turnoverBufferMinutes', v_after.turnover_buffer_minutes
      )
    );
  end if;

  return next v_after;
end;
$function$;

create or replace function public.set_theater_member_capability(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_user_id uuid,
  p_capability public.theater_capability,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_changed boolean := false;
  v_row_count integer := 0;
begin
  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::public.membership_status
      and (
        'owner'::public.theater_role = any(membership.roles)
        or 'admin'::public.theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_user_id
      and membership.status = 'active'::public.membership_status
  ) then
    raise invalid_parameter_value using message = 'Active Theater membership is required.';
  end if;

  if p_enabled then
    insert into public.theater_member_capabilities (
      theater_id, user_id, capability, granted_by_user_id
    ) values (
      p_theater_id, p_user_id, p_capability, p_actor_user_id
    )
    on conflict do nothing;
    get diagnostics v_row_count = row_count;
  else
    delete from public.theater_member_capabilities
    where theater_id = p_theater_id
      and user_id = p_user_id
      and capability = p_capability;
    get diagnostics v_row_count = row_count;
  end if;

  v_changed := v_row_count > 0;

  if v_changed then
    insert into public.activity_events (
      theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
    ) values (
      p_theater_id,
      'theater_member',
      p_user_id,
      p_actor_user_id,
      case when p_enabled then 'theater.capability.granted' else 'theater.capability.revoked' end,
      'member_visible'::public.activity_visibility,
      jsonb_build_object('memberUserId', p_user_id, 'capability', p_capability)
    );
  end if;

  return v_changed;
end;
$function$;

create or replace function public.create_managed_event(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_title text,
  p_slug text,
  p_producer_user_ids uuid[] default array[]::uuid[],
  p_director_user_id uuid default null
)
returns setof public.shows
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.shows%rowtype;
  v_producer_user_ids uuid[];
  v_user_id uuid;
begin
  if nullif(btrim(p_title), '') is null or nullif(btrim(p_slug), '') is null then
    raise invalid_parameter_value using message = 'Event title and slug are required.';
  end if;

  if not public.is_eligible_event_producer(p_theater_id, p_actor_user_id) then
    raise insufficient_privilege using message = 'Eligible Producer access is required.';
  end if;

  select array_agg(distinct producer_id)
  into v_producer_user_ids
  from unnest(array_append(coalesce(p_producer_user_ids, array[]::uuid[]), p_actor_user_id))
    as producer_id;

  if exists (
    select 1
    from unnest(v_producer_user_ids) as producer_id
    where not public.is_eligible_event_producer(p_theater_id, producer_id)
  ) then
    raise insufficient_privilege using message = 'Every Producer must be eligible under current Theater policy.';
  end if;

  if p_director_user_id is not null and not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_director_user_id
      and membership.status = 'active'::public.membership_status
  ) then
    raise invalid_parameter_value using message = 'The Director must be an active Theater Member.';
  end if;

  insert into public.shows (
    theater_id,
    created_by_user_id,
    title,
    slug,
    event_type,
    status,
    lifecycle_status,
    publication_status,
    operational_health,
    is_public_listed
  ) values (
    p_theater_id,
    p_actor_user_id,
    btrim(p_title),
    btrim(p_slug),
    'show'::public.event_type,
    'draft'::public.show_status,
    'draft'::public.show_lifecycle_status,
    'unpublished'::public.show_publication_status,
    'on_track'::public.show_operational_health,
    false
  )
  returning * into v_event;

  foreach v_user_id in array v_producer_user_ids loop
    insert into public.show_leadership (
      show_id, user_id, role, assigned_by_user_id
    ) values (
      v_event.id, v_user_id, 'producer'::public.event_leadership_role, p_actor_user_id
    );

    insert into public.activity_events (
      theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
    ) values (
      p_theater_id,
      'event',
      v_event.id,
      p_actor_user_id,
      'event.role.assigned',
      'member_visible'::public.activity_visibility,
      jsonb_build_object('memberUserId', v_user_id, 'role', 'producer')
    );
  end loop;

  if p_director_user_id is not null then
    insert into public.show_leadership (
      show_id, user_id, role, assigned_by_user_id
    ) values (
      v_event.id, p_director_user_id, 'director'::public.event_leadership_role, p_actor_user_id
    );

    insert into public.activity_events (
      theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
    ) values (
      p_theater_id,
      'event',
      v_event.id,
      p_actor_user_id,
      'event.role.assigned',
      'member_visible'::public.activity_visibility,
      jsonb_build_object('memberUserId', p_director_user_id, 'role', 'director')
    );
  end if;

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_theater_id,
    'event',
    v_event.id,
    p_actor_user_id,
    'event.created',
    'member_visible'::public.activity_visibility,
    jsonb_build_object('title', v_event.title, 'slug', v_event.slug)
  );

  return next v_event;
end;
$function$;

alter table public.theater_member_capabilities enable row level security;
alter table public.show_leadership enable row level security;

create policy "theater_member_capabilities_select_member"
on public.theater_member_capabilities
for select
to authenticated
using (public.is_active_member_of_theater(theater_id));

create policy "show_leadership_select_visible"
on public.show_leadership
for select
to authenticated
using (public.can_view_show(show_id));

revoke all on function public.is_eligible_event_producer(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.is_eligible_event_producer(uuid, uuid)
  to service_role;

revoke all on function public.update_theater_governance(
  uuid, uuid, public.producer_eligibility_policy, boolean, integer, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.update_theater_governance(
  uuid, uuid, public.producer_eligibility_policy, boolean, integer, text, integer, integer
) to service_role;

revoke all on function public.set_theater_member_capability(
  uuid, uuid, uuid, public.theater_capability, boolean
) from public, anon, authenticated;
grant execute on function public.set_theater_member_capability(
  uuid, uuid, uuid, public.theater_capability, boolean
) to service_role;

revoke all on function public.create_managed_event(
  uuid, uuid, text, text, uuid[], uuid
) from public, anon, authenticated;
grant execute on function public.create_managed_event(
  uuid, uuid, text, text, uuid[], uuid
) to service_role;

grant select, insert, update, delete
on public.theater_member_capabilities, public.show_leadership
to service_role;
