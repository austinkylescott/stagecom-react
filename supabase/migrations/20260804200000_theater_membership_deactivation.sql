alter table public.theater_memberships
  add column membership_version integer not null default 1
    check (membership_version > 0);

create or replace function public.project_theater_membership_deactivation_notification(
  p_activity_event_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.activity_events%rowtype;
  v_member_user_id uuid;
begin
  select * into v_event
  from public.activity_events as activity
  where activity.id = p_activity_event_id;

  if not found or v_event.action <> 'theater.membership.deactivated' then
    return;
  end if;

  v_member_user_id := (v_event.payload ->> 'memberUserId')::uuid;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  ) values (
    v_member_user_id,
    'theater.membership.deactivated',
    'theater'::public.notification_entity,
    v_event.theater_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'memberUserId', v_member_user_id,
      'theaterId', v_event.theater_id
    ),
    'theater-membership-deactivated:' || v_event.id::text
  )
  on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.deactivate_theater_membership(
  p_theater_id uuid,
  p_member_user_id uuid,
  p_actor_user_id uuid,
  p_command_id uuid,
  p_expected_membership_version integer
)
returns table (
  theater_id uuid,
  member_user_id uuid,
  membership_status public.membership_status,
  membership_version integer,
  affected_event_ids uuid[],
  at_risk_event_ids uuid[],
  leadership_assignments_ended integer,
  cast_assignments_ended integer,
  capabilities_ended integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor public.theater_memberships%rowtype;
  v_affected_event_ids uuid[] := array[]::uuid[];
  v_at_risk_event_ids uuid[] := array[]::uuid[];
  v_membership public.theater_memberships%rowtype;
  v_evaluated_event public.shows%rowtype;
  v_event_id uuid;
  v_existing_event public.activity_events%rowtype;
  v_capabilities_ended integer := 0;
  v_cast_assignments_ended integer := 0;
  v_leadership_assignments_ended integer := 0;
begin
  -- Serialize the same command identity before checking its durable fact so
  -- concurrent network retries observe and return the first committed result.
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));

  select * into v_existing_event
  from public.activity_events as activity
  where activity.id = p_command_id;

  if found then
    if v_existing_event.theater_id is distinct from p_theater_id
      or v_existing_event.entity_id is distinct from p_member_user_id
      or v_existing_event.actor_user_id is distinct from p_actor_user_id
      or v_existing_event.action <> 'theater.membership.deactivated'
    then
      raise unique_violation
        using message = 'Membership deactivation command identity is already in use.';
    end if;

    select * into v_membership
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_member_user_id;

    return query select
      p_theater_id,
      p_member_user_id,
      v_membership.status,
      v_membership.membership_version,
      coalesce(array(
        select value::uuid
        from jsonb_array_elements_text(
          coalesce(v_existing_event.payload -> 'affectedEventIds', '[]'::jsonb)
        ) as affected(value)
      ), array[]::uuid[]),
      coalesce(array(
        select value::uuid
        from jsonb_array_elements_text(
          coalesce(v_existing_event.payload -> 'atRiskEventIds', '[]'::jsonb)
        ) as at_risk(value)
      ), array[]::uuid[]),
      coalesce((v_existing_event.payload ->> 'leadershipAssignmentsEnded')::integer, 0),
      coalesce((v_existing_event.payload ->> 'castAssignmentsEnded')::integer, 0),
      coalesce((v_existing_event.payload ->> 'capabilitiesEnded')::integer, 0);
    return;
  end if;

  select * into v_actor
  from public.theater_memberships as membership
  where membership.theater_id = p_theater_id
    and membership.user_id = p_actor_user_id
  for update;

  if not found
    or v_actor.status <> 'active'::public.membership_status
    or not v_actor.roles && array[
      'owner'::public.theater_role,
      'admin'::public.theater_role
    ]
  then
    raise insufficient_privilege
      using message = 'Active Owner or Admin access is required.';
  end if;

  select * into v_membership
  from public.theater_memberships as membership
  where membership.theater_id = p_theater_id
    and membership.user_id = p_member_user_id
  for update;

  if not found then
    raise no_data_found using message = 'Theater membership was not found.';
  end if;

  if v_membership.membership_version <> p_expected_membership_version then
    raise object_not_in_prerequisite_state
      using message = 'Theater membership changed. Reload before deactivating.';
  end if;

  if v_membership.status <> 'active'::public.membership_status then
    raise object_not_in_prerequisite_state
      using message = 'Only an active Theater membership can be deactivated.';
  end if;

  if 'owner'::public.theater_role = any(v_membership.roles)
    and not exists (
      select 1
      from public.theater_memberships as accountable_owner
      where accountable_owner.theater_id = p_theater_id
        and accountable_owner.user_id <> p_member_user_id
        and accountable_owner.status = 'active'::public.membership_status
        and 'owner'::public.theater_role = any(accountable_owner.roles)
    )
  then
    raise check_violation
      using message = 'A Theater must retain at least one active Owner.';
  end if;

  select coalesce(array_agg(affected.show_id order by affected.show_id), array[]::uuid[])
  into v_affected_event_ids
  from (
    select leadership.show_id
    from public.show_leadership as leadership
    join public.shows as event on event.id = leadership.show_id
    where event.theater_id = p_theater_id
      and leadership.user_id = p_member_user_id
    union
    select cast_member.show_id
    from public.show_cast as cast_member
    join public.shows as event on event.id = cast_member.show_id
    where event.theater_id = p_theater_id
      and cast_member.user_id = p_member_user_id
      and cast_member.status in (
        'pending'::public.show_cast_status,
        'accepted'::public.show_cast_status
      )
  ) as affected;

  update public.theater_memberships as membership
  set status = 'inactive'::public.membership_status,
      is_home = false,
      home_rank = null,
      membership_version = membership.membership_version + 1
  where membership.theater_id = p_theater_id
    and membership.user_id = p_member_user_id
  returning * into v_membership;

  foreach v_event_id in array v_affected_event_ids loop
    v_evaluated_event := private.evaluate_event_operational_health(
      v_event_id,
      p_actor_user_id,
      'membership_deactivated'
    );
    if v_evaluated_event.lifecycle_status = 'approved'::public.show_lifecycle_status
      and v_evaluated_event.operational_health = 'at_risk'::public.show_operational_health
    then
      v_at_risk_event_ids := array_append(v_at_risk_event_ids, v_event_id);
    end if;
  end loop;

  delete from public.theater_member_capabilities as capability
  where capability.theater_id = p_theater_id
    and capability.user_id = p_member_user_id;
  get diagnostics v_capabilities_ended = row_count;

  with ended_leadership as (
    delete from public.show_leadership as leadership
    using public.shows as event
    where event.id = leadership.show_id
      and event.theater_id = p_theater_id
      and leadership.user_id = p_member_user_id
    returning leadership.show_id, leadership.role
  )
  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload
  )
  select
    p_theater_id,
    'event',
    ended.show_id,
    p_actor_user_id,
    'event.leadership.ended',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'cause', 'membership_deactivated',
      'memberUserId', p_member_user_id,
      'role', ended.role
    )
  from ended_leadership as ended;
  get diagnostics v_leadership_assignments_ended = row_count;

  delete from public.show_proposed_cast as proposed
  using public.shows as event
  where event.id = proposed.show_id
    and event.theater_id = p_theater_id
    and proposed.user_id = p_member_user_id;

  with ended_cast as (
    update public.show_cast as cast_member
    set status = 'removed'::public.show_cast_status,
        responded_at = now()
    from public.shows as event
    where event.id = cast_member.show_id
      and event.theater_id = p_theater_id
      and cast_member.user_id = p_member_user_id
      and cast_member.status in (
        'pending'::public.show_cast_status,
        'accepted'::public.show_cast_status
      )
    returning cast_member.show_id
  )
  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload
  )
  select
    p_theater_id,
    'event',
    ended.show_id,
    p_actor_user_id,
    'event.cast.removed',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'cause', 'membership_deactivated',
      'memberUserId', p_member_user_id
    )
  from ended_cast as ended;
  get diagnostics v_cast_assignments_ended = row_count;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload
  ) values (
    p_command_id,
    p_theater_id,
    'theater_membership',
    p_member_user_id,
    p_actor_user_id,
    'theater.membership.deactivated',
    'admin_only'::public.activity_visibility,
    jsonb_build_object(
      'affectedEventIds', v_affected_event_ids,
      'atRiskEventIds', v_at_risk_event_ids,
      'capabilitiesEnded', v_capabilities_ended,
      'castAssignmentsEnded', v_cast_assignments_ended,
      'leadershipAssignmentsEnded', v_leadership_assignments_ended,
      'memberUserId', p_member_user_id,
      'membershipVersion', v_membership.membership_version
    )
  );

  perform public.project_theater_membership_deactivation_notification(
    p_command_id
  );

  return query select
    p_theater_id,
    p_member_user_id,
    v_membership.status,
    v_membership.membership_version,
    v_affected_event_ids,
    v_at_risk_event_ids,
    v_leadership_assignments_ended,
    v_cast_assignments_ended,
    v_capabilities_ended;
end;
$function$;

revoke all on function public.deactivate_theater_membership(
  uuid, uuid, uuid, uuid, integer
) from public, anon, authenticated;
grant execute on function public.deactivate_theater_membership(
  uuid, uuid, uuid, uuid, integer
) to service_role;

revoke all on function public.project_theater_membership_deactivation_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.project_theater_membership_deactivation_notification(uuid)
  to service_role;
