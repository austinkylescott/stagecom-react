create or replace function public.is_theater_staff(p_theater_id uuid)
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
        'admin'::theater_role = any(m.roles)
        or 'manager'::theater_role = any(m.roles)
        or 'staff'::theater_role = any(m.roles)
      )
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
    from public.show_roles r
    where r.show_id = p_show_id
      and r.user_id = auth.uid()
      and r.role = 'producer'::show_role
  );
$function$;

create or replace function public.can_view_profile(
  p_profile_id uuid,
  p_visibility profile_visibility
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    auth.uid() = p_profile_id
    or p_visibility = 'public'::profile_visibility
    or (
      p_visibility = 'theater_only'::profile_visibility
      and exists (
        select 1
        from public.theater_memberships mine
        join public.theater_memberships theirs
          on theirs.theater_id = mine.theater_id
        where mine.user_id = auth.uid()
          and mine.status = 'active'::membership_status
          and theirs.user_id = p_profile_id
          and theirs.status = 'active'::membership_status
      )
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
    from public.shows s
    where s.id = p_show_id
      and (
        (s.status = 'approved'::show_status and s.is_public_listed = true)
        or public.is_show_producer(s.id)
        or public.is_theater_staff(s.theater_id)
        or exists (
          select 1
          from public.show_cast c
          where c.show_id = s.id
            and c.user_id = auth.uid()
            and c.status in (
              'pending'::show_cast_status,
              'accepted'::show_cast_status
            )
        )
      )
  );
$function$;

create or replace function public.can_insert_show_role(
  p_show_id uuid,
  p_user_id uuid,
  p_role show_role
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    (
      p_user_id = auth.uid()
      and p_role = 'producer'::show_role
      and exists (
        select 1
        from public.shows s
        where s.id = p_show_id
          and s.created_by_user_id = auth.uid()
      )
    )
    or exists (
      select 1
      from public.shows s
      where s.id = p_show_id
        and public.is_theater_staff(s.theater_id)
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
      public.is_show_producer(p_show_id)
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

create or replace function public.can_update_show_cast(
  p_show_id uuid,
  p_user_id uuid,
  p_source show_cast_source,
  p_status show_cast_status,
  p_program_order integer,
  p_note text
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
      from public.show_cast existing
      where existing.show_id = p_show_id
        and existing.user_id = auth.uid()
        and p_user_id = auth.uid()
        and existing.program_order is not distinct from p_program_order
        and existing.note is not distinct from p_note
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

-- Direct authenticated inserts into show_review_events stay staff-scoped.
-- Producer review submissions are expected to be recorded by an authorized
-- server-side workflow after producer permissions are checked.
--
-- program_order is application-managed for accepted performers. Producers
-- reorder the lineup through server logic that reindexes later slotted
-- performers so the order remains collision-free within a show.

alter table public.profiles enable row level security;
alter table public.theater_memberships enable row level security;
alter table public.shows enable row level security;
alter table public.show_roles enable row level security;
alter table public.show_occurrences enable row level security;
alter table public.show_cast enable row level security;
alter table public.show_review_events enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;

drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible"
on public.profiles
for select
to authenticated, anon
using (public.can_view_profile(id, visibility));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "theater_memberships_select_visible" on public.theater_memberships;
create policy "theater_memberships_select_visible"
on public.theater_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_theater_staff(theater_id)
  or (
    status = 'active'::membership_status
    and public.is_active_member_of_theater(theater_id)
  )
);

drop policy if exists "shows_select_visible" on public.shows;
create policy "shows_select_visible"
on public.shows
for select
to authenticated, anon
using (public.can_view_show(id));

drop policy if exists "shows_insert_active_member" on public.shows;
create policy "shows_insert_active_member"
on public.shows
for insert
to authenticated
with check (
  created_by_user_id = auth.uid()
  and public.is_active_member_of_theater(theater_id)
);

drop policy if exists "shows_update_staff_or_producer" on public.shows;
create policy "shows_update_staff_or_producer"
on public.shows
for update
to authenticated
using (
  public.is_show_producer(id)
  or public.is_theater_staff(theater_id)
)
with check (
  public.is_show_producer(id)
  or public.is_theater_staff(theater_id)
);

drop policy if exists "show_roles_select_visible" on public.show_roles;
create policy "show_roles_select_visible"
on public.show_roles
for select
to authenticated, anon
using (
  public.can_view_show(show_id)
  or user_id = auth.uid()
);

drop policy if exists "show_roles_insert_staff_or_producer" on public.show_roles;
create policy "show_roles_insert_staff_or_producer"
on public.show_roles
for insert
to authenticated
with check (public.can_insert_show_role(show_id, user_id, role));

drop policy if exists "show_occurrences_select_visible" on public.show_occurrences;
create policy "show_occurrences_select_visible"
on public.show_occurrences
for select
to authenticated, anon
using (public.can_view_show(show_id));

drop policy if exists "show_occurrences_mutate_staff_or_producer" on public.show_occurrences;
create policy "show_occurrences_mutate_staff_or_producer"
on public.show_occurrences
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

drop policy if exists "show_cast_select_visible" on public.show_cast;
create policy "show_cast_select_visible"
on public.show_cast
for select
to authenticated, anon
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.shows s
    where s.id = show_id
      and (
        public.is_show_producer(s.id)
        or public.is_theater_staff(s.theater_id)
        or (
          s.status = 'approved'::show_status
          and s.is_public_listed = true
          and show_cast.status = 'accepted'::show_cast_status
        )
        or (
          show_cast.status in (
            'accepted'::show_cast_status,
            'pending'::show_cast_status
          )
          and exists (
            select 1
            from public.show_cast mine
            where mine.show_id = show_cast.show_id
              and mine.user_id = auth.uid()
              and (
                mine.status = 'accepted'::show_cast_status
                or (mine.status = 'pending'::show_cast_status and mine.source = 'invited'::show_cast_source)
              )
          )
        )
      )
  )
);

drop policy if exists "show_cast_insert_self_or_producer" on public.show_cast;
create policy "show_cast_insert_self_or_producer"
on public.show_cast
for insert
to authenticated
with check (public.can_insert_show_cast(show_id, user_id, source, status));

drop policy if exists "show_cast_update_self_or_producer" on public.show_cast;
create policy "show_cast_update_self_or_producer"
on public.show_cast
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_show_producer(show_id)
)
with check (
  public.can_update_show_cast(
    show_id,
    user_id,
    source,
    status,
    program_order,
    note
  )
);

drop policy if exists "show_review_events_select_visible" on public.show_review_events;
create policy "show_review_events_select_visible"
on public.show_review_events
for select
to authenticated
using (public.can_view_show(show_id));

drop policy if exists "show_review_events_insert_staff" on public.show_review_events;
create policy "show_review_events_insert_staff"
on public.show_review_events
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and exists (
    select 1
    from public.shows s
    where s.id = show_id
      and public.is_theater_staff(s.theater_id)
  )
);

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "email_outbox_select_own" on public.email_outbox;
create policy "email_outbox_select_own"
on public.email_outbox
for select
to authenticated
using (user_id = auth.uid());
