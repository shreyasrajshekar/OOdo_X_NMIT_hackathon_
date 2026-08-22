-- Profiles are created via Supabase Auth. 
-- See seed script in 003_seed_data.sql

-- You must insert the following profiles first before running this script,
-- or this seed will fail due to foreign key constraints to the profiles table:
-- 'aaaaaaaa-bbbb-cccc-dddd-eeee00000001'
-- 'aaaaaaaa-bbbb-cccc-dddd-eeee00000002'
-- 'aaaaaaaa-bbbb-cccc-dddd-eeee00000003'

INSERT INTO public.leave_balance (employee_id, year, paid_leave, sick_leave, casual_leave)
VALUES 
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', extract(year from current_date), 12, 10, 6),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000002', extract(year from current_date), 12, 10, 6),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000003', extract(year from current_date), 12, 10, 6)
ON CONFLICT (employee_id, year) DO NOTHING;

INSERT INTO public.salary_structure (employee_id, basic, hra, da, allowance, pf_rate, tax_rate)
VALUES 
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 50000.00, 20000.00, 10000.00, 5000.00, 12.00, 10.00),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000002', 45000.00, 18000.00, 9000.00, 4500.00, 12.00, 10.00),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000003', 60000.00, 24000.00, 12000.00, 6000.00, 12.00, 10.00)
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
VALUES 
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', current_date - interval '5 days', (current_date - interval '5 days')::timestamp + interval '09:00', (current_date - interval '5 days')::timestamp + interval '17:00', 'present'),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', current_date - interval '4 days', (current_date - interval '4 days')::timestamp + interval '09:15', (current_date - interval '4 days')::timestamp + interval '17:30', 'present'),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', current_date - interval '3 days', (current_date - interval '3 days')::timestamp + interval '09:00', (current_date - interval '3 days')::timestamp + interval '13:00', 'half_day'),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', current_date - interval '2 days', NULL, NULL, 'absent'),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', current_date - interval '1 day', (current_date - interval '1 day')::timestamp + interval '08:50', (current_date - interval '1 day')::timestamp + interval '18:00', 'present')
ON CONFLICT (employee_id, date) DO NOTHING;
