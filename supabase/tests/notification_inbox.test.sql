begin;

select plan(10);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('79000000-0000-0000-0000-000000000001', 'notification-recipient@stagecom.local', '{"full_name":"Notification Recipient"}'),
  ('79000000-0000-0000-0000-000000000002', 'notification-other-recipient@stagecom.local', '{"full_name":"Other Notification Recipient"}');

select * from public.create_theater_with_owner(
  '79000000-0000-0000-0000-000000000001',
  'Notification Theater',
  'notification-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id,
  '79000000-0000-0000-0000-000000000002',
  array['member']::public.theater_role[],
  'active'::public.membership_status
from public.theaters
where slug = 'notification-theater';

update public.theaters
set producer_eligibility = 'all_members'::public.producer_eligibility_policy
where slug = 'notification-theater';

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'notification-theater'),
  '79000000-0000-0000-0000-000000000001',
  'Notification Event',
  'notification-event',
  array['79000000-0000-0000-0000-000000000002'::uuid],
  null
);

insert into public.notifications (
  id, user_id, type, entity_type, entity_id, payload, dedupe_key
) values
  (
    '79000000-0000-0000-0001-000000000001',
    '79000000-0000-0000-0000-000000000001',
    'event.cast.invited',
    'show'::public.notification_entity,
    (select id from public.shows where slug = 'notification-event'),
    jsonb_build_object(
      'eventId', (select id from public.shows where slug = 'notification-event')
    ),
    'recipient-event-alert'
  ),
  (
    '79000000-0000-0000-0001-000000000002',
    '79000000-0000-0000-0000-000000000002',
    'event.cast.invited',
    'show'::public.notification_entity,
    (select id from public.shows where slug = 'notification-event'),
    jsonb_build_object(
      'eventId', (select id from public.shows where slug = 'notification-event')
    ),
    'other-recipient-event-alert'
  );

select has_function(
  'public', 'set_notification_attention', array['uuid', 'text'],
  'recipient-only Notification attention transition is exposed'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '79000000-0000-0000-0000-000000000001';

select lives_ok(
  $$ select * from public.set_notification_attention(
    '79000000-0000-0000-0001-000000000001', 'read'
  ) $$,
  'a recipient can mark their Notification read'
);

select ok(
  (select read_at is not null and dismissed_at is null
   from public.notifications
   where id = '79000000-0000-0000-0001-000000000001'),
  'marking read changes only the recipient attention state'
);

select lives_ok(
  $$ select * from public.set_notification_attention(
    '79000000-0000-0000-0001-000000000001', 'dismiss'
  ) $$,
  'a recipient can dismiss their Notification'
);

select ok(
  (select read_at is not null and dismissed_at is not null
   from public.notifications
   where id = '79000000-0000-0000-0001-000000000001'),
  'dismissal remains historically distinguishable from unread and read'
);

select lives_ok(
  $$ select * from public.set_notification_attention(
    '79000000-0000-0000-0001-000000000001', 'dismiss'
  ) $$,
  'dismissing the same Notification is idempotent'
);

reset role;

select is(
  (select count(*) from public.notifications
   where id = '79000000-0000-0000-0001-000000000002'
     and read_at is null and dismissed_at is null),
  1::bigint,
  'another recipient retains their own attention state for the shared Event alert'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '79000000-0000-0000-0000-000000000002';

select is(
  (select count(*) from public.shows where slug = 'notification-event'),
  1::bigint,
  'another authorized collaborator still sees the underlying shared Event after dismissal'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = '79000000-0000-0000-0000-000000000001';

select is_empty(
  $$ select * from public.set_notification_attention(
    '79000000-0000-0000-0001-000000000002', 'read'
  ) $$,
  'a recipient cannot mutate another recipient Notification'
);

select throws_ok(
  $$ update public.notifications
     set dismissed_at = null
     where id = '79000000-0000-0000-0001-000000000001' $$,
  '42501',
  'permission denied for table notifications',
  'a recipient cannot bypass the attention transition with a direct update'
);

reset role;

select * from finish();
rollback;
