-- Dayflow 0012 — tighten EXECUTE grants on SECURITY DEFINER functions.
-- Supabase grants EXECUTE to PUBLIC by default, so every definer function in
-- `public` is reachable at /rest/v1/rpc/<name> by anon. Revoke from PUBLIC
-- first: revoking from anon alone is a no-op while the PUBLIC grant stands.
--
-- Deliberately NOT touched:
--   auth_role() / auth_company()   — RLS policy expressions are evaluated with
--     the querying role's privileges, so revoking EXECUTE breaks every policy.
--     They leak only the caller's own role/company, which the caller knows.
--   lookup_email_for_identifier()  — must stay anon-callable: sign-in resolves
--     a Login ID to its work email before signInWithPassword (Section 6.2).

-- Trigger functions: never valid as RPC, but keep them off the exposed API.
revoke execute on function attendance_compute()      from public, anon, authenticated;
revoke execute on function salary_audit()            from public, anon, authenticated;
revoke execute on function employees_guard_update()  from public, anon, authenticated;

-- Service-role only: called through the admin client in createEmployee /
-- signUp. Takes FOR UPDATE on companies, so anon must not be able to probe it.
revoke execute on function generate_login_id(uuid, text, text, date)
  from public, anon, authenticated;
grant  execute on function generate_login_id(uuid, text, text, date) to service_role;

-- Signed-in users only. Each already re-checks auth.uid()/auth_role() inside,
-- so this is defence in depth, not the only control.
revoke execute on function do_check_in()                              from public, anon;
revoke execute on function do_check_out()                             from public, anon;
revoke execute on function complete_password_change()                 from public, anon;
revoke execute on function replace_salary_components(uuid, jsonb)     from public, anon;
revoke execute on function audit_history_for_employee(uuid)           from public, anon;

grant execute on function do_check_in()                           to authenticated, service_role;
grant execute on function do_check_out()                          to authenticated, service_role;
grant execute on function complete_password_change()              to authenticated, service_role;
grant execute on function replace_salary_components(uuid, jsonb)  to authenticated, service_role;
grant execute on function audit_history_for_employee(uuid)        to authenticated, service_role;
