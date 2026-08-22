-- Function: fn_on_check_out
CREATE OR REPLACE FUNCTION public.fn_on_check_out()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only act when check_out is being set for the first time and check_in exists
    IF NEW.check_out IS NOT NULL AND OLD.check_out IS NULL AND NEW.check_in IS NOT NULL THEN
        -- Calculate hours_worked
        NEW.hours_worked := ROUND((EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 3600.0)::NUMERIC, 2);

        -- Determine status if not leave or absent
        IF NEW.status NOT IN ('leave', 'absent') THEN
            IF NEW.hours_worked < 4 THEN
                NEW.status := 'half_day';
            ELSE
                NEW.status := 'present';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_out ON public.attendance;
CREATE TRIGGER trg_check_out
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_check_out();


-- Function: fn_on_salary_paid
CREATE OR REPLACE FUNCTION public.fn_on_salary_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_end_time TIMESTAMPTZ;
    v_emp_name TEXT;
    v_month_name TEXT;
    v_cascade_id VARCHAR(50) := 'cas-sal-' || NEW.id;
BEGIN
    IF OLD.status != 'paid' AND NEW.status = 'paid' THEN
        -- Get month name (FMMonth removes trailing spaces)
        v_month_name := TO_CHAR(MAKE_DATE(NEW.year, NEW.month, 1), 'FMMonth YYYY');

        -- Get employee name
        SELECT COALESCE(first_name || ' ' || last_name, 'Unknown Employee') INTO v_emp_name
        FROM public.profiles
        WHERE id = NEW.employee_id;
        
        IF v_emp_name IS NULL THEN
            v_emp_name := 'Unknown Employee';
        END IF;

        -- Notify employee
        IF public.should_notify(NEW.employee_id, 'salary_credited') THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, action_url, cascade_id
            ) VALUES (
                NEW.employee_id, 'salary_credited', 'Salary Credited',
                'Your salary of ₹' || NEW.net_pay || ' for ' || v_month_name || ' has been credited to your account.',
                '/payroll',
                v_cascade_id
            );
        END IF;

        -- Calculate execution_ms
        v_end_time := clock_timestamp();

        -- Log to automation_logs
        INSERT INTO public.automation_logs (
            trigger_type, trigger_name, entity_type, entity_id, cascade_id, action_taken, execution_ms
        ) VALUES (
            'event', 'salary_paid', 'salary_record', NEW.id, v_cascade_id,
            'Notified ' || v_emp_name || ': ₹' || NEW.net_pay || ' for ' || v_month_name,
            (EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000)::INT
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_salary_paid ON public.salary_records;
CREATE TRIGGER trg_salary_paid
AFTER UPDATE ON public.salary_records
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_salary_paid();

-- TEST:
-- INSERT INTO public.salary_records (employee_id, month, year, basic, hra, da, allowance, pf_deduction, tax_deduction, other_deduction, net_pay, status)
-- VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeee00000001', EXTRACT(MONTH FROM current_date), EXTRACT(YEAR FROM current_date), 50000, 20000, 10000, 5000, 6000, 8500, 0, 70500, 'pending');
-- 
-- TEST:
-- UPDATE public.salary_records SET status = 'paid' WHERE employee_id = 'aaaaaaaa-bbbb-cccc-dddd-eeee00000001' AND month = EXTRACT(MONTH FROM current_date) AND year = EXTRACT(YEAR FROM current_date);
-- 
-- TEST:
-- SELECT * FROM public.notifications WHERE user_id = 'aaaaaaaa-bbbb-cccc-dddd-eeee00000001' ORDER BY created_at DESC LIMIT 1;
-- SELECT * FROM public.automation_logs ORDER BY created_at DESC LIMIT 1;
