alter table public.theaters
  add column primary_venue_id uuid not null default gen_random_uuid();

create unique index theaters_primary_venue_id_unique
  on public.theaters (primary_venue_id);

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
    join public.shows as show on show.id = leadership.show_id
    join public.theater_memberships as membership
      on membership.theater_id = show.theater_id
      and membership.user_id = leadership.user_id
      and membership.status = 'active'::public.membership_status
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
    join public.shows as show on show.id = leadership.show_id
    where leadership.show_id = p_show_id
      and leadership.user_id = auth.uid()
      and leadership.role = 'producer'::public.event_leadership_role
      and public.is_eligible_event_producer(show.theater_id, auth.uid())
  ) or exists (
    select 1
    from public.show_roles as role
    join public.shows as show on show.id = role.show_id
    where role.show_id = p_show_id
      and role.user_id = auth.uid()
      and role.role = 'producer'::public.show_role
      and public.is_eligible_event_producer(show.theater_id, auth.uid())
  );
$function$;

create or replace function public.can_insert_show_role(
  p_show_id uuid,
  p_user_id uuid,
  p_role public.show_role
)
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
      and p_role = 'producer'::public.show_role
      and public.is_eligible_event_producer(show.theater_id, p_user_id)
      and (
        (
          p_user_id = auth.uid()
          and show.created_by_user_id = auth.uid()
          and public.is_eligible_event_producer(show.theater_id, auth.uid())
        )
        or public.is_theater_admin(show.theater_id)
        or public.is_show_producer(show.id)
      )
  );
$function$;

drop policy if exists "shows_insert_active_member" on public.shows;
create policy "shows_insert_eligible_producer"
on public.shows
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.is_eligible_event_producer(theater_id, auth.uid())
);
