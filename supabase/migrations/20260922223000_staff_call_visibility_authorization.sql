create or replace function public.is_accepted_event_staff(p_show_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.show_staff_assignments as assignment
    join public.shows as show_record on show_record.id = assignment.show_id
    join public.theater_memberships as membership
      on membership.theater_id = show_record.theater_id
      and membership.user_id = assignment.user_id
      and membership.status = 'active'::public.membership_status
    where assignment.show_id = p_show_id
      and assignment.user_id = (select auth.uid())
      and assignment.status = 'accepted'
  );
$function$;

revoke all on function public.is_accepted_event_staff(uuid)
  from public, anon;
grant execute on function public.is_accepted_event_staff(uuid)
  to authenticated, service_role;

drop policy if exists "occurrence_calls_select_collaborative"
  on public.show_occurrence_calls;
create policy "occurrence_calls_select_collaborative"
on public.show_occurrence_calls
for select
to authenticated
using (
  public.can_view_event_coordination(show_id, (select auth.uid()))
  or (
    user_id = (select auth.uid())
    and public.is_accepted_event_staff(show_id)
  )
);
