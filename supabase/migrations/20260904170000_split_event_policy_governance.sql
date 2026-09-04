create or replace function public.update_theater_event_policy(
  p_theater_id uuid,
  p_actor_user_id uuid,
  p_producer_eligibility public.producer_eligibility_policy,
  p_owner_self_approval_enabled boolean,
  p_counteroffer_response_hours integer
)
returns setof public.theaters
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_before public.theaters%rowtype;
  v_after public.theaters%rowtype;
begin
  if not exists (
    select 1
    from public.theater_memberships as membership
    where membership.theater_id = p_theater_id
      and membership.user_id = p_actor_user_id
      and membership.status = 'active'::public.membership_status
      and (
        'owner'::public.theater_role = any(membership.roles)
        or 'admin'::public.theater_role = any(membership.roles)
      )
  ) then
    raise insufficient_privilege using message = 'Owner or Admin access is required.';
  end if;

  select * into v_before from public.theaters where id = p_theater_id for update;
  if not found then return; end if;

  update public.theaters
  set
    producer_eligibility = p_producer_eligibility,
    owner_self_approval_enabled = p_owner_self_approval_enabled,
    counteroffer_response_hours = p_counteroffer_response_hours
  where id = p_theater_id
  returning * into v_after;

  if row(
    v_before.producer_eligibility,
    v_before.owner_self_approval_enabled,
    v_before.counteroffer_response_hours
  ) is distinct from row(
    v_after.producer_eligibility,
    v_after.owner_self_approval_enabled,
    v_after.counteroffer_response_hours
  ) then
    insert into public.activity_events (
      theater_id, entity_type, entity_id, actor_user_id, action, visibility, payload
    ) values (
      p_theater_id, 'theater', p_theater_id, p_actor_user_id,
      'theater.event_policy.updated', 'member_visible'::public.activity_visibility,
      jsonb_build_object(
        'producerEligibility', v_after.producer_eligibility,
        'ownerSelfApprovalEnabled', v_after.owner_self_approval_enabled,
        'counterofferResponseHours', v_after.counteroffer_response_hours
      )
    );
  end if;

  return next v_after;
end;
$function$;

revoke all on function public.update_theater_event_policy(uuid, uuid, public.producer_eligibility_policy, boolean, integer) from public;
grant execute on function public.update_theater_event_policy(uuid, uuid, public.producer_eligibility_policy, boolean, integer) to service_role;
