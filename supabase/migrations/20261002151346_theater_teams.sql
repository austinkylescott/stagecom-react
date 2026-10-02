create table public.theater_teams (
  id uuid primary key,
  theater_id uuid not null references public.theaters(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  owner_user_id uuid not null references public.profiles(id),
  state text not null default 'active' check (state in ('active','dissolved')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  unique(id,theater_id)
);
create table public.team_memberships (
  team_id uuid not null,
  theater_id uuid not null,
  user_id uuid not null,
  state text not null check (state in ('pending','accepted','declined','left')),
  invited_by uuid not null references public.profiles(id),
  joined_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(team_id,user_id),
  foreign key(team_id,theater_id) references public.theater_teams(id,theater_id) on delete cascade,
  foreign key(theater_id,user_id) references public.theater_memberships(theater_id,user_id)
);
create index team_memberships_theater_user on public.team_memberships(theater_id,user_id);
create index theater_teams_theater on public.theater_teams(theater_id);
create table public.team_commands (
  id uuid primary key,
  theater_id uuid not null references public.theaters(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  request jsonb not null,
  result jsonb not null
);
alter table public.theater_teams enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_commands enable row level security;
revoke all on public.theater_teams,public.team_memberships,public.team_commands from anon,authenticated;
grant all on public.theater_teams,public.team_memberships,public.team_commands to service_role;

-- Authenticated projection is the private read boundary; no direct client table access.
create function public.get_team_workspace(p_theater_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.theater_memberships where theater_id=p_theater_id and user_id=auth.uid() and status='active') then
  raise insufficient_privilege using message='Active Theater membership is required.';
 end if;
 select jsonb_build_object('actorId',auth.uid(),'teams',coalesce(jsonb_agg(jsonb_build_object(
  'id',t.id,'name',t.name,'ownerId',t.owner_user_id,'version',t.version,
  'ownerEligible',exists(select 1 from public.theater_memberships where theater_id=t.theater_id and user_id=t.owner_user_id and status='active'),
  'memberIds',(select coalesce(jsonb_agg(m.user_id order by m.joined_at,m.user_id),'[]') from public.team_memberships m join public.theater_memberships tm on tm.theater_id=m.theater_id and tm.user_id=m.user_id and tm.status='active' where m.team_id=t.id and m.state='accepted'),
  'invitations',(select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'inviterId',m.invited_by)),'[]') from public.team_memberships m join public.theater_memberships tm on tm.theater_id=m.theater_id and tm.user_id=m.user_id and tm.status='active' where m.team_id=t.id and m.state='pending' and (t.owner_user_id=auth.uid() or m.user_id=auth.uid()))
 ) order by t.name,t.id),'[]')) into result from public.theater_teams t where t.theater_id=p_theater_id and t.state='active';
 return result;
end; $$;

create function public.manage_team(p_theater_id uuid,p_action text,p_input jsonb,p_command_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); t public.theater_teams; receipt public.team_commands; result jsonb; request jsonb:=jsonb_build_object('theaterId',p_theater_id,'action',p_action,'input',p_input); v_team_id uuid; recipient uuid;
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
  if p_action='invite' then
   if t.owner_user_id<>actor then raise insufficient_privilege using message='Only the Team Owner can invite Members.'; end if;
   recipient:=(p_input->>'memberUserId')::uuid;
   if recipient is null or not exists(select 1 from public.theater_memberships where theater_id=p_theater_id and user_id=recipient and status='active') then raise invalid_parameter_value using message='Choose an active Theater Member.'; end if;
   if exists(select 1 from public.team_memberships where team_memberships.team_id=t.id and user_id=recipient and state in ('pending','accepted')) then raise object_not_in_prerequisite_state using message='This Member already belongs to the Team or has a pending invitation.'; end if;
   insert into public.team_memberships(team_id,theater_id,user_id,state,invited_by) values(t.id,p_theater_id,recipient,'pending',actor)
    on conflict (team_id,user_id) do update set state='pending',invited_by=actor,joined_at=null,updated_at=now();
  elsif p_action='respond' then
   if p_input->>'response'='accepted' and not exists(select 1 from public.theater_memberships where theater_id=p_theater_id and user_id=t.owner_user_id and status='active') then raise object_not_in_prerequisite_state using message='Team ownership needs recovery before invitations can be accepted.'; end if;
   if p_input->>'response' is null or p_input->>'response' not in ('accepted','declined') then raise invalid_parameter_value using message='Accept or decline this invitation.'; end if;
   update public.team_memberships set state=p_input->>'response',joined_at=case when p_input->>'response'='accepted' then now() else null end,updated_at=now() where team_memberships.team_id=t.id and user_id=actor and state='pending';
   if not found then raise insufficient_privilege using message='Only the pending recipient can respond.'; end if;
  elsif p_action='leave' then
   if not exists(select 1 from public.team_memberships where team_memberships.team_id=t.id and user_id=actor and state='accepted') then raise insufficient_privilege using message='Only an accepted Team Member can leave themselves.'; end if;
   -- Count historical accepted memberships too: loss of Theater access does not
   -- authorize silent succession or dissolution. STA-72 supplies recovery.
   if t.owner_user_id=actor then
    if exists(select 1 from public.team_memberships where team_memberships.team_id=t.id and user_id<>actor and state='accepted') then raise object_not_in_prerequisite_state using message='Transfer ownership with successor consent before leaving. Ownership transfer is coming in the Team administration workflow.'; end if;
    update public.theater_teams set state='dissolved' where id=t.id;
    update public.team_memberships set state='declined',updated_at=now() where team_memberships.team_id=t.id and state='pending';
   end if;
   update public.team_memberships set state='left',updated_at=now() where team_memberships.team_id=t.id and user_id=actor;
  else
   raise invalid_parameter_value using message='Unknown Team action.';
  end if;
  update public.theater_teams set version=version+1 where id=t.id;
 end if;
 result:=jsonb_build_object('teamId',v_team_id);
 insert into public.team_commands values(p_command_id,p_theater_id,actor,request,result);
 insert into public.activity_events(id,theater_id,entity_type,entity_id,actor_user_id,action,payload) values(p_command_id,p_theater_id,'team',v_team_id,actor,'team.'||p_action,p_input);
 return result;
end; $$;
revoke all on function public.get_team_workspace(uuid),public.manage_team(uuid,text,jsonb,uuid) from public,anon;
grant execute on function public.get_team_workspace(uuid),public.manage_team(uuid,text,jsonb,uuid) to authenticated;
