alter table public.shows
add column if not exists slug text;

with ranked as (
  select
    s.id,
    case
      when trim(regexp_replace(lower(coalesce(s.title, 'event')), '[^a-z0-9]+', '-', 'g'), '-') = '' then 'event'
      else left(trim(regexp_replace(lower(coalesce(s.title, 'event')), '[^a-z0-9]+', '-', 'g'), '-'), 60)
    end as base_slug,
    row_number() over (
      partition by
        s.theater_id,
        case
          when trim(regexp_replace(lower(coalesce(s.title, 'event')), '[^a-z0-9]+', '-', 'g'), '-') = '' then 'event'
          else left(trim(regexp_replace(lower(coalesce(s.title, 'event')), '[^a-z0-9]+', '-', 'g'), '-'), 60)
        end
      order by s.created_at, s.id
    ) as duplicate_rank
  from public.shows s
)
update public.shows s
set slug = case
  when ranked.duplicate_rank = 1 then ranked.base_slug
  else left(ranked.base_slug, 54) || '-' || ranked.duplicate_rank
end
from ranked
where s.id = ranked.id
  and (s.slug is null or btrim(s.slug) = '');

alter table public.shows
alter column slug set not null;

create unique index if not exists idx_shows_theater_slug_unique
on public.shows (theater_id, slug);
