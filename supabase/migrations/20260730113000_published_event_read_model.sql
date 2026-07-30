create or replace function public.get_published_event(
  p_theater_slug text,
  p_event_slug text
)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'event', jsonb_build_object(
      'id', show.id,
      'lifecycleStatus', show.lifecycle_status,
      'slug', show.slug
    ),
    'theater', jsonb_build_object(
      'name', theater.name,
      'slug', theater.slug
    ),
    'content', jsonb_build_object(
      'title', revision.title,
      'description', revision.description,
      'imageUrl', revision.image_url,
      'admissionPriceCents', revision.admission_price_cents,
      'salesChannel', revision.sales_channel,
      'externalUrl', revision.external_url,
      'castCredits', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'displayName', credit.display_name,
            'position', credit.position
          ) order by credit.position, credit.display_name
        )
        from public.show_public_content_credits as credit
        where credit.revision_id = revision.id
          and credit.is_publicly_credited
      ), '[]'::jsonb),
      'occurrences', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'startsAt', occurrence.starts_at,
            'durationMinutes', occurrence.duration_minutes,
            'localStartsAt', occurrence.local_starts_at,
            'timezoneName', occurrence.timezone_name,
            'utcOffsetMinutes', occurrence.utc_offset_minutes,
            'locationName', occurrence.location_name
          ) order by occurrence.starts_at, occurrence.position
        )
        from public.show_public_occurrence_snapshots as occurrence
        where occurrence.revision_id = revision.id
      ), '[]'::jsonb)
    )
  )
  from public.shows as show
  join public.theaters as theater on theater.id = show.theater_id
  join public.show_public_content_revisions as revision
    on revision.id = show.published_public_content_revision_id
  where theater.slug = p_theater_slug
    and show.slug = p_event_slug
    and public.is_show_publicly_visible(show.id);
$function$;

revoke all on function public.get_published_event(text, text) from public;
grant execute on function public.get_published_event(text, text)
  to anon, authenticated, service_role;

revoke all on public.shows,
  public.show_public_content_revisions,
  public.show_public_content_credits,
  public.show_public_occurrence_snapshots
from anon;
