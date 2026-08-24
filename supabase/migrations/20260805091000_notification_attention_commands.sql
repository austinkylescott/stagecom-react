create or replace function public.set_notification_attention(
  p_notification_id uuid,
  p_action text
)
returns table (
  id uuid,
  read_at timestamptz,
  dismissed_at timestamptz
)
language plpgsql
security invoker
set search_path to 'public'
as $function$
begin
  if p_action not in ('read', 'dismiss') then
    raise exception 'Notification action must be read or dismiss.'
      using errcode = '22023';
  end if;

  return query
  update public.notifications as notification
  set
    read_at = coalesce(notification.read_at, now()),
    dismissed_at = case
      when p_action = 'dismiss' then coalesce(notification.dismissed_at, now())
      else notification.dismissed_at
    end
  where notification.id = p_notification_id
    and notification.user_id = auth.uid()
  returning notification.id, notification.read_at, notification.dismissed_at;
end;
$function$;

revoke all on function public.set_notification_attention(uuid, text)
  from public, anon;
grant execute on function public.set_notification_attention(uuid, text)
  to authenticated;
