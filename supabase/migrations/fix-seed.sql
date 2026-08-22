-- 1. Insert leave balances for the two existing profiles
INSERT INTO public.leave_balance (employee_id, year, paid_leave, sick_leave, casual_leave)
VALUES 
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', EXTRACT(YEAR FROM CURRENT_DATE), 12, 10, 6),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000002', EXTRACT(YEAR FROM CURRENT_DATE), 12, 10, 6)
ON CONFLICT (employee_id, year) DO NOTHING;

-- 2. Insert base salary structures for the two existing profiles
INSERT INTO public.salary_structure (employee_id, basic, hra, da, allowance, pf_rate, tax_rate)
VALUES 
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 50000.00, 20000.00, 10000.00, 5000.00, 12.00, 10.00),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000002', 60000.00, 24000.00, 12000.00, 6000.00, 12.00, 10.00)
ON CONFLICT (employee_id) DO NOTHING;

-- 3. Insert mock attendance logs for Test Employee (eeee00000001) over the last 5 days
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
VALUES 
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', CURRENT_DATE - INTERVAL '5 days', (CURRENT_DATE - INTERVAL '5 days')::TIMESTAMP + INTERVAL '09:00', (CURRENT_DATE - INTERVAL '5 days')::TIMESTAMP + INTERVAL '17:00', 'present'),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', CURRENT_DATE - INTERVAL '4 days', (CURRENT_DATE - INTERVAL '4 days')::TIMESTAMP + INTERVAL '09:15', (CURRENT_DATE - INTERVAL '4 days')::TIMESTAMP + INTERVAL '17:30', 'present'),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', CURRENT_DATE - INTERVAL '3 days', (CURRENT_DATE - INTERVAL '3 days')::TIMESTAMP + INTERVAL '09:00', (CURRENT_DATE - INTERVAL '3 days')::TIMESTAMP + INTERVAL '13:00', 'half_day'),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', CURRENT_DATE - INTERVAL '2 days', NULL, NULL, 'absent'),
    ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', CURRENT_DATE - INTERVAL '1 day', (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + INTERVAL '08:50', (CURRENT_DATE - INTERVAL '1 day')::TIMESTAMP + INTERVAL '18:00', 'present')
ON CONFLICT (employee_id, date) DO NOTHING;
