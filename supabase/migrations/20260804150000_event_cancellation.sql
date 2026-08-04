create table public.show_cancellation_requests (
  id uuid primary key,
  show_id uuid not null references public.shows(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (nullif(btrim(reason), '') is not null),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid references public.profiles(id) on delete restrict,
  cancellation_event_id uuid references public.activity_events(id) on delete set null,
  constraint show_cancellation_requests_resolution_check check (
    (resolved_at is null and resolved_by_user_id is null and cancellation_event_id is null)
    or
    (resolved_at is not null and resolved_by_user_id is not null and cancellation_event_id is not null)
  )
);

create index show_cancellation_requests_show_requested
  on public.show_cancellation_requests (show_id, requested_at desc);

alter table public.show_cancellation_requests enable row level security;

create policy "cancellation_requests_select_operational"
on public.show_cancellation_requests
for select
to authenticated
using (public.is_event_operational_viewer(show_id));

create or replace function public.request_event_cancellation(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_reason text,
  p_command_id uuid,
  p_now timestamptz default now()
)
returns public.show_cancellation_requests
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_request public.show_cancellation_requests%rowtype;
begin
  if auth.role() <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id
  then
    raise insufficient_privilege
      using message = 'The authenticated Producer identity is required.';
  end if;

  if nullif(btrim(p_reason), '') is null then
    raise invalid_parameter_value
      using message = 'A cancellation request reason is required.';
  end if;

  select * into v_request
  from public.show_cancellation_requests
  where id = p_command_id;

  if found then
    if v_request.show_id <> p_show_id
      or v_request.actor_user_id <> p_actor_user_id
      or v_request.reason <> btrim(p_reason)
    then
      raise unique_violation
        using message = 'Cancellation request command identity is already in use.';
    end if;
    return v_request;
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
    from public.show_leadership as leadership
    join public.theater_memberships as membership
      on membership.theater_id = v_show.theater_id
      and membership.user_id = leadership.user_id
      and membership.status = 'active'::public.membership_status
    where leadership.show_id = p_show_id
      and leadership.user_id = p_actor_user_id
      and leadership.role = 'producer'::public.event_leadership_role
  ) then
    raise insufficient_privilege
      using message = 'Active Event Producer access is required to request cancellation.';
  end if;

  if v_show.lifecycle_status in (
    'cancelled'::public.show_lifecycle_status,
    'completed'::public.show_lifecycle_status
  ) then
    raise object_not_in_prerequisite_state
      using message = 'A completed or cancelled Event cannot receive a cancellation request.';
  end if;

  insert into public.show_cancellation_requests (
    id, show_id, actor_user_id, reason, requested_at
  ) values (
    p_command_id, p_show_id, p_actor_user_id, btrim(p_reason), p_now
  ) returning * into v_request;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload, created_at
  ) values (
    p_command_id,
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.cancellation.requested',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'cancellationRequestId', v_request.id,
      'reason', v_request.reason
    ),
    p_now
  );

  return v_request;
end;
$function$;

revoke all on function public.request_event_cancellation(
  uuid, uuid, text, uuid, timestamptz
) from public, anon, authenticated;
grant execute on function public.request_event_cancellation(
  uuid, uuid, text, uuid, timestamptz
) to service_role;

grant select, insert, update on public.show_cancellation_requests to service_role;
grant select on public.show_cancellation_requests to authenticated;

alter type public.proposal_counteroffer_state add value if not exists 'cancelled';

alter table public.shows
  add column cancelled_at timestamptz,
  add column cancelled_by_user_id uuid
    references public.profiles(id) on delete restrict,
  add column cancellation_reason text,
  add constraint shows_cancellation_fact_check check (
    (
      lifecycle_status = 'cancelled'::public.show_lifecycle_status
      and (
        (
          cancelled_at is not null
          and cancelled_by_user_id is not null
          and nullif(btrim(cancellation_reason), '') is not null
        )
        or
        (
          cancelled_at is null
          and cancelled_by_user_id is null
          and cancellation_reason is null
        )
      )
    )
    or
    (
      lifecycle_status <> 'cancelled'::public.show_lifecycle_status
      and cancelled_at is null
      and cancelled_by_user_id is null
      and cancellation_reason is null
    )
  ) not valid;

create or replace function public.project_event_cancellation_notifications(
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

  if not found or v_event.action <> 'event.cancelled' then
    return;
  end if;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  )
  select
    recipient.user_id,
    'event.cancelled',
    'show'::public.notification_entity,
    v_event.entity_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'cancelledAt', v_event.payload -> 'cancelledAt',
      'eventId', v_event.entity_id,
      'theaterId', v_event.theater_id
    ),
    'event-cancelled:' || v_event.entity_id::text
  from (
    select leadership.user_id
    from public.show_leadership as leadership
    join public.theater_memberships as membership
      on membership.theater_id = v_event.theater_id
      and membership.user_id = leadership.user_id
      and membership.status = 'active'::public.membership_status
    where leadership.show_id = v_event.entity_id
    union
    select cast_member.user_id
    from public.show_cast as cast_member
    join public.theater_memberships as membership
      on membership.theater_id = v_event.theater_id
      and membership.user_id = cast_member.user_id
      and membership.status = 'active'::public.membership_status
    where cast_member.show_id = v_event.entity_id
      and cast_member.status = 'accepted'::public.show_cast_status
  ) as recipient
  where recipient.user_id is distinct from v_event.actor_user_id
  on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.cancel_event(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_reason text,
  p_command_id uuid,
  p_expected_lifecycle_status public.show_lifecycle_status,
  p_now timestamptz default now()
)
returns public.shows
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_existing_event public.activity_events%rowtype;
begin
  if auth.role() <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id
  then
    raise insufficient_privilege
      using message = 'The authenticated Owner or Admin identity is required.';
  end if;

  if nullif(btrim(p_reason), '') is null then
    raise invalid_parameter_value using message = 'A cancellation reason is required.';
  end if;

  select * into v_existing_event
  from public.activity_events
  where id = p_command_id;

  if found then
    if v_existing_event.entity_id <> p_show_id
      or v_existing_event.actor_user_id <> p_actor_user_id
      or v_existing_event.action <> 'event.cancelled'
      or v_existing_event.payload ->> 'reason' <> btrim(p_reason)
    then
      raise unique_violation
        using message = 'Cancellation command identity is already in use.';
    end if;

    select * into v_show from public.shows where id = p_show_id;
    return v_show;
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
      using message = 'Active Owner or Admin access is required to cancel an Event.';
  end if;

  if v_show.lifecycle_status <> p_expected_lifecycle_status then
    raise object_not_in_prerequisite_state
      using message = 'Event lifecycle changed. Reload before cancelling.';
  end if;

  if v_show.lifecycle_status in (
    'cancelled'::public.show_lifecycle_status,
    'completed'::public.show_lifecycle_status
  ) then
    raise object_not_in_prerequisite_state
      using message = 'A completed or cancelled Event cannot be cancelled.';
  end if;

  update public.shows
  set lifecycle_status = 'cancelled'::public.show_lifecycle_status,
      cancelled_at = p_now,
      cancelled_by_user_id = p_actor_user_id,
      cancellation_reason = btrim(p_reason),
      updated_at = p_now
  where id = p_show_id
  returning * into v_show;

  update public.show_occurrences as occurrence
  set status = 'cancelled'::public.show_occurrence_status,
      updated_at = p_now
  where occurrence.show_id = p_show_id
    and occurrence.status <> 'cancelled'::public.show_occurrence_status
    and (
      exists (
        select 1
        from public.show_candidate_slots as confirmed_slot
        where confirmed_slot.id = occurrence.confirmed_candidate_slot_id
          and confirmed_slot.starts_at >= p_now
      )
      or (
        occurrence.confirmed_candidate_slot_id is null
        and exists (
          select 1
          from public.show_candidate_slots as candidate_slot
          where candidate_slot.occurrence_id = occurrence.id
            and candidate_slot.starts_at >= p_now
        )
      )
    );

  update public.show_schedule_reservations
  set status = 'released'::public.schedule_reservation_status,
      released_at = p_now
  where show_id = p_show_id
    and status = 'active'::public.schedule_reservation_status
    and upper(reserved_during) > p_now;

  update public.show_counteroffers as counteroffer
  set state = 'cancelled'::public.proposal_counteroffer_state,
      responded_by_user_id = p_actor_user_id,
      responded_at = p_now
  from public.show_proposal_revisions as revision
  where revision.id = counteroffer.proposal_revision_id
    and revision.show_id = p_show_id
    and counteroffer.state = 'pending'::public.proposal_counteroffer_state;

  update public.show_availability_requests as request
  set closed_at = p_now
  from public.show_counteroffers as counteroffer
  join public.show_proposal_revisions as revision
    on revision.id = counteroffer.proposal_revision_id
  where request.counteroffer_id = counteroffer.id
    and revision.show_id = p_show_id
    and request.closed_at is null;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id,
    action, visibility, payload, created_at
  ) values (
    p_command_id,
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.cancelled',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'cancelledAt', p_now,
      'previousLifecycleStatus', p_expected_lifecycle_status,
      'reason', btrim(p_reason),
      'wasPublished', v_show.publication_status = 'published'::public.show_publication_status
    ),
    p_now
  );

  update public.show_cancellation_requests
  set resolved_at = p_now,
      resolved_by_user_id = p_actor_user_id,
      cancellation_event_id = p_command_id
  where show_id = p_show_id
    and resolved_at is null;

  perform public.project_event_cancellation_notifications(p_command_id);
  return v_show;
end;
$function$;

revoke all on function public.cancel_event(
  uuid, uuid, text, uuid, public.show_lifecycle_status, timestamptz
) from public, anon, authenticated;
grant execute on function public.cancel_event(
  uuid, uuid, text, uuid, public.show_lifecycle_status, timestamptz
) to service_role;

revoke all on function public.project_event_cancellation_notifications(uuid)
  from public, anon, authenticated;
grant execute on function public.project_event_cancellation_notifications(uuid)
  to service_role;

grant select, update (
  lifecycle_status, cancelled_at, cancelled_by_user_id,
  cancellation_reason, updated_at
) on public.shows to service_role;
