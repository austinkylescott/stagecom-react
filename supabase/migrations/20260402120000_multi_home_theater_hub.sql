create extension if not exists pg_trgm;

alter table public.theater_memberships
  add column if not exists is_home boolean not null default false,
  add column if not exists home_rank integer;

update public.theater_memberships as membership
set is_home = true
from public.profiles as profile
where profile.id = membership.user_id
  and profile.home_theater_id = membership.theater_id;

update public.theater_memberships
set is_home = false,
    home_rank = null
where status <> 'active';

create index if not exists idx_theater_memberships_user_home
  on public.theater_memberships (user_id, is_home);

create index if not exists idx_theaters_name
  on public.theaters (name);

create index if not exists idx_theaters_created_at
  on public.theaters (created_at desc);

create index if not exists idx_theaters_name_trgm
  on public.theaters
  using gin (name gin_trgm_ops);
