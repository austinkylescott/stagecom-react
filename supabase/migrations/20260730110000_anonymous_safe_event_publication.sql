alter table public.shows
  add column at_risk_continuation_allowed boolean not null default false,
  add column last_publication_command_id uuid;

create table public.show_public_occurrence_snapshots (
  revision_id uuid not null
    references public.show_public_content_revisions(id) on delete cascade,
  occurrence_id uuid not null references public.show_occurrences(id) on delete restrict,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  local_starts_at timestamp without time zone not null,
  timezone_name text not null check (btrim(timezone_name) <> ''),
  utc_offset_minutes integer not null,
  location_name text not null check (btrim(location_name) <> ''),
  position integer not null check (position >= 0),
  primary key (revision_id, occurrence_id)
);

create index show_public_occurrence_snapshots_chronological
  on public.show_public_occurrence_snapshots (revision_id, starts_at, position);

alter table public.show_public_occurrence_snapshots enable row level security;

create policy "published_event_occurrences_are_anonymous_safe"
on public.show_public_occurrence_snapshots
for select
using (
  exists (
    select 1
    from public.shows as show
    where show.published_public_content_revision_id = show_public_occurrence_snapshots.revision_id
      and public.is_show_publicly_visible(show.id)
  )
);

create or replace function public.is_show_publicly_visible(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.shows as show
    join public.theaters as theater on theater.id = show.theater_id
    where show.id = p_show_id
      and theater.status = 'published'::public.theater_status
      and show.status = 'approved'::public.show_status
      and show.is_public_listed = true
      and show.lifecycle_status = 'approved'::public.show_lifecycle_status
      and show.publication_status = 'published'::public.show_publication_status
      and show.published_public_content_revision_id is not null
  );
$function$;

create or replace function public.publish_event(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_public_content_revision_id uuid,
  p_expected_version integer,
  p_command_id uuid,
  p_allow_at_risk boolean default false
)
returns public.shows
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_revision public.show_public_content_revisions%rowtype;
  v_public_performance_count integer;
  v_allowed_at_risk_now boolean := false;
begin
  select * into v_show
  from public.shows
  where id = p_show_id
  for update;

  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if v_show.last_publication_command_id = p_command_id then
    return v_show;
  end if;

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_show.theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::public.membership_status
      and (
        'owner'::public.theater_role = any(membership.roles)
        or 'admin'::public.theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  if not exists (
    select 1
    from public.theaters as theater
    where theater.id = v_show.theater_id
      and theater.status = 'published'::public.theater_status
  ) then
    raise object_not_in_prerequisite_state
      using message = 'Publish the Theater before publishing this Event.';
  end if;

  if v_show.lifecycle_status <> 'approved'::public.show_lifecycle_status
    or v_show.approved_proposal_revision_id is null then
    raise object_not_in_prerequisite_state
      using message = 'Current Operational Approval is required.';
  end if;

  if v_show.operational_health = 'at_risk'::public.show_operational_health
    and not v_show.at_risk_continuation_allowed
    and not p_allow_at_risk then
    raise object_not_in_prerequisite_state
      using message = 'Management must explicitly allow this At Risk Event.';
  end if;

  if v_show.operational_health = 'at_risk'::public.show_operational_health
    and p_allow_at_risk
    and not v_show.at_risk_continuation_allowed then
    update public.shows
    set at_risk_continuation_allowed = true
    where id = p_show_id;
    v_allowed_at_risk_now := true;
  end if;

  select * into v_revision
  from public.show_public_content_revisions
  where id = p_public_content_revision_id
    and show_id = p_show_id
    and published_at is null
  for update;

  if not found then
    raise object_not_in_prerequisite_state
      using message = 'The previewed public-content revision is no longer publishable.';
  end if;

  if v_revision.version <> p_expected_version then
    raise object_not_in_prerequisite_state
      using message = 'Public content changed since it was previewed.';
  end if;

  if nullif(btrim(v_revision.description), '') is null
    or nullif(btrim(v_revision.image_url), '') is null then
    raise invalid_parameter_value
      using message = 'Complete the public Event description and image before Publication.';
  end if;

  select count(*) into v_public_performance_count
  from public.show_occurrences as occurrence
  join public.show_candidate_slots as slot
    on slot.id = occurrence.confirmed_candidate_slot_id
  where occurrence.show_id = p_show_id
    and occurrence.occurrence_type = 'performance'::public.occurrence_type
    and occurrence.visibility = 'public'::public.occurrence_visibility;

  if v_public_performance_count = 0 then
    raise object_not_in_prerequisite_state
      using message = 'Confirm at least one public Performance before Publication.';
  end if;

  insert into public.show_public_occurrence_snapshots (
    revision_id,
    occurrence_id,
    starts_at,
    duration_minutes,
    local_starts_at,
    timezone_name,
    utc_offset_minutes,
    location_name,
    position
  )
  select
    v_revision.id,
    occurrence.id,
    slot.starts_at,
    slot.duration_minutes,
    slot.local_starts_at,
    slot.timezone_name,
    slot.utc_offset_minutes,
    slot.location_name,
    occurrence.position
  from public.show_occurrences as occurrence
  join public.show_candidate_slots as slot
    on slot.id = occurrence.confirmed_candidate_slot_id
  where occurrence.show_id = p_show_id
    and occurrence.occurrence_type = 'performance'::public.occurrence_type
    and occurrence.visibility = 'public'::public.occurrence_visibility
  order by slot.starts_at, occurrence.position;

  update public.show_public_content_revisions
  set published_at = now(), updated_at = now()
  where id = v_revision.id;

  update public.shows
  set
    published_public_content_revision_id = v_revision.id,
    publication_status = 'published'::public.show_publication_status,
    is_public_listed = true,
    last_publication_command_id = p_command_id,
    updated_at = now()
  where id = p_show_id
  returning * into v_show;

  if v_allowed_at_risk_now then
    insert into public.activity_events (
      theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
    ) values (
      v_show.theater_id,
      'event',
      p_show_id,
      p_actor_user_id,
      'event.at_risk.continuation_allowed',
      'admin_only'::public.activity_visibility,
      jsonb_build_object('publicationCommandId', p_command_id)
    );
  end if;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_command_id,
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.published',
    'admin_only'::public.activity_visibility,
    jsonb_build_object(
      'publicContentRevisionId', v_revision.id,
      'revisionNumber', v_revision.revision_number
    )
  );

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  )
  select
    recipient.user_id,
    'event.published',
    'show'::public.notification_entity,
    p_show_id,
    jsonb_build_object(
      'activityEventId', p_command_id,
      'eventId', p_show_id,
      'publicContentRevisionId', v_revision.id,
      'theaterId', v_show.theater_id
    ),
    'event-publication:' || p_show_id::text || ':' || v_revision.id::text
  from (
    select leadership.user_id
    from public.show_leadership as leadership
    where leadership.show_id = p_show_id
    union
    select cast_member.user_id
    from public.show_cast as cast_member
    where cast_member.show_id = p_show_id
      and cast_member.status = 'accepted'::public.show_cast_status
  ) as recipient
  where recipient.user_id <> p_actor_user_id
  on conflict (user_id, dedupe_key) do nothing;

  return v_show;
end;
$function$;

revoke all on public.show_public_occurrence_snapshots from anon, authenticated;
grant select (
  revision_id, starts_at, duration_minutes, local_starts_at,
  timezone_name, utc_offset_minutes, location_name, position
) on public.show_public_occurrence_snapshots to anon;
grant select on public.show_public_occurrence_snapshots to authenticated;
grant select, insert, update, delete on public.show_public_occurrence_snapshots to service_role;

revoke all on function public.publish_event(
  uuid, uuid, uuid, integer, uuid, boolean
) from public, anon, authenticated;
grant execute on function public.publish_event(
  uuid, uuid, uuid, integer, uuid, boolean
) to service_role;

grant select, update (
  at_risk_continuation_allowed,
  last_publication_command_id,
  published_public_content_revision_id,
  publication_status,
  is_public_listed,
  updated_at
) on public.shows to service_role;
