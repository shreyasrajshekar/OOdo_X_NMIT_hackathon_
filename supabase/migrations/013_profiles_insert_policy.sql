-- profiles had no INSERT policy at all.
--
-- RLS is enabled on the table, and the only policies were profiles_select_all,
-- profiles_update_admin and profiles_update_own. With RLS on and no INSERT
-- policy, every insert is denied - so "Add employee" could never write the
-- profile row, whatever role the signed-in user held. The failure surfaces as
-- a row-level-security violation after the auth user has already been created,
-- which leaves an orphaned login behind.
--
-- Two paths need to insert:
--   1. an admin/HR creating a colleague
--   2. a new user creating their own row during company sign-up
--
-- The admin check subquery reads profiles, which is safe here because
-- profiles_select_all is USING (true) - the read inside the policy is not
-- itself gated on an admin check, so there is no recursion.

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
  on public.profiles
  for insert
  with check (
    exists (
      select 1
        from public.profiles me
       where me.id = auth.uid()
         and me.role = 'admin'
    )
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles
  for insert
  with check (auth.uid() = id);
