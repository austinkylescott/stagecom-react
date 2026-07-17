begin;

select plan(6);

select ok(
  has_table_privilege('service_role', 'public.profiles', 'select'),
  'service_role can read profiles for authorized server queries'
);

select ok(
  has_table_privilege('service_role', 'public.profiles', 'insert'),
  'service_role can create a missing profile during profile completion'
);

select ok(
  has_table_privilege('service_role', 'public.profiles', 'update'),
  'service_role can update a profile during profile completion'
);

select ok(
  has_table_privilege('service_role', 'public.profiles', 'delete'),
  'service_role retains the complete app-owned table access boundary'
);

select ok(
  has_table_privilege('service_role', 'public.theaters', 'select'),
  'service_role can read Theaters after application authorization'
);

select ok(
  has_table_privilege('service_role', 'public.theater_memberships', 'select'),
  'service_role can read memberships after application authorization'
);

select * from finish();

rollback;
