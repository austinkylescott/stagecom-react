create or replace function public.get_published_theater_events(
  p_theater_slug text
)
returns table (
  event_slug text,
  title text,
  image_url text,
  starts_at timestamptz,
  local_starts_at timestamp without time zone,
  timezone_name text,
  location_name text,
  admission_price_cents integer,
  sales_channel public.event_sales_channel,
  lifecycle_status public.show_lifecycle_status
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    show.slug as event_slug,
    revision.title,
    revision.image_url,
    next_performance.starts_at,
    next_performance.local_starts_at,
    next_performance.timezone_name,
    next_performance.location_name,
    revision.admission_price_cents,
    revision.sales_channel,
    show.lifecycle_status
  from public.theaters as theater
  join public.shows as show on show.theater_id = theater.id
  join public.show_public_content_revisions as revision
    on revision.id = show.published_public_content_revision_id
  join lateral (
    select snapshot.starts_at, snapshot.local_starts_at,
      snapshot.timezone_name, snapshot.location_name
    from public.show_public_occurrence_snapshots as snapshot
    where snapshot.revision_id = revision.id
      and snapshot.starts_at + snapshot.duration_minutes * interval '1 minute' > now()
    order by snapshot.starts_at, snapshot.position
    limit 1
  ) as next_performance on true
  where theater.slug = p_theater_slug
    and theater.status = 'published'::public.theater_status
    and show.event_type = 'show'::public.event_type
    and show.lifecycle_status in (
      'approved'::public.show_lifecycle_status,
      'cancelled'::public.show_lifecycle_status
    )
    and public.is_show_publicly_visible(show.id)
  order by next_performance.starts_at, show.slug;
$function$;

revoke all on function public.get_published_theater_events(text) from public;
grant execute on function public.get_published_theater_events(text)
  to anon, authenticated, service_role;
