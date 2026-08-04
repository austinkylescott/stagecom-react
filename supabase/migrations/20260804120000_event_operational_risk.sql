create type public.event_risk_management_action as enum (
  'revise',
  'reschedule',
  'allow',
  'cancel'
);

alter table public.shows
  add column operational_health_version integer not null default 1
    check (operational_health_version > 0);

create table public.show_risk_management_decisions (
  id uuid primary key,
  show_id uuid not null references public.shows(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action public.event_risk_management_action not null,
  reason text not null check (nullif(btrim(reason), '') is not null),
  prior_health_version integer not null check (prior_health_version > 0),
  resulting_health_version integer not null check (resulting_health_version > prior_health_version),
  created_at timestamptz not null default now()
);

create index show_risk_management_decisions_show_created
  on public.show_risk_management_decisions (show_id, created_at desc);

alter table public.show_risk_management_decisions enable row level security;

create policy "risk_decisions_select_operational"
on public.show_risk_management_decisions
for select
to authenticated
using (public.is_event_operational_viewer(show_id));

create or replace function public.project_event_risk_notifications(
  p_activity_event_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.activity_events%rowtype;
begin
  select * into v_event
  from public.activity_events
  where id = p_activity_event_id;

  if not found or v_event.action <> 'event.operational_health.at_risk' then
    return;
  end if;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  )
  select
    recipient.user_id,
    'event.operational_health.at_risk',
    'show'::public.notification_entity,
    v_event.entity_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'eventId', v_event.entity_id,
      'reasons', v_event.payload -> 'reasons',
      'theaterId', v_event.theater_id
    ),
    'event-at-risk:' || v_event.id::text
  from (
    select membership.user_id
    from public.theater_memberships as membership
    where membership.theater_id = v_event.theater_id
      and membership.status = 'active'::public.membership_status
      and membership.roles && array[
        'owner'::public.theater_role,
        'admin'::public.theater_role
      ]
    union
    select leadership.user_id
    from public.show_leadership as leadership
    join public.theater_memberships as membership
      on membership.theater_id = v_event.theater_id
      and membership.user_id = leadership.user_id
      and membership.status = 'active'::public.membership_status
    where leadership.show_id = v_event.entity_id
  ) as recipient
  where recipient.user_id is distinct from v_event.actor_user_id
  on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function private.evaluate_event_operational_health(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_cause text
)
returns public.shows
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_revision public.show_proposal_revisions%rowtype;
  v_occurrence jsonb;
  v_occurrence_id uuid;
  v_confirmed_slot_id uuid;
  v_available_count integer;
  v_minimum_viable_cast integer;
  v_missing_leadership jsonb;
  v_missing_required_cast jsonb;
  v_reasons jsonb := '[]'::jsonb;
  v_activity_event_id uuid;
begin
  select * into v_show
  from public.shows
  where id = p_show_id
  for update;

  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if v_show.lifecycle_status <> 'approved'::public.show_lifecycle_status
    or v_show.approved_proposal_revision_id is null
  then
    return v_show;
  end if;

  select * into v_revision
  from public.show_proposal_revisions
  where id = v_show.approved_proposal_revision_id;

  select coalesce(jsonb_agg(approved_leader), '[]'::jsonb)
  into v_missing_leadership
  from jsonb_array_elements(v_revision.snapshot -> 'leadership') as approved_leader
  where not exists (
    select 1
    from public.show_leadership as leadership
    join public.theater_memberships as membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = leadership.user_id
      and membership.status = 'active'::public.membership_status
    where leadership.show_id = p_show_id
      and leadership.user_id = (approved_leader ->> 'userId')::uuid
      and leadership.role::text = approved_leader ->> 'role'
  );

  if jsonb_array_length(v_missing_leadership) > 0 then
    v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
      'code', 'required_leadership_missing',
      'leaders', v_missing_leadership,
      'message', 'Required Event leadership is no longer active.'
    ));
  end if;

  v_minimum_viable_cast := coalesce(
    (v_revision.snapshot ->> 'minimumViableCast')::integer,
    v_show.minimum_viable_cast,
    1
  );

  for v_occurrence in
    select value
    from jsonb_array_elements(v_revision.snapshot -> 'occurrences')
    where value ->> 'type' = 'performance'
  loop
    v_occurrence_id := (v_occurrence ->> 'id')::uuid;
    v_confirmed_slot_id := (v_occurrence -> 'confirmedSlot' ->> 'candidateSlotId')::uuid;

    select count(*) into v_available_count
    from public.show_occurrence_calls as calls
    join public.show_cast as cast_member
      on cast_member.show_id = p_show_id
      and cast_member.user_id = calls.user_id
      and cast_member.status = 'accepted'::public.show_cast_status
    join public.theater_memberships as membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = calls.user_id
      and membership.status = 'active'::public.membership_status
    join public.show_availability_responses as response
      on response.candidate_slot_id = v_confirmed_slot_id
      and response.user_id = calls.user_id
      and response.response = 'available'::public.availability_response
    where calls.occurrence_id = v_occurrence_id
      and calls.call <> 'not_called'::public.occurrence_call;

    if v_available_count < v_minimum_viable_cast then
      v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
        'code', 'minimum_viable_cast_unmet',
        'occurrenceId', v_occurrence_id,
        'availableCommittedCastCount', v_available_count,
        'minimumViableCast', v_minimum_viable_cast,
        'message', 'A Performance is below Minimum Viable Cast.'
      ));
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'userId', calls.user_id
    ) order by calls.user_id), '[]'::jsonb)
    into v_missing_required_cast
    from public.show_occurrence_calls as calls
    left join public.show_cast as cast_member
      on cast_member.show_id = p_show_id
      and cast_member.user_id = calls.user_id
      and cast_member.status = 'accepted'::public.show_cast_status
    left join public.theater_memberships as membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = calls.user_id
      and membership.status = 'active'::public.membership_status
    left join public.show_availability_responses as response
      on response.candidate_slot_id = v_confirmed_slot_id
      and response.user_id = calls.user_id
      and response.response = 'available'::public.availability_response
    where calls.occurrence_id = v_occurrence_id
      and calls.call = 'required'::public.occurrence_call
      and (
        cast_member.user_id is null
        or membership.user_id is null
        or response.user_id is null
      );

    if jsonb_array_length(v_missing_required_cast) > 0 then
      v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
        'code', 'required_cast_unavailable',
        'occurrenceId', v_occurrence_id,
        'members', v_missing_required_cast,
        'message', 'Required Cast commitments are no longer confirmed.'
      ));
    end if;
  end loop;

  if jsonb_array_length(v_reasons) = 0
    or v_show.operational_health = 'at_risk'::public.show_operational_health
  then
    return v_show;
  end if;

  update public.shows
  set operational_health = 'at_risk'::public.show_operational_health,
      operational_health_version = operational_health_version + 1,
      updated_at = now()
  where id = p_show_id
  returning * into v_show;

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload
  ) values (
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.operational_health.at_risk',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'cause', p_cause,
      'healthVersion', v_show.operational_health_version,
      'proposalRevisionId', v_show.approved_proposal_revision_id,
      'reasons', v_reasons
    )
  )
  returning id into v_activity_event_id;

  perform public.project_event_risk_notifications(v_activity_event_id);
  return v_show;
end;
$function$;

create or replace function public.evaluate_event_operational_health(
  p_show_id uuid,
  p_actor_user_id uuid default null,
  p_cause text default 'explicit_reevaluation'
)
returns public.shows
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return private.evaluate_event_operational_health(
    p_show_id,
    p_actor_user_id,
    p_cause
  );
end;
$function$;

create or replace function private.evaluate_risk_after_cast_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if old.status is distinct from new.status then
    perform private.evaluate_event_operational_health(
      new.show_id,
      null,
      'cast_status_changed'
    );
  end if;
  return new;
end;
$function$;

create trigger evaluate_risk_after_cast_change
after update of status on public.show_cast
for each row execute procedure private.evaluate_risk_after_cast_change();

create or replace function private.evaluate_risk_after_availability_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show_id uuid;
begin
  select occurrence.show_id into v_show_id
  from public.show_candidate_slots as slot
  join public.show_occurrences as occurrence on occurrence.id = slot.occurrence_id
  where slot.id = new.candidate_slot_id;

  perform private.evaluate_event_operational_health(
    v_show_id,
    new.actor_user_id,
    'availability_changed'
  );
  return new;
end;
$function$;

create trigger evaluate_risk_after_availability_change
after insert or update of response on public.show_availability_responses
for each row execute procedure private.evaluate_risk_after_availability_change();

create or replace function private.evaluate_risk_after_leadership_removal()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform private.evaluate_event_operational_health(
    old.show_id,
    null,
    'leadership_removed'
  );
  return old;
end;
$function$;

create trigger evaluate_risk_after_leadership_removal
after delete on public.show_leadership
for each row execute procedure private.evaluate_risk_after_leadership_removal();

create or replace function private.reset_health_after_new_operational_approval()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.approved_proposal_revision_id is not null
    and new.approved_proposal_revision_id is distinct from old.approved_proposal_revision_id
    and old.operational_health = 'at_risk'::public.show_operational_health
    and new.operational_health = 'at_risk'::public.show_operational_health
  then
    new.operational_health := 'on_track'::public.show_operational_health;
    new.operational_health_version := new.operational_health_version + 1;
  end if;
  return new;
end;
$function$;

create trigger reset_health_after_new_operational_approval
before update of approved_proposal_revision_id on public.shows
for each row execute procedure private.reset_health_after_new_operational_approval();

create or replace function public.withdraw_from_event_cast(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_command_id uuid,
  p_expected_health_version integer
)
returns table (
  event_id uuid,
  member_user_id uuid,
  cast_status public.show_cast_status,
  operational_health public.show_operational_health,
  operational_health_version integer
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_cast public.show_cast%rowtype;
  v_existing_event public.activity_events%rowtype;
begin
  if auth.role() <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id
  then
    raise insufficient_privilege using message = 'The authenticated Cast Member identity is required.';
  end if;

  select * into v_existing_event
  from public.activity_events
  where id = p_command_id;

  if found then
    if v_existing_event.entity_id <> p_show_id
      or v_existing_event.actor_user_id <> p_actor_user_id
      or v_existing_event.action <> 'event.cast.withdrawn'
    then
      raise unique_violation using message = 'Cast withdrawal command identity is already in use.';
    end if;

    select * into v_show from public.shows where id = p_show_id;
    return query select p_show_id, p_actor_user_id,
      'withdrawn'::public.show_cast_status,
      v_show.operational_health, v_show.operational_health_version;
    return;
  end if;

  select * into v_show
  from public.shows
  where id = p_show_id
  for update;

  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if v_show.operational_health_version <> p_expected_health_version then
    raise object_not_in_prerequisite_state
      using message = 'Event health changed. Reload before withdrawing.';
  end if;

  select * into v_cast
  from public.show_cast
  where show_id = p_show_id and user_id = p_actor_user_id
  for update;

  if not found then
    raise no_data_found using message = 'Cast membership was not found.';
  end if;

  if v_cast.status <> 'accepted'::public.show_cast_status then
    raise object_not_in_prerequisite_state
      using message = 'Only an accepted Cast Member can withdraw.';
  end if;

  update public.show_cast
  set status = 'withdrawn'::public.show_cast_status,
      responded_at = now()
  where show_id = p_show_id and user_id = p_actor_user_id;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload
  ) values (
    p_command_id,
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.cast.withdrawn',
    'member_visible'::public.activity_visibility,
    jsonb_build_object('memberUserId', p_actor_user_id)
  );

  select * into v_show from public.shows where id = p_show_id;
  return query select p_show_id, p_actor_user_id,
    'withdrawn'::public.show_cast_status,
    v_show.operational_health, v_show.operational_health_version;
end;
$function$;

create or replace function public.manage_at_risk_event(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_action public.event_risk_management_action,
  p_reason text,
  p_command_id uuid,
  p_expected_health_version integer
)
returns table (
  event_id uuid,
  lifecycle_status public.show_lifecycle_status,
  publication_status public.show_publication_status,
  operational_health public.show_operational_health,
  operational_health_version integer,
  at_risk_continuation_allowed boolean
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_decision public.show_risk_management_decisions%rowtype;
begin
  if nullif(btrim(p_reason), '') is null then
    raise invalid_parameter_value using message = 'A management reason is required.';
  end if;

  select * into v_decision
  from public.show_risk_management_decisions
  where id = p_command_id;

  if found then
    if v_decision.show_id <> p_show_id
      or v_decision.actor_user_id <> p_actor_user_id
      or v_decision.action <> p_action
      or v_decision.reason <> btrim(p_reason)
    then
      raise unique_violation using message = 'Risk management command identity is already in use.';
    end if;
    select * into v_show from public.shows where id = p_show_id;
    return query select v_show.id, v_show.lifecycle_status,
      v_show.publication_status, v_show.operational_health,
      v_show.operational_health_version,
      v_show.at_risk_continuation_allowed;
    return;
  end if;

  select * into v_show
  from public.shows
  where id = p_show_id
  for update;

  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_show.theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::public.membership_status
      and membership.roles && array[
        'owner'::public.theater_role,
        'admin'::public.theater_role
      ]
  ) then
    raise insufficient_privilege
      using message = 'Owner or Admin access is required to manage an At Risk Event.';
  end if;

  if v_show.operational_health_version <> p_expected_health_version then
    raise object_not_in_prerequisite_state
      using message = 'Event health changed. Reload before choosing a management action.';
  end if;

  if v_show.lifecycle_status <> 'approved'::public.show_lifecycle_status
    or v_show.operational_health <> 'at_risk'::public.show_operational_health
    or v_show.approved_proposal_revision_id is null
  then
    raise object_not_in_prerequisite_state
      using message = 'Only an approved At Risk Event can receive this management action.';
  end if;

  if p_action = 'allow'::public.event_risk_management_action then
    update public.shows as target
    set at_risk_continuation_allowed = true,
        operational_health_version = target.operational_health_version + 1,
        updated_at = now()
    where id = p_show_id;
  elsif p_action in (
    'revise'::public.event_risk_management_action,
    'reschedule'::public.event_risk_management_action
  ) then
    update public.shows as target
    set status = 'draft'::public.show_status,
        lifecycle_status = 'draft'::public.show_lifecycle_status,
        approved_proposal_revision_id = null,
        at_risk_continuation_allowed = false,
        operational_health_version = target.operational_health_version + 1,
        updated_at = now()
    where id = p_show_id;
  else
    update public.shows as target
    set status = 'cancelled'::public.show_status,
        lifecycle_status = 'cancelled'::public.show_lifecycle_status,
        operational_health_version = target.operational_health_version + 1,
        updated_at = now()
    where id = p_show_id;

    update public.show_occurrences as occurrence
    set status = 'cancelled'::public.show_occurrence_status,
        updated_at = now()
    from public.show_candidate_slots as slot
    where occurrence.show_id = p_show_id
      and slot.id = occurrence.confirmed_candidate_slot_id
      and slot.starts_at > now()
      and occurrence.status <> 'cancelled'::public.show_occurrence_status;

    update public.show_schedule_reservations
    set status = 'released'::public.schedule_reservation_status,
        released_at = now()
    where show_id = p_show_id
      and status = 'active'::public.schedule_reservation_status;
  end if;

  select * into v_show from public.shows where id = p_show_id;

  insert into public.show_risk_management_decisions (
    id, show_id, actor_user_id, action, reason,
    prior_health_version, resulting_health_version
  ) values (
    p_command_id, p_show_id, p_actor_user_id, p_action, btrim(p_reason),
    p_expected_health_version, v_show.operational_health_version
  );

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload
  ) values (
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.at_risk.' || p_action::text,
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'commandId', p_command_id,
      'healthVersion', v_show.operational_health_version,
      'reason', btrim(p_reason)
    )
  );

  return query select v_show.id, v_show.lifecycle_status,
    v_show.publication_status, v_show.operational_health,
    v_show.operational_health_version,
    v_show.at_risk_continuation_allowed;
end;
$function$;

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
      and show.is_public_listed = true
      and show.lifecycle_status in (
        'approved'::public.show_lifecycle_status,
        'cancelled'::public.show_lifecycle_status,
        'completed'::public.show_lifecycle_status
      )
      and show.publication_status = 'published'::public.show_publication_status
      and show.published_public_content_revision_id is not null
  );
$function$;

revoke all on function private.evaluate_event_operational_health(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.evaluate_event_operational_health(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.evaluate_event_operational_health(uuid, uuid, text)
  to service_role;

revoke all on function public.withdraw_from_event_cast(uuid, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.withdraw_from_event_cast(uuid, uuid, uuid, integer)
  to service_role;

revoke all on function public.manage_at_risk_event(
  uuid, uuid, public.event_risk_management_action, text, uuid, integer
) from public, anon, authenticated;
grant execute on function public.manage_at_risk_event(
  uuid, uuid, public.event_risk_management_action, text, uuid, integer
) to service_role;

revoke all on function public.project_event_risk_notifications(uuid)
  from public, anon, authenticated;
grant execute on function public.project_event_risk_notifications(uuid)
  to service_role;

grant select, insert on public.show_risk_management_decisions to service_role;
grant select on public.show_risk_management_decisions to authenticated;
grant select, update (operational_health_version) on public.shows to service_role;
