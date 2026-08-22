-- Function: fn_morning_brief
CREATE OR REPLACE FUNCTION public.fn_morning_brief()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_pending_count INT := 0;
    v_stale_count INT := 0;
    v_consecutive_list TEXT := '';
    v_low_balance_list TEXT := '';
    v_present_yesterday INT := 0;
    v_total_employees INT := 0;
    v_brief_message TEXT := '';
    v_has_content BOOLEAN := false;
    
    v_emp RECORD;
    v_absent_count INT;
    v_bal RECORD;
    v_low_types_string TEXT;
    v_admin RECORD;
    v_execution_ms INT;
    
    v_consecutive_count INT := 0;
    v_low_balance_count INT := 0;
BEGIN
    -- SECTION 1 - Actions Needed
    SELECT COUNT(*) INTO v_pending_count FROM public.leave_requests WHERE status = 'pending';
    SELECT COUNT(*) INTO v_stale_count FROM public.leave_requests WHERE status = 'pending' AND created_at < NOW() - INTERVAL '24 hours';
    
    IF v_pending_count > 0 OR v_stale_count > 0 THEN
        v_brief_message := v_brief_message || '🔔 Actions Needed:' || E'\n';
        IF v_pending_count > 0 THEN
            v_brief_message := v_brief_message || '   • ' || v_pending_count || ' leave request(s) pending approval' || E'\n';
        END IF;
        IF v_stale_count > 0 THEN
            v_brief_message := v_brief_message || '   • ' || v_stale_count || ' request(s) waiting over 24 hours' || E'\n';
        END IF;
        v_brief_message := v_brief_message || E'\n';
        v_has_content := true;
    END IF;

    -- SECTION 2 - Watch List
    -- Consecutive absence
    FOR v_emp IN SELECT id, first_name, last_name FROM public.profiles WHERE role = 'employee' AND is_active = true LOOP
        SELECT COUNT(*) INTO v_absent_count
        FROM public.attendance
        WHERE employee_id = v_emp.id AND status = 'absent' AND date >= CURRENT_DATE - 7 AND date < CURRENT_DATE;

        IF v_absent_count >= 3 THEN
            v_consecutive_list := v_consecutive_list || '   • ' || COALESCE(v_emp.first_name || ' ' || v_emp.last_name, 'Unknown Employee') || ' (' || v_absent_count || ' days)' || E'\n';
            v_consecutive_count := v_consecutive_count + 1;
        END IF;
    END LOOP;

    -- Low balance
    FOR v_bal IN 
        SELECT b.employee_id, b.paid_leave, b.sick_leave, b.casual_leave, p.first_name, p.last_name
        FROM public.leave_balance b
        JOIN public.profiles p ON b.employee_id = p.id
        WHERE b.year = EXTRACT(YEAR FROM CURRENT_DATE)
    LOOP
        IF v_bal.paid_leave < 3 OR v_bal.sick_leave < 3 OR v_bal.casual_leave < 3 THEN
            v_low_types_string := '(';
            IF v_bal.paid_leave < 3 THEN v_low_types_string := v_low_types_string || 'paid: ' || v_bal.paid_leave || ', '; END IF;
            IF v_bal.sick_leave < 3 THEN v_low_types_string := v_low_types_string || 'sick: ' || v_bal.sick_leave || ', '; END IF;
            IF v_bal.casual_leave < 3 THEN v_low_types_string := v_low_types_string || 'casual: ' || v_bal.casual_leave || ', '; END IF;
            
            -- Remove trailing comma and space
            v_low_types_string := rtrim(v_low_types_string, ', ') || ')';
            
            v_low_balance_list := v_low_balance_list || '   • ' || COALESCE(v_bal.first_name || ' ' || v_bal.last_name, 'Unknown Employee') || ' ' || v_low_types_string || E'\n';
            v_low_balance_count := v_low_balance_count + 1;
        END IF;
    END LOOP;

    IF v_consecutive_list != '' OR v_low_balance_list != '' THEN
        v_brief_message := v_brief_message || '⚠️ Watch List:' || E'\n';
        IF v_consecutive_list != '' THEN
            v_brief_message := v_brief_message || '   Consecutive absence:' || E'\n' || v_consecutive_list;
        END IF;
        IF v_low_balance_list != '' THEN
            v_brief_message := v_brief_message || '   Low leave balance:' || E'\n' || v_low_balance_list;
        END IF;
        v_brief_message := v_brief_message || E'\n';
        v_has_content := true;
    END IF;

    -- SECTION 3 - Yesterday's Attendance
    SELECT COUNT(*) INTO v_total_employees FROM public.profiles WHERE role = 'employee' AND is_active = true;
    SELECT COUNT(*) INTO v_present_yesterday FROM public.attendance WHERE date = CURRENT_DATE - 1 AND status IN ('present', 'half_day');
    
    v_brief_message := v_brief_message || '✅ Yesterday: ' || v_present_yesterday || '/' || v_total_employees || ' present';

    -- Prepend header
    v_brief_message := '📋 Morning Brief — ' || TO_CHAR(CURRENT_DATE, 'Mon DD, YYYY') || E'\n\n' || v_brief_message;

    IF NOT v_has_content AND v_total_employees = 0 THEN
        INSERT INTO public.automation_logs (trigger_type, trigger_name, entity_type, status, action_taken, execution_ms)
        VALUES ('scheduled', 'morning_brief', 'system', 'silent', 'No employees found. Possible data issue.', (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT);
        RETURN;
    END IF;

    IF NOT v_has_content THEN
        INSERT INTO public.automation_logs (trigger_type, trigger_name, entity_type, status, action_taken, execution_ms)
        VALUES ('scheduled', 'morning_brief', 'system', 'skipped', 'Nothing to report. All clear.', (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT);
        RETURN;
    END IF;

    -- Send notifications to admins
    FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        IF public.should_notify(v_admin.id, 'morning_brief') THEN
            INSERT INTO public.notifications (user_id, type, title, message, action_url)
            VALUES (v_admin.id, 'morning_brief', '📋 Morning Brief', v_brief_message, '/admin/automations');
        END IF;
    END LOOP;

    -- Calculate execution_ms
    v_execution_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT;

    -- Log
    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, status, action_taken, execution_ms
    ) VALUES (
        'scheduled', 'morning_brief', 'system', 'success',
        'Sent brief: ' || v_pending_count || ' pending, ' || v_stale_count || ' stale, ' || v_consecutive_count || ' consecutive, ' || v_low_balance_count || ' low balance. (' || v_execution_ms || 'ms)',
        v_execution_ms
    );
END;
$$;

-- TEST CALLS
-- SELECT public.fn_morning_brief();
-- SELECT action_taken, status, execution_ms FROM public.automation_logs WHERE trigger_name = 'morning_brief' ORDER BY created_at DESC LIMIT 1;
-- SELECT message FROM public.notifications WHERE type = 'morning_brief' ORDER BY created_at DESC LIMIT 1;
