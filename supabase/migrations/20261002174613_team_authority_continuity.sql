alter table public.theater_teams add column recovery_user_id uuid references public.profiles(id), add column recovery_accepted boolean not null default false;
alter table public.theater_teams add column successor_user_id uuid references public.profiles(id), add column transfer_departure boolean not null default false;
alter table public.team_memberships add column admin_state text not null default 'none' check (admin_state in ('none','pending','accepted'));
alter table public.team_memberships add constraint team_admin_requires_accepted_membership check (state='accepted' or admin_state='none');
alter table public.theater_teams add constraint recovery_acceptance_requires_nominee check (not recovery_accepted or recovery_user_id is not null);

create or replace function public.get_team_workspace(p_theater_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.theater_memberships where theater_id=p_theater_id and user_id=auth.uid() and status='active') then
  raise insufficient_privilege using message='Active Theater membership is required.';
 end if;
 select jsonb_build_object('actorId',auth.uid(),'teams',coalesce(jsonb_agg(jsonb_build_object(
  'id',t.id,'name',t.name,'ownerId',t.owner_user_id,'version',t.version,
  'recovery',case when t.recovery_user_id is null then null else jsonb_build_object('userId',t.recovery_user_id,'accepted',t.recovery_accepted) end,
  'transfer',case when t.successor_user_id is null then null else jsonb_build_object('userId',t.successor_user_id,'depart',t.transfer_departure) end,
  'ownerEligible',exists(select 1 from public.theater_memberships where theater_id=t.theater_id and user_id=t.owner_user_id and status='active'),
  'adminIds',(select coalesce(jsonb_agg(m.user_id order by m.user_id),'[]') from public.team_memberships m where m.team_id=t.id and m.state='accepted' and m.admin_state='accepted'),
  'adminInvitationIds',(select coalesce(jsonb_agg(m.user_id order by m.user_id),'[]') from public.team_memberships m where m.team_id=t.id and m.state='accepted' and m.admin_state='pending' and (t.owner_user_id=auth.uid() or m.user_id=auth.uid() or exists(select 1 from public.team_memberships a where a.team_id=t.id and a.user_id=auth.uid() and a.state='accepted' and a.admin_state='accepted'))),
  'memberIds',(select coalesce(jsonb_agg(m.user_id order by m.joined_at,m.user_id),'[]') from public.team_memberships m join public.theater_memberships tm on tm.theater_id=m.theater_id and tm.user_id=m.user_id and tm.status='active' where m.team_id=t.id and m.state='accepted'),
  'invitations',(select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'inviterId',m.invited_by)),'[]') from public.team_memberships m join public.theater_memberships tm on tm.theater_id=m.theater_id and tm.user_id=m.user_id and tm.status='active' where m.team_id=t.id and m.state='pending' and (t.owner_user_id=auth.uid() or m.user_id=auth.uid() or exists(select 1 from public.team_memberships a where a.team_id=t.id and a.user_id=auth.uid() and a.state='accepted' and a.admin_state='accepted')))
 ) order by t.name,t.id),'[]')) into result from public.theater_teams t where t.theater_id=p_theater_id and t.state='active';
 return result;
end; $$;

create or replace function public.manage_team(p_theater_id uuid,p_action text,p_input jsonb,p_command_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); t public.theater_teams; receipt public.team_commands; result jsonb; request jsonb:=jsonb_build_object('theaterId',p_theater_id,'action',p_action,'input',p_input); v_team_id uuid; recipient uuid; is_admin boolean;
begin
 if actor is null then raise insufficient_privilege using message='Sign in is required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_command_id::text,0));
 -- Lock membership before Team, matching deactivation's membership-first order.
 perform 1 from public.theater_memberships where theater_id=p_theater_id order by user_id for share;
 if not exists(select 1 from public.theater_memberships where theater_id=p_theater_id and user_id=actor and status='active') then raise insufficient_privilege using message='Active Theater membership is required.'; end if;
 select * into receipt from public.team_commands where id=p_command_id;
 if found then
  if receipt.actor_id<>actor or receipt.request<>request then raise invalid_parameter_value using message='Command identity was already used for different input.'; end if;
  return receipt.result;
 end if;
 if p_action='create' then
  if p_input->>'name' is null or length(btrim(p_input->>'name')) not between 1 and 80 then raise invalid_parameter_value using message='Team name must contain 1 to 80 characters.'; end if;
  v_team_id:=p_command_id;
  insert into public.theater_teams(id,theater_id,name,owner_user_id) values(v_team_id,p_theater_id,btrim(p_input->>'name'),actor);
  insert into public.team_memberships(team_id,theater_id,user_id,state,invited_by,joined_at) values(v_team_id,p_theater_id,actor,'accepted',actor,now());
 else
  v_team_id:=(p_input->>'teamId')::uuid;
  select * into t from public.theater_teams where id=v_team_id and theater_id=p_theater_id for update;
  if not found then raise no_data_found using message='Team was not found.'; end if;
  if t.state<>'active' then raise object_not_in_prerequisite_state using message='This Team has dissolved. Refresh Teams.'; end if;
  if (p_input->>'expectedVersion')::integer is distinct from t.version then raise object_not_in_prerequisite_state using message='This Team changed. Refresh Teams and review your action.'; end if;
  is_admin:=exists(select 1 from public.team_memberships where team_id=t.id and user_id=actor and state='accepted' and admin_state='accepted');
  if p_action='invite' then
   if t.owner_user_id<>actor and not is_admin then raise insufficient_privilege using message='Only the Team Owner or accepted Admin can invite Members.'; end if;
   recipient:=(p_input->>'memberUserId')::uuid;
   if recipient is null or not exists(select 1 from public.theater_memberships where theater_id=p_theater_id and user_id=recipient and status='active') then raise invalid_parameter_value using message='Choose an active Theater Member.'; end if;
   if exists(select 1 from public.team_memberships where team_memberships.team_id=t.id and user_id=recipient and state in ('pending','accepted')) then raise object_not_in_prerequisite_state using message='This Member already belongs to the Team or has a pending invitation.'; end if;
   insert into public.team_memberships(team_id,theater_id,user_id,state,invited_by) values(t.id,p_theater_id,recipient,'pending',actor)
    on conflict (team_id,user_id) do update set state='pending',admin_state='none',invited_by=actor,joined_at=null,updated_at=now();
  elsif p_action='respond' then
   if p_input->>'response'='accepted' and not exists(select 1 from public.theater_memberships where theater_id=p_theater_id and user_id=t.owner_user_id and status='active') then raise object_not_in_prerequisite_state using message='Team ownership needs recovery before invitations can be accepted.'; end if;
   if p_input->>'response' is null or p_input->>'response' not in ('accepted','declined') then raise invalid_parameter_value using message='Accept or decline this invitation.'; end if;
   update public.team_memberships set state=p_input->>'response',joined_at=case when p_input->>'response'='accepted' then now() else null end,updated_at=now() where team_memberships.team_id=t.id and user_id=actor and state='pending';
   if not found then raise insufficient_privilege using message='Only the pending recipient can respond.'; end if;
  elsif p_action='offer_admin' then
   if t.owner_user_id<>actor then raise insufficient_privilege using message='Only the Team Owner can offer Admin authority.'; end if;
   recipient:=(p_input->>'memberUserId')::uuid;
   update public.team_memberships set admin_state='pending',updated_at=now() where team_id=t.id and user_id=recipient and user_id<>actor and state='accepted' and admin_state='none';
   if not found then raise invalid_parameter_value using message='Choose an ordinary accepted Team Member.'; end if;
  elsif p_action='respond_admin' then
   if p_input->>'response' is null or p_input->>'response' not in ('accepted','declined') then raise invalid_parameter_value using message='Accept or decline Admin authority.'; end if;
   update public.team_memberships set admin_state=case when p_input->>'response'='accepted' then 'accepted' else 'none' end,updated_at=now() where team_id=t.id and user_id=actor and state='accepted' and admin_state='pending';
   if not found then raise insufficient_privilege using message='Only the pending Admin recipient can respond.'; end if;
  elsif p_action='rename' then
   if t.owner_user_id<>actor and not is_admin then raise insufficient_privilege using message='Only the Team Owner or accepted Admin can rename the Team.'; end if;
   if p_input->>'name' is null or length(btrim(p_input->>'name')) not between 1 and 80 then raise invalid_parameter_value using message='Team name must contain 1 to 80 characters.'; end if;
   update public.theater_teams set name=btrim(p_input->>'name') where id=t.id;
  elsif p_action in ('remove_admin','relinquish_admin') then
   if p_action='remove_admin' then
    if t.owner_user_id<>actor then raise insufficient_privilege using message='Only the Team Owner can remove Admin authority.'; end if;
    recipient:=(p_input->>'memberUserId')::uuid;
   else
    recipient:=actor;
   end if;
   update public.team_memberships set admin_state='none',updated_at=now() where team_id=t.id and user_id=recipient and state='accepted' and admin_state in ('pending','accepted');
   if not found then raise object_not_in_prerequisite_state using message='Admin authority changed. Refresh Teams.'; end if;
  elsif p_action='remove' then
   if t.owner_user_id<>actor and not is_admin then raise insufficient_privilege using message='Only the Team Owner or accepted Admin can remove Members.'; end if;
   recipient:=(p_input->>'memberUserId')::uuid;
   if recipient=actor or recipient=t.owner_user_id or exists(select 1 from public.team_memberships where team_id=t.id and user_id=recipient and admin_state<>'none') then raise insufficient_privilege using message='Only ordinary other Members can be removed. Remove Admin authority first.'; end if;
   update public.team_memberships set state='left',admin_state='none',updated_at=now() where team_id=t.id and user_id=recipient and state='accepted';
   if not found then raise object_not_in_prerequisite_state using message='Team membership changed. Refresh Teams.'; end if;
  elsif p_action='offer_recovery' then
   if t.owner_user_id<>actor then raise insufficient_privilege using message='Only the Team Owner can choose a recovery nominee.'; end if;
   recipient:=(p_input->>'memberUserId')::uuid;
   if recipient is null or recipient=actor or not exists(select 1 from public.team_memberships where team_id=t.id and user_id=recipient and state='accepted') then raise invalid_parameter_value using message='Choose another accepted Team Member.'; end if;
   update public.theater_teams set recovery_user_id=recipient,recovery_accepted=false where id=t.id;
  elsif p_action='cancel_recovery' then
   if t.owner_user_id<>actor then raise insufficient_privilege using message='Only the Team Owner can clear a recovery nomination.'; end if;
   if t.recovery_user_id is null then raise object_not_in_prerequisite_state using message='Recovery nomination changed. Refresh Teams.'; end if;
   update public.theater_teams set recovery_user_id=null,recovery_accepted=false where id=t.id;
  elsif p_action='respond_recovery' then
   if t.recovery_user_id is distinct from actor or t.recovery_accepted or not exists(select 1 from public.team_memberships where team_id=t.id and user_id=actor and state='accepted') then raise insufficient_privilege using message='Only the pending recovery nominee can respond.'; end if;
   if p_input->>'response' is null or p_input->>'response' not in ('accepted','declined') then raise invalid_parameter_value using message='Accept or decline recovery nomination.'; end if;
   update public.theater_teams set recovery_user_id=case when p_input->>'response'='accepted' then actor else null end,recovery_accepted=(p_input->>'response'='accepted') where id=t.id;
  elsif p_action='offer_transfer' then
   if t.owner_user_id<>actor then raise insufficient_privilege using message='Only the Team Owner can offer ownership.'; end if;
   recipient:=(p_input->>'memberUserId')::uuid;
   if recipient is null or recipient=actor or not exists(select 1 from public.team_memberships where team_id=t.id and user_id=recipient and state='accepted') then raise invalid_parameter_value using message='Choose another accepted Team Member.'; end if;
   if p_input->>'depart' is null or p_input->>'depart' not in ('true','false') then raise invalid_parameter_value using message='Choose whether to depart on acceptance.'; end if;
   update public.theater_teams set successor_user_id=recipient,transfer_departure=(p_input->>'depart')::boolean where id=t.id;
  elsif p_action='cancel_transfer' then
   if t.owner_user_id<>actor then raise insufficient_privilege using message='Only the Team Owner can cancel ownership offers.'; end if;
   if t.successor_user_id is null then raise object_not_in_prerequisite_state using message='Ownership offer changed. Refresh Teams.'; end if;
   update public.theater_teams set successor_user_id=null,transfer_departure=false where id=t.id;
  elsif p_action='respond_transfer' then
   if t.successor_user_id is distinct from actor or not exists(select 1 from public.team_memberships where team_id=t.id and user_id=actor and state='accepted') then raise insufficient_privilege using message='Only the chosen successor can respond.'; end if;
   if p_input->>'response' is null or p_input->>'response' not in ('accepted','declined') then raise invalid_parameter_value using message='Accept or decline ownership.'; end if;
   if p_input->>'response'='accepted' then
    update public.theater_teams set owner_user_id=actor,recovery_user_id=null,recovery_accepted=false where id=t.id;
    update public.team_memberships set admin_state='none',updated_at=now() where team_id=t.id and user_id in (actor,t.owner_user_id);
    if t.transfer_departure then update public.team_memberships set state='left',updated_at=now() where team_id=t.id and user_id=t.owner_user_id; end if;
   end if;
   update public.theater_teams set successor_user_id=null,transfer_departure=false where id=t.id;
  elsif p_action='leave' then
   if not exists(select 1 from public.team_memberships where team_memberships.team_id=t.id and user_id=actor and state='accepted') then raise insufficient_privilege using message='Only an accepted Team Member can leave themselves.'; end if;
   if t.owner_user_id=actor then
    select user_id into recipient from public.team_memberships where team_id=t.id and user_id<>actor and state='accepted' order by joined_at,user_id limit 1;
    if (select count(*) from public.team_memberships where team_id=t.id and user_id<>actor and state='accepted')>1 then raise object_not_in_prerequisite_state using message='Choose a successor and wait for acceptance before leaving.'; end if;
    if recipient is null then
     update public.theater_teams set state='dissolved',recovery_user_id=null,recovery_accepted=false,successor_user_id=null,transfer_departure=false where id=t.id;
     update public.team_memberships set state='declined',admin_state='none',updated_at=now() where team_id=t.id and state='pending';
    else
     update public.theater_teams set owner_user_id=recipient,recovery_user_id=null,recovery_accepted=false,successor_user_id=null,transfer_departure=false where id=t.id;
     update public.team_memberships set admin_state='none',updated_at=now() where team_id=t.id and user_id=recipient;
    end if;
   end if;
   update public.team_memberships set state='left',admin_state='none',updated_at=now() where team_memberships.team_id=t.id and user_id=actor;
  else
   raise invalid_parameter_value using message='Unknown Team action.';
  end if;
  update public.theater_teams set successor_user_id=null,transfer_departure=false where id=t.id and successor_user_id is not null and not exists(select 1 from public.team_memberships m where m.team_id=t.id and m.user_id=successor_user_id and m.state='accepted');
  update public.theater_teams set recovery_user_id=null,recovery_accepted=false where id=t.id and recovery_user_id is not null and not exists(select 1 from public.team_memberships m where m.team_id=t.id and m.user_id=recovery_user_id and m.state='accepted');
  update public.theater_teams set version=version+1 where id=t.id;
 end if;
 result:=jsonb_build_object('teamId',v_team_id);
 insert into public.team_commands values(p_command_id,p_theater_id,actor,request,result);
 insert into public.activity_events(id,theater_id,entity_type,entity_id,actor_user_id,action,payload) values(p_command_id,p_theater_id,'team',v_team_id,actor,'team.'||p_action,p_input);
 return result;
end; $$;
revoke all on function public.get_team_workspace(uuid),public.manage_team(uuid,text,jsonb,uuid) from public,anon;
grant execute on function public.get_team_workspace(uuid),public.manage_team(uuid,text,jsonb,uuid) to authenticated;

-- Internal transition: only invoked by membership lifecycle and migration repair.
create function public.reconcile_team_ownership(p_team_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare t public.theater_teams; successor uuid;
begin
 select * into t from public.theater_teams where id=p_team_id for update;
 if not found or t.state<>'active' then return; end if;
 update public.team_memberships m set state=case when m.state='accepted' then 'left' else 'declined' end,admin_state='none',updated_at=now()
 where m.team_id=t.id and m.state in ('accepted','pending') and not exists(select 1 from public.theater_memberships tm where tm.theater_id=t.theater_id and tm.user_id=m.user_id and tm.status='active');
 if not exists(select 1 from public.team_memberships where team_id=t.id and user_id=t.owner_user_id and state='accepted') then
  select m.user_id into successor from public.team_memberships m
  where m.team_id=t.id and m.state='accepted'
  order by (m.user_id=t.recovery_user_id and t.recovery_accepted) desc,m.joined_at,m.user_id limit 1;
  if successor is null then
   update public.theater_teams set state='dissolved' where id=t.id;
   update public.team_memberships set state='declined',admin_state='none',updated_at=now() where team_id=t.id and state='pending';
  else
   update public.theater_teams set owner_user_id=successor where id=t.id;
   update public.team_memberships set admin_state='none',updated_at=now() where team_id=t.id and user_id=successor;
  end if;
  update public.theater_teams set successor_user_id=null,transfer_departure=false,recovery_user_id=null,recovery_accepted=false where id=t.id;
  insert into public.activity_events(id,theater_id,entity_type,entity_id,actor_user_id,action,payload)
  values(gen_random_uuid(),t.theater_id,'team',t.id,auth.uid(),case when successor is null then 'team.dissolved' else 'team.ownership_recovered' end,jsonb_build_object('previousOwnerId',t.owner_user_id,'successorId',successor,'cause','theater_membership_lost'));
 end if;
 update public.theater_teams set successor_user_id=null,transfer_departure=false where id=t.id and successor_user_id is not null and not exists(select 1 from public.team_memberships m where m.team_id=t.id and m.user_id=successor_user_id and m.state='accepted');
 update public.theater_teams set recovery_user_id=null,recovery_accepted=false where id=t.id and recovery_user_id is not null and not exists(select 1 from public.team_memberships m where m.team_id=t.id and m.user_id=recovery_user_id and m.state='accepted');
 update public.theater_teams set version=version+1 where id=t.id;
end; $$;
revoke all on function public.reconcile_team_ownership(uuid) from public,anon,authenticated;

create function public.recover_teams_on_theater_membership_loss() returns trigger
language plpgsql security definer set search_path='' as $$
declare membership record;
begin
 if old.status='active' and new.status<>'active' then
  for membership in select m.team_id,m.state,m.admin_state from public.team_memberships m join public.theater_teams t on t.id=m.team_id where m.theater_id=new.theater_id and m.user_id=new.user_id and m.state in ('accepted','pending') and t.state='active' order by m.team_id loop
   perform public.reconcile_team_ownership(membership.team_id);
   insert into public.activity_events(id,theater_id,entity_type,entity_id,actor_user_id,action,payload)
   values(gen_random_uuid(),new.theater_id,'team',membership.team_id,auth.uid(),'team.membership_lost',jsonb_build_object('memberUserId',new.user_id,'previousState',membership.state,'previousAdminState',membership.admin_state,'cause','theater_membership_lost'));
  end loop;
 end if;
 return new;
end; $$;
revoke all on function public.recover_teams_on_theater_membership_loss() from public,anon,authenticated;
create trigger recover_teams_after_membership_loss after update of status on public.theater_memberships for each row execute function public.recover_teams_on_theater_membership_loss();

-- Repair pre-existing ineligible memberships using the same deterministic rule.
do $$ declare team_id uuid; begin
 for team_id in select distinct m.team_id from public.team_memberships m join public.theater_memberships tm on tm.theater_id=m.theater_id and tm.user_id=m.user_id where m.state in ('accepted','pending') and tm.status<>'active' order by m.team_id loop
  perform public.reconcile_team_ownership(team_id);
 end loop;
end; $$;

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

  -- Order all membership locks before Team recovery triggers.
  perform 1 from public.theater_memberships m where m.theater_id=p_theater_id order by m.user_id for update;

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
