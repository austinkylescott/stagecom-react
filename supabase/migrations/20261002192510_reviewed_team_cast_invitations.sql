-- Private server-owned reviews; no direct client table access.
create table public.team_cast_reviews (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  selection jsonb not null,
  snapshot jsonb not null,
  sent_result jsonb,
  created_at timestamptz not null default now()
);
alter table public.team_cast_reviews enable row level security;
revoke all on public.team_cast_reviews from public, anon, authenticated;
grant all on public.team_cast_reviews to service_role;

create function public.team_cast_review_snapshot(p_show_id uuid, p_selection jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare theater uuid; result jsonb;
begin
 select theater_id into theater from public.shows where id=p_show_id;
 with selected as (
   select (s->>'teamId')::uuid team_id, s->'memberIds' member_ids
   from jsonb_array_elements(p_selection) s
 ), teams as (
   select s.*,t.name,t.state,
     coalesce((select jsonb_agg(m.user_id order by m.user_id)
       from public.team_memberships m
       join public.theater_memberships tm on tm.theater_id=m.theater_id and tm.user_id=m.user_id and tm.status='active'
       where m.team_id=s.team_id and m.state='accepted' and t.state='active'), '[]'::jsonb) current_members
   from selected s left join public.theater_teams t on t.id=s.team_id and t.theater_id=theater
 ), selected_people as (
   select t.team_id,(person #>> '{}')::uuid user_id
   from teams t cross join lateral jsonb_array_elements(
     case when t.member_ids='null'::jsonb then t.current_members else t.member_ids end
   ) person
 ), recipients as (
   select p.user_id,profile.display_name,
     case when tm.status is distinct from 'active'::public.membership_status then 'ineligible'
       when not exists(select 1 from selected_people sp join teams t on t.team_id=sp.team_id
         where sp.user_id=p.user_id and t.current_members @> jsonb_build_array(p.user_id)) then 'not_in_team'
       when c.user_id is not null then c.status::text else 'eligible' end status
   from (select distinct user_id from selected_people) p
   join public.profiles profile on profile.id=p.user_id
   left join public.theater_memberships tm on tm.theater_id=theater and tm.user_id=p.user_id
   left join public.show_cast c on c.show_id=p_show_id and c.user_id=p.user_id
 )
 select jsonb_build_object(
   'teams',coalesce((select jsonb_agg(jsonb_build_object('teamId',team_id,'name',name,'state',state,'memberIds',current_members) order by team_id) from teams),'[]'::jsonb),
   'recipients',coalesce((select jsonb_agg(jsonb_build_object('userId',user_id,'displayName',display_name,'status',status) order by display_name,user_id) from recipients),'[]'::jsonb)
 ) into result;
 return result;
end; $$;
revoke all on function public.team_cast_review_snapshot(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.team_cast_review_snapshot(uuid,jsonb) to service_role;

create function public.authorize_team_cast_review(p_show_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare theater uuid; lifecycle public.show_lifecycle_status;
begin
 select theater_id,lifecycle_status into theater,lifecycle from public.shows where id=p_show_id;
 if not found then raise no_data_found using message='Event was not found.'; end if;
 if auth.uid() is null or not exists(
   select 1 from public.show_leadership l join public.theater_memberships m
   on m.theater_id=theater and m.user_id=l.user_id and m.status='active'
   where l.show_id=p_show_id and l.user_id=auth.uid()
 ) then raise insufficient_privilege using message='Active Event leader access is required to invite Cast Members.'; end if;
 if lifecycle in ('cancelled','completed') then
   raise object_not_in_prerequisite_state using message='This Event is closed to Cast invitations.';
 end if;
 return theater;
end; $$;
revoke all on function public.authorize_team_cast_review(uuid) from public,anon,authenticated;
grant execute on function public.authorize_team_cast_review(uuid) to service_role;

create function public.review_team_cast_invitations(p_show_id uuid,p_selection jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare theater uuid; review public.team_cast_reviews; selected jsonb;
begin
 theater:=public.authorize_team_cast_review(p_show_id);
 if p_selection is null or jsonb_typeof(p_selection)<>'array' or jsonb_array_length(p_selection) not between 1 and 100 then
   raise invalid_parameter_value using message='Select at least one Team or subset.';
 end if;
 for selected in select * from jsonb_array_elements(p_selection) loop
   if not exists(select 1 from public.theater_teams where id=(selected->>'teamId')::uuid and theater_id=theater) or
     selected->'memberIds' is null or (selected->'memberIds'<>'null'::jsonb and jsonb_typeof(selected->'memberIds')<>'array') then
     raise invalid_parameter_value using message='Choose Teams from this Theater.';
   end if;
   if selected->'memberIds'<>'null'::jsonb and exists(
     select 1 from jsonb_array_elements_text(selected->'memberIds') person
     where not exists(select 1 from public.team_memberships where team_id=(selected->>'teamId')::uuid and user_id=person::uuid)
   ) then raise invalid_parameter_value using message='Choose Members of the selected Team.'; end if;
 end loop;
 insert into public.team_cast_reviews(show_id,actor_id,selection,snapshot)
 values(p_show_id,auth.uid(),p_selection,public.team_cast_review_snapshot(p_show_id,p_selection)) returning * into review;
 return jsonb_build_object('reviewId',review.id,'snapshot',review.snapshot);
end; $$;
revoke all on function public.review_team_cast_invitations(uuid,jsonb) from public,anon;
grant execute on function public.review_team_cast_invitations(uuid,jsonb) to authenticated,service_role;

create function public.send_team_cast_invitations(p_review_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare review public.team_cast_reviews; theater uuid; current_snapshot jsonb; recipient jsonb; result jsonb; refreshed jsonb;
begin
 select * into review from public.team_cast_reviews where id=p_review_id;
 if not found then raise no_data_found using message='Cast review was not found.'; end if;
 if review.actor_id is distinct from auth.uid() then raise insufficient_privilege using message='Only the reviewing Event leader can send this batch.'; end if;
 theater:=public.authorize_team_cast_review(review.show_id);
 -- Match Team commands and Theater deactivation: membership before Team.
 perform 1 from public.theater_memberships where theater_id=theater order by user_id for share;
 perform 1 from public.theater_teams where id in (select (s->>'teamId')::uuid from jsonb_array_elements(review.selection) s) order by id for update;
 perform 1 from public.shows where id=review.show_id for update;
 perform 1 from public.show_cast where show_id=review.show_id order by user_id for update;
 -- Keep the names that were reviewed stable through the send transaction.
 perform 1 from public.profiles where id in (select (r->>'userId')::uuid from jsonb_array_elements(review.snapshot->'recipients') r) order by id for share;
 perform public.authorize_team_cast_review(review.show_id);
 select * into review from public.team_cast_reviews where id=p_review_id for update;
 if review.sent_result is not null then return review.sent_result; end if;
 current_snapshot:=public.team_cast_review_snapshot(review.show_id,review.selection);
 if current_snapshot<>review.snapshot then
   refreshed:=public.review_team_cast_invitations(review.show_id,review.selection);
   return jsonb_build_object('state','refreshed','review',refreshed,'message','Team membership, names or Cast eligibility changed. No invitations were sent. Review the refreshed named recipients before sending again.');
 end if;
 if not exists(select 1 from jsonb_array_elements(current_snapshot->'recipients') r where r->>'status'='eligible') then
   raise invalid_parameter_value using message='No eligible recipients remain. Choose another Team or subset.';
 end if;
 for recipient in select * from jsonb_array_elements(current_snapshot->'recipients') r where r->>'status'='eligible' loop
   perform public.invite_event_cast_member(review.show_id,auth.uid(),(recipient->>'userId')::uuid);
 end loop;
 result:=jsonb_build_object('state','sent','recipientIds',(select jsonb_agg(r->'userId') from jsonb_array_elements(current_snapshot->'recipients') r where r->>'status'='eligible'));
 update public.team_cast_reviews set sent_result=result where id=p_review_id;
 return result;
end; $$;
revoke all on function public.send_team_cast_invitations(uuid) from public,anon;
grant execute on function public.send_team_cast_invitations(uuid) to authenticated,service_role;

create function public.get_cast_team_options(p_show_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 return public.get_team_workspace(public.authorize_team_cast_review(p_show_id));
end; $$;
revoke all on function public.get_cast_team_options(uuid) from public,anon;
grant execute on function public.get_cast_team_options(uuid) to authenticated,service_role;
