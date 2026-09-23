create or replace function public.get_event_staff_invitation_response_state(
  p_assignment_id uuid
)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select a.status::text
  from public.show_staff_assignments a
  join public.shows s on s.id = a.show_id
  join public.theater_memberships m
    on m.theater_id = s.theater_id
    and m.user_id = a.user_id
    and m.status = 'active'::public.membership_status
  where a.id = p_assignment_id
    and a.user_id = auth.uid();
$function$;

revoke all on function public.get_event_staff_invitation_response_state(uuid)
  from public, anon, authenticated;
grant execute on function public.get_event_staff_invitation_response_state(uuid)
  to authenticated, service_role;
