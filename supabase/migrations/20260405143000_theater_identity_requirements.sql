alter table public.theaters
  add column if not exists website_url text,
  add column if not exists logo_url text;

update public.theaters
set
  tagline = coalesce(nullif(btrim(tagline), ''), 'Community theater on Stagecom'),
  street = coalesce(nullif(btrim(street), ''), 'Address pending'),
  city = coalesce(nullif(btrim(city), ''), 'Unknown City'),
  state_region = coalesce(nullif(btrim(state_region), ''), 'Unknown Region'),
  postal_code = coalesce(nullif(btrim(postal_code), ''), '00000'),
  country = coalesce(nullif(btrim(country), ''), 'USA')
where
  nullif(btrim(tagline), '') is null
  or nullif(btrim(street), '') is null
  or nullif(btrim(city), '') is null
  or nullif(btrim(state_region), '') is null
  or nullif(btrim(postal_code), '') is null
  or nullif(btrim(country), '') is null;

alter table public.theaters
  alter column tagline set not null,
  alter column street set not null,
  alter column city set not null,
  alter column state_region set not null,
  alter column postal_code set not null,
  alter column country set not null;

alter table public.theaters
  drop constraint if exists theaters_name_not_blank,
  drop constraint if exists theaters_slug_not_blank,
  drop constraint if exists theaters_tagline_not_blank,
  drop constraint if exists theaters_timezone_not_blank,
  drop constraint if exists theaters_street_not_blank,
  drop constraint if exists theaters_city_not_blank,
  drop constraint if exists theaters_state_region_not_blank,
  drop constraint if exists theaters_postal_code_not_blank,
  drop constraint if exists theaters_country_not_blank;

alter table public.theaters
  add constraint theaters_name_not_blank check (btrim(name) <> ''),
  add constraint theaters_slug_not_blank check (btrim(slug) <> ''),
  add constraint theaters_tagline_not_blank check (btrim(tagline) <> ''),
  add constraint theaters_timezone_not_blank check (btrim(timezone) <> ''),
  add constraint theaters_street_not_blank check (btrim(street) <> ''),
  add constraint theaters_city_not_blank check (btrim(city) <> ''),
  add constraint theaters_state_region_not_blank check (btrim(state_region) <> ''),
  add constraint theaters_postal_code_not_blank check (btrim(postal_code) <> ''),
  add constraint theaters_country_not_blank check (btrim(country) <> '');
