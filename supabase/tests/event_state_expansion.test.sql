begin;

select plan(13);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '20000000-0000-0000-0000-000000000001',
  'event-owner@stagecom.local',
  '{"display_name":"Event Owner"}'
);

select *
from public.create_theater_with_owner(
  '20000000-0000-0000-0000-000000000001',
  'Event State Theater',
  'event-state-theater',
  'America/New_York'
);

insert into public.shows (
  theater_id,
  created_by_user_id,
  status,
  title,
  slug,
  is_public_listed
)
select
  theater.id,
  '20000000-0000-0000-0000-000000000001',
  fixture.status::public.show_status,
  fixture.title,
  fixture.slug,
  fixture.is_public_listed
from public.theaters as theater
cross join (
  values
    ('draft', 'Legacy draft', 'legacy-draft', false),
    ('pending_review', 'Legacy pending review', 'legacy-pending-review', false),
    ('approved', 'Legacy approved private', 'legacy-approved-private', false),
    ('approved', 'Legacy approved public', 'legacy-approved-public', true),
    ('rejected', 'Legacy rejected', 'legacy-rejected', false),
    ('cancelled', 'Legacy cancelled', 'legacy-cancelled', false)
) as fixture(status, title, slug, is_public_listed)
where theater.slug = 'event-state-theater';

alter table public.shows
  alter column lifecycle_status drop not null,
  alter column publication_status drop not null,
  alter column operational_health drop not null;

update public.shows
set lifecycle_status = null,
    publication_status = null,
    operational_health = null
where theater_id = (select id from public.theaters where slug = 'event-state-theater');

select private.backfill_expanded_show_state_from_legacy();

alter table public.shows
  alter column lifecycle_status set not null,
  alter column publication_status set not null,
  alter column operational_health set not null;

select results_eq(
  $$
    select title, lifecycle_status::text, publication_status::text, operational_health::text
    from public.shows
    where theater_id = (select id from public.theaters where slug = 'event-state-theater')
    order by title
  $$,
  $$
    values
      ('Legacy approved private'::text, 'approved'::text, 'unpublished'::text, 'on_track'::text),
      ('Legacy approved public'::text, 'approved'::text, 'published'::text, 'on_track'::text),
      ('Legacy cancelled'::text, 'cancelled'::text, 'unpublished'::text, 'on_track'::text),
      ('Legacy draft'::text, 'draft'::text, 'unpublished'::text, 'on_track'::text),
      ('Legacy pending review'::text, 'in_review'::text, 'unpublished'::text, 'on_track'::text),
      ('Legacy rejected'::text, 'cancelled'::text, 'unpublished'::text, 'on_track'::text)
  $$,
  'legacy Event state maps explicitly into independent persisted dimensions'
);

insert into public.shows (
  theater_id,
  created_by_user_id,
  status,
  title,
  slug,
  is_public_listed
)
select
  id,
  '20000000-0000-0000-0000-000000000001',
  'approved',
  'Post-migration legacy insert',
  'post-migration-legacy-insert',
  true
from public.theaters
where slug = 'event-state-theater';

select results_eq(
  $$
    select lifecycle_status::text, publication_status::text, operational_health::text
    from public.shows
    where slug = 'post-migration-legacy-insert'
  $$,
  $$ values ('approved'::text, 'published'::text, 'on_track'::text) $$,
  'legacy-shaped inserts remain compatible during expansion'
);

insert into public.shows (
  theater_id,
  created_by_user_id,
  title,
  slug,
  lifecycle_status,
  publication_status,
  operational_health
)
select
  id,
  '20000000-0000-0000-0000-000000000001',
  'Independent state insert',
  'independent-state-insert',
  'completed',
  'published',
  'at_risk'
from public.theaters
where slug = 'event-state-theater';

select results_eq(
  $$
    select lifecycle_status::text, publication_status::text, operational_health::text
    from public.shows
    where slug = 'independent-state-insert'
  $$,
  $$ values ('completed'::text, 'published'::text, 'at_risk'::text) $$,
  'new inserts can supply independent dimensions without legacy overwrite'
);

select lives_ok(
  $$
    update public.shows
    set publication_status = 'published',
        operational_health = 'at_risk'
    where slug = 'legacy-approved-private'
  $$,
  'Publication and operational health can change independently'
);

select results_eq(
  $$
    select status::text, lifecycle_status::text, publication_status::text, operational_health::text
    from public.shows
    where slug = 'legacy-approved-private'
  $$,
  $$ values ('approved'::text, 'approved'::text, 'published'::text, 'at_risk'::text) $$,
  'independent state changes do not rewrite the legacy status'
);

select lives_ok(
  $$
    update public.shows
    set status = 'approved',
        is_public_listed = true
    where slug = 'legacy-draft'
  $$,
  'a legacy caller can still update legacy Event state'
);

select results_eq(
  $$
    select lifecycle_status::text, publication_status::text, operational_health::text
    from public.shows
    where slug = 'legacy-draft'
  $$,
  $$ values ('approved'::text, 'published'::text, 'on_track'::text) $$,
  'legacy writes remain synchronized during expansion'
);

update public.shows
set lifecycle_status = 'completed',
    is_public_listed = false
where slug = 'legacy-draft';

select results_eq(
  $$
    select lifecycle_status::text, publication_status::text
    from public.shows
    where slug = 'legacy-draft'
  $$,
  $$ values ('completed'::text, 'unpublished'::text) $$,
  'a legacy listing change preserves the independent lifecycle'
);

select throws_like(
  $$ update public.shows set lifecycle_status = 'impossible' where slug = 'legacy-draft' $$,
  '%invalid input value for enum show_lifecycle_status: "impossible"%',
  'invalid lifecycle values are rejected'
);

select throws_like(
  $$ update public.shows set publication_status = 'approved' where slug = 'legacy-draft' $$,
  '%invalid input value for enum show_publication_status: "approved"%',
  'Publication cannot be conflated with approval'
);

select throws_like(
  $$ update public.shows set operational_health = 'cancelled' where slug = 'legacy-draft' $$,
  '%invalid input value for enum show_operational_health: "cancelled"%',
  'operational health cannot be conflated with lifecycle'
);

update public.shows
set
  operational_health = 'at_risk',
  at_risk_continuation_allowed = true
where slug = 'legacy-draft';

update public.shows
set operational_health = 'on_track'
where slug = 'legacy-draft';

select isnt(
  (select at_risk_continuation_allowed from public.shows where slug = 'legacy-draft'),
  true,
  'returning on track resets the allowance for a future At Risk episode'
);

update public.shows
set publication_status = 'unpublished'
where slug = 'legacy-approved-public';

update public.shows
set is_public_listed = true
where slug = 'legacy-approved-private';

grant select on public.shows to anon;

set local role anon;

select results_eq(
  $$
    select slug
    from public.shows
    order by slug
  $$,
  $$
    select null::text where false
  $$,
  'anonymous RLS suppresses Events while their Theater remains unpublished'
);

select * from finish();
rollback;
