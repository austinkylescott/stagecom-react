-- App-owned server functions use the service role only after explicit
-- application-level authorization. PostgreSQL table privileges are still
-- required even though service_role bypasses row-level security.
grant select, insert, update, delete
on all tables in schema public
to service_role;

alter default privileges in schema public
grant select, insert, update, delete
on tables
to service_role;
