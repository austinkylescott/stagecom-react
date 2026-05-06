alter table public.theaters enable row level security;

drop policy if exists "theaters_select_public" on public.theaters;
create policy "theaters_select_public"
on public.theaters
for select
to authenticated, anon
using (true);
