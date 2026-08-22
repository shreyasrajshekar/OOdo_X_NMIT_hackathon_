DO $$ 
BEGIN 
    -- 1. Leave Requests
    IF (SELECT COUNT(*) FROM public.leave_requests) < 5 THEN
        INSERT INTO public.leave_requests (employee_id, leave_type, from_date, to_date, total_days, reason, status, admin_comment)
        VALUES 
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 'sick', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '19 days', 2, 'Flu', 'approved', 'Hope you feel better.'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 'casual', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE - INTERVAL '10 days', 1, 'Personal errand', 'rejected', 'We are short-staffed today.'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 'paid', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '14 days', 5, 'Vacation', 'pending', NULL);
    END IF;

    -- 2. Salary Records
    IF (SELECT COUNT(*) FROM public.salary_records) < 2 THEN
        INSERT INTO public.salary_records (employee_id, month, year, basic, hra, da, allowance, pf_deduction, tax_deduction, other_deduction, net_pay, status)
        VALUES 
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '2 month'), EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '2 month'), 50000, 20000, 10000, 5000, 6000, 8500, 0, 70500, 'paid'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month'), EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month'), 50000, 20000, 10000, 5000, 6000, 8500, 0, 70500, 'pending');
    END IF;

    -- 3. Notifications (Mix of read and unread for both Admin and Employee)
    IF (SELECT COUNT(*) FROM public.notifications) < 10 THEN
        -- Admin notifications
        INSERT INTO public.notifications (user_id, type, title, message, is_read, action_url, created_at)
        VALUES 
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000002', 'leave_request', 'New Leave Request', 'Test Employee applied for paid leave from next week.', false, '/approvals', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000002', 'stale_approval', 'Pending Approval Reminder', 'Test Employee''s paid leave has been pending for 3 day(s).', false, '/approvals', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000002', 'morning_brief', '📋 Morning Brief', '✅ Yesterday: 45/45 present', true, '/admin/automations', CURRENT_TIMESTAMP - INTERVAL '1 day'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000002', 'weekly_summary', 'Weekly Attendance Summary', 'Week of 2026-08-10: 45 present, 0 absent. Avg hours: 8.2', true, '/reports', CURRENT_TIMESTAMP - INTERVAL '2 days');
            
        -- Employee notifications
        INSERT INTO public.notifications (user_id, type, title, message, is_read, action_url, created_at)
        VALUES 
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 'salary_credited', 'Salary Credited', 'Your salary of ₹70500 for last month has been credited.', false, '/payroll', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 'leave_approved', 'Leave Approved', 'Your sick leave has been approved.', true, '/leave', CURRENT_TIMESTAMP - INTERVAL '20 days'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 'leave_rejected', 'Leave Rejected', 'Your casual leave has been rejected. Comment: We are short-staffed today.', true, '/leave', CURRENT_TIMESTAMP - INTERVAL '10 days'),
            ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', 'attendance_absent', 'Marked Absent', 'You have been marked absent for today.', false, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days');
    END IF;

    -- 4. Automation Logs (Mix of types and statuses to show off the frontend table)
    IF (SELECT COUNT(*) FROM public.automation_logs) < 15 THEN
        INSERT INTO public.automation_logs (trigger_type, trigger_name, entity_type, status, action_taken, error_message, execution_ms, created_at)
        VALUES 
            ('scheduled', 'morning_brief', 'system', 'success', 'Sent brief: 1 pending, 0 stale, 0 consecutive, 0 low balance. (12ms)', NULL, 12, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
            ('event', 'leave_submitted', 'leave_request', 'success', 'Notified 1 admin(s): Test Employee — paid', NULL, 8, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
            ('scheduled', 'daily_stale_approvals', 'leave_request', 'success', 'Reminded admins about 1 stale request(s)', NULL, 15, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
            ('scheduled', 'daily_absent_marking', 'attendance', 'skipped', 'Skipped: weekend', NULL, 0, CURRENT_TIMESTAMP - INTERVAL '1 day'),
            ('condition', 'low_leave_balance', 'leave_balance', 'silent', 'All balances healthy', NULL, 4, CURRENT_TIMESTAMP - INTERVAL '2 days'),
            ('event', 'salary_paid', 'salary_record', 'failed', 'Failed to send notification', 'SMTP connection timeout', 5032, CURRENT_TIMESTAMP - INTERVAL '3 days'),
            ('manual', 'force_sync', 'system', 'success', 'Manually triggered sync of 45 employee records.', NULL, 120, CURRENT_TIMESTAMP - INTERVAL '4 days'),
            ('scheduled', 'payroll_prep', 'salary_record', 'success', 'Processed payroll for 1 employee(s). (45ms)', NULL, 45, CURRENT_TIMESTAMP - INTERVAL '5 days');
    END IF;
END $$;
