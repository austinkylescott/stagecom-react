begin;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('98000000-0000-0000-0000-000000000001', 'schedule-block-owner@stagecom.local', '{"full_name":"Schedule Block Owner"}'),
  ('98000000-0000-0000-0000-000000000002', 'schedule-block-member@stagecom.local', '{"full_name":"Schedule Block Member"}');

select * from public.create_theater_with_owner(
  '98000000-0000-0000-0000-000000000001', 'Schedule Block Theater',
  'schedule-block-theater', 'America/New_York'
);

update public.theaters set setup_buffer_minutes = 30, turnover_buffer_minutes = 30
where slug = 'schedule-block-theater';

insert into public.theater_memberships (theater_id, user_id, roles, status)
select id, '98000000-0000-0000-0000-000000000002', array['member']::public.theater_role[], 'active'
from public.theaters where slug = 'schedule-block-theater';

select lives_ok(
  $$ select public.create_schedule_block(
    (select id from public.theaters where slug = 'schedule-block-theater'),
    '98000000-0000-0000-0000-000000000001',
    '98000000-0000-0000-0000-000000000011',
    '2026-12-10T19:00:00Z', '2026-12-10T21:00:00Z', 'Lighting maintenance', 'Replace gels'
  ) $$,
  'an Operator creates a Schedule Block'
);

select is((select state::text from public.schedule_blocks where private_label = 'Lighting maintenance'), 'active', 'the block is active');
select is((select count(*) from public.schedule_block_history), 1::bigint, 'creation is factual history');
select is((select count(*) from public.show_schedule_reservations where kind = 'schedule_block' and status = 'active'), 1::bigint, 'the block reserves the shared resource truth');

select is(
  (select id from public.create_schedule_block(
    (select id from public.theaters where slug = 'schedule-block-theater'),
    '98000000-0000-0000-0000-000000000001',
    '98000000-0000-0000-0000-000000000011',
    '2026-12-10T19:00:00Z', '2026-12-10T21:00:00Z', 'ignored retry', null
  )),
  (select schedule_block_id from public.schedule_block_history where command_id = '98000000-0000-0000-0000-000000000011'),
  'an identical command id is idempotent'
);

select throws_ok(
  $$ select public.create_schedule_block(
    (select id from public.theaters where slug = 'schedule-block-theater'),
    '98000000-0000-0000-0000-000000000001',
    '98000000-0000-0000-0000-000000000012',
    '2026-12-10T18:45:00Z', '2026-12-10T19:30:00Z', 'Overlapping rental', null
  ) $$,
  '55000', 'The Primary Venue is already reserved during this buffered time.',
  'buffered Schedule Blocks cannot overlap'
);

select throws_ok(
  $$ select public.create_schedule_block(
    (select id from public.theaters where slug = 'schedule-block-theater'),
    '98000000-0000-0000-0000-000000000002',
    '98000000-0000-0000-0000-000000000013',
    '2026-12-11T19:00:00Z', '2026-12-11T21:00:00Z', 'Unauthorized', null
  ) $$,
  '42501', 'Current Theater Operator access is required.',
  'a Member cannot create a Schedule Block'
);

select lives_ok(
  $$ select public.change_schedule_block(
    (select id from public.schedule_blocks where private_label = 'Lighting maintenance'),
    '98000000-0000-0000-0000-000000000001',
    '98000000-0000-0000-0000-000000000014', 1, 'released'
  ) $$,
  'an Operator releases a Schedule Block'
);

select is((select status::text from public.show_schedule_reservations where kind = 'schedule_block'), 'released', 'release frees the resource truth');

select * from finish();
rollback;
