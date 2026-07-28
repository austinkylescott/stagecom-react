alter table public.show_cast
  add column invited_by_user_id uuid references public.profiles(id) on delete set null,
  add column invited_at timestamptz,
  add column responded_at timestamptz;

update public.show_cast
set invited_at = created_at
where source = 'invited'::public.show_cast_source
  and invited_at is null;

create or replace function public.is_event_operational_viewer(
  p_show_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.shows as show
    join public.theater_memberships as membership
      on membership.theater_id = show.theater_id
      and membership.user_id = p_user_id
      and membership.status = 'active'::public.membership_status
    where show.id = p_show_id
      and (
        membership.roles && array[
          'owner'::public.theater_role,
          'admin'::public.theater_role
        ]
        or exists (
          select 1
          from public.show_leadership as leadership
          where leadership.show_id = show.id
            and leadership.user_id = p_user_id
        )
        or exists (
          select 1
          from public.theater_member_capabilities as capability
          where capability.theater_id = show.theater_id
            and capability.user_id = p_user_id
            and capability.capability = 'reviewer'::public.theater_capability
        )
      )
  );
$function$;

create or replace function public.can_view_show(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.shows as show
    where show.id = p_show_id
      and (
        public.is_show_publicly_visible(show.id)
        or public.is_event_operational_viewer(show.id)
        or exists (
          select 1
          from public.show_cast as cast_member
          where cast_member.show_id = show.id
            and cast_member.user_id = auth.uid()
            and cast_member.status in (
              'pending'::public.show_cast_status,
              'accepted'::public.show_cast_status
            )
        )
      )
  );
$function$;

create or replace function public.event_cast_status_for_actor(
  p_show_id uuid,
  p_user_id uuid default auth.uid()
)
returns public.show_cast_status
language sql
stable
security definer
set search_path to 'public'
as $function$
  select cast_member.status
  from public.show_cast as cast_member
  where cast_member.show_id = p_show_id
    and cast_member.user_id = p_user_id;
$function$;

create or replace function public.can_view_event_cast_row(
  p_show_id uuid,
  p_row_user_id uuid,
  p_row_status public.show_cast_status
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    p_row_user_id = auth.uid()
    or public.is_event_operational_viewer(p_show_id)
    or (
      p_row_status = 'accepted'::public.show_cast_status
      and public.event_cast_status_for_actor(p_show_id) in (
        'pending'::public.show_cast_status,
        'accepted'::public.show_cast_status
      )
    )
    or public.event_cast_status_for_actor(p_show_id) = 'accepted'::public.show_cast_status
    or (
      p_row_status = 'accepted'::public.show_cast_status
      and public.is_show_publicly_visible(p_show_id)
    );
$function$;

drop policy if exists "show_cast_select_visible" on public.show_cast;
create policy "show_cast_select_visible"
on public.show_cast
for select
to authenticated, anon
using (
  public.can_view_event_cast_row(show_id, user_id, status)
);

create or replace function public.project_event_cast_invitation_notification(
  p_activity_event_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event public.activity_events%rowtype;
  v_recipient_user_id uuid;
begin
  select * into v_event
  from public.activity_events
  where id = p_activity_event_id;

  if not found or v_event.action <> 'event.cast.invited' then
    return;
  end if;

  v_recipient_user_id := (v_event.payload ->> 'memberUserId')::uuid;

  insert into public.notifications (
    user_id,
    type,
    entity_type,
    entity_id,
    payload,
    dedupe_key
  ) values (
    v_recipient_user_id,
    'event.cast.invited',
    'cast'::public.notification_entity,
    v_event.entity_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'eventId', v_event.entity_id,
      'theaterId', v_event.theater_id
    ),
    'event-cast-invitation:' || v_event.id::text
  )
  on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.invite_event_cast_member(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_member_user_id uuid
)
returns public.show_cast
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_cast public.show_cast%rowtype;
  v_activity_event_id uuid;
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
  ) then
    raise insufficient_privilege
      using message = 'Active Event leader access is required to invite Cast Members.';
  end if;

  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = v_show.theater_id
      and membership.user_id = p_member_user_id
      and membership.status = 'active'::public.membership_status
  ) then
    raise invalid_parameter_value
      using message = 'The invitee must be an active Theater Member.';
  end if;

  select * into v_cast
  from public.show_cast as existing
  where existing.show_id = p_show_id
    and existing.user_id = p_member_user_id;

  if found and v_cast.source = 'invited'::public.show_cast_source
    and v_cast.status = 'pending'::public.show_cast_status then
    return v_cast;
  end if;

  if found then
    raise unique_violation
      using message = 'That Theater Member already has a Cast invitation for this Event.';
  end if;

  insert into public.show_cast (
    show_id,
    user_id,
    source,
    status,
    invited_by_user_id,
    invited_at
  ) values (
    p_show_id,
    p_member_user_id,
    'invited'::public.show_cast_source,
    'pending'::public.show_cast_status,
    p_actor_user_id,
    now()
  )
  returning * into v_cast;

  insert into public.activity_events (
    theater_id,
    entity_type,
    entity_id,
    actor_user_id,
    action,
    visibility,
    payload
  ) values (
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    'event.cast.invited',
    'self_only'::public.activity_visibility,
    jsonb_build_object('memberUserId', p_member_user_id)
  )
  returning id into v_activity_event_id;

  perform public.project_event_cast_invitation_notification(v_activity_event_id);

  return v_cast;
end;
$function$;

create or replace function public.respond_to_event_cast_invitation(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_response public.show_cast_status
)
returns public.show_cast
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_cast public.show_cast%rowtype;
begin
  if p_response not in (
    'accepted'::public.show_cast_status,
    'declined'::public.show_cast_status
  ) then
    raise invalid_parameter_value
      using message = 'Participation response must be accepted or declined.';
  end if;

  select * into v_show
  from public.shows
  where id = p_show_id;

  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  select * into v_cast
  from public.show_cast
  where show_id = p_show_id
    and user_id = p_actor_user_id
  for update;

  if not found then
    raise no_data_found using message = 'Cast invitation was not found.';
  end if;

  if v_cast.source <> 'invited'::public.show_cast_source then
    raise object_not_in_prerequisite_state
      using message = 'Only a direct Cast invitation can receive this response.';
  end if;

  if v_cast.status = p_response then
    return v_cast;
  end if;

  if v_cast.status <> 'pending'::public.show_cast_status then
    raise object_not_in_prerequisite_state
      using message = 'This Cast invitation has already received a response.';
  end if;

  update public.show_cast
  set status = p_response,
      responded_at = now()
  where show_id = p_show_id
    and user_id = p_actor_user_id
  returning * into v_cast;

  insert into public.activity_events (
    theater_id,
    entity_type,
    entity_id,
    actor_user_id,
    action,
    visibility,
    payload
  ) values (
    v_show.theater_id,
    'event',
    p_show_id,
    p_actor_user_id,
    case p_response
      when 'accepted'::public.show_cast_status then 'event.cast.accepted'
      else 'event.cast.declined'
    end,
    'self_only'::public.activity_visibility,
    jsonb_build_object('memberUserId', p_actor_user_id)
  );

  return v_cast;
end;
$function$;

revoke all on function public.is_event_operational_viewer(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.is_event_operational_viewer(uuid, uuid)
  to service_role;

revoke all on function public.event_cast_status_for_actor(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.event_cast_status_for_actor(uuid, uuid)
  to service_role;

revoke all on function public.can_view_event_cast_row(
  uuid, uuid, public.show_cast_status
) from public, anon, authenticated;
grant execute on function public.can_view_event_cast_row(
  uuid, uuid, public.show_cast_status
) to anon, authenticated, service_role;

revoke all on function public.project_event_cast_invitation_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.project_event_cast_invitation_notification(uuid)
  to service_role;

revoke all on function public.invite_event_cast_member(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.invite_event_cast_member(uuid, uuid, uuid)
  to service_role;

revoke all on function public.respond_to_event_cast_invitation(
  uuid, uuid, public.show_cast_status
) from public, anon, authenticated;
grant execute on function public.respond_to_event_cast_invitation(
  uuid, uuid, public.show_cast_status
) to service_role;

grant select, insert, update on public.show_cast, public.notifications
  to service_role;

grant select on public.show_cast to authenticated;
