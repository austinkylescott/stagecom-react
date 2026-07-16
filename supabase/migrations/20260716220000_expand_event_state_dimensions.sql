create type public.show_lifecycle_status as enum (
  'draft',
  'in_review',
  'approved',
  'cancelled',
  'completed'
);

create type public.show_publication_status as enum (
  'unpublished',
  'published'
);

create type public.show_operational_health as enum (
  'on_track',
  'at_risk'
);

create schema if not exists private;

revoke all on schema private from public, anon, authenticated, service_role;

alter table public.shows
  add column lifecycle_status public.show_lifecycle_status,
  add column publication_status public.show_publication_status,
  add column operational_health public.show_operational_health;

create or replace function public.legacy_show_lifecycle_status(
  p_status public.show_status
)
returns public.show_lifecycle_status
language sql
immutable
set search_path to 'public'
as $function$
  select case p_status
    when 'draft'::public.show_status then 'draft'::public.show_lifecycle_status
    when 'pending_review'::public.show_status then 'in_review'::public.show_lifecycle_status
    when 'approved'::public.show_status then 'approved'::public.show_lifecycle_status
    when 'rejected'::public.show_status then 'cancelled'::public.show_lifecycle_status
    when 'cancelled'::public.show_status then 'cancelled'::public.show_lifecycle_status
  end;
$function$;

create or replace function public.legacy_show_publication_status(
  p_status public.show_status,
  p_is_public_listed boolean
)
returns public.show_publication_status
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_status = 'approved'::public.show_status and p_is_public_listed
      then 'published'::public.show_publication_status
    else 'unpublished'::public.show_publication_status
  end;
$function$;

-- Legacy Event rows map as follows during expansion:
--
-- legacy status   lifecycle    Publication                         health
-- draft           draft        unpublished                        on_track
-- pending_review  in_review    unpublished                        on_track
-- approved        approved     published only when publicly listed on_track
-- rejected        cancelled    unpublished                        on_track
-- cancelled       cancelled    unpublished                        on_track
--
-- `rejected` remains available in the legacy status column. Mapping it to the
-- terminal cancelled lifecycle avoids reviving a closed legacy Event as a new
-- draft. The old schema has no reliable operational-risk signal, so every row
-- begins on track.
create or replace function private.backfill_expanded_show_state_from_legacy()
returns void
language sql
set search_path to 'public'
as $function$
  update public.shows
  set
    lifecycle_status = public.legacy_show_lifecycle_status(status),
    publication_status = public.legacy_show_publication_status(status, is_public_listed),
    operational_health = 'on_track'::public.show_operational_health
  where lifecycle_status is null
    or publication_status is null
    or operational_health is null;
$function$;

select private.backfill_expanded_show_state_from_legacy();

revoke all on function private.backfill_expanded_show_state_from_legacy()
from public, anon, authenticated, service_role;

alter table public.shows
  alter column lifecycle_status set default 'draft'::public.show_lifecycle_status,
  alter column lifecycle_status set not null,
  alter column publication_status set default 'unpublished'::public.show_publication_status,
  alter column publication_status set not null,
  alter column operational_health set default 'on_track'::public.show_operational_health,
  alter column operational_health set not null;

create index idx_shows_lifecycle_status
  on public.shows (lifecycle_status);

create index idx_shows_publication_status
  on public.shows (publication_status)
  where publication_status = 'published'::public.show_publication_status;

create index idx_shows_operational_health
  on public.shows (operational_health)
  where operational_health = 'at_risk'::public.show_operational_health;

-- Keep inserts and callers that still write the legacy status/listing fields
-- compatible during expansion. New callers may update the independent fields
-- directly; those writes deliberately do not collapse back into one status.
create or replace function public.sync_expanded_show_state_from_legacy()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    -- A non-default legacy field identifies a legacy-shaped insert. When the
    -- legacy fields remain at their defaults, preserve explicitly supplied
    -- independent dimensions for new callers.
    if new.status <> 'draft'::public.show_status or new.is_public_listed then
      new.lifecycle_status := public.legacy_show_lifecycle_status(new.status);
      new.publication_status := public.legacy_show_publication_status(
        new.status,
        new.is_public_listed
      );
    end if;

    return new;
  end if;

  if new.status is distinct from old.status then
    new.lifecycle_status := public.legacy_show_lifecycle_status(new.status);
  end if;

  if new.status is distinct from old.status
    or new.is_public_listed is distinct from old.is_public_listed
  then
    new.publication_status := public.legacy_show_publication_status(
      new.status,
      new.is_public_listed
    );
  end if;

  return new;
end;
$function$;

create trigger trg_shows_sync_expanded_state_from_legacy
  before insert or update of status, is_public_listed on public.shows
  for each row execute procedure public.sync_expanded_show_state_from_legacy();

-- During expansion, anonymous visibility requires the old and new
-- representations to agree. Existing callers keep working through the legacy
-- synchronization trigger, while the new Publication field remains an
-- independent defense-in-depth boundary.
create or replace function public.is_show_publicly_visible(p_show_id uuid)
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
      and s.status = 'approved'::public.show_status
      and s.is_public_listed = true
      and s.lifecycle_status = 'approved'::public.show_lifecycle_status
      and s.publication_status = 'published'::public.show_publication_status
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
        public.is_show_publicly_visible(s.id)
        or public.is_show_producer(s.id)
        or public.is_theater_staff(s.theater_id)
        or exists (
          select 1
          from public.show_cast c
          where c.show_id = s.id
            and c.user_id = auth.uid()
            and c.status in (
              'pending'::public.show_cast_status,
              'accepted'::public.show_cast_status
            )
        )
      )
  );
$function$;

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
          public.is_show_publicly_visible(s.id)
          and show_cast.status = 'accepted'::public.show_cast_status
        )
        or (
          show_cast.status in (
            'accepted'::public.show_cast_status,
            'pending'::public.show_cast_status
          )
          and exists (
            select 1
            from public.show_cast mine
            where mine.show_id = show_cast.show_id
              and mine.user_id = auth.uid()
              and (
                mine.status = 'accepted'::public.show_cast_status
                or (
                  mine.status = 'pending'::public.show_cast_status
                  and mine.source = 'invited'::public.show_cast_source
                )
              )
          )
        )
      )
  )
);
