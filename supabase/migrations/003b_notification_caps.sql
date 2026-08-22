-- Create notification_logs table to track sent notifications for cooldown checks
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for efficient cooldown lookups
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_type_time ON public.notification_logs(user_id, type, sent_at DESC);

-- Create notification_caps table
CREATE TABLE IF NOT EXISTS public.notification_caps (
    type VARCHAR(50) PRIMARY KEY,
    cooldown_hours INT NOT NULL,
    description TEXT
);

-- Enable RLS and add policy
ALTER TABLE public.notification_caps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_caps_selectable_by_anyone"
    ON public.notification_caps FOR SELECT
    USING (true);

-- Seed the notification caps
INSERT INTO public.notification_caps (type, cooldown_hours, description) VALUES
    ('attendance_absent', 24, 'Daily cap for marked absent'),
    ('consecutive_absence', 72, 'Cap for consecutive absence warning'),
    ('low_leave_balance', 720, 'Cap for low leave balance warning (30 days)'),
    ('stale_approval', 12, 'Cap for stale approval reminders'),
    ('daily_digest', 24, 'Daily digest cap'),
    ('attendance_auto_checkout', 24, 'Cap for auto checkout notifications'),
    ('leave_request', 1, 'Leave request cap'),
    ('leave_approved', 1, 'Leave approved cap'),
    ('leave_rejected', 1, 'Leave rejected cap'),
    ('salary_credited', 1, 'Salary credited cap'),
    ('morning_brief', 24, 'Morning brief cap')
ON CONFLICT (type) DO UPDATE SET
    cooldown_hours = EXCLUDED.cooldown_hours,
    description = EXCLUDED.description;

-- Create the should_notify function
CREATE OR REPLACE FUNCTION public.should_notify(p_user_id UUID, p_type VARCHAR(50))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cooldown_hours INT;
    v_last_sent TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the cooldown for this notification type
    SELECT cooldown_hours INTO v_cooldown_hours
    FROM public.notification_caps
    WHERE type = p_type;

    -- If no cap exists, allow the notification
    IF v_cooldown_hours IS NULL THEN
        RETURN true;
    END IF;

    -- Get the last time this notification was sent to this user
    SELECT sent_at INTO v_last_sent
    FROM public.notification_logs
    WHERE user_id = p_user_id AND type = p_type
    ORDER BY sent_at DESC
    LIMIT 1;

    -- If never sent, allow the notification
    IF v_last_sent IS NULL THEN
        RETURN true;
    END IF;

    -- Check if the cooldown period has expired
    IF v_last_sent + (v_cooldown_hours || ' hours')::INTERVAL <= now() THEN
        RETURN true;
    END IF;

    -- Cooldown hasn't expired
    RETURN false;
END;
$$;
