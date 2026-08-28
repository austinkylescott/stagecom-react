create type public.schedule_block_state as enum ('active', 'released', 'cancelled');

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  theater_id uuid not null references public.theaters(id) on delete cascade,
  resource_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  private_label text not null,
  private_notes text,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  state public.schedule_block_state not null default 'active',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz,
  cancelled_at timestamptz,
  constraint schedule_blocks_interval_check check (ends_at > starts_at),
  constraint schedule_blocks_label_check check (length(btrim(private_label)) between 1 and 160),
  constraint schedule_blocks_notes_check check (private_notes is null or length(private_notes) <= 4000),
  constraint schedule_blocks_lifecycle_check check (
    (state = 'active' and released_at is null and cancelled_at is null)
    or (state = 'released' and released_at is not null and cancelled_at is null)
    or (state = 'cancelled' and cancelled_at is not null and released_at is null)
  )
);

create table public.schedule_block_history (
  id uuid primary key default gen_random_uuid(),
  schedule_block_id uuid not null references public.schedule_blocks(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null check (action in ('created', 'updated', 'released', 'cancelled')),
  command_id uuid not null unique,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.show_schedule_reservations
  add column schedule_block_id uuid unique references public.schedule_blocks(id) on delete cascade,
  alter column show_id drop not null,
  alter column occurrence_id drop not null,
  alter column candidate_slot_id drop not null;

alter table public.show_schedule_reservations
  drop constraint show_schedule_reservations_reference_check,
  add constraint show_schedule_reservations_reference_check check (
    (kind = 'counteroffer_hold' and counteroffer_id is not null and proposal_revision_id is null and schedule_block_id is null)
    or (kind = 'approved_commitment' and counteroffer_id is null and proposal_revision_id is not null and schedule_block_id is null)
    or (kind = 'schedule_block' and counteroffer_id is null and proposal_revision_id is null and schedule_block_id is not null)
  );

create index schedule_blocks_theater_resource_active
  on public.schedule_blocks (theater_id, resource_id)
  where state = 'active';
create index schedule_block_history_block_created
  on public.schedule_block_history (schedule_block_id, created_at);

alter table public.schedule_blocks enable row level security;
alter table public.schedule_block_history enable row level security;

create policy "schedule_blocks_select_operators"
on public.schedule_blocks for select to authenticated
using (
  exists (
    select 1 from public.theater_memberships membership
    where membership.theater_id = schedule_blocks.theater_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.roles && array['owner', 'admin']::public.theater_role[]
  )
);
create policy "schedule_block_history_select_operators"
on public.schedule_block_history for select to authenticated
using (
  exists (
    select 1 from public.schedule_blocks block
    where block.id = schedule_block_id
      and exists (
        select 1 from public.theater_memberships membership
        where membership.theater_id = block.theater_id
          and membership.user_id = (select auth.uid())
          and membership.status = 'active'
          and membership.roles && array['owner', 'admin']::public.theater_role[]
      )
  )
);

create or replace function public.assert_schedule_block_operator(
  p_theater_id uuid,
  p_actor_user_id uuid
)
returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if auth.role() <> 'service_role' then
    raise insufficient_privilege using message = 'Schedule Blocks require the app service role.';
  end if;
  if not exists (
    select 1 from public.theater_memberships membership
    where membership.theater_id = p_theater_id and membership.user_id = p_actor_user_id
      and membership.status = 'active'
      and membership.roles && array['owner', 'admin']::public.theater_role[]
  ) then
    raise insufficient_privilege using message = 'Current Theater Operator access is required.';
  end if;
end;
$function$;

create or replace function public.create_schedule_block(
  p_theater_id uuid, p_actor_user_id uuid, p_command_id uuid,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_private_label text, p_private_notes text default null
)
returns public.schedule_blocks language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_theater public.theaters%rowtype;
  v_block public.schedule_blocks%rowtype;
begin
  perform public.assert_schedule_block_operator(p_theater_id, p_actor_user_id);
  select block.* into v_block
  from public.schedule_block_history history
  join public.schedule_blocks block on block.id = history.schedule_block_id
  where history.command_id = p_command_id;
  if found then return v_block; end if;

  select * into v_theater from public.theaters where id = p_theater_id for update;
  if not found then raise no_data_found using message = 'Theater was not found.'; end if;
  if p_ends_at <= p_starts_at then raise invalid_parameter_value using message = 'Schedule Block end must be after its start.'; end if;

  insert into public.schedule_blocks (theater_id, resource_id, starts_at, ends_at, private_label, private_notes, created_by_user_id)
  values (p_theater_id, v_theater.primary_venue_id, p_starts_at, p_ends_at, btrim(p_private_label), nullif(btrim(p_private_notes), ''), p_actor_user_id)
  returning * into v_block;
  begin
    insert into public.show_schedule_reservations (theater_id, resource_id, schedule_block_id, kind, reserved_during)
    values (p_theater_id, v_theater.primary_venue_id, v_block.id, 'schedule_block', tstzrange(
      p_starts_at - make_interval(mins => v_theater.setup_buffer_minutes),
      p_ends_at + make_interval(mins => v_theater.turnover_buffer_minutes), '[)'));
  exception when exclusion_violation then
    raise object_not_in_prerequisite_state using message = 'The Primary Venue is already reserved during this buffered time.';
  end;
  insert into public.schedule_block_history (schedule_block_id, actor_user_id, action, command_id, version, snapshot)
  values (v_block.id, p_actor_user_id, 'created', p_command_id, v_block.version, to_jsonb(v_block));
  insert into public.activity_events (theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
  values (p_theater_id, 'schedule_block', v_block.id, p_actor_user_id, 'schedule_block.created', 'admin_only', jsonb_build_object('scheduleBlockId', v_block.id, 'commandId', p_command_id));
  return v_block;
end;
$function$;

create or replace function public.change_schedule_block(
  p_schedule_block_id uuid, p_actor_user_id uuid, p_command_id uuid,
  p_expected_version integer, p_action text,
  p_starts_at timestamptz default null, p_ends_at timestamptz default null,
  p_private_label text default null, p_private_notes text default null
)
returns public.schedule_blocks language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_block public.schedule_blocks%rowtype;
  v_theater public.theaters%rowtype;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  select * into v_block from public.schedule_blocks where id = p_schedule_block_id for update;
  if not found then raise no_data_found using message = 'Schedule Block was not found.'; end if;
  perform public.assert_schedule_block_operator(v_block.theater_id, p_actor_user_id);
  select block.* into v_block from public.schedule_block_history history
  join public.schedule_blocks block on block.id = history.schedule_block_id
  where history.command_id = p_command_id and history.schedule_block_id = p_schedule_block_id
    and history.action = p_action;
  if found then return v_block; end if;
  select * into v_block from public.schedule_blocks where id = p_schedule_block_id for update;
  select * into v_theater from public.theaters where id = v_block.theater_id for update;
  if v_block.version <> p_expected_version then raise serialization_failure using message = 'This Schedule Block changed. Reload it before saving.'; end if;
  if v_block.state <> 'active' then raise object_not_in_prerequisite_state using message = 'Only an active Schedule Block can be changed.'; end if;

  if p_action = 'updated' then
    v_starts_at := coalesce(p_starts_at, v_block.starts_at); v_ends_at := coalesce(p_ends_at, v_block.ends_at);
    if v_ends_at <= v_starts_at then raise invalid_parameter_value using message = 'Schedule Block end must be after its start.'; end if;
    begin
      update public.show_schedule_reservations set reserved_during = tstzrange(
        v_starts_at - make_interval(mins => v_theater.setup_buffer_minutes), v_ends_at + make_interval(mins => v_theater.turnover_buffer_minutes), '[)')
      where schedule_block_id = v_block.id and status = 'active';
    exception when exclusion_violation then
      raise object_not_in_prerequisite_state using message = 'The Primary Venue is already reserved during this buffered time.';
    end;
    update public.schedule_blocks set starts_at = v_starts_at, ends_at = v_ends_at,
      private_label = coalesce(btrim(p_private_label), private_label),
      private_notes = nullif(btrim(p_private_notes), ''),
      version = version + 1, updated_at = now() where id = v_block.id returning * into v_block;
  elsif p_action in ('released', 'cancelled') then
    update public.show_schedule_reservations set status = 'released', released_at = now()
      where schedule_block_id = v_block.id and status = 'active';
    update public.schedule_blocks set state = p_action::public.schedule_block_state,
      released_at = case when p_action = 'released' then now() else null end,
      cancelled_at = case when p_action = 'cancelled' then now() else null end,
      version = version + 1, updated_at = now() where id = v_block.id returning * into v_block;
  else raise invalid_parameter_value using message = 'Unknown Schedule Block action.'; end if;
  insert into public.schedule_block_history (schedule_block_id, actor_user_id, action, command_id, version, snapshot)
  values (v_block.id, p_actor_user_id, p_action, p_command_id, v_block.version, to_jsonb(v_block));
  insert into public.activity_events (theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
  values (v_block.theater_id, 'schedule_block', v_block.id, p_actor_user_id, 'schedule_block.' || p_action, 'admin_only', jsonb_build_object('scheduleBlockId', v_block.id, 'commandId', p_command_id));
  return v_block;
end;
$function$;

create or replace function public.get_schedule_blocks(p_theater_slug text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_theater public.theaters%rowtype;
begin
  select * into v_theater from public.theaters where slug = p_theater_slug;
  if not found then return null; end if;
  return jsonb_build_object(
    'theaterId', v_theater.id,
    'theaterName', v_theater.name,
    'scheduleBlocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', block.id, 'startsAt', block.starts_at, 'endsAt', block.ends_at,
        'privateLabel', block.private_label, 'privateNotes', block.private_notes,
        'state', block.state, 'version', block.version, 'createdAt', block.created_at,
        'createdByName', profile.display_name,
        'history', coalesce((select jsonb_agg(jsonb_build_object(
          'action', history.action, 'createdAt', history.created_at,
          'version', history.version
        ) order by history.created_at desc) from public.schedule_block_history history
        where history.schedule_block_id = block.id), '[]'::jsonb)
      ) order by block.starts_at desc)
      from public.schedule_blocks block join public.profiles profile on profile.id = block.created_by_user_id
      where block.theater_id = v_theater.id
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.create_schedule_block(uuid, uuid, uuid, timestamptz, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.change_schedule_block(uuid, uuid, uuid, integer, text, timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.create_schedule_block(uuid, uuid, uuid, timestamptz, timestamptz, text, text) to service_role;
grant execute on function public.change_schedule_block(uuid, uuid, uuid, integer, text, timestamptz, timestamptz, text, text) to service_role;
revoke all on function public.get_schedule_blocks(text) from public, anon, authenticated;
grant execute on function public.get_schedule_blocks(text) to service_role;
grant select, insert, update on public.schedule_blocks, public.schedule_block_history to service_role;
grant select on public.schedule_blocks, public.schedule_block_history to authenticated;
