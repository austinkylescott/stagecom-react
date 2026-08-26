create type public.theater_ownership_transfer_status as enum (
  'pending',
  'accepted',
  'declined'
);

create table public.theater_ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  theater_id uuid not null references public.theaters(id) on delete cascade,
  member_user_id uuid not null references public.profiles(id) on delete restrict,
  proposed_by_user_id uuid not null references public.profiles(id) on delete restrict,
  former_owner_role public.theater_role not null default 'admin'::public.theater_role,
  status public.theater_ownership_transfer_status not null default 'pending',
  responded_at timestamptz,
  response_command_id uuid unique,
  created_at timestamptz not null default now(),
  constraint theater_ownership_transfers_former_owner_role check (
    former_owner_role in ('admin'::public.theater_role, 'member'::public.theater_role)
  ),
  constraint theater_ownership_transfers_response_matches_status check (
    (status = 'pending'::public.theater_ownership_transfer_status and responded_at is null)
    or (status <> 'pending'::public.theater_ownership_transfer_status and responded_at is not null)
  )
);

create unique index theater_ownership_transfers_one_pending_per_theater
  on public.theater_ownership_transfers (theater_id)
  where status = 'pending'::public.theater_ownership_transfer_status;

create index theater_ownership_transfers_member_pending
  on public.theater_ownership_transfers (member_user_id, created_at desc)
  where status = 'pending'::public.theater_ownership_transfer_status;

create unique index theater_memberships_one_active_owner
  on public.theater_memberships (theater_id)
  where status = 'active'::public.membership_status
    and roles @> array['owner'::public.theater_role];

create or replace function public.enforce_exactly_one_active_theater_owner()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_theater_id uuid := coalesce(new.theater_id, old.theater_id);
begin
  if not exists (select 1 from public.theaters where id = v_theater_id) then
    return null;
  end if;
  if not exists (
    select 1
    from public.theater_memberships
    where theater_id = v_theater_id
      and status = 'active'::public.membership_status
      and roles @> array['owner'::public.theater_role]
  ) then
    raise check_violation using message = 'A Theater must have exactly one active Owner.';
  end if;
  return null;
end;
$function$;

create constraint trigger theater_memberships_exactly_one_active_owner
after insert or update of theater_id, roles, status or delete on public.theater_memberships
deferrable initially deferred
for each row execute function public.enforce_exactly_one_active_theater_owner();

create or replace function public.can_respond_to_theater_ownership_transfer(
  p_transfer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.theater_ownership_transfers
    where id = p_transfer_id
      and member_user_id = auth.uid()
      and status = 'pending'::public.theater_ownership_transfer_status
  );
$function$;

create or replace function public.project_theater_ownership_transfer_notification(
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
  select * into v_event from public.activity_events where id = p_activity_event_id;
  if not found or v_event.action not in (
    'theater.ownership.proposed',
    'theater.ownership.accepted',
    'theater.ownership.declined'
  ) then
    return;
  end if;

  v_recipient_user_id := case
    when v_event.action = 'theater.ownership.proposed'
      then (v_event.payload ->> 'memberUserId')::uuid
    else (v_event.payload ->> 'formerOwnerUserId')::uuid
  end;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  ) values (
    v_recipient_user_id,
    v_event.action,
    'theater'::public.notification_entity,
    v_event.theater_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'theaterId', v_event.theater_id,
      'ownershipTransferId', v_event.entity_id
    ),
    'theater-ownership-transfer:' || v_event.id::text
  ) on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.propose_theater_ownership_transfer(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_member_user_id uuid,
  p_former_owner_role public.theater_role default 'admin'::public.theater_role,
  p_command_id uuid default gen_random_uuid()
)
returns public.theater_ownership_transfers
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_owner public.theater_memberships%rowtype;
  v_member public.theater_memberships%rowtype;
  v_transfer public.theater_ownership_transfers%rowtype;
  v_activity_event public.activity_events%rowtype;
  v_activity_event_id uuid;
begin
  if p_former_owner_role not in ('admin'::public.theater_role, 'member'::public.theater_role) then
    raise invalid_parameter_value using message = 'The former Owner role must be Admin or Member.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select * into v_activity_event from public.activity_events where id = p_command_id;
  if found then
    if v_activity_event.theater_id is distinct from p_theater_id
      or v_activity_event.actor_user_id is distinct from p_actor_user_id
      or v_activity_event.action <> 'theater.ownership.proposed'
      or (v_activity_event.payload ->> 'memberUserId')::uuid is distinct from p_member_user_id
      or (v_activity_event.payload ->> 'formerOwnerRole') is distinct from p_former_owner_role::text
    then
      raise unique_violation using message = 'Ownership transfer proposal command identity is already in use.';
    end if;
    select * into v_transfer from public.theater_ownership_transfers where id = v_activity_event.entity_id;
    return v_transfer;
  end if;

  select * into v_owner from public.theater_memberships
  where theater_id = p_theater_id and user_id = p_actor_user_id for update;
  if not found or v_owner.status <> 'active'::public.membership_status
    or not v_owner.roles @> array['owner'::public.theater_role]
  then
    raise insufficient_privilege using message = 'Only the current Owner can propose an ownership transfer.';
  end if;

  select * into v_member from public.theater_memberships
  where theater_id = p_theater_id and user_id = p_member_user_id for update;
  if not found or v_member.status <> 'active'::public.membership_status then
    raise invalid_parameter_value using message = 'The successor must be an active Theater Member.';
  end if;
  if v_member.roles @> array['owner'::public.theater_role] then
    raise invalid_parameter_value using message = 'The successor is already the Theater Owner.';
  end if;

  select * into v_transfer from public.theater_ownership_transfers
  where theater_id = p_theater_id and status = 'pending'::public.theater_ownership_transfer_status
  for update;
  if found then
    if v_transfer.member_user_id = p_member_user_id
      and v_transfer.former_owner_role = p_former_owner_role
      and v_transfer.proposed_by_user_id = p_actor_user_id
    then return v_transfer; end if;
    raise object_not_in_prerequisite_state using message = 'A Theater ownership transfer is already pending.';
  end if;

  insert into public.theater_ownership_transfers (
    theater_id, member_user_id, proposed_by_user_id, former_owner_role
  ) values (p_theater_id, p_member_user_id, p_actor_user_id, p_former_owner_role)
  returning * into v_transfer;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_command_id, p_theater_id, 'ownership_transfer', v_transfer.id, p_actor_user_id,
    'theater.ownership.proposed', 'admin_only'::public.activity_visibility,
    jsonb_build_object(
      'memberUserId', p_member_user_id,
      'formerOwnerRole', p_former_owner_role::text,
      'formerOwnerUserId', p_actor_user_id
    )
  ) returning id into v_activity_event_id;
  perform public.project_theater_ownership_transfer_notification(v_activity_event_id);
  return v_transfer;
end;
$function$;

create or replace function public.respond_to_theater_ownership_transfer(
  p_transfer_id uuid,
  p_actor_user_id uuid,
  p_response text,
  p_command_id uuid
)
returns public.theater_ownership_transfers
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_transfer public.theater_ownership_transfers%rowtype;
  v_former_owner public.theater_memberships%rowtype;
  v_successor public.theater_memberships%rowtype;
  v_activity_event public.activity_events%rowtype;
  v_activity_event_id uuid;
begin
  if p_response not in ('accepted', 'declined') then
    raise invalid_parameter_value using message = 'Ownership transfer response must be accepted or declined.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_command_id::text, 0));
  select * into v_activity_event from public.activity_events where id = p_command_id;
  if found then
    if v_activity_event.entity_id is distinct from p_transfer_id
      or v_activity_event.actor_user_id is distinct from p_actor_user_id
      or v_activity_event.action <> 'theater.ownership.' || p_response
    then
      raise unique_violation using message = 'Ownership transfer response command identity is already in use.';
    end if;
    select * into v_transfer from public.theater_ownership_transfers where id = p_transfer_id;
    return v_transfer;
  end if;

  select * into v_transfer from public.theater_ownership_transfers where id = p_transfer_id for update;
  if not found then raise no_data_found using message = 'Ownership transfer was not found.'; end if;
  if v_transfer.member_user_id <> p_actor_user_id then
    raise insufficient_privilege using message = 'Only the proposed successor can respond.';
  end if;
  if v_transfer.status = p_response::public.theater_ownership_transfer_status then return v_transfer; end if;
  if v_transfer.status <> 'pending'::public.theater_ownership_transfer_status then
    raise object_not_in_prerequisite_state using message = 'This ownership transfer has already received a response.';
  end if;

  select * into v_former_owner from public.theater_memberships
  where theater_id = v_transfer.theater_id and user_id = v_transfer.proposed_by_user_id
  for update;
  select * into v_successor from public.theater_memberships
  where theater_id = v_transfer.theater_id and user_id = v_transfer.member_user_id
  for update;
  if not found or v_successor.status <> 'active'::public.membership_status then
    raise object_not_in_prerequisite_state using message = 'Only an active Theater Member can accept ownership.';
  end if;

  update public.theater_ownership_transfers
  set status = p_response::public.theater_ownership_transfer_status,
    responded_at = now(), response_command_id = p_command_id
  where id = p_transfer_id returning * into v_transfer;

  if p_response = 'accepted' then
    if v_former_owner.status <> 'active'::public.membership_status
      or not v_former_owner.roles @> array['owner'::public.theater_role]
    then
      raise object_not_in_prerequisite_state using message = 'The proposed Owner no longer holds ownership.';
    end if;
    update public.theater_memberships
    set roles = case
      when v_transfer.former_owner_role = 'admin'::public.theater_role
        then array['admin', 'member']::public.theater_role[]
      else array['member']::public.theater_role[]
    end,
      membership_version = membership_version + 1
    where theater_id = v_transfer.theater_id and user_id = v_transfer.proposed_by_user_id;
    update public.theater_memberships
    set roles = array['owner', 'member']::public.theater_role[],
      membership_version = membership_version + 1
    where theater_id = v_transfer.theater_id and user_id = v_transfer.member_user_id;
  end if;

  insert into public.activity_events (
    id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    p_command_id, v_transfer.theater_id, 'ownership_transfer', v_transfer.id, p_actor_user_id,
    'theater.ownership.' || p_response, 'admin_only'::public.activity_visibility,
    jsonb_build_object(
      'formerOwnerRole', v_transfer.former_owner_role::text,
      'formerOwnerUserId', v_transfer.proposed_by_user_id,
      'memberUserId', v_transfer.member_user_id
    ) || case
      when p_response = 'accepted' then jsonb_build_object('successorRole', 'owner')
      else '{}'::jsonb
    end
  ) returning id into v_activity_event_id;
  perform public.project_theater_ownership_transfer_notification(v_activity_event_id);
  return v_transfer;
end;
$function$;

revoke all on public.theater_ownership_transfers from anon, authenticated;
revoke all on function public.propose_theater_ownership_transfer(uuid, uuid, uuid, public.theater_role, uuid) from public;
revoke all on function public.respond_to_theater_ownership_transfer(uuid, uuid, text, uuid) from public;
revoke all on function public.can_respond_to_theater_ownership_transfer(uuid) from public;
grant execute on function public.propose_theater_ownership_transfer(uuid, uuid, uuid, public.theater_role, uuid) to service_role;
grant execute on function public.respond_to_theater_ownership_transfer(uuid, uuid, text, uuid) to service_role;
grant execute on function public.can_respond_to_theater_ownership_transfer(uuid) to authenticated;
