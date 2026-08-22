-- Repair: 28 of 30 accounts could not sign in.
--
-- Every user created by a direct INSERT into auth.users (the whole demo roster
-- from supabase/seed/demo_data.sql) left the token columns NULL. GoTrue scans
-- those into Go strings, so any sign-in attempt fails with
--   "Database error querying schema"
-- even though the row, the password hash and the identity are all correct.
-- Empty string is the right "no token outstanding" value.
--
-- supabase/seed/demo_data.sql now sets these at insert time; this fixes the
-- accounts that already exist. Safe to re-run.
update auth.users
   set confirmation_token         = coalesce(confirmation_token, ''),
       recovery_token             = coalesce(recovery_token, ''),
       email_change               = coalesce(email_change, ''),
       email_change_token_new     = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       phone_change               = coalesce(phone_change, ''),
       phone_change_token         = coalesce(phone_change_token, ''),
       reauthentication_token     = coalesce(reauthentication_token, '')
 where confirmation_token is null
    or recovery_token is null
    or email_change is null
    or email_change_token_new is null
    or email_change_token_current is null
    or phone_change is null
    or phone_change_token is null
    or reauthentication_token is null;
