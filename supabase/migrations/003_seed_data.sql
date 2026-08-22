-- Demo rows for three fixed profile ids.
--
-- These ids only exist if someone created the matching auth users first, and
-- profiles.id is a foreign key onto auth.users(id), so on a clean database
-- this had nothing to attach to and took `supabase db push` down with it.
-- Guarded now: if the profiles aren't there, the migration says so and skips.
--
-- For a real demo dataset use `npm run seed`, which creates the auth users
-- properly and builds all 25 people.

DO $$
DECLARE
    v_ids UUID[] := ARRAY[
        'aaaaaaaa-bbbb-cccc-dddd-eeee00000001',
        'aaaaaaaa-bbbb-cccc-dddd-eeee00000002',
        'aaaaaaaa-bbbb-cccc-dddd-eeee00000003'
    ]::UUID[];
    v_present INT;
BEGIN
    SELECT count(*) INTO v_present FROM public.profiles WHERE id = ANY(v_ids);

    IF v_present < 3 THEN
        RAISE NOTICE 'skipping 003_seed_data: demo profiles not present (found %/3). Run npm run seed instead.', v_present;
        RETURN;
    END IF;

    INSERT INTO public.leave_balance (employee_id, year, paid_leave, sick_leave, casual_leave)
    SELECT unnest(v_ids), extract(year from current_date), 12, 10, 6
    ON CONFLICT (employee_id, year) DO NOTHING;

    INSERT INTO public.salary_structure (employee_id, basic, hra, da, allowance, pf_rate, tax_rate)
    VALUES
        (v_ids[1], 50000.00, 20000.00, 10000.00, 5000.00, 12.00, 10.00),
        (v_ids[2], 45000.00, 18000.00, 9000.00, 4500.00, 12.00, 10.00),
        (v_ids[3], 60000.00, 24000.00, 12000.00, 6000.00, 12.00, 10.00)
    ON CONFLICT (employee_id) DO NOTHING;

    INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
    VALUES
        (v_ids[1], current_date - 5, (current_date - 5)::timestamp + interval '09:00', (current_date - 5)::timestamp + interval '17:00', 'present'),
        (v_ids[1], current_date - 4, (current_date - 4)::timestamp + interval '09:15', (current_date - 4)::timestamp + interval '17:30', 'present'),
        (v_ids[1], current_date - 3, (current_date - 3)::timestamp + interval '09:00', (current_date - 3)::timestamp + interval '13:00', 'half_day'),
        (v_ids[1], current_date - 2, NULL, NULL, 'absent'),
        (v_ids[1], current_date - 1, (current_date - 1)::timestamp + interval '08:50', (current_date - 1)::timestamp + interval '18:00', 'present')
    ON CONFLICT (employee_id, date) DO NOTHING;
END $$;
