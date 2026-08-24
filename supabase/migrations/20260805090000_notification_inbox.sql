alter table public.notifications
  add column dismissed_at timestamptz;

create index idx_notifications_user_dismissed
  on public.notifications (user_id, dismissed_at, created_at desc);

grant select, update (read_at, dismissed_at) on public.notifications
  to authenticated;
