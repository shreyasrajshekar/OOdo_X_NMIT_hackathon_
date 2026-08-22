-- Step 1: Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    department VARCHAR(50),
    position VARCHAR(100),
    join_date DATE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Stores extended user profile information for all employees and admins.';

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Step 3: Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    hours_worked DECIMAL(4,2),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, date)
);
COMMENT ON TABLE public.attendance IS 'Stores daily attendance logs including check-in/out times and status.';

CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance
CREATE POLICY "attendance_select_own" ON public.attendance FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "attendance_select_admin" ON public.attendance FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "attendance_insert_own" ON public.attendance FOR INSERT WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "attendance_update_own" ON public.attendance FOR UPDATE USING (auth.uid() = employee_id);
CREATE POLICY "attendance_update_admin" ON public.attendance FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Step 4: Create leave_balance table
CREATE TABLE IF NOT EXISTS public.leave_balance (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    year INT NOT NULL,
    paid_leave INT DEFAULT 12,
    sick_leave INT DEFAULT 10,
    casual_leave INT DEFAULT 6,
    unpaid_leave INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, year)
);
COMMENT ON TABLE public.leave_balance IS 'Tracks the remaining leave balances for employees by year.';

CREATE INDEX IF NOT EXISTS idx_leave_balance_employee_id ON public.leave_balance(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balance_year ON public.leave_balance(year);

ALTER TABLE public.leave_balance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_balance
CREATE POLICY "leave_balance_select_own" ON public.leave_balance FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "leave_balance_select_admin" ON public.leave_balance FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "leave_balance_all_admin" ON public.leave_balance FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Step 5: Create leave_requests table
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL CHECK (leave_type IN ('paid', 'sick', 'unpaid', 'casual')),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days INT NOT NULL CHECK (total_days > 0),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (from_date <= to_date)
);
COMMENT ON TABLE public.leave_requests IS 'Stores employee leave applications and their approval status.';

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_from_date ON public.leave_requests(from_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON public.leave_requests(created_at);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_requests
CREATE POLICY "leave_requests_select_own" ON public.leave_requests FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "leave_requests_select_admin" ON public.leave_requests FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "leave_requests_insert_own" ON public.leave_requests FOR INSERT WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "leave_requests_update_admin" ON public.leave_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Step 6: Create salary_structure table
CREATE TABLE IF NOT EXISTS public.salary_structure (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    basic DECIMAL(10,2) NOT NULL,
    hra DECIMAL(10,2) NOT NULL,
    da DECIMAL(10,2) NOT NULL,
    allowance DECIMAL(10,2) NOT NULL,
    pf_rate DECIMAL(5,2) DEFAULT 12.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.salary_structure IS 'Defines the base salary breakdown and rates for each employee.';

CREATE INDEX IF NOT EXISTS idx_salary_structure_employee_id ON public.salary_structure(employee_id);

ALTER TABLE public.salary_structure ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_structure
CREATE POLICY "salary_structure_select_own" ON public.salary_structure FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "salary_structure_all_admin" ON public.salary_structure FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Step 7: Create salary_records table
CREATE TABLE IF NOT EXISTS public.salary_records (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INT NOT NULL,
    basic DECIMAL(10,2) NOT NULL,
    hra DECIMAL(10,2) NOT NULL,
    da DECIMAL(10,2) NOT NULL,
    allowance DECIMAL(10,2) NOT NULL,
    pf_deduction DECIMAL(10,2) DEFAULT 0,
    tax_deduction DECIMAL(10,2) DEFAULT 0,
    other_deduction DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
    paid_on DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);
COMMENT ON TABLE public.salary_records IS 'Monthly payroll records showing calculated earnings and deductions.';

CREATE INDEX IF NOT EXISTS idx_salary_records_employee_id ON public.salary_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_month_year ON public.salary_records(month, year);
CREATE INDEX IF NOT EXISTS idx_salary_records_status ON public.salary_records(status);

ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salary_records
CREATE POLICY "salary_records_select_own" ON public.salary_records FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY "salary_records_all_admin" ON public.salary_records FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
