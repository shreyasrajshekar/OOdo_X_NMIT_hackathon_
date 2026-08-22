-- Function 1: fn_low_leave_balance
CREATE OR REPLACE FUNCTION public.fn_low_leave_balance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_count INT := 0;
    v_rec RECORD;
    v_execution_ms INT;
BEGIN
    FOR v_rec IN 
        SELECT b.employee_id, b.paid_leave, b.sick_leave, b.casual_leave, p.first_name, p.last_name
        FROM public.leave_balance b
        JOIN public.profiles p ON b.employee_id = p.id
        WHERE b.year = EXTRACT(YEAR FROM CURRENT_DATE)
    LOOP
        IF v_rec.paid_leave < 3 OR v_rec.sick_leave < 3 OR v_rec.casual_leave < 3 THEN
            IF public.should_notify(v_rec.employee_id, 'low_leave_balance') THEN
                INSERT INTO public.notifications (user_id, type, title, message, action_url)
                VALUES (
                    v_rec.employee_id, 'low_leave_balance', 'Low Leave Balance',
                    'Your leave balance is running low. Paid: ' || v_rec.paid_leave || 
                    ', Sick: ' || v_rec.sick_leave || ', Casual: ' || v_rec.casual_leave || ' days remaining.',
                    '/leave'
                );
            END IF;
            v_count := v_count + 1;
        END IF;
    END LOOP;

    v_execution_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT;

    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, status, action_taken, execution_ms
    ) VALUES (
        'scheduled', 'daily_low_leave_balance', 'leave_balance',
        CASE WHEN v_count > 0 THEN 'success' ELSE 'skipped' END,
        CASE WHEN v_count > 0 THEN 'Warned ' || v_count || ' employee(s)' ELSE 'All balances healthy' END,
        v_execution_ms
    );
END;
$$;


-- Function 2: fn_consecutive_absence
CREATE OR REPLACE FUNCTION public.fn_consecutive_absence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_count INT := 0;
    v_emp RECORD;
    v_absent_count INT;
    v_admin RECORD;
    v_execution_ms INT;
    v_emp_name TEXT;
BEGIN
    FOR v_emp IN SELECT id, first_name, last_name FROM public.profiles WHERE role = 'employee' AND is_active = true LOOP
        SELECT COUNT(*) INTO v_absent_count
        FROM public.attendance
        WHERE employee_id = v_emp.id 
          AND status = 'absent' 
          AND date >= CURRENT_DATE - 7 
          AND date < CURRENT_DATE;

        IF v_absent_count >= 3 THEN
            v_emp_name := COALESCE(v_emp.first_name || ' ' || v_emp.last_name, 'Unknown Employee');
            
            FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
                IF public.should_notify(v_admin.id, 'consecutive_absence') THEN
                    INSERT INTO public.notifications (user_id, type, title, message)
                    VALUES (
                        v_admin.id, 'consecutive_absence', 'Consecutive Absence Alert',
                        v_emp_name || ' has been absent for ' || v_absent_count || ' day(s) in the last week.'
                    );
                END IF;
            END LOOP;
            v_count := v_count + 1;
        END IF;
    END LOOP;

    v_execution_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT;

    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, status, action_taken, execution_ms
    ) VALUES (
        'scheduled', 'daily_consecutive_absence', 'attendance',
        CASE WHEN v_count > 0 THEN 'success' ELSE 'skipped' END,
        CASE WHEN v_count > 0 THEN 'Flagged ' || v_count || ' employee(s) for consecutive absence' ELSE 'No consecutive absences detected' END,
        v_execution_ms
    );
END;
$$;


-- Function 3: fn_stale_approvals
CREATE OR REPLACE FUNCTION public.fn_stale_approvals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_count INT := 0;
    v_hours_pending NUMERIC;
    v_req RECORD;
    v_admin RECORD;
    v_execution_ms INT;
    v_emp_name TEXT;
BEGIN
    FOR v_req IN 
        SELECT r.id, r.leave_type, r.created_at, p.first_name, p.last_name
        FROM public.leave_requests r
        JOIN public.profiles p ON r.employee_id = p.id
        WHERE r.status = 'pending' AND r.created_at < NOW() - INTERVAL '24 hours'
    LOOP
        v_hours_pending := ROUND((EXTRACT(EPOCH FROM (NOW() - v_req.created_at)) / 3600.0)::NUMERIC);
        v_emp_name := COALESCE(v_req.first_name || ' ' || v_req.last_name, 'Unknown Employee');
        
        FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
            IF public.should_notify(v_admin.id, 'stale_approval') THEN
                INSERT INTO public.notifications (user_id, type, title, message, action_url)
                VALUES (
                    v_admin.id, 'stale_approval', 'Pending Approval Reminder',
                    v_emp_name || '''s ' || v_req.leave_type || ' leave has been pending for ' || (v_hours_pending / 24)::INT || ' day(s).',
                    '/approvals'
                );
            END IF;
        END LOOP;
        v_count := v_count + 1;
    END LOOP;

    v_execution_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT;

    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, status, action_taken, execution_ms
    ) VALUES (
        'scheduled', 'daily_stale_approvals', 'leave_request',
        CASE WHEN v_count > 0 THEN 'success' ELSE 'skipped' END,
        CASE WHEN v_count > 0 THEN 'Reminded admins about ' || v_count || ' stale request(s)' ELSE 'No stale requests found' END,
        v_execution_ms
    );
END;
$$;

-- TEST CALLS
-- SELECT public.fn_low_leave_balance();
-- SELECT * FROM public.automation_logs WHERE trigger_name = 'daily_low_leave_balance' ORDER BY created_at DESC LIMIT 1;
-- 
-- SELECT public.fn_consecutive_absence();
-- SELECT * FROM public.automation_logs WHERE trigger_name = 'daily_consecutive_absence' ORDER BY created_at DESC LIMIT 1;
-- 
-- SELECT public.fn_stale_approvals();
-- SELECT * FROM public.automation_logs WHERE trigger_name = 'daily_stale_approvals' ORDER BY created_at DESC LIMIT 1;
