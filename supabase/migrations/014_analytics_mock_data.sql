-- Migration: 014_analytics_mock_data.sql
-- Generates historical analytics data for the real employees in profiles.

SELECT setseed(0.42);

DO $$
DECLARE
    v_emp RECORD;
    v_admin_id UUID;
    v_date DATE;
    v_month_start DATE;
    v_month_end DATE;
    v_month INT;
    v_year INT;
    v_current_date DATE := CURRENT_DATE;
    
    v_status TEXT;
    v_check_in TIMESTAMP WITH TIME ZONE;
    v_check_out TIMESTAMP WITH TIME ZONE;
    v_hours NUMERIC;
    
    v_leave_type TEXT;
    v_leave_status TEXT;
    v_leave_from DATE;
    v_leave_to DATE;
    v_leave_days INT;
    
    v_basic NUMERIC;
    v_hra NUMERIC;
    v_da NUMERIC;
    v_allowance NUMERIC;
    v_pf_rate NUMERIC;
    v_tax_rate NUMERIC;
    
    v_present_days INT;
    v_approved_leaves INT;
    v_absent_days INT;
    v_working_days INT;
    v_per_day NUMERIC;
    v_absence_deduction NUMERIC;
    v_pf_deduction NUMERIC;
    v_tax_deduction NUMERIC;
    v_gross NUMERIC;
    v_net NUMERIC;
    v_record_status TEXT;
    
    v_reason TEXT;
    v_reasons TEXT[] := ARRAY['Personal work', 'Family function', 'Not feeling well', 'Doctor appointment', 'Travel', 'Fever', 'Moving to new house', 'Marriage ceremony'];
BEGIN
    -- Get one admin ID for approvals
    SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' AND is_active = true LIMIT 1;

    -- Step 1 & 6: Ensure salary_structure and leave_balance exist
    FOR v_emp IN SELECT id FROM public.profiles WHERE role = 'employee' AND is_active = true LOOP
        
        -- Randomize salary
        v_basic := (floor(random() * 11) * 5000) + 25000; -- 25k to 75k in 5k increments
        v_hra := (round((v_basic * 0.4) / 500) * 500);
        v_da := (round((v_basic * 0.2) / 500) * 500);
        v_allowance := (round((v_basic * 0.1) / 500) * 500);
        v_pf_rate := 12;
        v_tax_rate := floor(random() * 16) + 5; -- 5 to 20

        INSERT INTO public.salary_structure (employee_id, basic, hra, da, allowance, pf_rate, tax_rate, updated_by)
        VALUES (v_emp.id, v_basic, v_hra, v_da, v_allowance, v_pf_rate, v_tax_rate, COALESCE(v_admin_id, v_emp.id))
        ON CONFLICT (employee_id) DO NOTHING;
        
        -- Leave balance for current year
        INSERT INTO public.leave_balance (employee_id, year, paid_leave, sick_leave, casual_leave)
        VALUES (v_emp.id, extract(year from v_current_date)::int, 12, 10, 6)
        ON CONFLICT (employee_id, year) DO NOTHING;

    END LOOP;

    -- Step 2 & 3: Generate Attendance & Leaves for last 6 months
    -- We'll loop through the last 6 months
    FOR i IN 0..5 LOOP
        v_month_start := date_trunc('month', v_current_date - (i || ' months')::interval)::date;
        v_month_end := (v_month_start + interval '1 month - 1 day')::date;
        
        -- Generate leaves per employee in this month
        FOR v_emp IN SELECT id FROM public.profiles WHERE role = 'employee' AND is_active = true LOOP
            
            -- Generate 1 or 2 leave requests in this month (random)
            FOR j IN 1..(floor(random() * 2) + 1)::int LOOP
                -- 40% sick, 30% paid, 20% casual, 10% unpaid
                v_basic := random();
                IF v_basic < 0.4 THEN v_leave_type := 'sick';
                ELSIF v_basic < 0.7 THEN v_leave_type := 'paid';
                ELSIF v_basic < 0.9 THEN v_leave_type := 'casual';
                ELSE v_leave_type := 'unpaid'; END IF;
                
                -- Random from_date in this month
                v_leave_from := v_month_start + (floor(random() * (v_month_end - v_month_start + 1))::int);
                -- Ensure weekday
                WHILE extract(isodow from v_leave_from) > 5 LOOP
                    v_leave_from := v_leave_from + 1;
                END LOOP;
                
                -- 1 to 3 days
                v_leave_days := floor(random() * 3) + 1;
                v_leave_to := v_leave_from + (v_leave_days - 1);
                WHILE extract(isodow from v_leave_to) > 5 LOOP
                    v_leave_to := v_leave_to + 1;
                END LOOP;
                
                v_reason := v_reasons[(floor(random() * array_length(v_reasons, 1)) + 1)::int];
                
                v_basic := random();
                IF v_basic < 0.7 THEN v_leave_status := 'approved';
                ELSIF v_basic < 0.85 THEN v_leave_status := 'rejected';
                ELSE v_leave_status := 'pending'; END IF;
                
                INSERT INTO public.leave_requests (
                    employee_id, leave_type, from_date, to_date, total_days, reason, 
                    status, approved_by, admin_comment, created_at, updated_at
                ) VALUES (
                    v_emp.id, v_leave_type, v_leave_from, v_leave_to, v_leave_days, v_reason,
                    v_leave_status, 
                    CASE WHEN v_leave_status != 'pending' THEN v_admin_id ELSE NULL END,
                    CASE WHEN v_leave_status = 'approved' THEN 'Approved' 
                         WHEN v_leave_status = 'rejected' THEN 'Not approved due to project deadline' 
                         ELSE NULL END,
                    (v_leave_from - (floor(random() * 5) + 1 || ' days')::interval)::timestamp,
                    CASE WHEN v_leave_status != 'pending' THEN (v_leave_from - (floor(random() * 2) || ' days')::interval)::timestamp ELSE (v_leave_from - (floor(random() * 5) + 1 || ' days')::interval)::timestamp END
                ) ON CONFLICT DO NOTHING;
            END LOOP;

            -- Generate Attendance for each weekday in this month
            v_date := v_month_start;
            WHILE v_date <= v_month_end AND v_date <= v_current_date LOOP
                IF extract(isodow from v_date) <= 5 THEN
                    
                    -- Check if employee has an approved leave on this date
                    IF EXISTS (SELECT 1 FROM public.leave_requests WHERE employee_id = v_emp.id AND status = 'approved' AND v_date BETWEEN from_date AND to_date) THEN
                        v_status := 'leave';
                        v_check_in := NULL;
                        v_check_out := NULL;
                        v_hours := 0;
                    ELSE
                        v_basic := random();
                        IF v_basic < 0.80 THEN v_status := 'present';
                        ELSIF v_basic < 0.90 THEN v_status := 'absent';
                        ELSIF v_basic < 0.97 THEN v_status := 'half_day';
                        ELSE v_status := 'leave'; END IF;
                        
                        IF v_status IN ('present', 'half_day') THEN
                            -- Check in between 8:30 and 10:00
                            v_check_in := (v_date + interval '8 hours 30 minutes' + (random() * 90 || ' minutes')::interval) AT TIME ZONE 'UTC';
                            -- Check out between 17:00 and 19:00
                            v_check_out := (v_date + interval '17 hours' + (random() * 120 || ' minutes')::interval) AT TIME ZONE 'UTC';
                            v_hours := ROUND(extract(epoch from (v_check_out - v_check_in))/3600, 2);
                            IF v_status = 'half_day' THEN
                                v_hours := ROUND(v_hours / 2, 2);
                                v_check_out := v_check_in + (v_hours || ' hours')::interval;
                            END IF;
                        ELSE
                            v_check_in := NULL;
                            v_check_out := NULL;
                            v_hours := 0;
                        END IF;
                    END IF;
                    
                    INSERT INTO public.attendance (employee_id, date, status, check_in, check_out, hours_worked)
                    VALUES (v_emp.id, v_date, v_status, v_check_in, v_check_out, v_hours)
                    ON CONFLICT (employee_id, date) DO NOTHING;
                    
                END IF;
                v_date := v_date + 1;
            END LOOP;
        END LOOP;
    END LOOP;

    -- Step 4: Generate Salary Records for the last 6 COMPLETED months
    FOR i IN 1..6 LOOP
        v_month_start := date_trunc('month', v_current_date - (i || ' months')::interval)::date;
        v_month_end := (v_month_start + interval '1 month - 1 day')::date;
        v_month := extract(month from v_month_start)::int;
        v_year := extract(year from v_month_start)::int;
        
        -- working days
        v_working_days := 0;
        v_date := v_month_start;
        WHILE v_date <= v_month_end LOOP
            IF extract(isodow from v_date) <= 5 THEN
                v_working_days := v_working_days + 1;
            END IF;
            v_date := v_date + 1;
        END LOOP;

        FOR v_emp IN SELECT id FROM public.profiles WHERE role = 'employee' AND is_active = true LOOP
            
            SELECT basic, hra, da, allowance, pf_rate, tax_rate 
            INTO v_basic, v_hra, v_da, v_allowance, v_pf_rate, v_tax_rate
            FROM public.salary_structure WHERE employee_id = v_emp.id;

            IF FOUND THEN
                SELECT COUNT(*) INTO v_present_days FROM public.attendance 
                WHERE employee_id = v_emp.id AND date >= v_month_start AND date <= v_month_end AND status IN ('present', 'half_day');
                
                SELECT COALESCE(SUM(total_days), 0) INTO v_approved_leaves FROM public.leave_requests 
                WHERE employee_id = v_emp.id AND status = 'approved' AND from_date >= v_month_start AND from_date <= v_month_end;
                
                v_absent_days := GREATEST(v_working_days - v_present_days - v_approved_leaves, 0);
                
                v_gross := v_basic + v_hra + v_da + v_allowance;
                v_per_day := v_basic / GREATEST(v_working_days, 1);
                
                v_absence_deduction := ROUND(v_absent_days * v_per_day, 2);
                v_pf_deduction := ROUND(v_basic * v_pf_rate / 100, 2);
                v_tax_deduction := ROUND(v_gross * v_tax_rate / 100, 2);
                
                v_net := ROUND(v_gross - v_absence_deduction - v_pf_deduction - v_tax_deduction, 2);
                
                IF i = 1 THEN
                    v_record_status := 'processed';
                ELSE
                    v_record_status := 'paid';
                END IF;
                
                INSERT INTO public.salary_records (
                    employee_id, month, year, basic, hra, da, allowance,
                    pf_deduction, tax_deduction, other_deduction, net_pay,
                    status, paid_on
                ) VALUES (
                    v_emp.id, v_month, v_year, v_basic, v_hra, v_da, v_allowance,
                    v_pf_deduction, v_tax_deduction, v_absence_deduction, v_net,
                    v_record_status, 
                    CASE WHEN v_record_status = 'paid' THEN (v_month_end + interval '1 day')::date ELSE NULL END
                ) ON CONFLICT (employee_id, month, year) DO NOTHING;
            END IF;
            
        END LOOP;
    END LOOP;

    -- Step 5: Update leave_balance to reflect approved leaves for current year
    FOR v_emp IN SELECT id FROM public.profiles WHERE role = 'employee' AND is_active = true LOOP
        
        -- sum approved types
        SELECT 
            COALESCE(SUM(total_days) FILTER (WHERE leave_type = 'paid'), 0),
            COALESCE(SUM(total_days) FILTER (WHERE leave_type = 'sick'), 0),
            COALESCE(SUM(total_days) FILTER (WHERE leave_type = 'casual'), 0)
        INTO v_working_days, v_present_days, v_absent_days -- reusing variables
        FROM public.leave_requests
        WHERE employee_id = v_emp.id AND status = 'approved' AND extract(year from from_date) = extract(year from v_current_date);
        
        UPDATE public.leave_balance
        SET 
            paid_leave = GREATEST(12 - v_working_days, 0),
            sick_leave = GREATEST(10 - v_present_days, 0),
            casual_leave = GREATEST(6 - v_absent_days, 0)
        WHERE employee_id = v_emp.id AND year = extract(year from v_current_date)::int;
        
    END LOOP;

END $$;

-- Verification queries
-- SELECT 'attendance' as table_name, COUNT(*) FROM public.attendance;
-- SELECT 'leave_requests' as table_name, COUNT(*) FROM public.leave_requests;
-- SELECT 'salary_records' as table_name, COUNT(*) FROM public.salary_records;
-- SELECT month, year, COUNT(*), SUM(net_pay) FROM public.salary_records GROUP BY month, year ORDER BY year, month;
