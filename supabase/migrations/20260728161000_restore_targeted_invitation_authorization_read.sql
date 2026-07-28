-- The app checks RLS-scoped invitation visibility before using the
-- service-role revocation transaction. Column privilege was missing even
-- though the existing policy already limits rows to Theater Owner/Admin.
grant select (id) on public.theater_invites to authenticated;
