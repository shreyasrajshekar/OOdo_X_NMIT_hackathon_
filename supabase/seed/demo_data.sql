-- Dayflow demo data — the OD company, 25 people.
--
-- Paste into the SQL editor and run. Unlike `npm run seed` this needs no
-- service-role key, because it creates the auth users directly rather than
-- going through the admin API. Same dataset either way.
--
-- Idempotent: clears the previous run first, keyed on the seed email domain
-- (@odooindia.dayflow.test), so nothing else in the project is touched.
--
-- Every account shares the password Dayflow!2026.

DO $$
DECLARE
    v_domain   TEXT := 'odooindia.dayflow.test';
    v_password TEXT := 'Dayflow!2026';
    v_ids      UUID[];
    v_admin    UUID;
    v_old      UUID[];
    r          RECORD;
    v_uid      UUID;
    v_email    TEXT;
    v_idx      INT := 0;
    v_day      DATE;
    v_back     INT;
    v_roll     INT;
    v_late     INT := 0;
    v_missing  INT := 0;
    v_absent   INT := 0;
BEGIN
    SELECT array_agg(id) INTO v_old
    FROM auth.users WHERE email LIKE '%@' || v_domain;

    IF v_old IS NOT NULL THEN
        -- profiles has no ON DELETE CASCADE from auth.users, so it goes first;
        -- attendance, leave and salary all cascade off profiles.
        DELETE FROM public.notification_logs WHERE user_id = ANY(v_old);
        DELETE FROM public.profiles          WHERE id      = ANY(v_old);
        DELETE FROM auth.identities          WHERE user_id = ANY(v_old);
        DELETE FROM auth.users               WHERE id      = ANY(v_old);
        RAISE NOTICE 'cleared % people from the previous run', array_length(v_old, 1);
    END IF;

    CREATE TEMP TABLE _roster (
        idx INT, first TEXT, last TEXT, dept TEXT, title TEXT,
        is_admin BOOLEAN, join_date DATE, wage NUMERIC
    ) ON COMMIT DROP;

    INSERT INTO _roster VALUES
    (0,'Priya','Menon','Management','Administrator',TRUE,'2022-01-10',175000),
    (1,'Rohan','Iyer','Engineering','Engineering Manager',FALSE,'2023-06-13',84500),
    (2,'Ananya','Sharma','Engineering','Software Engineer',FALSE,'2024-11-24',59000),
    (3,'Vikram','Rao','Engineering','Software Engineer',FALSE,'2025-04-05',133500),
    (4,'Meera','Nair','Engineering','Software Engineer',FALSE,'2026-09-16',108000),
    (5,'Arjun','Patel','Engineering','Software Engineer',FALSE,'2022-02-27',72500),
    (6,'Divya','Kulkarni','Engineering','Software Engineer',FALSE,'2023-07-08',47000),
    (7,'Karthik','Reddy','Engineering','Software Engineer',FALSE,'2024-12-19',121000),
    (8,'Sneha','Joshi','Engineering','Software Engineer',FALSE,'2025-05-02',95500),
    (9,'Aditya','Verma','Engineering','Software Engineer',FALSE,'2026-10-13',60000),
    (10,'Tanvi','Deshmukh','Engineering','Software Engineer',FALSE,'2022-03-24',146500),
    (11,'Neha','Gupta','Sales','Sales Manager',FALSE,'2023-08-05',88000),
    (12,'Suresh','Kumar','Sales','Sales Executive',FALSE,'2024-01-16',51500),
    (13,'Pooja','Desai','Sales','Sales Executive',FALSE,'2025-06-27',125000),
    (14,'Rahul','Mishra','Sales','Sales Executive',FALSE,'2026-11-10',99500),
    (15,'Aisha','Khan','Sales','Sales Executive',FALSE,'2022-04-21',64000),
    (16,'Manikandan','S','Sales','Sales Executive',FALSE,'2023-09-02',38500),
    (17,'Kavya','Menon','Sales','Sales Executive',FALSE,'2024-02-13',112500),
    (18,'Lakshmi','Prasad','HR','HR Manager',FALSE,'2025-07-24',87000),
    (19,'Farhan','Ali','HR','HR Associate',FALSE,'2026-12-07',52000),
    (20,'Deepa','Krishnan','HR','HR Associate',FALSE,'2022-05-18',139000),
    (21,'Gaurav','Saxena','Finance','Finance Manager',FALSE,'2023-10-31',103500),
    (22,'Ritika','Bansal','Finance','Accountant',FALSE,'2024-03-12',68000),
    (23,'Mohan','Iyer','Finance','Accountant',FALSE,'2025-08-23',42500),
    (24,'Shreya','Pillai','Finance','Accountant',FALSE,'2026-01-04',116500);

    FOR r IN SELECT * FROM _roster ORDER BY idx LOOP
        v_uid   := gen_random_uuid();
        v_email := lower(regexp_replace(r.first || '.' || r.last, '[^A-Za-z.]', '', 'g'))
                   || '.' || r.idx || '@' || v_domain;

        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, created_at, updated_at,
            raw_app_meta_data, raw_user_meta_data
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated',
            'authenticated', v_email, crypt(v_password, gen_salt('bf')),
            now(), now(), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('first_name', r.first, 'last_name', r.last)
        );

        INSERT INTO auth.identities (
            provider_id, user_id, identity_data, provider,
            last_sign_in_at, created_at, updated_at
        ) VALUES (
            v_uid::text, v_uid,
            jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now()
        );

        INSERT INTO public.profiles (
            id, first_name, last_name, phone, role, department, position,
            join_date, is_active
        ) VALUES (
            v_uid, r.first, r.last,
            '+9198' || lpad(((r.idx * 7919) % 100000000)::text, 8, '0'),
            CASE WHEN r.is_admin THEN 'admin' ELSE 'employee' END,
            r.dept, r.title, r.join_date, TRUE
        );

        INSERT INTO public.salary_structure
            (employee_id, basic, hra, da, allowance, pf_rate, tax_rate)
        VALUES
            (v_uid, r.wage * 0.5, r.wage * 0.2, r.wage * 0.2, r.wage * 0.1,
             12, CASE WHEN r.wage > 100000 THEN 20 ELSE 10 END);

        INSERT INTO public.leave_balance
            (employee_id, year, paid_leave, sick_leave, casual_leave, unpaid_leave)
        VALUES
            (v_uid, extract(year FROM current_date)::int, 12, 10, 6, 0);

        v_ids := array_append(v_ids, v_uid);
        IF r.is_admin THEN v_admin := v_uid; END IF;
    END LOOP;

    RAISE NOTICE 'created % people', array_length(v_ids, 1);

    -- Deliberately messy: a clean month demos nothing. Deterministic, so the
    -- same demo comes out every run.
    FOR v_idx IN 1 .. array_length(v_ids, 1) LOOP
        FOR v_back IN REVERSE 30 .. 1 LOOP
            v_day := current_date - v_back;
            CONTINUE WHEN extract(isodow FROM v_day) > 5;   -- weekdays only

            v_roll := (v_idx * 9973 + v_back * 7919) % 100;

            -- person 8 carries three consecutive absences, so the
            -- consecutive-absence rule has something real to fire on
            IF (v_idx = 8 AND v_back BETWEEN 3 AND 5) OR v_roll < 4 THEN
                INSERT INTO public.attendance (employee_id, date, status, check_in, check_out)
                VALUES (v_ids[v_idx], v_day, 'absent', NULL, NULL)
                ON CONFLICT (employee_id, date) DO NOTHING;
                v_absent := v_absent + 1;

            ELSIF v_roll < 8 THEN
                INSERT INTO public.attendance (employee_id, date, status, check_in, check_out, hours_worked)
                VALUES (v_ids[v_idx], v_day, 'half_day',
                        v_day + TIME '09:00', v_day + TIME '13:00', 4)
                ON CONFLICT (employee_id, date) DO NOTHING;

            ELSIF v_roll < 14 THEN
                -- forgot to check out
                INSERT INTO public.attendance (employee_id, date, status, check_in, check_out)
                VALUES (v_ids[v_idx], v_day, 'present', v_day + TIME '09:10', NULL)
                ON CONFLICT (employee_id, date) DO NOTHING;
                v_missing := v_missing + 1;

            ELSIF v_roll < 26 THEN
                -- late arrival
                INSERT INTO public.attendance (employee_id, date, status, check_in, check_out, hours_worked)
                VALUES (v_ids[v_idx], v_day, 'present',
                        v_day + TIME '09:35' + ((v_roll % 40) || ' minutes')::interval,
                        v_day + TIME '18:15', 8.25)
                ON CONFLICT (employee_id, date) DO NOTHING;
                v_late := v_late + 1;

            ELSE
                INSERT INTO public.attendance (employee_id, date, status, check_in, check_out, hours_worked)
                VALUES (v_ids[v_idx], v_day, 'present',
                        v_day + TIME '09:00' + ((v_roll % 12) || ' minutes')::interval,
                        v_day + TIME '18:00', 8.75)
                ON CONFLICT (employee_id, date) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'attendance: % late, % missing check-out, % absent', v_late, v_missing, v_absent;

    -- The pending unpaid one is the stage moment: it sits unapproved in the
    -- admin queue, and inserting it fires trg_leave_submitted so the
    -- notification bell has something in it on a fresh seed.
    INSERT INTO public.leave_requests
        (employee_id, leave_type, from_date, to_date, total_days, reason, status)
    VALUES
        (v_ids[4], 'unpaid', current_date + 4, current_date + 6, 3,
         'Family function out of town, no paid balance left for the year.', 'pending');

    -- Inserted already-decided, which deliberately does NOT fire the approved
    -- and rejected triggers - those are AFTER UPDATE, so seeding history
    -- neither spams notifications nor double-counts the balance.
    INSERT INTO public.leave_requests
        (employee_id, leave_type, from_date, to_date, total_days, reason, status,
         approved_by, admin_comment)
    VALUES
        (v_ids[6], 'sick', current_date - 12, current_date - 11, 2,
         'Viral fever, doctor advised rest.', 'approved', v_admin, 'Get well soon.'),
        (v_ids[10], 'casual', current_date - 6, current_date - 6, 1,
         'Personal errand.', 'rejected', v_admin, 'Clashes with the quarter-end review.');

    RAISE NOTICE 'leave: 1 pending unpaid (stage), 1 approved, 1 rejected';
    RAISE NOTICE 'done - sign in with any @% address, password %', v_domain, v_password;
END $$;
