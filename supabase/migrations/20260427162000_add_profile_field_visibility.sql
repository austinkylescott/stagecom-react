alter table public.profiles
add column if not exists field_visibility jsonb not null default '{}'::jsonb;

update public.profiles
set field_visibility = jsonb_build_object(
  'displayName', visibility::text,
  'handle', visibility::text,
  'pronouns', visibility::text,
  'city', visibility::text,
  'bio', visibility::text
)
where field_visibility = '{}'::jsonb;
