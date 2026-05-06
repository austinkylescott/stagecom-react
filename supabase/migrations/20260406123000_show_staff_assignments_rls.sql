alter table public.show_staff_assignments enable row level security;

drop policy if exists "show_staff_assignments_select_visible" on public.show_staff_assignments;
create policy "show_staff_assignments_select_visible"
on public.show_staff_assignments
for select
to authenticated, anon
using (
  user_id = auth.uid()
  or public.can_view_show(show_id)
);

drop policy if exists "show_staff_assignments_mutate_staff_or_producer" on public.show_staff_assignments;
create policy "show_staff_assignments_mutate_staff_or_producer"
on public.show_staff_assignments
for all
to authenticated
using (
  public.is_show_producer(show_id)
  or exists (
    select 1
    from public.shows s
    where s.id = show_id
      and public.is_theater_staff(s.theater_id)
  )
)
with check (
  public.is_show_producer(show_id)
  or exists (
    select 1
    from public.shows s
    where s.id = show_id
      and public.is_theater_staff(s.theater_id)
  )
);
