-- Function: fn_on_leave_submitted
CREATE OR REPLACE FUNCTION public.fn_on_leave_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_end_time TIMESTAMPTZ;
    v_emp_name TEXT := 'Unknown Employee';
    v_admin_record RECORD;
    v_admin_count INT := 0;
    v_cascade_id VARCHAR(50) := 'cas-' || NEW.id;
BEGIN
    -- Get employee name, fallback to 'Unknown Employee' if missing
    SELECT COALESCE(first_name || ' ' || last_name, 'Unknown Employee') INTO v_emp_name
    FROM public.profiles
    WHERE id = NEW.employee_id;
    
    IF v_emp_name IS NULL THEN
        v_emp_name := 'Unknown Employee';
    END IF;

    -- Notify all admins
    FOR v_admin_record IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        IF public.should_notify(v_admin_record.id, 'leave_request') THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, action_url, cascade_id
            ) VALUES (
                v_admin_record.id,
                'leave_request',
                'New Leave Request',
                v_emp_name || ' applied for ' || NEW.leave_type || ' leave from ' || NEW.from_date || ' to ' || NEW.to_date || ' (' || NEW.total_days || ' day(s)).',
                '/leave',
                v_cascade_id
            );
        END IF;
        v_admin_count := v_admin_count + 1;
    END LOOP;

    -- Calculate execution_ms
    v_end_time := clock_timestamp();
    
    -- Log to automation_logs
    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, entity_id, cascade_id, action_taken, execution_ms
    ) VALUES (
        'event', 'leave_submitted', 'leave_request', NEW.id, v_cascade_id,
        'Notified ' || v_admin_count || ' admin(s): ' || v_emp_name || ' — ' || NEW.leave_type,
        (EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000)::INT
    );

    RETURN NEW;
END;
$$;

-- Function: fn_on_leave_approved
CREATE OR REPLACE FUNCTION public.fn_on_leave_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_end_time TIMESTAMPTZ;
    v_emp_name TEXT := 'Unknown Employee';
    v_cascade_id VARCHAR(50) := 'cas-' || NEW.id;
    v_curr_date DATE;
    v_attendance_count INT := 0;
    v_column_name TEXT;
    v_msg TEXT;
BEGIN
    -- ONLY fire when transitioning from pending to approved
    IF OLD.status != 'pending' OR NEW.status != 'approved' THEN
        RETURN NEW;
    END IF;

    -- Get employee name
    SELECT COALESCE(first_name || ' ' || last_name, 'Unknown Employee') INTO v_emp_name
    FROM public.profiles
    WHERE id = NEW.employee_id;

    IF v_emp_name IS NULL THEN
        v_emp_name := 'Unknown Employee';
    END IF;

    -- Loop dates for attendance update
    v_curr_date := NEW.from_date;
    WHILE v_curr_date <= NEW.to_date LOOP
        -- Skip weekends (0 = Sunday, 6 = Saturday)
        IF EXTRACT(DOW FROM v_curr_date) NOT IN (0, 6) THEN
            INSERT INTO public.attendance (employee_id, date, status, hours_worked, note)
            VALUES (NEW.employee_id, v_curr_date, 'leave', 0, 'On ' || NEW.leave_type || ' leave (Approved)')
            ON CONFLICT (employee_id, date) DO UPDATE 
            SET status = 'leave', hours_worked = 0, note = 'On ' || NEW.leave_type || ' leave (Approved)';
            
            v_attendance_count := v_attendance_count + 1;
        END IF;
        v_curr_date := v_curr_date + interval '1 day';
    END LOOP;

    -- Deduct from leave_balance
    v_column_name := CASE NEW.leave_type
        WHEN 'paid' THEN 'paid_leave'
        WHEN 'sick' THEN 'sick_leave'
        WHEN 'casual' THEN 'casual_leave'
        ELSE NULL
    END;

    IF v_column_name IS NOT NULL THEN
        EXECUTE format('UPDATE public.leave_balance SET %I = GREATEST(%I - %s, 0) WHERE employee_id = %L AND year = %s', 
            v_column_name, v_column_name, NEW.total_days, NEW.employee_id, EXTRACT(YEAR FROM current_date));
    END IF;

    -- Notify employee
    v_msg := 'Your ' || NEW.leave_type || ' leave from ' || NEW.from_date || ' to ' || NEW.to_date || ' (' || NEW.total_days || ' day(s)) has been approved.';
    IF NEW.admin_comment IS NOT NULL AND NEW.admin_comment != '' THEN
        v_msg := v_msg || ' Comment: ' || NEW.admin_comment;
    END IF;

    IF public.should_notify(NEW.employee_id, 'leave_approved') THEN
        INSERT INTO public.notifications (
            user_id, type, title, message, cascade_id
        ) VALUES (
            NEW.employee_id, 'leave_approved', 'Leave Approved', v_msg, v_cascade_id
        );
    END IF;

    -- Calculate execution_ms
    v_end_time := clock_timestamp();

    -- Log
    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, entity_id, cascade_id, action_taken, execution_ms
    ) VALUES (
        'event', 'leave_approved', 'leave_request', NEW.id, v_cascade_id,
        'Updated ' || v_attendance_count || ' attendance rows and deducted balance for ' || v_emp_name,
        (EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000)::INT
    );

    RETURN NEW;
END;
$$;

-- Function: fn_on_leave_rejected
CREATE OR REPLACE FUNCTION public.fn_on_leave_rejected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := clock_timestamp();
    v_end_time TIMESTAMPTZ;
    v_emp_name TEXT := 'Unknown Employee';
    v_cascade_id VARCHAR(50) := 'cas-' || NEW.id;
    v_msg TEXT;
BEGIN
    -- ONLY fire when transitioning from pending to rejected
    IF OLD.status != 'pending' OR NEW.status != 'rejected' THEN
        RETURN NEW;
    END IF;

    -- Get employee name
    SELECT COALESCE(first_name || ' ' || last_name, 'Unknown Employee') INTO v_emp_name
    FROM public.profiles
    WHERE id = NEW.employee_id;

    IF v_emp_name IS NULL THEN
        v_emp_name := 'Unknown Employee';
    END IF;

    -- Notify employee
    v_msg := 'Your ' || NEW.leave_type || ' leave from ' || NEW.from_date || ' to ' || NEW.to_date || ' has been rejected.';
    IF NEW.admin_comment IS NOT NULL AND NEW.admin_comment != '' THEN
        v_msg := v_msg || ' Comment: ' || NEW.admin_comment;
    END IF;

    IF public.should_notify(NEW.employee_id, 'leave_rejected') THEN
        INSERT INTO public.notifications (
            user_id, type, title, message, cascade_id
        ) VALUES (
            NEW.employee_id, 'leave_rejected', 'Leave Rejected', v_msg, v_cascade_id
        );
    END IF;

    -- Calculate execution_ms
    v_end_time := clock_timestamp();

    -- Log
    INSERT INTO public.automation_logs (
        trigger_type, trigger_name, entity_type, entity_id, cascade_id, action_taken, execution_ms
    ) VALUES (
        'event', 'leave_rejected', 'leave_request', NEW.id, v_cascade_id,
        'Notified ' || v_emp_name || ' of leave rejection',
        (EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000)::INT
    );

    RETURN NEW;
END;
$$;

-- Wiring up the triggers
DROP TRIGGER IF EXISTS trg_leave_submitted ON public.leave_requests;
CREATE TRIGGER trg_leave_submitted
AFTER INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_leave_submitted();

DROP TRIGGER IF EXISTS trg_leave_approved ON public.leave_requests;
CREATE TRIGGER trg_leave_approved
AFTER UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_leave_approved();

DROP TRIGGER IF EXISTS trg_leave_rejected ON public.leave_requests;
CREATE TRIGGER trg_leave_rejected
AFTER UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_leave_rejected();
