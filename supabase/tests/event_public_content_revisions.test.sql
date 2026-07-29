begin;

select plan(15);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('74000000-0000-0000-0000-000000000001', 'public-owner@stagecom.local', '{"full_name":"Public Owner"}'),
  ('74000000-0000-0000-0000-000000000002', 'credited-cast@stagecom.local', '{"full_name":"Credited Cast"}'),
  ('74000000-0000-0000-0000-000000000003', 'hidden-cast@stagecom.local', '{"full_name":"Hidden Cast"}');

select * from public.create_theater_with_owner(
  '74000000-0000-0000-0000-000000000001',
  'Public Content Theater',
  'public-content-theater',
  'America/New_York'
);

insert into public.theater_memberships (theater_id, user_id, roles, status)
select
  (select id from public.theaters where slug = 'public-content-theater'),
  member_id,
  array['member']::public.theater_role[],
  'active'::public.membership_status
from unnest(array[
  '74000000-0000-0000-0000-000000000002'::uuid,
  '74000000-0000-0000-0000-000000000003'::uuid
]) as member(member_id);

update public.profiles
set public_cast_credit_preference = id = '74000000-0000-0000-0000-000000000002'
where id in (
  '74000000-0000-0000-0000-000000000002',
  '74000000-0000-0000-0000-000000000003'
);

select * from public.create_managed_event(
  (select id from public.theaters where slug = 'public-content-theater'),
  '74000000-0000-0000-0000-000000000001',
  'Working Event Title',
  'versioned-public-event'
);

select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'versioned-public-event'),
  '74000000-0000-0000-0000-000000000001',
  '74000000-0000-0000-0000-000000000002'
);

select * from public.invite_event_cast_member(
  (select id from public.shows where slug = 'versioned-public-event'),
  '74000000-0000-0000-0000-000000000001',
  '74000000-0000-0000-0000-000000000003'
);

select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'versioned-public-event'),
  '74000000-0000-0000-0000-000000000002',
  'accepted'
);

select * from public.respond_to_event_cast_invitation(
  (select id from public.shows where slug = 'versioned-public-event'),
  '74000000-0000-0000-0000-000000000003',
  'accepted'
);

select results_eq(
  $$
    select user_id, public_credit_enabled
    from public.show_cast
    where show_id = (select id from public.shows where slug = 'versioned-public-event')
    order by user_id
  $$,
  $$ values
    ('74000000-0000-0000-0000-000000000002'::uuid, true),
    ('74000000-0000-0000-0000-000000000003'::uuid, false)
  $$,
  'Event credit settings begin from each Cast Member profile preference'
);

update public.profiles
set public_cast_credit_preference = false
where id = '74000000-0000-0000-0000-000000000002';

select ok(
  (select public_credit_enabled from public.show_cast
   where show_id = (select id from public.shows where slug = 'versioned-public-event')
     and user_id = '74000000-0000-0000-0000-000000000002'),
  'an Event credit preference remains independent after initialization'
);

select lives_ok(
  $$
    select * from public.save_event_public_content_draft(
      p_show_id => (select id from public.shows where slug = 'versioned-public-event'),
      p_actor_user_id => '74000000-0000-0000-0000-000000000001',
      p_command_id => '74000000-0000-0000-0000-000000000011',
      p_title => 'Published Event Title',
      p_description => 'The exact public description.',
      p_admission_price_cents => 0,
      p_sales_channel => 'external',
      p_credits => '[
        {"user_id":"74000000-0000-0000-0000-000000000002","publicly_credited":true,"position":0},
        {"user_id":"74000000-0000-0000-0000-000000000003","publicly_credited":false,"position":1}
      ]'::jsonb,
      p_image_url => 'https://images.example/event.jpg',
      p_external_url => 'https://tickets.example/reserve'
    )
  $$,
  'a Producer can prepare explicit free external admission and cast credits'
);

select is(
  (select version from public.show_public_content_revisions
   where show_id = (select id from public.shows where slug = 'versioned-public-event')),
  1,
  'the first public-content save creates version one of revision one'
);

select throws_ok(
  $$
    select * from public.save_event_public_content_draft(
      p_show_id => (select id from public.shows where slug = 'versioned-public-event'),
      p_actor_user_id => '74000000-0000-0000-0000-000000000001',
      p_command_id => '74000000-0000-0000-0000-000000000012',
      p_title => 'Invalid external admission',
      p_description => '',
      p_admission_price_cents => 1000,
      p_sales_channel => 'external',
      p_credits => '[
        {"user_id":"74000000-0000-0000-0000-000000000002","publicly_credited":true,"position":0},
        {"user_id":"74000000-0000-0000-0000-000000000003","publicly_credited":false,"position":1}
      ]'::jsonb,
      p_expected_version => 1
    )
  $$,
  '22023',
  'External sales requires a valid ticket or reservation URL.',
  'external sales rejects a missing URL'
);

select throws_ok(
  $$
    select * from public.save_event_public_content_draft(
      p_show_id => (select id from public.shows where slug = 'versioned-public-event'),
      p_actor_user_id => '74000000-0000-0000-0000-000000000001',
      p_command_id => '74000000-0000-0000-0000-000000000013',
      p_title => 'Invalid no-advance admission',
      p_description => '',
      p_admission_price_cents => 1000,
      p_sales_channel => 'no_advance_ticketing',
      p_credits => '[
        {"user_id":"74000000-0000-0000-0000-000000000002","publicly_credited":true,"position":0},
        {"user_id":"74000000-0000-0000-0000-000000000003","publicly_credited":false,"position":1}
      ]'::jsonb,
      p_expected_version => 1,
      p_external_url => 'https://tickets.example/should-not-exist'
    )
  $$,
  '22023',
  'No advance ticketing cannot include an external sales URL.',
  'no advance ticketing is explicit and rejects an external URL'
);

select throws_ok(
  $$ insert into public.show_public_content_revisions (
    show_id, revision_number, title, admission_price_cents, sales_channel,
    external_url, last_command_id
  ) values (
    (select id from public.shows where slug = 'versioned-public-event'),
    2, 'Negative admission', -1, 'no_advance_ticketing', null,
    '74000000-0000-0000-0000-000000000014'
  ) $$,
  '23514',
  null,
  'admission price is always non-negative at the database boundary'
);

select is(
  (select array_agg(enumlabel order by enumsortorder)::text
   from pg_enum
   where enumtypid = 'public.event_sales_channel'::regtype),
  '{external,no_advance_ticketing}',
  'native Stagecom ticketing is not an initial Sales Channel'
);

update public.theaters
set
  status = 'published',
  tagline = 'A public theater',
  timezone = 'America/New_York',
  timezone_source = 'manual',
  street = '1 Main Street',
  city = 'New York',
  state_region = 'NY',
  postal_code = '10001',
  country = 'US'
where slug = 'public-content-theater';

update public.show_public_content_revisions
set published_at = now()
where show_id = (select id from public.shows where slug = 'versioned-public-event');

update public.shows
set
  status = 'approved',
  is_public_listed = true,
  published_public_content_revision_id = (
    select id from public.show_public_content_revisions
    where show_id = public.shows.id and revision_number = 1
  )
where slug = 'versioned-public-event';

select lives_ok(
  $$
    select * from public.save_event_public_content_draft(
      p_show_id => (select id from public.shows where slug = 'versioned-public-event'),
      p_actor_user_id => '74000000-0000-0000-0000-000000000001',
      p_command_id => '74000000-0000-0000-0000-000000000015',
      p_title => 'Unpublished Replacement Title',
      p_description => 'Draft changes stay private.',
      p_admission_price_cents => 2500,
      p_sales_channel => 'no_advance_ticketing',
      p_credits => '[
        {"user_id":"74000000-0000-0000-0000-000000000002","publicly_credited":false,"position":0},
        {"user_id":"74000000-0000-0000-0000-000000000003","publicly_credited":true,"position":1}
      ]'::jsonb,
      p_image_url => 'https://images.example/replacement.jpg'
    )
  $$,
  'editing after Publication creates a new unpublished revision'
);

select is(
  (select revision_number from public.show_public_content_revisions
   where show_id = (select id from public.shows where slug = 'versioned-public-event')
     and published_at is null),
  2,
  'the new unpublished snapshot receives the next revision number'
);

select is(
  (select title from public.show_public_content_revisions
   where show_id = (select id from public.shows where slug = 'versioned-public-event')
     and revision_number = 1),
  'Published Event Title',
  'editing the draft never mutates the published snapshot'
);

select is(
  (select count(*) from public.show_public_content_revisions
   where show_id = (select id from public.shows where slug = 'versioned-public-event')
     and published_at is null),
  1::bigint,
  'an Event has one current unpublished public-content revision'
);

set local role anon;

select results_eq(
  $$ select title from public.show_public_content_revisions $$,
  $$ values ('Published Event Title'::text) $$,
  'anonymous reads return the published snapshot and never the newer draft'
);

select results_eq(
  $$ select display_name from public.show_public_content_credits $$,
  $$ values ('Credited Cast'::text) $$,
  'anonymous reads omit hidden Cast credits'
);

reset role;

select is(
  (select count(*) from public.activity_events
   where entity_id = (select id from public.shows where slug = 'versioned-public-event')
     and action = 'event.public_content.updated'),
  2::bigint,
  'each successful public-content edit emits one factual domain event'
);

select * from finish();
rollback;
