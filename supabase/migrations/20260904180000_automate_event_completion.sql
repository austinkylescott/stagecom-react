create extension if not exists pg_cron;

create unique index activity_events_event_completion_failed_once
  on public.activity_events (entity_id)
  where entity_type = 'event'
    and action = 'event.completion.failed';

create or replace function public.complete_due_events(
  p_now timestamptz default now(),
  p_show_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_error_code text;
  v_error_message text;
  v_final_confirmed_slot_ends_at timestamptz;
  v_show public.shows%rowtype;
  v_completed_count integer := 0;
begin
  for v_show in
    select show.*
    from public.shows as show
    where show.lifecycle_status = 'approved'::public.show_lifecycle_status
      and (p_show_id is null or show.id = p_show_id)
      and exists (
        select 1
        from public.show_occurrences as occurrence
        join public.show_candidate_slots as slot
          on slot.id = occurrence.confirmed_candidate_slot_id
        where occurrence.show_id = show.id
      )
      and not exists (
        select 1
        from public.show_occurrences as occurrence
        join public.show_candidate_slots as slot
          on slot.id = occurrence.confirmed_candidate_slot_id
        where occurrence.show_id = show.id
          and slot.starts_at + make_interval(mins => slot.duration_minutes) > p_now
      )
    order by show.id
    for update of show skip locked
  loop
    begin
      if private.transition_event_to_completed(
        v_show.id,
        null,
        null,
        p_now,
        false
      ) then
        v_completed_count := v_completed_count + 1;
      end if;
    exception when others then
      get stacked diagnostics
        v_error_code = returned_sqlstate,
        v_error_message = message_text;

      select max(slot.starts_at + make_interval(mins => slot.duration_minutes))
      into v_final_confirmed_slot_ends_at
      from public.show_occurrences as occurrence
      join public.show_candidate_slots as slot
        on slot.id = occurrence.confirmed_candidate_slot_id
      where occurrence.show_id = v_show.id;

      insert into public.activity_events (
        theater_id,
        entity_type,
        entity_id,
        actor_user_id,
        action,
        visibility,
        payload,
        created_at
      ) values (
        v_show.theater_id,
        'event',
        v_show.id,
        null,
        'event.completion.failed',
        'admin_only'::public.activity_visibility,
        jsonb_strip_nulls(jsonb_build_object(
          'errorCode', v_error_code,
          'errorMessage', v_error_message,
          'evaluatedAt', p_now,
          'finalConfirmedSlotEndsAt', v_final_confirmed_slot_ends_at
        )),
        p_now
      )
      on conflict (entity_id)
        where entity_type = 'event'
          and action = 'event.completion.failed'
      do update set payload = excluded.payload;
    end;
  end loop;

  return v_completed_count;
end;
$function$;

select cron.schedule(
  'stagecom-complete-due-events',
  '* * * * *',
  $$select public.complete_due_events(now(), null)$$
);

revoke all on function public.complete_due_events(timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_due_events(timestamptz, uuid)
  to service_role;
