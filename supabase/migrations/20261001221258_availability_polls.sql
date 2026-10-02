-- Poll answers are intentionally independent of legacy Candidate Slot availability.
create table public.show_availability_polls (
  id uuid primary key,
  occurrence_id uuid not null references public.show_occurrences(id) on delete cascade,
  state text not null default 'open' check (state in ('open', 'closed', 'cancelled')),
  timezone_name text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 1 and 30),
  opened_by uuid not null references public.profiles(id),
  opened_at timestamptz not null default now(),
  ended_at timestamptz,
  replaced_poll_id uuid references public.show_availability_polls(id)
);
create unique index one_open_availability_poll_per_occurrence
  on public.show_availability_polls(occurrence_id) where state = 'open';
create table public.show_poll_respondents (
  poll_id uuid not null references public.show_availability_polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  display_name text not null,
  primary key (poll_id, user_id)
);
create table public.show_poll_responses (
  poll_id uuid not null,
  user_id uuid not null,
  submitted jsonb,
  draft jsonb,
  version integer not null default 0,
  submitted_at timestamptz,
  primary key (poll_id, user_id),
  foreign key (poll_id, user_id) references public.show_poll_respondents(poll_id, user_id) on delete cascade
);
create table public.show_poll_commands (
  command_id uuid primary key,
  actor_user_id uuid not null references public.profiles(id),
  poll_id uuid not null references public.show_availability_polls(id) on delete cascade,
  request jsonb not null,
  result jsonb not null
);

create function public.is_poll_respondent(p_poll_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.show_poll_respondents r
    join public.show_availability_polls p on p.id = r.poll_id
    join public.show_occurrences o on o.id = p.occurrence_id
    join public.shows s on s.id = o.show_id
    join public.show_cast c on c.show_id = s.id and c.user_id = r.user_id and c.status = 'accepted'
    join public.theater_memberships m on m.theater_id = s.theater_id and m.user_id = r.user_id and m.status = 'active'
    where r.poll_id = p_poll_id and r.user_id = p_user_id
  );
$$;
create function public.can_view_availability_poll(p_poll_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.show_availability_polls p
    join public.show_occurrences o on o.id = p.occurrence_id
    where p.id = p_poll_id and (
      public.is_show_leader(o.show_id, auth.uid()) or public.is_poll_respondent(p.id, auth.uid())
    )
  );
$$;
alter table public.show_availability_polls enable row level security;
alter table public.show_poll_respondents enable row level security;
alter table public.show_poll_responses enable row level security;
alter table public.show_poll_commands enable row level security;
create policy poll_read on public.show_availability_polls for select to authenticated
  using (public.can_view_availability_poll(id));
create policy respondents_read on public.show_poll_respondents for select to authenticated
  using (public.can_view_availability_poll(poll_id));
-- Drafts and submissions share a physical row; only the owner may read it directly.
-- The read RPC below projects submitted answers for the authorized comparison audience.
create policy own_response_read on public.show_poll_responses for select to authenticated
  using (user_id = auth.uid() and public.is_poll_respondent(poll_id));
grant select on public.show_availability_polls, public.show_poll_respondents, public.show_poll_responses to authenticated;
revoke all on function public.is_poll_respondent(uuid, uuid), public.can_view_availability_poll(uuid) from public, anon;
grant execute on function public.is_poll_respondent(uuid, uuid), public.can_view_availability_poll(uuid) to authenticated;

create function public.open_availability_poll(
  p_occurrence_id uuid, p_slot_ids uuid[], p_user_ids uuid[], p_command_id uuid,
  p_replace_poll_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_show public.shows%rowtype;
  v_options jsonb;
  v_timezone text;
  v_request jsonb := jsonb_build_object('occurrence', p_occurrence_id, 'slots', p_slot_ids, 'users', p_user_ids, 'replace', p_replace_poll_id);
  v_receipt public.show_poll_commands%rowtype;
  v_poll public.show_availability_polls%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then raise insufficient_privilege using message = 'Sign in is required.'; end if;
  select s.* into v_show from public.shows s join public.show_occurrences o on o.show_id = s.id where o.id = p_occurrence_id for update of s;
  if not found then raise no_data_found using message = 'Occurrence was not found.'; end if;
  perform 1 from public.theater_memberships where theater_id = v_show.theater_id and user_id = auth.uid() for share;
  perform 1 from public.show_leadership where show_id = v_show.id and user_id = auth.uid() for share;
  if not public.is_show_leader(v_show.id) then raise insufficient_privilege using message = 'Producer or Director access is required.'; end if;
  select * into v_receipt from public.show_poll_commands where command_id = p_command_id;
  if found then
    if v_receipt.actor_user_id <> auth.uid() or v_receipt.request <> v_request then raise invalid_parameter_value using message = 'Command was already used for different input.'; end if;
    return v_receipt.result;
  end if;
  if v_show.lifecycle_status in ('cancelled', 'completed') then raise object_not_in_prerequisite_state using message = 'This Event no longer accepts poll changes.'; end if;
  if cardinality(p_slot_ids) is null or cardinality(p_slot_ids) not between 1 and 30
    or cardinality(p_user_ids) is null or cardinality(p_user_ids) not between 1 and 200
    or (select count(distinct x) from unnest(p_slot_ids) x) <> cardinality(p_slot_ids)
    or (select count(distinct x) from unnest(p_user_ids) x) <> cardinality(p_user_ids) then
    raise invalid_parameter_value using message = 'Select unique options and accepted Cast respondents.';
  end if;
  select timezone into v_timezone from public.theaters where id = v_show.theater_id;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = v_timezone) then
    raise invalid_parameter_value using message = 'Configure the Theater time zone first.';
  end if;
  perform 1 from public.show_candidate_slots where id = any(p_slot_ids) for share;
  if (select count(*) from public.show_candidate_slots where occurrence_id = p_occurrence_id and id = any(p_slot_ids)) <> cardinality(p_slot_ids) then
    raise invalid_parameter_value using message = 'Options must belong to this Occurrence.';
  end if;
  -- Existing Candidate Slots are entered with a local timestamp and time zone.
  -- Reject inconsistent and DST-ambiguous snapshots instead of choosing an offset.
  if exists (
    select 1 from public.show_candidate_slots c where c.id = any(p_slot_ids) and (
      c.starts_at at time zone c.timezone_name <> c.local_starts_at
      or (select count(*) from generate_series(c.starts_at - interval '3 hours', c.starts_at + interval '3 hours', interval '15 minutes') t
          where t at time zone c.timezone_name = c.local_starts_at) <> 1
    )
  ) then raise invalid_parameter_value using message = 'An option has an ambiguous or invalid local time. Correct the Candidate Slot first.'; end if;
  perform 1 from public.theater_memberships where theater_id = v_show.theater_id and user_id = any(p_user_ids) for share;
  perform 1 from public.show_cast where show_id = v_show.id and user_id = any(p_user_ids) for share;
  if (select count(*) from public.show_cast c join public.theater_memberships m on m.user_id = c.user_id and m.theater_id = v_show.theater_id and m.status = 'active'
      where c.show_id = v_show.id and c.status = 'accepted' and c.user_id = any(p_user_ids)) <> cardinality(p_user_ids) then
    raise insufficient_privilege using message = 'Every respondent must be an active accepted Cast Member.';
  end if;
  if p_replace_poll_id is not null then
    select * into v_poll from public.show_availability_polls where id = p_replace_poll_id for update;
    if not found or v_poll.occurrence_id <> p_occurrence_id or v_poll.state <> 'open' then
      raise object_not_in_prerequisite_state using message = 'The poll changed. Refresh before replacing it.';
    end if;
    update public.show_availability_polls set state = 'cancelled', ended_at = now() where id = p_replace_poll_id;
  end if;
  select jsonb_agg(jsonb_build_object('id', c.id, 'startsAt', c.starts_at, 'durationMinutes', c.duration_minutes, 'locationName', c.location_name) order by array_position(p_slot_ids, c.id))
    into v_options from public.show_candidate_slots c where id = any(p_slot_ids);
  insert into public.show_availability_polls(id, occurrence_id, timezone_name, options, opened_by, replaced_poll_id)
    values(p_command_id, p_occurrence_id, v_timezone, v_options, auth.uid(), p_replace_poll_id);
  insert into public.show_poll_respondents(poll_id, user_id, display_name)
    select p_command_id, id, coalesce(display_name, 'Cast Member') from public.profiles where id = any(p_user_ids);
  v_result := jsonb_build_object('pollId', p_command_id);
  insert into public.show_poll_commands values(p_command_id, auth.uid(), p_command_id, v_request, v_result);
  insert into public.activity_events(id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
    values(p_command_id, v_show.theater_id, 'event', v_show.id, auth.uid(), 'event.availability_poll.opened', 'self_only', v_result);
  return v_result;
end;
$$;

create function public.close_availability_poll(p_poll_id uuid, p_command_id uuid, p_cancel boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_poll public.show_availability_polls%rowtype;
  v_show public.shows%rowtype;
  v_receipt public.show_poll_commands%rowtype;
  v_request jsonb := jsonb_build_object('poll', p_poll_id, 'cancel', p_cancel);
  v_result jsonb;
begin
  if auth.uid() is null then raise insufficient_privilege using message = 'Sign in is required.'; end if;
  select s.* into v_show from public.shows s join public.show_occurrences o on o.show_id = s.id join public.show_availability_polls p on p.occurrence_id = o.id where p.id = p_poll_id for update of s;
  if not found then raise no_data_found using message = 'Poll was not found.'; end if;
  perform 1 from public.theater_memberships where theater_id = v_show.theater_id and user_id = auth.uid() for share;
  perform 1 from public.show_leadership where show_id = v_show.id and user_id = auth.uid() for share;
  if not public.is_show_leader(v_show.id) then raise insufficient_privilege using message = 'Producer or Director access is required.'; end if;
  select * into v_receipt from public.show_poll_commands where command_id = p_command_id;
  if found then
    if v_receipt.actor_user_id <> auth.uid() or v_receipt.request <> v_request then raise invalid_parameter_value using message = 'Command was already used for different input.'; end if;
    return v_receipt.result;
  end if;
  select * into v_poll from public.show_availability_polls where id = p_poll_id for update;
  if v_poll.state <> 'open' then raise object_not_in_prerequisite_state using message = 'This poll has already ended. Refresh to see its history.'; end if;
  update public.show_availability_polls set state = case when p_cancel then 'cancelled' else 'closed' end, ended_at = now() where id = p_poll_id;
  v_result := jsonb_build_object('pollId', p_poll_id);
  insert into public.show_poll_commands values(p_command_id, auth.uid(), p_poll_id, v_request, v_result);
  insert into public.activity_events(id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
    values(p_command_id, v_show.theater_id, 'event', v_show.id, auth.uid(), 'event.availability_poll.ended', 'self_only', jsonb_build_object('pollId', p_poll_id, 'cancelled', p_cancel));
  return v_result;
end;
$$;

create function public.save_availability_poll_answers(
  p_poll_id uuid, p_answers jsonb, p_submit boolean, p_expected_version integer, p_command_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_poll public.show_availability_polls%rowtype;
  v_show public.shows%rowtype;
  v_response public.show_poll_responses%rowtype;
  v_receipt public.show_poll_commands%rowtype;
  v_request jsonb := jsonb_build_object('poll', p_poll_id, 'answers', p_answers, 'submit', p_submit, 'version', p_expected_version);
  v_result jsonb;
begin
  if auth.uid() is null then raise insufficient_privilege using message = 'Sign in is required.'; end if;
  select s.* into v_show from public.shows s join public.show_occurrences o on o.show_id = s.id join public.show_availability_polls p on p.occurrence_id = o.id where p.id = p_poll_id for update of s;
  if not found then raise no_data_found using message = 'Poll was not found.'; end if;
  perform 1 from public.theater_memberships where theater_id = v_show.theater_id and user_id = auth.uid() for share;
  perform 1 from public.show_cast where show_id = v_show.id and user_id = auth.uid() for share;
  if not public.is_poll_respondent(p_poll_id) then raise insufficient_privilege using message = 'Selected active accepted Cast membership is required.'; end if;
  select * into v_receipt from public.show_poll_commands where command_id = p_command_id;
  if found then
    if v_receipt.actor_user_id <> auth.uid() or v_receipt.request <> v_request then raise invalid_parameter_value using message = 'Command was already used for different input.'; end if;
    return v_receipt.result;
  end if;
  select * into v_poll from public.show_availability_polls where id = p_poll_id for update;
  if v_poll.state <> 'open' or v_show.lifecycle_status in ('cancelled', 'completed') then
    raise object_not_in_prerequisite_state using message = 'This poll is closed or the Event has ended. Your editing input has been preserved.';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then raise invalid_parameter_value using message = 'Answers must be an option map.'; end if;
  if exists(select 1 from jsonb_each_text(p_answers) a where a.value is null or a.value not in ('available', 'unavailable', 'uncertain')
    or not exists(select 1 from jsonb_array_elements(v_poll.options) o where o->>'id' = a.key)) then
    raise invalid_parameter_value using message = 'Choose Available, Unavailable or Uncertain for poll options.';
  end if;
  if p_submit and (select count(*) from jsonb_object_keys(p_answers)) <> jsonb_array_length(v_poll.options) then
    raise invalid_parameter_value using message = 'Answer every option before submitting.';
  end if;
  select * into v_response from public.show_poll_responses where poll_id = p_poll_id and user_id = auth.uid() for update;
  if coalesce(v_response.version, 0) <> p_expected_version or p_expected_version is null then
    raise object_not_in_prerequisite_state using message = 'Your answers changed. Refresh before saving again; your input has been preserved.';
  end if;
  insert into public.show_poll_responses(poll_id, user_id, draft, submitted, submitted_at, version)
    values(p_poll_id, auth.uid(), case when p_submit then null else p_answers end,
      case when p_submit then p_answers else null end, case when p_submit then now() else null end, 1)
    on conflict (poll_id, user_id) do update set
      draft = case when p_submit then null else p_answers end,
      submitted = case when p_submit then p_answers else public.show_poll_responses.submitted end,
      submitted_at = case when p_submit then now() else public.show_poll_responses.submitted_at end,
      version = public.show_poll_responses.version + 1
    returning jsonb_build_object('pollId', poll_id, 'version', version) into v_result;
  insert into public.show_poll_commands values(p_command_id, auth.uid(), p_poll_id, v_request, v_result);
  if p_submit then
    insert into public.activity_events(id, theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload)
      values(p_command_id, v_show.theater_id, 'event', v_show.id, auth.uid(), 'event.availability_poll.submitted', 'self_only', v_result);
  end if;
  return v_result;
end;
$$;

create function public.get_availability_polls(p_show_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_leader boolean; v_result jsonb;
begin
  if auth.uid() is null then raise insufficient_privilege using message = 'Sign in is required.'; end if;
  v_leader := public.is_show_leader(p_show_id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'occurrenceId', p.occurrence_id, 'state', p.state, 'timezoneName', p.timezone_name,
    'options', p.options, 'openedAt', p.opened_at, 'canRespond', public.is_poll_respondent(p.id),
    'respondents', (select coalesce(jsonb_agg(jsonb_build_object(
      'userId', r.user_id, 'displayName', r.display_name, 'eligible', public.is_poll_respondent(p.id, r.user_id),
      'submitted', a.submitted, 'submittedAt', a.submitted_at
    ) order by r.display_name), '[]'::jsonb) from public.show_poll_respondents r
      left join public.show_poll_responses a on a.poll_id = r.poll_id and a.user_id = r.user_id where r.poll_id = p.id),
    'own', (select jsonb_build_object('draft', a.draft, 'submitted', a.submitted, 'version', a.version)
      from public.show_poll_responses a where a.poll_id = p.id and a.user_id = auth.uid() and public.is_poll_respondent(p.id))
  ) order by p.opened_at desc, p.id desc), '[]'::jsonb) into v_result
  from public.show_availability_polls p join public.show_occurrences o on o.id = p.occurrence_id
  where o.show_id = p_show_id and (v_leader or public.is_poll_respondent(p.id));
  return jsonb_build_object('canLead', v_leader, 'polls', v_result);
end;
$$;
revoke all on function public.open_availability_poll(uuid, uuid[], uuid[], uuid, uuid),
  public.close_availability_poll(uuid, uuid, boolean),
  public.save_availability_poll_answers(uuid, jsonb, boolean, integer, uuid),
  public.get_availability_polls(uuid) from public, anon;
grant execute on function public.open_availability_poll(uuid, uuid[], uuid[], uuid, uuid),
  public.close_availability_poll(uuid, uuid, boolean),
  public.save_availability_poll_answers(uuid, jsonb, boolean, integer, uuid),
  public.get_availability_polls(uuid) to authenticated;
-- Protect poll history when a plan attempts to remove its Occurrence.
alter table public.show_availability_polls drop constraint show_availability_polls_occurrence_id_fkey;
alter table public.show_availability_polls add constraint show_availability_polls_occurrence_id_fkey foreign key(occurrence_id) references public.show_occurrences(id) on delete restrict;
-- Explicitly owned local/demo reset code can clear poll rows before its Events.
grant all on public.show_availability_polls, public.show_poll_respondents, public.show_poll_responses, public.show_poll_commands to service_role;

create function public.get_my_poll_actions() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'eventSlug', s.slug, 'eventTitle', s.title, 'theaterSlug', t.slug, 'theaterTitle', t.name)), '[]'::jsonb)
  from public.show_poll_respondents r
  join public.show_availability_polls p on p.id = r.poll_id and p.state = 'open'
  join public.show_occurrences o on o.id = p.occurrence_id
  join public.shows s on s.id = o.show_id and s.lifecycle_status not in ('cancelled', 'completed')
  join public.theaters t on t.id = s.theater_id
  left join public.show_poll_responses a on a.poll_id = r.poll_id and a.user_id = r.user_id
  where auth.uid() is not null and r.user_id = auth.uid() and public.is_poll_respondent(p.id) and a.submitted is null;
$$;
revoke all on function public.get_my_poll_actions() from public, anon;
grant execute on function public.get_my_poll_actions() to authenticated;
