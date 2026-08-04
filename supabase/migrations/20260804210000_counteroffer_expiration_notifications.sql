create unique index activity_events_counteroffer_expiring_soon_once
  on public.activity_events ((payload ->> 'counterofferId'))
  where action = 'event.proposal_counteroffer.expiring_soon';

create or replace function public.project_counteroffer_expiration_notification(
  p_activity_event_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.activity_events%rowtype;
  v_counteroffer public.show_counteroffers%rowtype;
  v_revision public.show_proposal_revisions%rowtype;
begin
  select * into v_event
  from public.activity_events
  where id = p_activity_event_id;

  if not found
    or v_event.action <> 'event.proposal_counteroffer.expiring_soon'
  then
    return;
  end if;

  select * into v_counteroffer
  from public.show_counteroffers
  where id = (v_event.payload ->> 'counterofferId')::uuid;

  select * into v_revision
  from public.show_proposal_revisions
  where id = v_counteroffer.proposal_revision_id;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  )
  select
    leadership.user_id,
    'event.proposal_counteroffer.expiring_soon',
    'show'::public.notification_entity,
    v_revision.show_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'counterofferId', v_counteroffer.id,
      'eventId', v_revision.show_id,
      'responseDeadline', v_counteroffer.response_deadline,
      'theaterId', v_event.theater_id
    ),
    'counteroffer-expiring-soon:' || v_counteroffer.id::text
  from public.show_leadership leadership
  where leadership.show_id = v_revision.show_id
    and leadership.role = 'producer'::public.event_leadership_role
  on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.notify_approaching_counteroffer_expirations(
  p_now timestamptz default now(),
  p_window interval default interval '24 hours',
  p_show_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_offer record;
  v_activity_event_id uuid;
  v_notified_count integer := 0;
begin
  if p_window <= interval '0 seconds' then
    raise invalid_parameter_value
      using message = 'The approaching-expiration window must be positive.';
  end if;

  for v_offer in
    select
      counteroffer.id,
      counteroffer.proposal_revision_id,
      counteroffer.response_deadline,
      revision.show_id,
      show_record.theater_id
    from public.show_counteroffers counteroffer
    join public.show_proposal_revisions revision
      on revision.id = counteroffer.proposal_revision_id
    join public.shows show_record on show_record.id = revision.show_id
    where counteroffer.state = 'pending'::public.proposal_counteroffer_state
      and counteroffer.response_deadline > p_now
      and counteroffer.response_deadline <= p_now + p_window
      and (p_show_id is null or revision.show_id = p_show_id)
    order by counteroffer.response_deadline, counteroffer.id
  loop
    v_activity_event_id := null;
    insert into public.activity_events (
      theater_id, entity_type, entity_id, actor_user_id, action, visibility,
      payload
    ) values (
      v_offer.theater_id,
      'event',
      v_offer.show_id,
      null,
      'event.proposal_counteroffer.expiring_soon',
      'member_visible'::public.activity_visibility,
      jsonb_build_object(
        'counterofferId', v_offer.id,
        'proposalRevisionId', v_offer.proposal_revision_id,
        'responseDeadline', v_offer.response_deadline
      )
    )
    on conflict do nothing
    returning id into v_activity_event_id;

    if v_activity_event_id is not null then
      perform public.project_counteroffer_expiration_notification(
        v_activity_event_id
      );
      v_notified_count := v_notified_count + 1;
    end if;
  end loop;

  return v_notified_count;
end;
$function$;

revoke all on function public.project_counteroffer_expiration_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.project_counteroffer_expiration_notification(uuid)
  to service_role;

revoke all on function public.notify_approaching_counteroffer_expirations(
  timestamptz, interval, uuid
) from public, anon, authenticated;
grant execute on function public.notify_approaching_counteroffer_expirations(
  timestamptz, interval, uuid
) to service_role;
