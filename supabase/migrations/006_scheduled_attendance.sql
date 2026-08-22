-- Function 1: fn_mark_absent
CREATE OR REPLACE FUNCTION public.fn_mark_absent()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_today_date DATE := CURRENT_DATE;
    v_absent_names TEXT := '';
    v_absent_count INT := 0;
    v_total_employees INT;
    v_emp RECORD;
    v_exists BOOLEAN;
    v_execution_ms INT;
BEGIN
    -- Skip if weekend
    IF EXTRACT(DOW FROM v_today_date) IN (0, 6) THEN
        INSERT INTO public.automation_logs (trigger_type, trigger_name, entity_type, status, action_taken, execution_ms)
        VALUES ('scheduled', 'daily_absent_marking', 'attendance', 'skipped', 'Skipped: weekend', 0);
        RETURN;
    END IF;

    -- Count total employees
    SELECT COUNT(*) INTO v_total_employees FROM public.profiles WHERE role = 'employee' AND is_active = true;

    IF v_total_employees = 0 THEN
        INSERT INTO public.automation_logs (trigger_type, trigger_name, entity_type, status, action_taken, execution_ms)
        VALUES ('scheduled', 'daily_absent_marking', 'attendance', 'silent', 'No active employees found in profiles table. Possible data issue.', 0);
        RETURN;
    END IF;

    -- Loop through active employees
    FOR v_emp IN SELECT id, first_name, last_name FROM public.profiles WHERE role = 'employee' AND is_active = true LOOP
        SELECT EXISTS(SELECT 1 FROM public.attendance WHERE employee_id = v_emp.id AND date = v_today_date) INTO v_exists;

        IF NOT v_exists THEN
            INSERT INTO public.attendance (employee_id, date, status, hours_worked, note)
            VALUES (v_emp.id, v_today_date, 'absent', 0, 'Auto-marked absent by system');

            IF public.should_notify(v_emp.id, 'attendance_absent') THEN
                INSERT INTO public.notifications (user_id, type, title, message)
                VALUES (v_emp.id, 'attendance_absent', 'Marked Absent', 'You have been marked absent for today. Contact HR if this is incorrect.');
            END IF;

            v_absent_names := v_absent_names || COALESCE(v_emp.first_name || ' ' || v_emp.last_name, 'Unknown') || ', ';
            v_absent_count := v_absent_count + 1;
        END IF;
    END LOOP;

    -- Calculate execution_ms
    v_execution_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT;

    -- Log
    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, status, action_taken, execution_ms
    ) VALUES (
        'scheduled', 'daily_absent_marking', 'attendance',
        CASE WHEN v_absent_count > 0 THEN 'success' ELSE 'skipped' END,
        'Checked ' || v_total_employees || ' employees. ' || 
        CASE WHEN v_absent_count > 0 THEN 'Marked ' || v_absent_count || ' absent: ' || v_absent_names ELSE 'All checked in.' END ||
        ' (' || v_execution_ms || 'ms)',
        v_execution_ms
    );
END;
$$;


-- Function 2: fn_auto_checkout
CREATE OR REPLACE FUNCTION public.fn_auto_checkout()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_work_end TIME := '18:00:00';
    v_count INT := 0;
    v_checkout_time TIMESTAMPTZ;
    v_hours NUMERIC;
    v_new_status VARCHAR(20);
    v_att RECORD;
    v_execution_ms INT;
BEGIN
    -- Skip if weekend
    IF EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6) THEN
        INSERT INTO public.automation_logs (trigger_type, trigger_name, entity_type, status, action_taken, execution_ms)
        VALUES ('scheduled', 'daily_auto_checkout', 'attendance', 'skipped', 'Skipped: weekend', 0);
        RETURN;
    END IF;

    FOR v_att IN SELECT * FROM public.attendance WHERE date = CURRENT_DATE AND check_in IS NOT NULL AND check_out IS NULL LOOP
        -- Calculate checkout_time (cast work_end to interval as requested)
        v_checkout_time := (CURRENT_DATE::TIMESTAMP + v_work_end::INTERVAL)::TIMESTAMPTZ;
        
        -- Calculate hours
        v_hours := ROUND((EXTRACT(EPOCH FROM (v_checkout_time - v_att.check_in)) / 3600.0)::NUMERIC, 2);
        
        -- Determine new status
        IF v_hours < 4 THEN
            v_new_status := 'half_day';
        ELSE
            v_new_status := 'present';
        END IF;

        -- Update attendance
        UPDATE public.attendance 
        SET check_out = v_checkout_time,
            hours_worked = v_hours,
            status = CASE WHEN status NOT IN ('absent', 'leave') THEN v_new_status ELSE status END,
            note = CASE WHEN note IS NULL OR note = '' THEN 'Auto-checked out at 18:00.' ELSE note || ' Auto-checked out at 18:00.' END
        WHERE id = v_att.id;

        -- Notify employee
        IF public.should_notify(v_att.employee_id, 'attendance_auto_checkout') THEN
            INSERT INTO public.notifications (user_id, type, title, message)
            VALUES (v_att.employee_id, 'attendance_auto_checkout', 'Auto Check-Out', 'You were automatically checked out at 6:00 PM. Hours worked: ' || v_hours);
        END IF;

        v_count := v_count + 1;
    END LOOP;

    -- Calculate execution_ms
    v_execution_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT;

    -- Log
    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, status, action_taken, execution_ms
    ) VALUES (
        'scheduled', 'daily_auto_checkout', 'attendance',
        CASE WHEN v_count > 0 THEN 'success' ELSE 'skipped' END,
        'Auto checked out ' || v_count || ' employee(s). (' || v_execution_ms || 'ms)',
        v_execution_ms
    );
END;
$$;

-- TEST CALLS
-- SELECT public.fn_mark_absent();
-- SELECT * FROM public.automation_logs WHERE trigger_name = 'daily_absent_marking' ORDER BY created_at DESC LIMIT 1;
-- 
-- SELECT public.fn_auto_checkout();
-- SELECT * FROM public.automation_logs WHERE trigger_name = 'daily_auto_checkout' ORDER BY created_at DESC LIMIT 1;
