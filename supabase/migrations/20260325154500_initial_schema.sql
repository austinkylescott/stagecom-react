create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create type theater_role as enum ('admin', 'manager', 'staff', 'instructor', 'member');
create type membership_status as enum ('active', 'inactive');
create type show_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'cancelled');
create type event_type as enum ('show', 'practice', 'meeting', 'audition', 'workshop');
create type casting_mode as enum ('direct_invite', 'theater_casting', 'public_casting');
create type show_role as enum ('producer');
create type show_occurrence_status as enum ('scheduled', 'changed', 'cancelled');
create type show_cast_source as enum ('invited', 'requested');
create type show_cast_status as enum ('pending', 'accepted', 'declined', 'withdrawn', 'removed');
create type review_action as enum ('submitted', 'approved', 'rejected', 'changes_requested');
create type notification_entity as enum ('show', 'occurrence', 'cast');
create type email_outbox_status as enum ('queued', 'sent', 'failed');
create type profile_visibility as enum ('public', 'theater_only', 'private');

create table profiles (
    id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
    display_name text not null,
    avatar_url text,
    timezone text default 'UTC',
    pronouns text,
    bio text,
    city text,
    handle text,
    home_theater_id uuid,
    contact_links jsonb not null default '{}'::jsonb,
    notification_preferences jsonb not null default '{}'::jsonb,
    availability jsonb,
    casting_notes text,
    visibility profile_visibility not null default 'theater_only',
    verified_at timestamptz,
    trust_flags jsonb not null default '{}'::jsonb,
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_profiles_display_name on profiles using gin (to_tsvector('english', display_name));
create unique index idx_profiles_handle_lower_unique on profiles (lower(handle));

create table theaters (
    id uuid primary key default gen_random_uuid(),
    name text not null check (btrim(name) <> ''),
    slug text not null unique check (btrim(slug) <> ''),
    tagline text not null check (btrim(tagline) <> ''),
    timezone text not null default 'UTC' check (btrim(timezone) <> ''),
    street text not null check (btrim(street) <> ''),
    city text not null check (btrim(city) <> ''),
    state_region text not null check (btrim(state_region) <> ''),
    postal_code text not null check (btrim(postal_code) <> ''),
    country text not null check (btrim(country) <> ''),
    website_url text,
    logo_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table theater_memberships (
    theater_id uuid not null references theaters(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    roles theater_role[] not null default array['member']::theater_role[],
    status membership_status not null default 'active',
    is_home boolean not null default false,
    home_rank integer,
    created_at timestamptz not null default now(),
    primary key (theater_id, user_id)
);
create index idx_theater_memberships_user on theater_memberships (user_id);
create index idx_theater_memberships_user_home on theater_memberships (user_id, is_home);

create table shows (
    id uuid primary key default gen_random_uuid(),
    theater_id uuid not null references theaters(id) on delete cascade,
    created_by_user_id uuid references profiles(id) on delete set null,
    status show_status not null default 'draft',
    title text not null,
    description text,
    event_type event_type not null default 'show',
    casting_mode casting_mode not null default 'direct_invite',
    cast_min integer,
    cast_max integer,
    is_cast_finalized boolean not null default false,
    is_public_listed boolean not null default false,
    ticket_url text,
    on_sale_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index idx_shows_theater on shows (theater_id);
create index idx_shows_status on shows (status);

create table show_roles (
    show_id uuid not null references shows(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    role show_role not null default 'producer',
    created_at timestamptz not null default now(),
    primary key (show_id, user_id, role)
);

create table show_occurrences (
    id uuid primary key default gen_random_uuid(),
    show_id uuid not null references shows(id) on delete cascade,
    starts_at timestamptz not null,
    ends_at timestamptz,
    status show_occurrence_status not null default 'scheduled',
    created_at timestamptz not null default now()
);
create index idx_show_occurrences_show on show_occurrences (show_id, starts_at);

create table show_cast (
    show_id uuid not null references shows(id) on delete cascade,
    user_id uuid not null references profiles(id) on delete cascade,
    source show_cast_source not null,
    status show_cast_status not null default 'pending',
    program_order integer,
    note text,
    created_at timestamptz not null default now(),
    primary key (show_id, user_id)
);
create index idx_show_cast_user on show_cast (user_id);

create table show_review_events (
    id uuid primary key default gen_random_uuid(),
    show_id uuid not null references shows(id) on delete cascade,
    action review_action not null,
    actor_user_id uuid references profiles(id) on delete set null,
    note text,
    created_at timestamptz not null default now()
);
create index idx_show_review_events_show on show_review_events (show_id, created_at);

create table notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references profiles(id) on delete cascade,
    type text not null,
    entity_type notification_entity not null,
    entity_id uuid not null,
    payload jsonb,
    dedupe_key text not null,
    read_at timestamptz,
    created_at timestamptz not null default now(),
    unique (user_id, dedupe_key)
);
create index idx_notifications_user_read on notifications (user_id, read_at);

create table email_outbox (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references profiles(id) on delete set null,
    template text not null,
    payload jsonb,
    dedupe_key text,
    status email_outbox_status not null default 'queued',
    created_at timestamptz not null default now(),
    sent_at timestamptz,
    last_error text,
    unique (user_id, dedupe_key)
);

create or replace function public.set_timestamp()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated
  before update on profiles
  for each row execute procedure set_timestamp();

create trigger trg_theaters_updated
  before update on theaters
  for each row execute procedure set_timestamp();

create trigger trg_shows_updated
  before update on shows
  for each row execute procedure set_timestamp();

alter table profiles
  add constraint fk_profiles_home_theater
  foreign key (home_theater_id) references theaters(id) on delete set null;

create or replace function public.handle_new_user()
returns trigger as $$
declare
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'user_name',
    new.email,
    'New user'
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, display_name, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path to 'public';

create or replace function public.is_active_member_of_theater(p_theater_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.theater_memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'::membership_status
      and m.theater_id = p_theater_id
  );
$function$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
