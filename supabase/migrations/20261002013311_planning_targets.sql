-- STA-70: consent and pending moves are separate from current commitments.
create table public.show_planning_targets (
 id uuid primary key default gen_random_uuid(),
 show_id uuid not null references public.shows(id) on delete cascade,
 occurrence_id uuid not null references public.show_occurrences(id) on delete cascade,
 base_revision_id uuid references public.show_proposal_revisions(id),
 proposal_revision_id uuid references public.show_proposal_revisions(id),
 selected_by uuid not null references public.profiles(id),
 slot jsonb not null,
 version integer not null default 1,
 state text not null default 'planning' check (state in ('planning','submitted','committed','withdrawn','denied','changes_requested')),
 hold_until timestamptz,
 created_at timestamptz not null default now()
);
create unique index show_planning_one_target on public.show_planning_targets(occurrence_id) where state in ('planning','submitted');
create unique index show_planning_one_move on public.show_planning_targets(show_id) where base_revision_id is not null and state in ('planning','submitted');
create table public.show_planning_calls (
 target_id uuid not null references public.show_planning_targets(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 call public.occurrence_call not null,
 version integer not null default 1,
 primary key(target_id,user_id)
);
create table public.show_planning_confirmations (
 target_id uuid not null references public.show_planning_targets(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 target_version integer not null,
 call_version integer not null,
 confirmed boolean not null,
 version integer not null default 1,
 responded_at timestamptz not null default now(),
 primary key(target_id,user_id)
);
create table public.show_planning_commands (
 id uuid primary key,
 show_id uuid not null references public.shows(id) on delete cascade,
 actor_id uuid not null references public.profiles(id),
 action text not null,
 input jsonb not null,
 result jsonb not null
);
alter table public.show_schedule_reservations add column planning_target_id uuid references public.show_planning_targets(id) on delete cascade;
-- Planning holds use the existing exclusion-protected hold storage. Unlike a
-- Counteroffer they have a planning target, not a reviewer offer.
alter table public.show_schedule_reservations drop constraint show_schedule_reservations_reference_check;
alter table public.show_schedule_reservations add constraint show_schedule_reservations_reference_check check (
 (kind='approved_commitment' and proposal_revision_id is not null and counteroffer_id is null and schedule_block_id is null and planning_target_id is null)
 or (kind='counteroffer_hold' and ((counteroffer_id is not null and planning_target_id is null) or (counteroffer_id is null and planning_target_id is not null)) and schedule_block_id is null)
 or (kind='schedule_block' and schedule_block_id is not null and counteroffer_id is null and proposal_revision_id is null and planning_target_id is null)
);

create function private.planning_participant(p_show_id uuid,p_user_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from shows s join theater_memberships m on m.theater_id=s.theater_id and m.user_id=p_user_id and m.status='active' where s.id=p_show_id)
 and (exists(select 1 from show_cast where show_id=p_show_id and user_id=p_user_id and status='accepted') or exists(select 1 from show_staff_assignments where show_id=p_show_id and user_id=p_user_id and status='accepted'));
$$;
create function private.planning_leader(p_show_id uuid,p_user_id uuid,p_role public.event_leadership_role) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from shows s join theater_memberships m on m.theater_id=s.theater_id and m.user_id=p_user_id and m.status='active' join show_leadership l on l.show_id=s.id and l.user_id=m.user_id and l.role=p_role where s.id=p_show_id);
$$;
create function private.planning_viewer(p_show_id uuid,p_user_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from shows s join theater_memberships m on m.theater_id=s.theater_id and m.user_id=p_user_id and m.status='active' where s.id=p_show_id and (m.roles && array['owner','admin']::theater_role[] or exists(select 1 from theater_member_capabilities c where c.theater_id=s.theater_id and c.user_id=p_user_id and c.capability='reviewer')))
 or private.planning_leader(p_show_id,p_user_id,'producer') or private.planning_leader(p_show_id,p_user_id,'director');
$$;

alter table public.show_planning_targets enable row level security;
alter table public.show_planning_calls enable row level security;
alter table public.show_planning_confirmations enable row level security;
alter table public.show_planning_commands enable row level security;
create policy planning_targets_read on public.show_planning_targets for select to authenticated using (private.planning_viewer(show_id,auth.uid()) or (private.planning_participant(show_id,auth.uid()) and exists(select 1 from public.show_planning_calls c where c.target_id=id and c.user_id=auth.uid())));
-- Avoid a policy cycle through the target table by using the authorized read RPC.
-- Direct participant-table reads are deliberately not granted to authenticated.
grant select on public.show_planning_targets to authenticated;
grant all on public.show_planning_targets,public.show_planning_calls,public.show_planning_confirmations,public.show_planning_commands to service_role;

create function public.planning_target_blockers(p_target_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t show_planning_targets; s shows; blockers jsonb:='[]'; missing jsonb; n integer; slotrow show_candidate_slots;
begin
 select * into t from show_planning_targets where id=p_target_id;
 select * into s from shows where id=t.show_id;
 select * into slotrow from show_candidate_slots where id=(t.slot->>'candidateSlotId')::uuid;
 if slotrow.id is null or jsonb_build_object('candidateSlotId',slotrow.id,'startsAt',slotrow.starts_at,'durationMinutes',slotrow.duration_minutes,'locationKind',slotrow.location_kind,'resourceId',slotrow.resource_id,'locationName',slotrow.location_name,'offSiteApproved',slotrow.off_site_approved,'localStartsAt',slotrow.local_starts_at,'timezoneName',slotrow.timezone_name,'timezoneSource',slotrow.timezone_source,'utcOffsetMinutes',slotrow.utc_offset_minutes) is distinct from t.slot then
  blockers:=blockers||jsonb_build_array(jsonb_build_object('code','stale_target','message','The Candidate Slot changed. Select it again and obtain fresh confirmations.'));
 end if;
 if t.state in ('planning','submitted') and t.base_revision_id is not null and t.base_revision_id is distinct from s.approved_proposal_revision_id then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','stale_base','message','The current approval changed. Withdraw and refresh the move.')); end if;
 if exists(select 1 from show_proposed_cast pc where pc.show_id=s.id and not exists(select 1 from show_planning_calls c where c.target_id=t.id and c.user_id=pc.user_id)) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','calls_incomplete','message','Director must assign a Call to every Proposed Cast Member.')); end if;
 select coalesce(jsonb_agg(jsonb_build_object('userId',c.user_id,'displayName',p.display_name)), '[]') into missing from show_planning_calls c join profiles p on p.id=c.user_id left join show_planning_confirmations f on f.target_id=c.target_id and f.user_id=c.user_id where c.target_id=t.id and c.call='required' and (not private.planning_participant(s.id,c.user_id) or f.confirmed is distinct from true or f.target_version<>t.version or f.call_version<>c.version);
 if jsonb_array_length(missing)>0 then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','missing_confirmations','message','Every required Cast/staff participant must explicitly confirm the selected time.','members',missing)); end if;
 if exists(select 1 from show_proposed_cast pc where pc.show_id=s.id and (not private.planning_participant(s.id,pc.user_id) or not exists(select 1 from show_cast cast_member where cast_member.show_id=s.id and cast_member.user_id=pc.user_id and cast_member.status='accepted'))) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','ineligible_cast','message','Remove ineligible Proposed Cast Members.')); end if;
 select count(*) into n from show_planning_calls c join show_proposed_cast pc on pc.show_id=s.id and pc.user_id=c.user_id join show_planning_confirmations f on f.target_id=c.target_id and f.user_id=c.user_id and f.confirmed and f.target_version=t.version and f.call_version=c.version where c.target_id=t.id and c.call<>'not_called' and private.planning_participant(s.id,c.user_id) and exists(select 1 from show_cast cast_member where cast_member.show_id=s.id and cast_member.user_id=c.user_id and cast_member.status='accepted');
 if (select occurrence_type from show_occurrences where id=t.occurrence_id)='performance' and n<coalesce(s.minimum_viable_cast,1) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','minimum_viable_cast','message',format('%s called Cast Members confirmed; %s required for Minimum Viable Cast.',n,coalesce(s.minimum_viable_cast,1)))); end if;
 if t.slot->>'locationKind'='off_site' and (t.slot->>'offSiteApproved')::boolean is distinct from true then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','offsite_unapproved','message','The off-site location requires approval.')); end if;
 if exists(select 1 from show_resource_requests r where r.show_id=s.id and r.resource_type='staff' and public.event_staff_coverage(s.id,r.id)<r.quantity) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','staff_coverage','message','Accepted Event staffing does not meet requested coverage.')); end if;
 if t.slot->>'locationKind'='primary_venue' and exists(select 1 from show_schedule_reservations r join theaters th on th.id=s.theater_id where r.resource_id=(t.slot->>'resourceId')::uuid and r.status='active' and r.planning_target_id is distinct from t.id and (r.proposal_revision_id is distinct from (case when t.state='committed' then s.approved_proposal_revision_id else t.base_revision_id end) or (case when t.state='committed' then s.approved_proposal_revision_id else t.base_revision_id end) is null) and (r.planning_target_id is null or exists(select 1 from show_planning_targets ht where ht.id=r.planning_target_id and ht.hold_until>now())) and r.reserved_during && tstzrange((t.slot->>'startsAt')::timestamptz-make_interval(mins=>th.setup_buffer_minutes),(t.slot->>'startsAt')::timestamptz+make_interval(mins=>(t.slot->>'durationMinutes')::integer+th.turnover_buffer_minutes),'[)')) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','venue_conflict','message','The Primary Venue conflicts with an active buffered commitment or hold.')); end if;
 return blockers;
end;
$$;

create function public.get_event_planning(p_show_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); can_view boolean; result jsonb;
begin
 if actor is null then raise insufficient_privilege using message='Sign in is required.'; end if;
 can_view:=private.planning_viewer(p_show_id,actor);
 if not can_view and not private.planning_participant(p_show_id,actor) then raise insufficient_privilege using message='Current Event planning access is required.'; end if;
 perform public.expire_planning_holds(now());
 select jsonb_build_object('canSelect',private.planning_leader(p_show_id,actor,'producer'),'canCall',private.planning_leader(p_show_id,actor,'director'),'canHold',exists(select 1 from shows s join theater_memberships m on m.theater_id=s.theater_id and m.user_id=actor and m.status='active' and m.roles && array['owner','admin']::theater_role[] where s.id=p_show_id),'targets',coalesce(jsonb_agg(jsonb_build_object('id',t.id,'occurrenceId',t.occurrence_id,'version',t.version,'state',t.state,'currentCommitment',t.state='committed' and exists(select 1 from shows cs join show_proposal_revisions cr on cr.id=cs.approved_proposal_revision_id cross join lateral jsonb_array_elements(cr.snapshot->'occurrences') co where cs.id=t.show_id and co->>'planningTargetId'=t.id::text),'replacement',t.base_revision_id is not null,'revisionId',t.proposal_revision_id,'slot',t.slot,'holdUntil',t.hold_until,'blockers',case when can_view then planning_target_blockers(t.id) else '[]'::jsonb end,'calls',(select coalesce(jsonb_agg(jsonb_build_object('userId',c.user_id,'displayName',p.display_name,'call',c.call,'version',c.version,'eligible',private.planning_participant(t.show_id,c.user_id),'own',c.user_id=actor,'confirmed',coalesce(f.confirmed and f.target_version=t.version and f.call_version=c.version,false),'confirmationVersion',coalesce(f.version,0)) order by p.display_name),'[]') from show_planning_calls c join profiles p on p.id=c.user_id left join show_planning_confirmations f on f.target_id=c.target_id and f.user_id=c.user_id where c.target_id=t.id and (can_view or c.user_id=actor))) order by t.created_at desc),'[]')) into result from show_planning_targets t where t.show_id=p_show_id and (can_view or exists(select 1 from show_planning_calls c where c.target_id=t.id and c.user_id=actor));
 return result||jsonb_build_object('participants',case when can_view then (select coalesce(jsonb_agg(jsonb_build_object('userId',p.id,'displayName',p.display_name) order by p.display_name),'[]') from profiles p where private.planning_participant(p_show_id,p.id)) else '[]'::jsonb end);
end;
$$;

create function public.submit_planning_revision(p_show_id uuid,p_actor_id uuid,p_command_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s shows; t show_planning_targets; o show_occurrences; snapshot jsonb; occurrences jsonb:='[]'; item jsonb; blockers jsonb:='[]'; revision show_proposal_revisions; base show_proposal_revisions; n integer;
begin
 select * into s from shows where id=p_show_id for update;
 if not private.planning_leader(s.id,p_actor_id,'producer') or not is_eligible_event_producer(s.theater_id,p_actor_id) then raise insufficient_privilege using message='Eligible Producer access is required.'; end if;
 if s.lifecycle_status not in ('draft','approved') then raise object_not_in_prerequisite_state using message='The Event is already in review or closed.'; end if;
 if s.minimum_viable_cast is null or s.target_cast_size is null then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','thresholds_missing','message','Declare target cast size and Minimum Viable Cast.')); end if;
 if not exists(select 1 from show_proposed_cast where show_id=s.id) then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','proposed_cast_empty','message','Select accepted Proposed Cast before submission.')); end if;
 if not exists(select 1 from show_occurrences where show_id=s.id and occurrence_type='performance') then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','performance_missing','message','Add a Performance before submission.')); end if;
 if s.approved_proposal_revision_id is not null then
  select * into base from show_proposal_revisions where id=s.approved_proposal_revision_id;
  snapshot:=base.snapshot;
 else
  snapshot:=jsonb_build_object('eventId',s.id,'leadership',(select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'role',role)),'[]') from show_leadership where show_id=s.id),'proposedCastUserIds',(select coalesce(jsonb_agg(user_id),'[]') from show_proposed_cast where show_id=s.id),'targetCastSize',s.target_cast_size,'minimumViableCast',s.minimum_viable_cast,'resourceRequests',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'type',resource_type,'label',label,'quantity',quantity,'position',position)),'[]') from show_resource_requests where show_id=s.id));
 end if;
 for o in select * from show_occurrences where show_id=s.id order by position loop
  select * into t from show_planning_targets where occurrence_id=o.id and state='planning';
  if t.id is null then
   if base.id is not null then
    select value into item from jsonb_array_elements(base.snapshot->'occurrences') where value->>'id'=o.id::text;
    if item ? 'planningTargetId' then blockers:=blockers||planning_target_blockers((item->>'planningTargetId')::uuid); end if;
   else blockers:=blockers||jsonb_build_array(jsonb_build_object('code','target_missing','message',format('Select a planning target for Occurrence %s.',o.position+1))); item:=null;
   end if;
  else
   if t.base_revision_id is distinct from base.id then blockers:=blockers||jsonb_build_array(jsonb_build_object('code','stale_base','message','The selected target belongs to an older approval.')); end if;
   blockers:=blockers||planning_target_blockers(t.id);
   select count(*) into n from show_planning_calls c join show_proposed_cast pc on pc.show_id=s.id and pc.user_id=c.user_id join show_planning_confirmations f on f.target_id=c.target_id and f.user_id=c.user_id and f.confirmed and f.call_version=c.version and f.target_version=t.version where c.target_id=t.id and c.call<>'not_called' and private.planning_participant(s.id,c.user_id) and exists(select 1 from show_cast cast_member where cast_member.show_id=s.id and cast_member.user_id=c.user_id and cast_member.status='accepted');
   item:=jsonb_build_object('id',o.id,'type',o.occurrence_type,'visibility',o.visibility,'position',o.position,'confirmedSlot',t.slot,'calls',(select coalesce(jsonb_agg(jsonb_build_object('userId',c.user_id,'displayName',p.display_name,'call',c.call)),'[]') from show_planning_calls c join profiles p on p.id=c.user_id where c.target_id=t.id),'viability',jsonb_build_object('availableCalledCastCount',n,'minimumViableCast',s.minimum_viable_cast),'planningTargetId',t.id,'confirmations',(select coalesce(jsonb_agg(jsonb_build_object('userId',f.user_id,'displayName',(select display_name from profiles where id=f.user_id),'confirmed',f.confirmed,'respondedAt',f.responded_at,'targetVersion',f.target_version,'callVersion',f.call_version)),'[]') from show_planning_confirmations f where f.target_id=t.id));
  end if;
  if item is not null then occurrences:=occurrences||jsonb_build_array(item); end if;
 end loop;
 if jsonb_array_length(blockers)>0 then raise invalid_parameter_value using message='The Proposal Revision is blocked.',detail=blockers::text; end if;
 if not exists(select 1 from show_planning_targets where show_id=s.id and state='planning') then raise invalid_parameter_value using message='Select a planning target first.'; end if;
 snapshot:=snapshot||jsonb_build_object('occurrences',occurrences,'baseApprovalId',base.id,'planningTargetIds',(select jsonb_agg(id) from show_planning_targets where show_id=s.id and state='planning'));
 insert into show_proposal_revisions(show_id,revision_number,submitted_by,command_id,snapshot) values(s.id,(select coalesce(max(revision_number),0)+1 from show_proposal_revisions where show_id=s.id),p_actor_id,p_command_id,snapshot) returning * into revision;
 update show_planning_targets set state='submitted',proposal_revision_id=revision.id where show_id=s.id and state='planning';
 if base.id is null then update shows set lifecycle_status='in_review',status='pending_review' where id=s.id; end if;
 insert into activity_events(theater_id,entity_type,entity_id,actor_user_id,action,visibility,payload) values(s.theater_id,'event',s.id,p_actor_id,'event.proposal_revision.submitted','member_visible',jsonb_build_object('proposalRevisionId',revision.id,'revisionNumber',revision.revision_number,'replacement',base.id is not null));
 return jsonb_build_object('revisionId',revision.id,'revisionNumber',revision.revision_number);
end;
$$;
revoke all on function public.submit_planning_revision(uuid,uuid,uuid) from public,anon,authenticated;

create function public.manage_event_planning(p_show_id uuid,p_action text,p_input jsonb,p_command_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); s shows; th theaters; t show_planning_targets; slotrow show_candidate_slots; c show_planning_calls; f show_planning_confirmations; prior show_planning_commands; result jsonb; director boolean; producer boolean; operator boolean; participant uuid;
begin
 if actor is null then raise insufficient_privilege using message='Sign in is required.'; end if;
 -- New planning commands share Theater -> Event -> membership/participation -> target order.
 select * into th from theaters where id=(select theater_id from shows where id=p_show_id) for update;
 select * into s from shows where id=p_show_id for update;
 if not found then raise no_data_found using message='Event was not found.'; end if;
 perform 1 from theater_memberships where theater_id=s.theater_id order by user_id for share;
 perform 1 from show_cast where show_id=s.id order by user_id for share;
 perform 1 from show_staff_assignments where show_id=s.id order by id for share;
 perform 1 from show_leadership where show_id=s.id order by user_id,role for share;
 perform 1 from theater_member_capabilities where theater_id=s.theater_id order by user_id,capability for share;
 producer:=private.planning_leader(s.id,actor,'producer'); director:=private.planning_leader(s.id,actor,'director');
 operator:=exists(select 1 from theater_memberships where theater_id=s.theater_id and user_id=actor and status='active' and roles && array['owner','admin']::theater_role[]);
 if not ((p_action in ('select','withdraw','submit') and producer) or (p_action='call' and director) or (p_action='hold' and operator) or (p_action='confirm' and private.planning_participant(s.id,actor))) then raise insufficient_privilege using message='Current authority for this planning action is required.'; end if;
 if p_action not in ('select','call','confirm','hold','withdraw','submit') or p_input is null or jsonb_typeof(p_input)<>'object' or (p_input->>'expectedVersion') is null or (p_input->>'expectedVersion')::integer<0 or p_command_id is null then raise invalid_parameter_value using message='A valid planning action, command identity and expected version are required.'; end if;
 select * into prior from show_planning_commands where id=p_command_id;
 if found then
  if prior.show_id<>s.id or prior.actor_id<>actor or prior.action<>p_action or prior.input<>p_input then raise unique_violation using message='Command identity is already in use for different input.'; end if;
  return prior.result;
 end if;
 if s.lifecycle_status not in ('draft','approved','in_review') then raise object_not_in_prerequisite_state using message='This Event no longer permits planning.'; end if;
 -- Expired planning holds release without withdrawing pending Review.
 perform public.expire_planning_holds(now());
 if p_action='select' then
  if s.lifecycle_status='in_review' then raise object_not_in_prerequisite_state using message='Withdraw the submitted plan before changing its target.'; end if;
  select * into slotrow from show_candidate_slots where id=(p_input->>'slotId')::uuid and occurrence_id=(p_input->>'occurrenceId')::uuid and exists(select 1 from show_occurrences o where o.id=occurrence_id and o.show_id=s.id) for share;
  if not found then raise invalid_parameter_value using message='Choose a Candidate Slot belonging to this Occurrence.'; end if;
  select * into t from show_planning_targets where occurrence_id=slotrow.occurrence_id and state in ('planning','submitted') for update;
  if coalesce(t.version,0)<>(p_input->>'expectedVersion')::integer then raise object_not_in_prerequisite_state using message='Planning target changed. Refresh before selecting again.'; end if;
  if t.state='submitted' then raise object_not_in_prerequisite_state using message='Withdraw the submitted target before selecting again.'; end if;
  if t.id is not null then
   update show_planning_targets set state='withdrawn' where id=t.id or (t.proposal_revision_id is not null and proposal_revision_id=t.proposal_revision_id);
   update show_schedule_reservations set status='released',released_at=now() where planning_target_id in(select id from show_planning_targets where id=t.id or (t.proposal_revision_id is not null and proposal_revision_id=t.proposal_revision_id)) and status='active';
  end if;
  insert into show_planning_targets(show_id,occurrence_id,base_revision_id,selected_by,version,slot) values(s.id,slotrow.occurrence_id,s.approved_proposal_revision_id,actor,coalesce(t.version,0)+1,jsonb_build_object('candidateSlotId',slotrow.id,'startsAt',slotrow.starts_at,'durationMinutes',slotrow.duration_minutes,'locationKind',slotrow.location_kind,'resourceId',slotrow.resource_id,'locationName',slotrow.location_name,'offSiteApproved',slotrow.off_site_approved,'localStartsAt',slotrow.local_starts_at,'timezoneName',slotrow.timezone_name,'timezoneSource',slotrow.timezone_source,'utcOffsetMinutes',slotrow.utc_offset_minutes)) returning * into t;
  -- Copy expectations only. No current Call or booking is changed.
  insert into show_planning_calls(target_id,user_id,call) select t.id,user_id,call from show_occurrence_calls where occurrence_id=t.occurrence_id;
 else
  select * into t from show_planning_targets where id=(p_input->>'targetId')::uuid and show_id=s.id for update;
  if not found then raise no_data_found using message='Planning target was not found.'; end if;
  if t.version<>(p_input->>'expectedVersion')::integer or (t.state not in ('planning','submitted') and not(p_action='confirm' and t.state='committed' and exists(select 1 from show_proposal_revisions cr cross join lateral jsonb_array_elements(cr.snapshot->'occurrences') co where cr.id=s.approved_proposal_revision_id and co->>'planningTargetId'=t.id::text))) then raise object_not_in_prerequisite_state using message='Planning target changed. Refresh before acting again.'; end if;
  if p_action='call' then
   if t.state<>'planning' then raise object_not_in_prerequisite_state using message='Submitted Calls are immutable. Withdraw before editing.'; end if;
   participant:=(p_input->>'userId')::uuid;
   if not private.planning_participant(s.id,participant) then raise invalid_parameter_value using message='Calls require accepted active Cast or Event staff.'; end if;
   select * into c from show_planning_calls where target_id=t.id and user_id=participant for update;
   if (p_input->>'callVersion') is null or coalesce(c.version,0)<>(p_input->>'callVersion')::integer then raise object_not_in_prerequisite_state using message='Call changed. Refresh before saving again.'; end if;
   insert into show_planning_calls(target_id,user_id,call) values(t.id,participant,(p_input->>'call')::occurrence_call) on conflict(target_id,user_id) do update set call=excluded.call,version=show_planning_calls.version+1;
  elsif p_action='confirm' then
   select * into c from show_planning_calls where target_id=t.id and user_id=actor;
   if c.user_id is null or c.call='not_called' then raise insufficient_privilege using message='Only a called participant can confirm this target.'; end if;
   if (p_input->>'callVersion') is null or c.version<>(p_input->>'callVersion')::integer then raise object_not_in_prerequisite_state using message='Your Call changed. Refresh before confirming.'; end if;
   if jsonb_typeof(p_input->'confirmed') is distinct from 'boolean' then raise invalid_parameter_value using message='An explicit confirmation or refusal is required.'; end if;
   select * into f from show_planning_confirmations where target_id=t.id and user_id=actor for update;
   if (p_input->>'confirmationVersion') is null or coalesce(f.version,0)<>(p_input->>'confirmationVersion')::integer then raise object_not_in_prerequisite_state using message='Your confirmation changed. Refresh before responding.'; end if;
   insert into show_planning_confirmations(target_id,user_id,target_version,call_version,confirmed) values(t.id,actor,t.version,c.version,(p_input->>'confirmed')::boolean) on conflict(target_id,user_id) do update set confirmed=excluded.confirmed,target_version=excluded.target_version,call_version=excluded.call_version,version=show_planning_confirmations.version+1,responded_at=now();
  elsif p_action='withdraw' then
   update show_planning_targets set state='withdrawn' where id=t.id or (t.proposal_revision_id is not null and proposal_revision_id=t.proposal_revision_id);
   update show_schedule_reservations set status='released',released_at=now() where planning_target_id in(select id from show_planning_targets where id=t.id or (t.proposal_revision_id is not null and proposal_revision_id=t.proposal_revision_id)) and status='active';
   if t.proposal_revision_id is not null then
    update show_proposal_revisions set decision_state='changes_requested',decision_version=decision_version+1 where id=t.proposal_revision_id and decision_state='pending';
    if t.base_revision_id is null then update shows set lifecycle_status='draft',status='draft' where id=s.id; end if;
   end if;
  elsif p_action='hold' then
   if t.slot->>'locationKind'<>'primary_venue' then raise invalid_parameter_value using message='Off-site targets do not reserve the Primary Venue.'; end if;
   update show_schedule_reservations set status='released',released_at=now() where planning_target_id=t.id and status='active';
   update show_planning_targets set hold_until=now()+make_interval(hours=>th.counteroffer_response_hours) where id=t.id returning * into t;
   insert into show_schedule_reservations(theater_id,resource_id,show_id,occurrence_id,candidate_slot_id,kind,planning_target_id,reserved_during) values(s.theater_id,(t.slot->>'resourceId')::uuid,s.id,t.occurrence_id,(t.slot->>'candidateSlotId')::uuid,'counteroffer_hold',t.id,tstzrange((t.slot->>'startsAt')::timestamptz-make_interval(mins=>th.setup_buffer_minutes),(t.slot->>'startsAt')::timestamptz+make_interval(mins=>(t.slot->>'durationMinutes')::integer+th.turnover_buffer_minutes),'[)'));
  elsif p_action='submit' then
   result:=public.submit_planning_revision(s.id,actor,p_command_id);
  end if;
 end if;
 if p_action='confirm' and t.state='committed' then perform private.evaluate_event_operational_health(s.id,actor,'selected_time_confirmation_changed'); end if;
 result:=coalesce(result,'{}'::jsonb)||jsonb_build_object('targetId',t.id);
 insert into show_planning_commands values(p_command_id,s.id,actor,p_action,p_input,result);
 insert into activity_events(id,theater_id,entity_type,entity_id,actor_user_id,action,visibility,payload) values(p_command_id,s.theater_id,'event',s.id,actor,'event.planning.'||p_action,'self_only',result||jsonb_build_object('participantUserId',actor));
 return result;
end;
$$;
revoke all on function private.planning_participant(uuid,uuid),private.planning_leader(uuid,uuid,public.event_leadership_role),private.planning_viewer(uuid,uuid),public.planning_target_blockers(uuid),public.get_event_planning(uuid),public.manage_event_planning(uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function private.planning_participant(uuid,uuid),private.planning_leader(uuid,uuid,public.event_leadership_role),private.planning_viewer(uuid,uuid),public.get_event_planning(uuid),public.manage_event_planning(uuid,text,jsonb,uuid) to authenticated,service_role;

-- Keep the existing decision authorization, audited override and notification
-- projection. The wrapper adds planning concurrency and booking persistence.
alter function public.review_proposal_revision(uuid,uuid,public.proposal_review_action,text,boolean,uuid,integer) rename to review_proposal_revision_without_planning;
create function public.review_proposal_revision(p_proposal_revision_id uuid,p_actor_user_id uuid,p_action public.proposal_review_action,p_reason text,p_owner_override boolean,p_command_id uuid,p_expected_version integer) returns public.show_proposal_decisions
language plpgsql security definer set search_path=public as $$
declare r show_proposal_revisions; s shows; t show_planning_targets; decision show_proposal_decisions; blockers jsonb:='[]'; old_reservations uuid[]; item jsonb; current_ids jsonb;
begin
 select * into r from show_proposal_revisions where id=p_proposal_revision_id;
 if not (r.snapshot ? 'planningTargetIds') then return review_proposal_revision_without_planning(p_proposal_revision_id,p_actor_user_id,p_action,p_reason,p_owner_override,p_command_id,p_expected_version); end if;
 if coalesce(auth.role(),'') <> 'service_role' and auth.uid() is distinct from p_actor_user_id then raise insufficient_privilege using message='The authenticated Reviewer identity is required.'; end if;
 
 perform 1 from theaters where id=(select theater_id from shows where id=r.show_id) for update;
 select * into s from shows where id=r.show_id for update;
 perform 1 from theater_memberships where theater_id=s.theater_id order by user_id for share;
 perform 1 from show_cast where show_id=s.id order by user_id for share;
 perform 1 from show_staff_assignments where show_id=s.id order by id for share;
 perform 1 from show_leadership where show_id=s.id order by user_id,role for share;
 perform 1 from theater_member_capabilities where theater_id=s.theater_id order by user_id,capability for share;
 if not exists(select 1 from theater_memberships m where m.theater_id=s.theater_id and m.user_id=p_actor_user_id and m.status='active' and (m.roles && array['owner','admin']::theater_role[] or exists(select 1 from theater_member_capabilities c where c.theater_id=m.theater_id and c.user_id=m.user_id and c.capability='reviewer'))) then raise insufficient_privilege using message='Current Reviewer authority is required.'; end if;
 select * into decision from show_proposal_decisions where command_id=p_command_id;
 if found then
  if decision.proposal_revision_id<>r.id or decision.actor_user_id<>p_actor_user_id or decision.action<>p_action or decision.reason is distinct from nullif(btrim(p_reason),'') or decision.owner_override<>p_owner_override then raise unique_violation using message='Review command identity is already in use for different input.'; end if;
  return decision;
 end if;
 if s.lifecycle_status in ('cancelled','completed') then raise object_not_in_prerequisite_state using message='This Event is closed.'; end if;
 if (select count(*) from show_planning_targets where proposal_revision_id=r.id)<>jsonb_array_length(r.snapshot->'planningTargetIds') then raise object_not_in_prerequisite_state using message='The submitted plan no longer identifies every target. Refresh before review.'; end if;
 for t in select * from show_planning_targets where proposal_revision_id=r.id order by id for update loop
  if t.state<>'submitted' then raise object_not_in_prerequisite_state using message='This planning revision is no longer current.'; end if;
  if t.base_revision_id is distinct from s.approved_proposal_revision_id then raise object_not_in_prerequisite_state using message='Current Operational Approval changed. Refresh the pending move.'; end if;
  if p_action='approve' then blockers:=blockers||planning_target_blockers(t.id); end if;
 end loop;
 if p_action='approve' then
  -- Recheck the entire replacement, including unchanged committed targets.
  for item in select value from jsonb_array_elements(r.snapshot->'occurrences') loop
   if item ? 'planningTargetId' and not (r.snapshot->'planningTargetIds' ? (item->>'planningTargetId')) then blockers:=blockers||planning_target_blockers((item->>'planningTargetId')::uuid); end if;
  end loop;
  perform public.expire_planning_holds(now());
  if jsonb_array_length(blockers)>0 then raise invalid_parameter_value using message='Approval is blocked.',detail=blockers::text; end if;
  select coalesce(jsonb_agg(user_id order by user_id),'[]') into current_ids from show_proposed_cast where show_id=s.id;
  if current_ids is distinct from (select coalesce(jsonb_agg(value order by value),'[]') from jsonb_array_elements(r.snapshot->'proposedCastUserIds')) then raise object_not_in_prerequisite_state using message='Proposed Cast changed after submission. Submit a fresh revision.'; end if;
  -- Releases and replacement reservations are one transaction. Exclusion or
  -- authorization failure restores the original booking and hold automatically.
  update show_schedule_reservations set status='released',released_at=now() where status='active' and (proposal_revision_id=s.approved_proposal_revision_id or planning_target_id in(select id from show_planning_targets where proposal_revision_id=r.id));
  perform set_config('stagecom.planning_swap','true',true);
  for t in select * from show_planning_targets where proposal_revision_id=r.id loop
   update show_occurrences set confirmed_candidate_slot_id=(t.slot->>'candidateSlotId')::uuid,starts_at=(t.slot->>'startsAt')::timestamptz,ends_at=(t.slot->>'startsAt')::timestamptz+make_interval(mins=>(t.slot->>'durationMinutes')::integer) where id=t.occurrence_id;
   delete from show_occurrence_calls where occurrence_id=t.occurrence_id and user_id not in(select user_id from show_planning_calls where target_id=t.id);
   insert into show_occurrence_calls(occurrence_id,show_id,user_id,call,version,actor_user_id,last_command_id) select t.occurrence_id,t.show_id,user_id,call,1,p_actor_user_id,gen_random_uuid() from show_planning_calls where target_id=t.id
   on conflict(occurrence_id,user_id) do update set call=excluded.call,version=show_occurrence_calls.version+1,actor_user_id=excluded.actor_user_id,last_command_id=excluded.last_command_id,assigned_at=now();
  end loop;
 elsif p_action='request_edits' and s.approved_proposal_revision_id is not null then
  select array_agg(id) into old_reservations from show_schedule_reservations where proposal_revision_id=s.approved_proposal_revision_id and status='active';
 end if;
 decision:=review_proposal_revision_without_planning(p_proposal_revision_id,p_actor_user_id,p_action,p_reason,p_owner_override,p_command_id,p_expected_version);
 perform set_config('stagecom.planning_swap','false',true);
 if p_action='request_edits' and s.approved_proposal_revision_id is not null then
  update shows set lifecycle_status=s.lifecycle_status,status=s.status,approved_proposal_revision_id=s.approved_proposal_revision_id where id=s.id;
  -- Restoring the old pointer is not a new approval and must not reset health.
  update shows set operational_health=s.operational_health,operational_health_version=s.operational_health_version,at_risk_continuation_allowed=s.at_risk_continuation_allowed where id=s.id;
  update show_schedule_reservations set status='active',released_at=null where id=any(old_reservations);
 end if;
 update show_planning_targets set state=case p_action when 'approve' then 'committed' when 'deny' then 'denied' else 'changes_requested' end where proposal_revision_id=r.id;
 if p_action<>'approve' then update show_schedule_reservations set status='released',released_at=now() where planning_target_id in(select id from show_planning_targets where proposal_revision_id=r.id) and status='active'; end if;
 return decision;
end;
$$;
revoke all on function public.review_proposal_revision_without_planning(uuid,uuid,public.proposal_review_action,text,boolean,uuid,integer),public.review_proposal_revision(uuid,uuid,public.proposal_review_action,text,boolean,uuid,integer) from public,anon,authenticated;
grant execute on function public.review_proposal_revision(uuid,uuid,public.proposal_review_action,text,boolean,uuid,integer) to authenticated,service_role;

-- The existing application submission entry point cannot bypass confirmations
-- once a Producer has chosen the explicit planning workflow.
alter function public.submit_event_proposal_revision(uuid,uuid,uuid) rename to submit_event_proposal_revision_without_planning;
create function public.submit_event_proposal_revision(p_show_id uuid,p_actor_user_id uuid,p_command_id uuid) returns public.show_proposal_revisions
language plpgsql security definer set search_path=public as $$
declare result jsonb; r show_proposal_revisions;
begin
 if exists(select 1 from show_planning_targets where show_id=p_show_id and state in ('planning','submitted')) then
  select * into r from show_proposal_revisions where command_id=p_command_id;
  if r.id is not null and r.show_id=p_show_id and r.submitted_by=p_actor_user_id and private.planning_leader(p_show_id,p_actor_user_id,'producer') then return r; end if;
  perform 1 from theaters where id=(select theater_id from shows where id=p_show_id) for update;
  result:=submit_planning_revision(p_show_id,p_actor_user_id,p_command_id);
  select * into r from show_proposal_revisions where id=(result->>'revisionId')::uuid;
  return r;
 end if;
 return submit_event_proposal_revision_without_planning(p_show_id,p_actor_user_id,p_command_id);
end;
$$;
revoke all on function public.submit_event_proposal_revision_without_planning(uuid,uuid,uuid),public.submit_event_proposal_revision(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.submit_event_proposal_revision(uuid,uuid,uuid) to service_role;

create function private.planning_called(p_target_id uuid,p_actor_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from show_planning_calls where target_id=p_target_id and user_id=p_actor_id);
$$;
revoke all on function private.planning_called(uuid,uuid) from public,anon,authenticated;
grant execute on function private.planning_called(uuid,uuid) to authenticated,service_role;
drop policy planning_targets_read on public.show_planning_targets;
create policy planning_targets_read on public.show_planning_targets for select to authenticated using (private.planning_viewer(show_id,auth.uid()) or (private.planning_participant(show_id,auth.uid()) and private.planning_called(id,auth.uid())));

create function public.expire_planning_holds(p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path=public as $$
declare r record; n integer:=0;
begin
 for r in update show_schedule_reservations reservation set status='released',released_at=p_now from show_planning_targets target where reservation.planning_target_id=target.id and target.hold_until<=p_now and reservation.status='active' returning reservation.show_id,reservation.theater_id,target.id loop
  n:=n+1;
  insert into activity_events(theater_id,entity_type,entity_id,action,visibility,payload) values(r.theater_id,'event',r.show_id,'event.planning.hold_expired','member_visible',jsonb_build_object('targetId',r.id));
 end loop;
 return n;
end;
$$;
revoke all on function public.expire_planning_holds(timestamptz) from public,anon,authenticated;
grant execute on function public.expire_planning_holds(timestamptz) to service_role;
create function private.expire_planning_holds_before_reservation() returns trigger
language plpgsql security definer set search_path=public as $$
begin perform public.expire_planning_holds(now()); return new; end;
$$;
revoke all on function private.expire_planning_holds_before_reservation() from public,anon,authenticated;
create trigger expire_planning_holds_before_reservation before insert on public.show_schedule_reservations for each row execute function private.expire_planning_holds_before_reservation();

-- Existing plan edits keep their supported behavior. While an approved move is
-- pending, changing approved scope must go through the staged replacement.
alter function public.save_event_operational_plan(uuid,uuid,integer,integer,jsonb,jsonb) rename to save_event_operational_plan_without_planning;
create function public.save_event_operational_plan(p_show_id uuid,p_actor_user_id uuid,p_target_cast_size integer,p_minimum_viable_cast integer,p_occurrences jsonb,p_resource_requests jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s shows; approved show_proposal_revisions;
begin
 select * into s from shows where id=p_show_id for update;
 if exists(select 1 from show_planning_targets where show_id=s.id and base_revision_id is not null and state in ('planning','submitted')) then
  select * into approved from show_proposal_revisions where id=s.approved_proposal_revision_id;
  if proposal_approval_scope_from_plan(p_minimum_viable_cast,p_occurrences,p_resource_requests) is distinct from proposal_approval_scope_from_snapshot(approved.snapshot) then raise object_not_in_prerequisite_state using message='A replacement is pending. Withdraw it before editing the current approved plan.'; end if;
 end if;
 return save_event_operational_plan_without_planning(p_show_id,p_actor_user_id,p_target_cast_size,p_minimum_viable_cast,p_occurrences,p_resource_requests);
end;
$$;
revoke all on function public.save_event_operational_plan_without_planning(uuid,uuid,integer,integer,jsonb,jsonb),public.save_event_operational_plan(uuid,uuid,integer,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_event_operational_plan(uuid,uuid,integer,integer,jsonb,jsonb) to service_role;

create function public.planning_committed_confirmation(p_target_id uuid,p_user_id uuid,p_call public.occurrence_call) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from show_planning_targets t join show_planning_calls c on c.target_id=t.id and c.user_id=p_user_id and c.call=p_call join show_planning_confirmations f on f.target_id=c.target_id and f.user_id=c.user_id and f.confirmed and f.target_version=t.version and f.call_version=c.version where t.id=p_target_id and t.state='committed' and private.planning_participant(t.show_id,p_user_id));
$$;
revoke all on function public.planning_committed_confirmation(uuid,uuid,public.occurrence_call) from public,anon,authenticated;

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
    where value ->> 'type' = 'performance' or value ? 'planningTargetId'
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
    left join public.show_availability_responses as response
      on response.candidate_slot_id = v_confirmed_slot_id
      and response.user_id = calls.user_id
      and response.response = 'available'::public.availability_response
    where calls.occurrence_id = v_occurrence_id
      and calls.call <> 'not_called'::public.occurrence_call
      and case when v_occurrence ? 'planningTargetId' then public.planning_committed_confirmation((v_occurrence->>'planningTargetId')::uuid,calls.user_id,calls.call) else response.user_id is not null end;

    if v_occurrence->>'type'='performance' and v_available_count < v_minimum_viable_cast then
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
        case when v_occurrence ? 'planningTargetId' then not public.planning_committed_confirmation((v_occurrence->>'planningTargetId')::uuid,calls.user_id,calls.call) else cast_member.user_id is null or membership.user_id is null or response.user_id is null end
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


create function public.get_my_planning_actions() returns jsonb
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise insufficient_privilege using message='Sign in is required.'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'startsAt',t.slot->>'startsAt','eventSlug',s.slug,'eventTitle',s.title,'theaterSlug',th.slug,'theaterName',th.name)),'[]') from show_planning_targets t join shows s on s.id=t.show_id join theaters th on th.id=s.theater_id join show_planning_calls c on c.target_id=t.id and c.user_id=auth.uid() and c.call<>'not_called' left join show_planning_confirmations f on f.target_id=c.target_id and f.user_id=c.user_id where t.state in ('planning','submitted') and s.lifecycle_status not in ('cancelled','completed') and private.planning_participant(s.id,auth.uid()) and (f.confirmed is distinct from true or f.target_version<>t.version or f.call_version<>c.version));
end;
$$;
revoke all on function public.get_my_planning_actions() from public,anon,authenticated;
grant execute on function public.get_my_planning_actions() to authenticated,service_role;

grant execute on function public.planning_target_blockers(uuid) to service_role;

-- Legacy Counteroffers cannot mutate an explicitly confirmed planning revision.
create or replace function public.issue_proposal_counteroffer(
  p_proposal_revision_id uuid,
  p_occurrence_id uuid,
  p_actor_user_id uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_local_starts_at timestamp without time zone,
  p_timezone_name text,
  p_timezone_source public.timezone_source,
  p_utc_offset_minutes integer,
  p_location_kind public.slot_location_kind,
  p_location_name text,
  p_command_id uuid,
  p_expected_version integer,
  p_response_deadline timestamptz default null,
  p_now timestamptz default now()
)
returns public.show_counteroffers
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_revision public.show_proposal_revisions%rowtype;
  v_show public.shows%rowtype;
  v_theater public.theaters%rowtype;
  v_membership public.theater_memberships%rowtype;
  v_counteroffer public.show_counteroffers%rowtype;
  v_candidate_slot public.show_candidate_slots%rowtype;
  v_deadline timestamptz;
  v_is_reviewer boolean;
  v_activity_event_id uuid;
  v_position integer;
begin
  if exists(select 1 from public.show_proposal_revisions where id=p_proposal_revision_id and snapshot ? 'planningTargetIds') then
    raise object_not_in_prerequisite_state using message='Explicit planning revisions require withdrawal and a freshly confirmed target instead of a Counteroffer.';
  end if;
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_actor_user_id then
    raise insufficient_privilege using message = 'The authenticated Reviewer identity is required.';
  end if;

  select * into v_counteroffer
  from public.show_counteroffers where command_id = p_command_id;
  if found then
    if v_counteroffer.proposal_revision_id <> p_proposal_revision_id
      or v_counteroffer.actor_user_id <> p_actor_user_id
    then
      raise unique_violation using message = 'Counteroffer command identity is already in use.';
    end if;
    return v_counteroffer;
  end if;

  perform public.expire_proposal_counteroffers(p_now, null);

  select * into v_revision
  from public.show_proposal_revisions
  where id = p_proposal_revision_id
  for update;
  if not found then
    raise no_data_found using message = 'Proposal Revision was not found.';
  end if;
  select * into v_show from public.shows where id = v_revision.show_id for update;
  select * into v_theater from public.theaters where id = v_show.theater_id for update;

  select * into v_membership
  from public.theater_memberships
  where theater_id = v_show.theater_id
    and user_id = p_actor_user_id
    and status = 'active'::public.membership_status;
  if not found then
    raise insufficient_privilege using message = 'Current active Reviewer membership is required.';
  end if;

  v_is_reviewer := 'owner'::public.theater_role = any(v_membership.roles)
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
  if v_revision.submitted_by = p_actor_user_id then
    raise insufficient_privilege using message = 'A Proposal Revision author cannot Counteroffer their own revision.';
  end if;
  if v_revision.decision_state <> 'pending'::public.proposal_decision_state then
    raise object_not_in_prerequisite_state using message = 'This Proposal Revision is not awaiting review.';
  end if;
  if p_expected_version is null or p_expected_version <> v_revision.decision_version then
    raise object_not_in_prerequisite_state using message = 'The Proposal Revision changed before this Counteroffer was saved.';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_revision.snapshot -> 'occurrences') occurrence
    where occurrence ->> 'id' = p_occurrence_id::text
  ) then
    raise invalid_parameter_value using message = 'The target Occurrence is not part of this Proposal Revision.';
  end if;
  if p_duration_minutes not between 15 and 1440
    or nullif(btrim(p_timezone_name), '') is null
    or p_utc_offset_minutes not between -840 and 840
  then
    raise invalid_parameter_value using message = 'The offered slot is invalid.';
  end if;

  v_deadline := coalesce(
    p_response_deadline,
    p_now + make_interval(hours => v_theater.counteroffer_response_hours)
  );
  if v_deadline <= p_now
    or v_deadline > p_now + interval '720 hours'
  then
    raise invalid_parameter_value using message = 'The Counteroffer deadline must be within the next 720 hours.';
  end if;

  select slot.* into v_candidate_slot
  from public.show_candidate_slots slot
  where slot.occurrence_id = p_occurrence_id
    and slot.starts_at = p_starts_at
    and slot.duration_minutes = p_duration_minutes
    and slot.location_kind = p_location_kind
    and (
      (p_location_kind = 'primary_venue' and slot.resource_id = v_theater.primary_venue_id)
      or
      (p_location_kind = 'off_site' and slot.resource_id is null and slot.location_name = btrim(p_location_name))
    )
  limit 1;

  if not found then
    select coalesce(max(position), -1) + 1 into v_position
    from public.show_candidate_slots where occurrence_id = p_occurrence_id;
    insert into public.show_candidate_slots (
      occurrence_id, starts_at, duration_minutes, local_starts_at,
      timezone_name, timezone_source, utc_offset_minutes, location_kind,
      resource_id, location_name, off_site_approved, position
    ) values (
      p_occurrence_id, p_starts_at, p_duration_minutes, p_local_starts_at,
      btrim(p_timezone_name), p_timezone_source, p_utc_offset_minutes, p_location_kind,
      case when p_location_kind = 'primary_venue' then v_theater.primary_venue_id else null end,
      case when p_location_kind = 'primary_venue'
        then coalesce(v_theater.primary_venue_name, v_theater.name)
        else btrim(p_location_name)
      end,
      p_location_kind = 'off_site', v_position
    ) returning * into v_candidate_slot;
  end if;

  insert into public.show_counteroffers (
    proposal_revision_id, occurrence_id, candidate_slot_id, actor_user_id,
    response_deadline, command_id, created_at
  ) values (
    v_revision.id, p_occurrence_id, v_candidate_slot.id, p_actor_user_id,
    v_deadline, p_command_id, p_now
  ) returning * into v_counteroffer;

  if p_location_kind = 'primary_venue' then
    begin
      insert into public.show_schedule_reservations (
        theater_id, resource_id, show_id, occurrence_id, candidate_slot_id,
        counteroffer_id, kind, reserved_during, created_at
      ) values (
        v_show.theater_id, v_theater.primary_venue_id, v_show.id,
        p_occurrence_id, v_candidate_slot.id, v_counteroffer.id,
        'counteroffer_hold'::public.schedule_reservation_kind,
        tstzrange(
          p_starts_at - make_interval(mins => v_theater.setup_buffer_minutes),
          p_starts_at + make_interval(mins => p_duration_minutes + v_theater.turnover_buffer_minutes),
          '[)'
        ),
        p_now
      );
    exception when exclusion_violation then
      raise object_not_in_prerequisite_state
        using message = 'The Primary Venue is already reserved during this buffered time.';
    end;
  end if;

  insert into public.show_availability_requests (
    counteroffer_id, candidate_slot_id, user_id, requested_at
  )
  select v_counteroffer.id, v_candidate_slot.id, proposed.user_id, p_now
  from public.show_proposed_cast proposed
  where proposed.show_id = v_show.id
    and not exists (
      select 1 from public.show_availability_responses response
      where response.candidate_slot_id = v_candidate_slot.id
        and response.user_id = proposed.user_id
    );

  update public.show_proposal_revisions
  set decision_state = 'counteroffered'::public.proposal_decision_state,
      decision_version = decision_version + 1
  where id = v_revision.id;

  insert into public.activity_events (
    theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload, created_at
  ) values (
    v_show.theater_id, 'event', v_show.id, p_actor_user_id,
    'event.proposal_counteroffer.issued',
    'member_visible'::public.activity_visibility,
    jsonb_build_object(
      'candidateSlotId', v_candidate_slot.id,
      'counterofferId', v_counteroffer.id,
      'proposalRevisionId', v_revision.id,
      'responseDeadline', v_deadline,
      'commandId', p_command_id
    ),
    p_now
  ) returning id into v_activity_event_id;
  perform public.project_counteroffer_notifications(v_activity_event_id);

  return v_counteroffer;
end;
$function$;

-- Existing Director commands still own committed Calls. Synchronize their
-- versions into current planning consent without rewriting revision snapshots.
create function private.sync_committed_planning_call() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_target_id uuid;
begin
 if current_setting('stagecom.planning_swap',true)='true' then return new; end if;
 select (occurrence->>'planningTargetId')::uuid into v_target_id
 from shows s join show_proposal_revisions r on r.id=s.approved_proposal_revision_id
 cross join lateral jsonb_array_elements(r.snapshot->'occurrences') occurrence
 where s.id=new.show_id and occurrence->>'id'=new.occurrence_id::text;
 if v_target_id is not null then
  insert into show_planning_calls(target_id,user_id,call,version)
  values(v_target_id,new.user_id,new.call,new.version)
  on conflict(target_id,user_id) do update set call=excluded.call,version=show_planning_calls.version+1;
  perform private.evaluate_event_operational_health(new.show_id,new.actor_user_id,'occurrence_call_changed');
 end if;
 return new;
end;
$$;
revoke all on function private.sync_committed_planning_call() from public,anon,authenticated;
create trigger sync_committed_planning_call after insert or update on public.show_occurrence_calls for each row execute function private.sync_committed_planning_call();
