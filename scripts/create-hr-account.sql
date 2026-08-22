-- Creates the HR account. Run in the Supabase SQL editor.
--
-- Needs no service-role key: it inserts the auth user directly, the same way
-- supabase/seed/demo_data.sql does.
--
-- CHANGE v_pass BEFORE RUNNING if this is anything other than a throwaway
-- demo database. The password is written in plaintext in this file and lands
-- in your SQL editor history.
--
-- Safe to re-run: the account is dropped and recreated.

DO $$
DECLARE
  v_uid   uuid := gen_random_uuid();
  v_email text := 'hr@odooindia.dayflow.test';
  v_pass  text := 'eD2Z3wFNofaLTMSk';
  v_old   uuid;
BEGIN
  SELECT id INTO v_old FROM auth.users WHERE email = v_email;
  IF v_old IS NOT NULL THEN
    DELETE FROM public.leave_balance WHERE employee_id = v_old;
    DELETE FROM public.profiles      WHERE id      = v_old;
    DELETE FROM auth.identities      WHERE user_id = v_old;
    DELETE FROM auth.users           WHERE id      = v_old;
  END IF;

  -- The eight token columns must be '' and never NULL. GoTrue scans them into
  -- Go strings, so a NULL makes every sign-in fail with
  -- "Database error querying schema" while the row looks perfectly healthy.
  -- This is what locked out 28 of 30 accounts; see migration 012.
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated',
    'authenticated', v_email, crypt(v_pass, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name','HR','last_name','Team'),
    '', '', '', '', '', '', '', ''
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- role must be 'admin': the profiles CHECK constraint allows only
  -- 'admin' or 'employee', and every admin RLS policy tests for 'admin'.
  -- "HR" is the department, not the role.
  INSERT INTO public.profiles (
    id, first_name, last_name, role, department, position, join_date, is_active
  ) VALUES (
    v_uid, 'HR', 'Team', 'admin', 'HR', 'HR Manager', current_date, true
  );

  INSERT INTO public.leave_balance (employee_id, year)
  VALUES (v_uid, extract(year from current_date)::int)
  ON CONFLICT DO NOTHING;
END $$;

-- Verify: password_verifies and tokens_ok must both be true.
SELECT u.email, p.role, p.department, p.position,
       u.encrypted_password = crypt('eD2Z3wFNofaLTMSk', u.encrypted_password) AS password_verifies,
       (u.confirmation_token IS NOT NULL
        AND u.recovery_token IS NOT NULL
        AND u.email_change IS NOT NULL
        AND u.email_change_token_new IS NOT NULL) AS tokens_ok,
       EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id) AS has_identity
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'hr@odooindia.dayflow.test';
