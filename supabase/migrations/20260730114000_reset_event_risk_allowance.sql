create or replace function public.reset_event_risk_continuation_allowance()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.operational_health = 'on_track'::public.show_operational_health then
    new.at_risk_continuation_allowed := false;
  end if;
  return new;
end;
$function$;

create trigger reset_event_risk_continuation_allowance
before insert or update of operational_health on public.shows
for each row execute procedure public.reset_event_risk_continuation_allowance();
