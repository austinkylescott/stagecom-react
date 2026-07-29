create type public.event_sales_channel as enum (
  'external',
  'no_advance_ticketing'
);

alter table public.profiles
  add column public_cast_credit_preference boolean not null default false;

alter table public.show_cast
  add column public_credit_enabled boolean;

update public.show_cast as cast_member
set public_credit_enabled = profile.public_cast_credit_preference
from public.profiles as profile
where profile.id = cast_member.user_id;

create or replace function public.initialize_event_cast_credit_preference()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.public_credit_enabled is null then
    select profile.public_cast_credit_preference
    into new.public_credit_enabled
    from public.profiles as profile
    where profile.id = new.user_id;

    new.public_credit_enabled := coalesce(new.public_credit_enabled, false);
  end if;

  return new;
end;
$function$;

create trigger initialize_event_cast_credit_preference
before insert on public.show_cast
for each row execute procedure public.initialize_event_cast_credit_preference();

alter table public.show_cast
  alter column public_credit_enabled set not null;

create table public.show_public_content_revisions (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  image_url text,
  admission_price_cents integer not null check (admission_price_cents >= 0),
  sales_channel public.event_sales_channel not null,
  external_url text,
  version integer not null default 1 check (version > 0),
  last_command_id uuid not null,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint show_public_content_revisions_admission_check check (
    (
      sales_channel = 'external'::public.event_sales_channel
      and external_url is not null
      and external_url ~* '^https?://[^[:space:]]+$'
    )
    or (
      sales_channel = 'no_advance_ticketing'::public.event_sales_channel
      and external_url is null
    )
  ),
  unique (show_id, revision_number),
  unique (show_id, last_command_id)
);

create unique index show_public_content_one_draft_per_event
  on public.show_public_content_revisions (show_id)
  where published_at is null;

create table public.show_public_content_credits (
  revision_id uuid not null references public.show_public_content_revisions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  display_name text not null check (btrim(display_name) <> ''),
  is_publicly_credited boolean not null,
  position integer not null default 0 check (position >= 0),
  primary key (revision_id, user_id)
);

alter table public.shows
  add column published_public_content_revision_id uuid
    references public.show_public_content_revisions(id) on delete restrict;

create index shows_published_public_content_revision
  on public.shows (published_public_content_revision_id)
  where published_public_content_revision_id is not null;

create or replace function public.save_event_public_content_draft(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_command_id uuid,
  p_title text,
  p_description text,
  p_admission_price_cents integer,
  p_sales_channel public.event_sales_channel,
  p_credits jsonb,
  p_expected_version integer default null,
  p_image_url text default null,
  p_external_url text default null
)
returns public.show_public_content_revisions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_revision public.show_public_content_revisions%rowtype;
  v_credit_count integer;
  v_accepted_count integer;
begin
  select * into v_show
  from public.shows
  where id = p_show_id
  for update;

  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if not exists (
    select 1
    from public.show_leadership as leadership
    join public.theater_memberships as membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = leadership.user_id
      and membership.status = 'active'::public.membership_status
    where leadership.show_id = p_show_id
      and leadership.user_id = p_actor_user_id
      and leadership.role = 'producer'::public.event_leadership_role
  ) or not public.is_eligible_event_producer(v_show.theater_id, p_actor_user_id) then
    raise insufficient_privilege
      using message = 'Eligible Event Producer access is required.';
  end if;

  if v_show.lifecycle_status in (
    'cancelled'::public.show_lifecycle_status,
    'completed'::public.show_lifecycle_status
  ) then
    raise object_not_in_prerequisite_state
      using message = 'Public content cannot be edited for a completed or cancelled Event.';
  end if;

  if p_admission_price_cents < 0 then
    raise invalid_parameter_value using message = 'Admission price cannot be negative.';
  end if;

  if p_sales_channel = 'external'::public.event_sales_channel and (
    p_external_url is null or p_external_url !~* '^https?://[^[:space:]]+$'
  ) then
    raise invalid_parameter_value
      using message = 'External sales requires a valid ticket or reservation URL.';
  end if;

  if p_sales_channel = 'no_advance_ticketing'::public.event_sales_channel
    and p_external_url is not null then
    raise invalid_parameter_value
      using message = 'No advance ticketing cannot include an external sales URL.';
  end if;

  if jsonb_typeof(p_credits) <> 'array' then
    raise invalid_parameter_value using message = 'Cast credit settings must be an array.';
  end if;

  select count(*), count(distinct credit.user_id)
  into v_credit_count, v_accepted_count
  from jsonb_to_recordset(p_credits) as credit(
    user_id uuid,
    publicly_credited boolean,
    position integer
  );

  if v_credit_count <> v_accepted_count then
    raise invalid_parameter_value using message = 'Cast credit settings cannot contain duplicate Members.';
  end if;

  select count(*) into v_accepted_count
  from public.show_cast as cast_member
  where cast_member.show_id = p_show_id
    and cast_member.status = 'accepted'::public.show_cast_status;

  if v_credit_count <> v_accepted_count or exists (
    select 1
    from jsonb_to_recordset(p_credits) as credit(
      user_id uuid,
      publicly_credited boolean,
      position integer
    )
    left join public.show_cast as cast_member
      on cast_member.show_id = p_show_id
      and cast_member.user_id = credit.user_id
      and cast_member.status = 'accepted'::public.show_cast_status
    where cast_member.user_id is null
      or credit.publicly_credited is null
      or credit.position is null
      or credit.position < 0
  ) then
    raise invalid_parameter_value
      using message = 'Credit settings must identify every accepted Cast Member exactly once.';
  end if;

  select * into v_revision
  from public.show_public_content_revisions as revision
  where revision.show_id = p_show_id
    and revision.published_at is null
  for update;

  if found and v_revision.last_command_id = p_command_id then
    return v_revision;
  end if;

  if found and p_expected_version is distinct from v_revision.version then
    raise object_not_in_prerequisite_state
      using message = 'Public content changed since it was loaded.';
  end if;

  if not found and p_expected_version is not null then
    raise object_not_in_prerequisite_state
      using message = 'Public content changed since it was loaded.';
  end if;

  if v_revision.id is null then
    insert into public.show_public_content_revisions (
      show_id,
      revision_number,
      title,
      description,
      image_url,
      admission_price_cents,
      sales_channel,
      external_url,
      last_command_id,
      created_by_user_id,
      updated_by_user_id
    ) values (
      p_show_id,
      coalesce((
        select max(revision_number) + 1
        from public.show_public_content_revisions
        where show_id = p_show_id
      ), 1),
      btrim(p_title),
      btrim(p_description),
      nullif(btrim(p_image_url), ''),
      p_admission_price_cents,
      p_sales_channel,
      nullif(btrim(p_external_url), ''),
      p_command_id,
      p_actor_user_id,
      p_actor_user_id
    ) returning * into v_revision;
  else
    update public.show_public_content_revisions
    set
      title = btrim(p_title),
      description = btrim(p_description),
      image_url = nullif(btrim(p_image_url), ''),
      admission_price_cents = p_admission_price_cents,
      sales_channel = p_sales_channel,
      external_url = nullif(btrim(p_external_url), ''),
      version = version + 1,
      last_command_id = p_command_id,
      updated_by_user_id = p_actor_user_id,
      updated_at = now()
    where id = v_revision.id
    returning * into v_revision;

    delete from public.show_public_content_credits
    where revision_id = v_revision.id;
  end if;

  update public.show_cast as cast_member
  set public_credit_enabled = credit.publicly_credited
  from jsonb_to_recordset(p_credits) as credit(
    user_id uuid,
    publicly_credited boolean,
    position integer
  )
  where cast_member.show_id = p_show_id
    and cast_member.user_id = credit.user_id;

  insert into public.show_public_content_credits (
    revision_id,
    user_id,
    display_name,
    is_publicly_credited,
    position
  )
  select
    v_revision.id,
    credit.user_id,
    profile.display_name,
    credit.publicly_credited,
    credit.position
  from jsonb_to_recordset(p_credits) as credit(
    user_id uuid,
    publicly_credited boolean,
    position integer
  )
  join public.profiles as profile on profile.id = credit.user_id;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_command_id,
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.public_content.updated',
    'admin_only'::public.activity_visibility,
    jsonb_build_object(
      'publicContentRevisionId', v_revision.id,
      'revisionNumber', v_revision.revision_number,
      'version', v_revision.version
    )
  ) on conflict (id) do nothing;

  return v_revision;
end;
$function$;

alter table public.show_public_content_revisions enable row level security;
alter table public.show_public_content_credits enable row level security;

create policy "published_event_content_is_anonymous_safe"
on public.show_public_content_revisions
for select
using (
  exists (
    select 1
    from public.shows as show
    where show.published_public_content_revision_id = show_public_content_revisions.id
      and public.is_show_publicly_visible(show.id)
  )
);

create policy "published_event_credits_are_anonymous_safe"
on public.show_public_content_credits
for select
using (
  is_publicly_credited
  and exists (
    select 1
    from public.shows as show
    where show.published_public_content_revision_id = show_public_content_credits.revision_id
      and public.is_show_publicly_visible(show.id)
  )
);

revoke all on public.show_public_content_revisions, public.show_public_content_credits from anon, authenticated;
grant select on public.shows to anon;
grant select (
  title, description, image_url, admission_price_cents, sales_channel, external_url
) on public.show_public_content_revisions to anon;
grant select (revision_id, display_name, position)
  on public.show_public_content_credits to anon;
grant select on public.show_public_content_revisions, public.show_public_content_credits to authenticated;
grant select, insert, update, delete on public.show_public_content_revisions, public.show_public_content_credits to service_role;
grant select, update on public.show_cast to service_role;

revoke all on function public.save_event_public_content_draft(
  uuid, uuid, uuid, text, text, integer, public.event_sales_channel,
  jsonb, integer, text, text
) from public, anon, authenticated;
grant execute on function public.save_event_public_content_draft(
  uuid, uuid, uuid, text, text, integer, public.event_sales_channel,
  jsonb, integer, text, text
) to service_role;
