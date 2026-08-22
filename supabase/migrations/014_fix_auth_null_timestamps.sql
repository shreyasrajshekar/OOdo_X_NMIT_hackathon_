-- Second half of the auth NULL problem. 012 fixed the token columns; these are
-- the ones that broke the *admin* API rather than sign-in.
--
-- The test1@/test2@ placeholder rows from 003_seed_data.sql were inserted
-- without created_at, updated_at or the two metadata columns. GoTrue scans
-- created_at/updated_at into non-pointer time.Time, so a single NULL row makes
-- auth.admin.listUsers fail wholesale with "Database error finding users" -
-- and that takes out the admin API for every user, not just the bad rows.
--
-- Same root cause as 012: inserting into auth.users directly skips the
-- defaults GoTrue would otherwise write itself.
update auth.users
   set created_at         = coalesce(created_at, now()),
       updated_at         = coalesce(updated_at, now()),
       raw_app_meta_data  = coalesce(raw_app_meta_data,  '{"provider":"email","providers":["email"]}'::jsonb),
       raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
 where created_at is null
    or updated_at is null
    or raw_app_meta_data is null
    or raw_user_meta_data is null;
