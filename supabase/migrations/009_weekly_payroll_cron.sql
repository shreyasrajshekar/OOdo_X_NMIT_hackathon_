-- Function 1: fn_weekly_summary
CREATE OR REPLACE FUNCTION public.fn_weekly_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_week_start DATE;
    v_week_end DATE;
    v_total_present INT;
    v_total_absent INT;
    v_total_half INT;
    v_avg_hours NUMERIC;
    v_summary TEXT;
    v_admin RECORD;
    v_execution_ms INT;
BEGIN
    -- Calculate week start (last Monday)
    v_week_start := (CURRENT_DATE - INTERVAL '1 week' - ((EXTRACT(DOW FROM CURRENT_DATE) - 1) * INTERVAL '1 day'))::DATE;
    v_week_end := v_week_start + 4; -- Last Friday

    -- Aggregate attendance
    SELECT 
        COUNT(*) FILTER (WHERE status = 'present'),
        COUNT(*) FILTER (WHERE status = 'absent'),
        COUNT(*) FILTER (WHERE status = 'half_day'),
        ROUND(COALESCE(AVG(hours_worked), 0)::numeric, 1)
    INTO 
        v_total_present, v_total_absent, v_total_half, v_avg_hours
    FROM public.attendance 
    WHERE date BETWEEN v_week_start AND v_week_end;

    -- Build summary string
    v_summary := 'Week of ' || v_week_start || ': ' || v_total_present || ' present, ' || v_total_absent || ' absent, ' || v_total_half || ' half-day(s). Avg hours: ' || v_avg_hours;

    -- Notify admins
    FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        IF public.should_notify(v_admin.id, 'weekly_summary') THEN
            INSERT INTO public.notifications (user_id, type, title, message, action_url)
            VALUES (v_admin.id, 'weekly_summary', 'Weekly Attendance Summary', v_summary, '/reports');
        END IF;
    END LOOP;

    -- Calculate execution_ms
    v_execution_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT;

    -- Log
    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, status, action_taken, execution_ms
    ) VALUES (
        'scheduled', 'weekly_summary', 'attendance', 'success',
        'Sent weekly summary: ' || v_total_present || ' present. (' || v_execution_ms || 'ms)',
        v_execution_ms
    );
END;
$$;


-- Function 2: fn_payroll_prep
CREATE OR REPLACE FUNCTION public.fn_payroll_prep()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_last_month INT := EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month');
    v_last_year INT := EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month');
    v_days_in_month INT;
    v_month_name TEXT;
    v_total_processed INT := 0;
    
    v_emp RECORD;
    v_present_days INT;
    v_leave_days INT;
    v_absent_days INT;
    v_per_day NUMERIC;
    v_gross NUMERIC;
    v_absence_deduction NUMERIC;
    v_pf_deduction NUMERIC;
    v_tax_deduction NUMERIC;
    v_net_pay NUMERIC;
    
    v_admin RECORD;
    v_execution_ms INT;
BEGIN
    v_days_in_month := EXTRACT(DAY FROM (MAKE_DATE(v_last_year, v_last_month, 1) + INTERVAL '1 month' - INTERVAL '1 day'));

    -- Check if already prepared
    IF EXISTS(SELECT 1 FROM public.salary_records WHERE month = v_last_month AND year = v_last_year) THEN
        INSERT INTO public.automation_logs (trigger_type, trigger_name, entity_type, status, action_taken, execution_ms)
        VALUES ('scheduled', 'payroll_prep', 'salary_record', 'skipped', 'Payroll for this period already exists.', (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT);
        RETURN;
    END IF;

    v_month_name := TO_CHAR(MAKE_DATE(v_last_year, v_last_month, 1), 'FMMonth YYYY');

    -- Loop through active employees with a salary structure
    FOR v_emp IN 
        SELECT p.id, s.basic, s.hra, s.da, s.allowance, s.pf_rate, s.tax_rate
        FROM public.profiles p
        JOIN public.salary_structure s ON p.id = s.employee_id
        WHERE p.role = 'employee' AND p.is_active = true
    LOOP
        -- Count present days
        SELECT COUNT(*) INTO v_present_days
        FROM public.attendance
        WHERE employee_id = v_emp.id 
          AND EXTRACT(MONTH FROM date) = v_last_month 
          AND EXTRACT(YEAR FROM date) = v_last_year 
          AND status IN ('present', 'half_day');

        -- Count leave days
        SELECT COALESCE(SUM(total_days), 0) INTO v_leave_days
        FROM public.leave_requests
        WHERE employee_id = v_emp.id 
          AND status = 'approved'
          AND EXTRACT(MONTH FROM from_date) = v_last_month 
          AND EXTRACT(YEAR FROM from_date) = v_last_year;

        -- Calculate absences and deduct properly
        v_absent_days := v_days_in_month - v_present_days - v_leave_days;
        IF v_absent_days < 0 THEN
            v_absent_days := 0;
        END IF;

        v_per_day := v_emp.basic / v_days_in_month;
        v_gross := v_emp.basic + v_emp.hra + v_emp.da + v_emp.allowance;
        v_absence_deduction := v_absent_days * v_per_day;
        v_pf_deduction := ROUND((v_emp.basic * v_emp.pf_rate / 100.0)::numeric, 2);
        v_tax_deduction := ROUND((v_gross * v_emp.tax_rate / 100.0)::numeric, 2);
        v_net_pay := v_gross - v_absence_deduction - v_pf_deduction - v_tax_deduction;

        -- Insert salary record
        INSERT INTO public.salary_records (
            employee_id, month, year, basic, hra, da, allowance, 
            pf_deduction, tax_deduction, other_deduction, net_pay, status
        ) VALUES (
            v_emp.id, v_last_month, v_last_year, v_emp.basic, v_emp.hra, v_emp.da, v_emp.allowance,
            v_pf_deduction, v_tax_deduction, v_absence_deduction, v_net_pay, 'pending'
        );

        v_total_processed := v_total_processed + 1;
    END LOOP;

    -- Notify admins
    FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        IF public.should_notify(v_admin.id, 'payroll_ready') THEN
            INSERT INTO public.notifications (user_id, type, title, message, action_url)
            VALUES (
                v_admin.id, 'payroll_ready', 'Payroll Ready',
                'Payroll for ' || v_month_name || ' is ready for review. ' || v_total_processed || ' employee(s) processed.',
                '/payroll'
            );
        END IF;
    END LOOP;

    -- Calculate execution_ms
    v_execution_ms := (EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT;

    -- Log
    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, status, action_taken, execution_ms
    ) VALUES (
        'scheduled', 'payroll_prep', 'salary_record', 'success',
        'Processed payroll for ' || v_total_processed || ' employee(s). (' || v_execution_ms || 'ms)',
        v_execution_ms
    );
END;
$$;


-- CRON SETUP

-- Safely unschedule if they exist
SELECT cron.unschedule('cron-mark-absent') FROM cron.job WHERE jobname = 'cron-mark-absent';
SELECT cron.unschedule('cron-auto-checkout') FROM cron.job WHERE jobname = 'cron-auto-checkout';
SELECT cron.unschedule('cron-morning-brief') FROM cron.job WHERE jobname = 'cron-morning-brief';
SELECT cron.unschedule('cron-low-balance') FROM cron.job WHERE jobname = 'cron-low-balance';
SELECT cron.unschedule('cron-consecutive-absence') FROM cron.job WHERE jobname = 'cron-consecutive-absence';
SELECT cron.unschedule('cron-stale-approvals') FROM cron.job WHERE jobname = 'cron-stale-approvals';
SELECT cron.unschedule('cron-weekly-summary') FROM cron.job WHERE jobname = 'cron-weekly-summary';
SELECT cron.unschedule('cron-payroll-prep') FROM cron.job WHERE jobname = 'cron-payroll-prep';

-- Schedule all 8 jobs
SELECT cron.schedule('cron-mark-absent', '0 10 * * 1-5', 'SELECT public.fn_mark_absent()');
SELECT cron.schedule('cron-auto-checkout', '0 18 * * 1-5', 'SELECT public.fn_auto_checkout()');
SELECT cron.schedule('cron-morning-brief', '0 9 * * 1-5', 'SELECT public.fn_morning_brief()');
SELECT cron.schedule('cron-low-balance', '30 9 * * 1-5', 'SELECT public.fn_low_leave_balance()');
SELECT cron.schedule('cron-consecutive-absence', '0 10 * * 1-5', 'SELECT public.fn_consecutive_absence()');
SELECT cron.schedule('cron-stale-approvals', '30 10 * * 1-5', 'SELECT public.fn_stale_approvals()');
SELECT cron.schedule('cron-weekly-summary', '0 9 * * 1', 'SELECT public.fn_weekly_summary()');
SELECT cron.schedule('cron-payroll-prep', '0 6 1 * *', 'SELECT public.fn_payroll_prep()');

-- TEST / VERIFICATION CALLS
-- SELECT jobname, schedule, command FROM cron.job ORDER BY jobid;
