alter table public.shows
  add column summary text,
  add column poster_url text,
  add column producer_note text;

create table public.show_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_type text not null check (
    assignment_type in ('front_of_house', 'box_office', 'bar', 'tech', 'other')
  ),
  status text not null default 'assigned' check (
    status in ('assigned', 'confirmed', 'cancelled')
  ),
  note text,
  created_at timestamptz not null default now(),
  unique (show_id, user_id, assignment_type)
);

create index idx_show_staff_assignments_show
  on public.show_staff_assignments (show_id, assignment_type);

create index idx_show_staff_assignments_user
  on public.show_staff_assignments (user_id);
