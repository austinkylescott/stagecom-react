create type theater_status as enum ('draft', 'published', 'archived');
create type timezone_source as enum ('unknown', 'inferred', 'manual');
create type invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type activity_visibility as enum ('admin_only', 'member_visible', 'self_only');
create type staff_slot_type as enum ('lead', 'front_of_house', 'box_office', 'bar', 'tech', 'other');

alter table public.theaters
  add column status theater_status not null default 'draft',
  add column published_at timestamptz,
  add column social_links jsonb not null default '{}'::jsonb,
  add column timezone_source timezone_source not null default 'unknown';

create index idx_theaters_status on public.theaters (status);
create index idx_theaters_published on public.theaters (slug)
  where status = 'published'::theater_status;

create table public.theater_invites (
  id uuid primary key default gen_random_uuid(),
  theater_id uuid not null references public.theaters(id) on delete cascade,
  email text not null check (btrim(email) <> ''),
  role theater_role not null default 'member',
  token_hash text not null unique check (btrim(token_hash) <> ''),
  status invite_status not null default 'pending',
  invited_by_user_id uuid references public.profiles(id) on delete set null,
  accepted_by_user_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_theater_invites_theater_status
  on public.theater_invites (theater_id, status);
create index idx_theater_invites_email_theater
  on public.theater_invites (lower(email), theater_id);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  theater_id uuid references public.theaters(id) on delete cascade,
  entity_type text not null check (btrim(entity_type) <> ''),
  entity_id uuid,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null check (btrim(action) <> ''),
  visibility activity_visibility not null default 'admin_only',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_events_theater_created
  on public.activity_events (theater_id, created_at desc);
create index idx_activity_events_entity_created
  on public.activity_events (entity_type, entity_id, created_at desc);
create index idx_activity_events_actor_created
  on public.activity_events (actor_user_id, created_at desc);

create table public.theater_staff_slot_defaults (
  id uuid primary key default gen_random_uuid(),
  theater_id uuid not null references public.theaters(id) on delete cascade,
  event_type event_type not null,
  slot_type staff_slot_type not null,
  label text not null check (btrim(label) <> ''),
  minimum_count integer not null default 0 check (minimum_count >= 0),
  recommended_count integer not null default 0,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint theater_staff_slot_defaults_recommended_check
    check (recommended_count >= minimum_count),
  unique (theater_id, event_type, slot_type, label)
);

create index idx_theater_staff_slot_defaults_theater_event
  on public.theater_staff_slot_defaults (theater_id, event_type, is_active, position);

create table public.show_acts (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (show_id, position)
);

create index idx_show_acts_show_position
  on public.show_acts (show_id, position);

alter table public.show_cast
  add column act_id uuid references public.show_acts(id) on delete set null;

create index idx_show_cast_act on public.show_cast (act_id, program_order);

alter table public.show_staff_assignments
  drop constraint if exists show_staff_assignments_assignment_type_check;

alter table public.show_staff_assignments
  add constraint show_staff_assignments_assignment_type_check
    check (assignment_type in ('lead', 'front_of_house', 'box_office', 'bar', 'tech', 'other'));

create trigger trg_theater_invites_updated
  before update on public.theater_invites
  for each row execute procedure public.set_timestamp();

create trigger trg_theater_staff_slot_defaults_updated
  before update on public.theater_staff_slot_defaults
  for each row execute procedure public.set_timestamp();

create trigger trg_show_acts_updated
  before update on public.show_acts
  for each row execute procedure public.set_timestamp();

create or replace function public.is_theater_admin(p_theater_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.theater_memberships m
    where m.theater_id = p_theater_id
      and m.user_id = auth.uid()
      and m.status = 'active'::membership_status
      and (
        'owner'::theater_role = any(m.roles)
        or 'admin'::theater_role = any(m.roles)
      )
  );
$function$;

create or replace function public.is_theater_owner(p_theater_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.theater_memberships m
    where m.theater_id = p_theater_id
      and m.user_id = auth.uid()
      and m.status = 'active'::membership_status
      and 'owner'::theater_role = any(m.roles)
  );
$function$;

-- Preserve the old helper name for baseline policy compatibility, but redefine
-- its meaning for the rebuild: theater oversight is owner/admin only.
create or replace function public.is_theater_staff(p_theater_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select public.is_theater_admin(p_theater_id);
$function$;

create or replace function public.can_update_show_cast(
  p_show_id uuid,
  p_user_id uuid,
  p_source show_cast_source,
  p_status show_cast_status,
  p_program_order integer,
  p_note text,
  p_act_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    public.is_show_producer(p_show_id)
    or exists (
      select 1
      from public.shows s
      where s.id = p_show_id
        and public.is_theater_admin(s.theater_id)
    )
    or exists (
      select 1
      from public.show_cast existing
      where existing.show_id = p_show_id
        and existing.user_id = auth.uid()
        and p_user_id = auth.uid()
        and existing.program_order is not distinct from p_program_order
        and existing.note is not distinct from p_note
        and existing.act_id is not distinct from p_act_id
        and existing.source = p_source
        and (
          (
            existing.source = 'invited'::show_cast_source
            and existing.status = 'pending'::show_cast_status
            and p_status in (
              'accepted'::show_cast_status,
              'declined'::show_cast_status
            )
          )
          or (
            existing.source = 'requested'::show_cast_source
            and existing.status = 'pending'::show_cast_status
            and p_status = 'withdrawn'::show_cast_status
          )
          or (
            existing.status = 'accepted'::show_cast_status
            and p_status = 'withdrawn'::show_cast_status
          )
        )
    );
$function$;

create or replace function public.can_insert_show_cast(
  p_show_id uuid,
  p_user_id uuid,
  p_source show_cast_source,
  p_status show_cast_status
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    (
      (
        public.is_show_producer(p_show_id)
        or exists (
          select 1
          from public.shows s
          where s.id = p_show_id
            and public.is_theater_admin(s.theater_id)
        )
      )
      and p_source = 'invited'::show_cast_source
      and p_status = 'pending'::show_cast_status
    )
    or (
      p_user_id = auth.uid()
      and p_source = 'requested'::show_cast_source
      and p_status = 'pending'::show_cast_status
      and exists (
        select 1
        from public.shows s
        where s.id = p_show_id
          and not public.is_show_producer(s.id)
          and (
            s.casting_mode = 'public_casting'::casting_mode
            or (
              s.casting_mode = 'theater_casting'::casting_mode
              and public.is_active_member_of_theater(s.theater_id)
            )
          )
      )
    );
$function$;

alter table public.theater_invites enable row level security;
alter table public.activity_events enable row level security;
alter table public.theater_staff_slot_defaults enable row level security;
alter table public.show_acts enable row level security;

drop policy if exists "theaters_select_public" on public.theaters;
create policy "theaters_select_public"
on public.theaters
for select
to authenticated, anon
using (
  status = 'published'::theater_status
  or public.is_active_member_of_theater(id)
);

drop policy if exists "theater_memberships_select_visible" on public.theater_memberships;
create policy "theater_memberships_select_visible"
on public.theater_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_theater_admin(theater_id)
  or (
    status = 'active'::membership_status
    and public.is_active_member_of_theater(theater_id)
  )
);

drop policy if exists "show_cast_update_self_or_producer" on public.show_cast;
create policy "show_cast_update_self_or_producer"
on public.show_cast
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_show_producer(show_id)
  or exists (
    select 1
    from public.shows s
    where s.id = show_id
      and public.is_theater_admin(s.theater_id)
  )
)
with check (
  public.can_update_show_cast(
    show_id,
    user_id,
    source,
    status,
    program_order,
    note,
    act_id
  )
);

drop policy if exists "show_staff_assignments_mutate_staff_or_producer" on public.show_staff_assignments;
create policy "show_staff_assignments_mutate_admin"
on public.show_staff_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.shows s
    where s.id = show_id
      and public.is_theater_admin(s.theater_id)
  )
)
with check (
  exists (
    select 1
    from public.shows s
    where s.id = show_id
      and public.is_theater_admin(s.theater_id)
  )
);

create policy "theater_invites_select_admin"
on public.theater_invites
for select
to authenticated
using (public.is_theater_admin(theater_id));

create policy "theater_invites_insert_admin"
on public.theater_invites
for insert
to authenticated
with check (
  public.is_theater_admin(theater_id)
  and invited_by_user_id = auth.uid()
);

create policy "theater_invites_update_admin"
on public.theater_invites
for update
to authenticated
using (public.is_theater_admin(theater_id))
with check (public.is_theater_admin(theater_id));

create policy "activity_events_select_visible"
on public.activity_events
for select
to authenticated
using (
  (
    visibility = 'admin_only'::activity_visibility
    and theater_id is not null
    and public.is_theater_admin(theater_id)
  )
  or (
    visibility = 'member_visible'::activity_visibility
    and theater_id is not null
    and public.is_active_member_of_theater(theater_id)
  )
  or (
    visibility = 'self_only'::activity_visibility
    and actor_user_id = auth.uid()
  )
);

create policy "activity_events_insert_admin_or_actor"
on public.activity_events
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and (
    visibility = 'self_only'::activity_visibility
    or (
      theater_id is not null
      and public.is_theater_admin(theater_id)
    )
  )
);

create policy "theater_staff_slot_defaults_select_member"
on public.theater_staff_slot_defaults
for select
to authenticated
using (public.is_active_member_of_theater(theater_id));

create policy "theater_staff_slot_defaults_mutate_admin"
on public.theater_staff_slot_defaults
for all
to authenticated
using (public.is_theater_admin(theater_id))
with check (public.is_theater_admin(theater_id));

create policy "show_acts_select_visible"
on public.show_acts
for select
to authenticated, anon
using (public.can_view_show(show_id));

create policy "show_acts_mutate_producer_or_admin"
on public.show_acts
for all
to authenticated
using (
  public.is_show_producer(show_id)
  or exists (
    select 1
    from public.shows s
    where s.id = show_id
      and public.is_theater_admin(s.theater_id)
  )
)
with check (
  public.is_show_producer(show_id)
  or exists (
    select 1
    from public.shows s
    where s.id = show_id
      and public.is_theater_admin(s.theater_id)
  )
);
