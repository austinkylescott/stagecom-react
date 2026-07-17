alter table public.theaters
  add column if not exists upcoming_shows_limit integer not null default 5,
  add column if not exists upcoming_other_events_limit integer not null default 5;

alter table public.theaters
  drop constraint if exists theaters_upcoming_shows_limit_check,
  drop constraint if exists theaters_upcoming_other_events_limit_check;

alter table public.theaters
  add constraint theaters_upcoming_shows_limit_check
    check (upcoming_shows_limit between 1 and 12),
  add constraint theaters_upcoming_other_events_limit_check
    check (upcoming_other_events_limit between 1 and 12);
