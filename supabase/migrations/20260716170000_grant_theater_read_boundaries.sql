grant select (
  id,
  name,
  slug,
  status,
  tagline,
  timezone,
  street,
  city,
  state_region,
  postal_code,
  country,
  website_url,
  logo_url,
  social_links
) on public.theaters to anon, authenticated;

grant select (
  theater_id,
  user_id,
  roles,
  status,
  is_home,
  home_rank,
  created_at
) on public.theater_memberships to authenticated;
