create type public.proposal_review_action as enum (
  'approve',
  'request_edits',
  'deny'
);

alter table public.show_proposal_revisions
  add column decision_version integer not null default 1
    check (decision_version > 0);

alter table public.shows
  add column approved_proposal_revision_id uuid
    references public.show_proposal_revisions(id) on delete set null;

create table public.show_proposal_decisions (
  id uuid primary key default gen_random_uuid(),
  proposal_revision_id uuid not null
    references public.show_proposal_revisions(id) on delete cascade,
  action public.proposal_review_action not null,
  reason text,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  owner_override boolean not null default false,
  revision_version integer not null check (revision_version > 0),
  command_id uuid not null unique,
  created_at timestamptz not null default now(),
  constraint show_proposal_decisions_reason_check check (
    (action = 'approve'::public.proposal_review_action and not owner_override)
    or nullif(btrim(reason), '') is not null
  ),
  unique (proposal_revision_id)
);

create index show_proposal_decisions_revision_created
  on public.show_proposal_decisions (proposal_revision_id, created_at);

create table public.show_proposal_replacements (
  source_proposal_revision_id uuid not null
    references public.show_proposal_revisions(id) on delete cascade,
  replacement_show_id uuid not null
    references public.shows(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete restrict,
  command_id uuid not null unique,
  created_at timestamptz not null default now(),
  primary key (source_proposal_revision_id, replacement_show_id),
  unique (replacement_show_id)
);

alter table public.show_proposal_decisions enable row level security;
alter table public.show_proposal_replacements enable row level security;

create policy "show_proposal_decisions_select_operational"
on public.show_proposal_decisions
for select
to authenticated
using (
  exists (
    select 1
    from public.show_proposal_revisions revision
    where revision.id = proposal_revision_id
      and public.is_event_operational_viewer(revision.show_id, (select auth.uid()))
  )
);

create policy "show_proposal_replacements_select_operational"
on public.show_proposal_replacements
for select
to authenticated
using (
  public.is_event_operational_viewer(replacement_show_id, (select auth.uid()))
  or exists (
    select 1
    from public.show_proposal_revisions revision
    where revision.id = source_proposal_revision_id
      and public.is_event_operational_viewer(revision.show_id, (select auth.uid()))
  )
);

create or replace function public.prevent_proposal_revision_mutation()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  if tg_op = 'UPDATE'
    and new.id = old.id
    and new.show_id = old.show_id
    and new.revision_number = old.revision_number
    and new.submitted_by = old.submitted_by
    and new.submitted_at = old.submitted_at
    and new.command_id = old.command_id
    and new.snapshot = old.snapshot
    and new.decision_version = old.decision_version + 1
    and new.decision_state is distinct from old.decision_state
  then
    return new;
  end if;

  raise object_not_in_prerequisite_state
    using message = 'Submitted Proposal Revisions are immutable.';
end;
$function$;

create or replace function public.project_proposal_decision_notifications(
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

  if not found or v_event.action not in (
    'event.proposal_revision.approved',
    'event.proposal_revision.owner_override_approved',
    'event.proposal_revision.changes_requested',
    'event.proposal_revision.denied'
  ) then
    return;
  end if;

  insert into public.notifications (
    user_id, type, entity_type, entity_id, payload, dedupe_key
  )
  select
    recipient.user_id,
    v_event.action,
    'show'::public.notification_entity,
    v_event.entity_id,
    jsonb_build_object(
      'activityEventId', v_event.id,
      'eventId', v_event.entity_id,
      'proposalRevisionId', v_event.payload ->> 'proposalRevisionId',
      'revisionNumber', v_event.payload -> 'revisionNumber',
      'reason', v_event.payload -> 'reason',
      'theaterId', v_event.theater_id
    ),
    'proposal-decision:' || v_event.id::text
  from (
    select leadership.user_id
    from public.show_leadership leadership
    where leadership.show_id = v_event.entity_id
    union
    select proposed.user_id
    from public.show_proposed_cast proposed
    where proposed.show_id = v_event.entity_id
  ) recipient
  where recipient.user_id <> v_event.actor_user_id
  on conflict (user_id, dedupe_key) do nothing;
end;
$function$;

create or replace function public.review_proposal_revision(
  p_proposal_revision_id uuid,
  p_actor_user_id uuid,
  p_action public.proposal_review_action,
  p_reason text,
  p_owner_override boolean,
  p_command_id uuid,
  p_expected_version integer
)
returns public.show_proposal_decisions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_revision public.show_proposal_revisions%rowtype;
  v_show public.shows%rowtype;
  v_theater public.theaters%rowtype;
  v_membership public.theater_memberships%rowtype;
  v_decision public.show_proposal_decisions%rowtype;
  v_activity_event_id uuid;
  v_event_action text;
  v_is_reviewer boolean;
  v_is_owner boolean;
begin
  if auth.role() <> 'service_role'
    and auth.uid() is distinct from p_actor_user_id
  then
    raise insufficient_privilege using message = 'The authenticated Reviewer identity is required.';
  end if;

  select * into v_decision
  from public.show_proposal_decisions
  where command_id = p_command_id;

  if found then
    if v_decision.proposal_revision_id <> p_proposal_revision_id
      or v_decision.actor_user_id <> p_actor_user_id
      or v_decision.action <> p_action
    then
      raise unique_violation using message = 'Review command identity is already in use.';
    end if;
    return v_decision;
  end if;

  select * into v_revision
  from public.show_proposal_revisions
  where id = p_proposal_revision_id
  for update;

  if not found then
    raise no_data_found using message = 'Proposal Revision was not found.';
  end if;

  select * into v_show from public.shows where id = v_revision.show_id for update;
  select * into v_theater from public.theaters where id = v_show.theater_id;
  select * into v_membership
  from public.theater_memberships
  where theater_id = v_show.theater_id
    and user_id = p_actor_user_id
    and status = 'active'::public.membership_status;

  if not found then
    raise insufficient_privilege using message = 'Current active Reviewer membership is required.';
  end if;

  v_is_owner := 'owner'::public.theater_role = any(v_membership.roles);
  v_is_reviewer := v_is_owner
    or 'admin'::public.theater_role = any(v_membership.roles)
    or exists (
      select 1 from public.theater_member_capabilities capability
      where capability.theater_id = v_show.theater_id
        and capability.user_id = p_actor_user_id
        and capability.capability = 'reviewer'::public.theater_capability
    );

  if not v_is_reviewer then
    raise insufficient_privilege using message = 'Current Reviewer authority is required.';
  end if;

  if v_revision.decision_state <> 'pending'::public.proposal_decision_state
    or exists (
      select 1 from public.show_proposal_decisions decision
      where decision.proposal_revision_id = v_revision.id
    )
  then
    raise object_not_in_prerequisite_state
      using message = 'This Proposal Revision has already been decided.';
  end if;

  if p_expected_version is null or p_expected_version <> v_revision.decision_version then
    raise object_not_in_prerequisite_state
      using message = 'The Proposal Revision changed before this decision was saved.';
  end if;

  if v_revision.submitted_by = p_actor_user_id then
    if not (
      p_action = 'approve'::public.proposal_review_action
      and p_owner_override
      and v_is_owner
      and v_theater.owner_self_approval_enabled
      and nullif(btrim(p_reason), '') is not null
    ) then
      raise insufficient_privilege
        using message = 'A Proposal Revision author cannot decide it without the explicit audited Owner approval override.';
    end if;
  elsif p_owner_override then
    raise invalid_parameter_value
      using message = 'Owner override is only valid for an Owner approving their own Proposal Revision.';
  end if;

  if p_action in (
    'request_edits'::public.proposal_review_action,
    'deny'::public.proposal_review_action
  ) and nullif(btrim(p_reason), '') is null then
    raise invalid_parameter_value using message = 'A reason is required for this decision.';
  end if;

  insert into public.show_proposal_decisions (
    proposal_revision_id, action, reason, actor_user_id, owner_override,
    revision_version, command_id
  ) values (
    v_revision.id,
    p_action,
    nullif(btrim(p_reason), ''),
    p_actor_user_id,
    p_owner_override,
    v_revision.decision_version,
    p_command_id
  ) returning * into v_decision;

  update public.show_proposal_revisions
  set decision_state = case p_action
        when 'approve'::public.proposal_review_action then 'approved'::public.proposal_decision_state
        when 'request_edits'::public.proposal_review_action then 'changes_requested'::public.proposal_decision_state
        when 'deny'::public.proposal_review_action then 'denied'::public.proposal_decision_state
      end,
      decision_version = decision_version + 1
  where id = v_revision.id;

  if p_action = 'approve'::public.proposal_review_action then
    update public.shows
    set status = 'approved'::public.show_status,
        lifecycle_status = 'approved'::public.show_lifecycle_status,
        approved_proposal_revision_id = v_revision.id,
        updated_at = now()
    where id = v_show.id;
    v_event_action := case when p_owner_override
      then 'event.proposal_revision.owner_override_approved'
      else 'event.proposal_revision.approved'
    end;
  elsif p_action = 'request_edits'::public.proposal_review_action then
    update public.shows
    set status = 'draft'::public.show_status,
        lifecycle_status = 'draft'::public.show_lifecycle_status,
        approved_proposal_revision_id = null,
        updated_at = now()
    where id = v_show.id;
    v_event_action := 'event.proposal_revision.changes_requested';
  else
    v_event_action := 'event.proposal_revision.denied';
  end if;

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    v_show.theater_id,
    'event',
    v_show.id,
    p_actor_user_id,
    v_event_action,
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'proposalRevisionId', v_revision.id,
      'revisionNumber', v_revision.revision_number,
      'decisionId', v_decision.id,
      'reason', v_decision.reason,
      'ownerOverride', v_decision.owner_override,
      'commandId', p_command_id
    )
  ) returning id into v_activity_event_id;

  perform public.project_proposal_decision_notifications(v_activity_event_id);
  return v_decision;
end;
$function$;

create or replace function public.proposal_approval_scope_from_snapshot(p_snapshot jsonb)
returns jsonb
language sql
immutable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'minimumViableCast', p_snapshot -> 'minimumViableCast',
    'occurrences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', occurrence -> 'id',
        'type', occurrence -> 'type',
        'visibility', occurrence -> 'visibility',
        'position', occurrence -> 'position',
        'confirmedSlot', jsonb_build_object(
          'candidateSlotId', occurrence -> 'confirmedSlot' -> 'candidateSlotId',
          'startsAt', occurrence -> 'confirmedSlot' -> 'startsAt',
          'durationMinutes', occurrence -> 'confirmedSlot' -> 'durationMinutes',
          'locationKind', occurrence -> 'confirmedSlot' -> 'locationKind',
          'resourceId', occurrence -> 'confirmedSlot' -> 'resourceId',
          'locationName', occurrence -> 'confirmedSlot' -> 'locationName'
        )
      ) order by (occurrence ->> 'position')::integer)
      from jsonb_array_elements(p_snapshot -> 'occurrences') occurrence
    ), '[]'::jsonb),
    'resourceRequests', coalesce(p_snapshot -> 'resourceRequests', '[]'::jsonb)
  );
$function$;

create or replace function public.proposal_approval_scope_from_plan(
  p_minimum_viable_cast integer,
  p_occurrences jsonb,
  p_resource_requests jsonb
)
returns jsonb
language sql
immutable
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'minimumViableCast', to_jsonb(p_minimum_viable_cast),
    'occurrences', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', occurrence -> 'id',
        'type', occurrence -> 'type',
        'visibility', occurrence -> 'visibility',
        'position', occurrence -> 'position',
        'confirmedSlot', jsonb_build_object(
          'candidateSlotId', occurrence -> 'confirmedCandidateSlotId',
          'startsAt', slot -> 'startsAt',
          'durationMinutes', slot -> 'durationMinutes',
          'locationKind', slot -> 'locationKind',
          'resourceId', slot -> 'resourceId',
          'locationName', slot -> 'locationName'
        )
      ) order by (occurrence ->> 'position')::integer)
      from jsonb_array_elements(p_occurrences) occurrence
      cross join lateral (
        select candidate as slot
        from jsonb_array_elements(occurrence -> 'candidateSlots') candidate
        where candidate ->> 'id' = occurrence ->> 'confirmedCandidateSlotId'
      ) chosen
    ), '[]'::jsonb),
    'resourceRequests', coalesce((
      select jsonb_agg(resource order by (resource ->> 'position')::integer)
      from jsonb_array_elements(p_resource_requests) resource
    ), '[]'::jsonb)
  );
$function$;

alter function public.save_event_operational_plan(
  uuid, uuid, integer, integer, jsonb, jsonb
) rename to save_event_operational_plan_draft;

create or replace function public.save_event_operational_plan(
  p_show_id uuid,
  p_actor_user_id uuid,
  p_target_cast_size integer,
  p_minimum_viable_cast integer,
  p_occurrences jsonb,
  p_resource_requests jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_show public.shows%rowtype;
  v_revision public.show_proposal_revisions%rowtype;
  v_invalidates boolean := false;
  v_result jsonb;
begin
  select * into v_show from public.shows where id = p_show_id for update;
  if not found then
    raise no_data_found using message = 'Event was not found.';
  end if;

  if v_show.lifecycle_status not in (
    'draft'::public.show_lifecycle_status,
    'approved'::public.show_lifecycle_status
  ) then
    raise object_not_in_prerequisite_state
      using message = 'The operational plan is editable only while the Event is a draft or approved.';
  end if;

  if v_show.lifecycle_status = 'approved'::public.show_lifecycle_status then
    select * into v_revision
    from public.show_proposal_revisions
    where id = v_show.approved_proposal_revision_id;
    if not found then
      raise object_not_in_prerequisite_state
        using message = 'The approved Event does not identify its Operational Approval.';
    end if;

    v_invalidates := public.proposal_approval_scope_from_plan(
      p_minimum_viable_cast, p_occurrences, p_resource_requests
    ) is distinct from public.proposal_approval_scope_from_snapshot(v_revision.snapshot);

    update public.shows set lifecycle_status = 'draft'::public.show_lifecycle_status
    where id = p_show_id;
  end if;

  v_result := public.save_event_operational_plan_draft(
    p_show_id, p_actor_user_id, p_target_cast_size, p_minimum_viable_cast,
    p_occurrences, p_resource_requests
  );

  if v_show.lifecycle_status = 'approved'::public.show_lifecycle_status then
    if v_invalidates then
      update public.shows
      set approved_proposal_revision_id = null,
          updated_at = now()
      where id = p_show_id;

      insert into public.activity_events (
        theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
      ) values (
        v_show.theater_id, 'event', p_show_id, p_actor_user_id,
        'event.operational_approval.invalidated',
        'member_visible'::public.activity_visibility,
        jsonb_build_object('approvedProposalRevisionId', v_revision.id)
      );
    else
      update public.shows
      set lifecycle_status = 'approved'::public.show_lifecycle_status,
          approved_proposal_revision_id = v_revision.id,
          updated_at = now()
      where id = p_show_id;
    end if;
  end if;

  return v_result || jsonb_build_object('operationalApprovalInvalidated', v_invalidates);
end;
$function$;

create or replace function public.seed_denied_proposal_replacement(
  p_source_proposal_revision_id uuid,
  p_actor_user_id uuid,
  p_title text,
  p_slug text,
  p_command_id uuid
)
returns public.shows
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_source_revision public.show_proposal_revisions%rowtype;
  v_source_show public.shows%rowtype;
  v_replacement public.shows%rowtype;
  v_existing_show_id uuid;
  v_occurrence jsonb;
  v_slot jsonb;
  v_resource jsonb;
  v_occurrence_id uuid;
  v_slot_id uuid;
begin
  select replacement_show_id into v_existing_show_id
  from public.show_proposal_replacements where command_id = p_command_id;
  if found then
    select * into v_replacement from public.shows where id = v_existing_show_id;
    return v_replacement;
  end if;

  select * into v_source_revision
  from public.show_proposal_revisions
  where id = p_source_proposal_revision_id and decision_state = 'denied'
  for share;
  if not found then
    raise object_not_in_prerequisite_state
      using message = 'Only a denied Proposal Revision can seed a replacement Event.';
  end if;

  select * into v_source_show from public.shows where id = v_source_revision.show_id;
  if not public.is_eligible_event_producer(v_source_show.theater_id, p_actor_user_id)
    or not exists (
      select 1 from public.show_leadership
      where show_id = v_source_show.id and user_id = p_actor_user_id
        and role = 'producer'::public.event_leadership_role
    )
  then
    raise insufficient_privilege using message = 'Current source Event Producer access is required.';
  end if;

  if nullif(btrim(p_title), '') is null or nullif(btrim(p_slug), '') is null then
    raise invalid_parameter_value using message = 'Replacement Event title and slug are required.';
  end if;

  insert into public.shows (
    theater_id, created_by_user_id, title, slug, event_type, status,
    lifecycle_status, publication_status, operational_health, is_public_listed,
    target_cast_size, minimum_viable_cast
  ) values (
    v_source_show.theater_id, p_actor_user_id, btrim(p_title), btrim(p_slug),
    'show'::public.event_type, 'draft'::public.show_status,
    'draft'::public.show_lifecycle_status, 'unpublished'::public.show_publication_status,
    'on_track'::public.show_operational_health, false,
    (v_source_revision.snapshot ->> 'targetCastSize')::integer,
    (v_source_revision.snapshot ->> 'minimumViableCast')::integer
  ) returning * into v_replacement;

  insert into public.show_leadership (show_id, user_id, role, assigned_by_user_id)
  values (v_replacement.id, p_actor_user_id, 'producer', p_actor_user_id);

  for v_occurrence in
    select value from jsonb_array_elements(v_source_revision.snapshot -> 'occurrences')
  loop
    v_occurrence_id := gen_random_uuid();
    v_slot_id := gen_random_uuid();
    v_slot := v_occurrence -> 'confirmedSlot';
    insert into public.show_occurrences (
      id, show_id, occurrence_type, visibility, position, status
    ) values (
      v_occurrence_id, v_replacement.id,
      (v_occurrence ->> 'type')::public.occurrence_type,
      (v_occurrence ->> 'visibility')::public.occurrence_visibility,
      (v_occurrence ->> 'position')::integer,
      'scheduled'::public.show_occurrence_status
    );
    insert into public.show_candidate_slots (
      id, occurrence_id, starts_at, duration_minutes, local_starts_at,
      timezone_name, timezone_source, utc_offset_minutes, location_kind,
      resource_id, location_name, off_site_approved, position
    ) values (
      v_slot_id, v_occurrence_id, (v_slot ->> 'startsAt')::timestamptz,
      (v_slot ->> 'durationMinutes')::integer,
      (v_slot ->> 'localStartsAt')::timestamp,
      v_slot ->> 'timezoneName',
      (v_slot ->> 'timezoneSource')::public.timezone_source,
      (v_slot ->> 'utcOffsetMinutes')::integer,
      (v_slot ->> 'locationKind')::public.slot_location_kind,
      (v_slot ->> 'resourceId')::uuid,
      v_slot ->> 'locationName',
      coalesce((v_slot ->> 'offSiteApproved')::boolean, false), 0
    );
    update public.show_occurrences
    set confirmed_candidate_slot_id = v_slot_id,
        starts_at = (v_slot ->> 'startsAt')::timestamptz,
        ends_at = (v_slot ->> 'startsAt')::timestamptz
          + make_interval(mins => (v_slot ->> 'durationMinutes')::integer)
    where id = v_occurrence_id;
  end loop;

  for v_resource in
    select value from jsonb_array_elements(v_source_revision.snapshot -> 'resourceRequests')
  loop
    insert into public.show_resource_requests (
      show_id, resource_type, label, quantity, position
    ) values (
      v_replacement.id,
      (v_resource ->> 'type')::public.event_resource_type,
      v_resource ->> 'label',
      (v_resource ->> 'quantity')::integer,
      (v_resource ->> 'position')::integer
    );
  end loop;

  insert into public.show_proposal_replacements (
    source_proposal_revision_id, replacement_show_id, created_by_user_id, command_id
  ) values (
    v_source_revision.id, v_replacement.id, p_actor_user_id, p_command_id
  );

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
  ) values (
    v_source_show.theater_id, 'event', v_replacement.id, p_actor_user_id,
    'event.created_from_denied_proposal',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'sourceEventId', v_source_show.id,
      'sourceProposalRevisionId', v_source_revision.id,
      'commandId', p_command_id
    )
  );

  return v_replacement;
exception
  when unique_violation then
    raise unique_violation using message = 'The replacement Event slug or command identity is already in use.';
end;
$function$;

revoke all on function public.review_proposal_revision(
  uuid, uuid, public.proposal_review_action, text, boolean, uuid, integer
) from public, anon;
grant execute on function public.review_proposal_revision(
  uuid, uuid, public.proposal_review_action, text, boolean, uuid, integer
) to authenticated, service_role;

revoke all on function public.seed_denied_proposal_replacement(
  uuid, uuid, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.seed_denied_proposal_replacement(
  uuid, uuid, text, text, uuid
) to service_role;

revoke all on function public.save_event_operational_plan_draft(
  uuid, uuid, integer, integer, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.save_event_operational_plan(
  uuid, uuid, integer, integer, jsonb, jsonb
) to service_role;

revoke all on function public.project_proposal_decision_notifications(uuid)
from public, anon, authenticated;
grant execute on function public.project_proposal_decision_notifications(uuid)
to service_role;

grant select, insert on public.show_proposal_decisions,
  public.show_proposal_replacements to service_role;
grant select on public.show_proposal_decisions,
  public.show_proposal_replacements to authenticated;
grant update (decision_state, decision_version)
on public.show_proposal_revisions to service_role;
grant select, update (approved_proposal_revision_id) on public.shows to service_role;
