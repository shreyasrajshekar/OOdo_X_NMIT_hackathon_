-- Table 1: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    cascade_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_all" ON public.notifications FOR INSERT WITH CHECK (true);

-- Table 2: automation_logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id BIGSERIAL PRIMARY KEY,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('scheduled', 'event', 'condition', 'manual')),
    trigger_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    action_taken TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'skipped', 'silent')),
    error_message TEXT,
    cascade_id VARCHAR(50),
    undo_sql TEXT,
    undone BOOLEAN DEFAULT FALSE,
    execution_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_trigger_type ON public.automation_logs(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at_desc ON public.automation_logs(created_at DESC);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "automation_logs_admin_all" ON public.automation_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Table 3: notification_caps
CREATE TABLE IF NOT EXISTS public.notification_caps (
    type VARCHAR(50) PRIMARY KEY,
    cooldown_hours INT NOT NULL,
    description TEXT
);

-- Note: No RLS needed for notification_caps
ALTER TABLE public.notification_caps DISABLE ROW LEVEL SECURITY;

INSERT INTO public.notification_caps (type, cooldown_hours, description) VALUES
    ('attendance_absent', 24, 'Max one absent notification per day'),
    ('consecutive_absence', 72, 'Max one alert per 3 days'),
    ('low_leave_balance', 720, 'Max one warning per 30 days'),
    ('stale_approval', 12, 'Max one reminder per 12 hours'),
    ('daily_digest', 24, 'Max one digest per day'),
    ('attendance_auto_checkout', 24, 'Max one auto-checkout per day'),
    ('leave_request', 1, 'No practical limit'),
    ('leave_approved', 1, 'No practical limit'),
    ('leave_rejected', 1, 'No practical limit'),
    ('salary_credited', 1, 'No practical limit'),
    ('morning_brief', 24, 'Max one brief per day')
ON CONFLICT (type) DO UPDATE SET
    cooldown_hours = EXCLUDED.cooldown_hours,
    description = EXCLUDED.description;

-- Function: should_notify
CREATE OR REPLACE FUNCTION public.should_notify(p_user_id UUID, p_type VARCHAR(50))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cooldown_hours INT;
    v_exists BOOLEAN;
BEGIN
    SELECT cooldown_hours INTO v_cooldown_hours
    FROM public.notification_caps
    WHERE type = p_type;

    IF v_cooldown_hours IS NULL THEN
        RETURN true;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p_user_id 
          AND type = p_type 
          AND created_at > now() - (v_cooldown_hours || ' hours')::INTERVAL
    ) INTO v_exists;

    IF v_exists THEN
        RETURN false;
    ELSE
        RETURN true;
    END IF;
END;
$$;
