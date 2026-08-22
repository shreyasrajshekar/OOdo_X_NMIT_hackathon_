# Dayflow HRMS — Build Guide & Agent Prompt

**Event:** Odoo Hackathon
**Deliverable:** Full-stack role-based HRMS web app
**Tagline:** Every workday, perfectly aligned.
**Status of this doc:** Source of truth. If code and this doc disagree, fix the code.

---

## 0. How to use this file

This doubles as a human plan and an agent prompt. When starting a Claude Code session, paste:

> Read `DAYFLOW_BUILD_GUIDE.md` in full before writing anything. You are building module `<X>`. Follow Section 5 (schema), Section 6 (business rules), Section 7 (RLS) and Section 4 (design tokens) exactly. Do not invent fields. Do not change the palette. Do not skip RLS. Ask before altering any existing migration.

Rules for every agent session:

1. Never edit an applied migration. Add a new one.
2. Every table gets RLS enabled the same commit it is created.
3. No hardcoded colours or font sizes. Tokens only.
4. If a requirement is ambiguous, implement the Odoo-native behaviour, not the convenient one.

---

## 1. Win condition

Judges are Odoo engineers. They wrote this spec and they know the real HR module cold. So:

- **Spec fidelity beats feature count.** Every mockup element must exist and work.
- **Correct domain semantics beat AI gimmicks.** A working salary rule engine scores higher than a chatbot.
- **Live proof beats claims.** Show enforcement happening, do not narrate it.

Positioning line for the pitch:

> "We built the payroll engine the spec implies but does not ask for."

The three moments the demo is built around:

1. Admin changes an employee's wage. Every salary component recomputes live, and the payslip PDF regenerates with new numbers.
2. Employee checks in on one screen. The status dot flips green on the admin's screen instantly, no refresh.
3. Judge tries to fetch another employee's salary row from the browser console. The database returns nothing, not the UI.

---

## 2. Locked scope

### 2.1 Must exist (spec + mockup, non-negotiable)

- [ ] Company sign-up (company name, admin name, email, phone, password, confirm, logo upload)
- [ ] Employee sign-in with system-generated Login ID or email
- [ ] No public employee registration. Admin/HR creates employees.
- [ ] System-generated Login ID (Section 6.1)
- [ ] System-generated first password, emailed, forced change on first login
- [ ] Role-based routing (Admin/HR vs Employee)
- [ ] Employee grid landing page with avatar cards, search, status dot per employee
- [ ] Card click opens read-only employee profile
- [ ] Avatar dropdown: My Profile, Log Out
- [ ] Profile tabs: Resume, Private Info, Salary Info, Security
- [ ] Salary Info tab visible only to Admin on other employees; visible to employee on self
- [ ] Salary component engine with percent-of-wage and percent-of-component computation
- [ ] PF (employee + employer) and Professional Tax config
- [ ] Check In / Check Out with green status dot on success
- [ ] Attendance list view (Date, Check In, Check Out, Work Hours, Extra Hours)
- [ ] Employee attendance filters: days present, leaves count, total working days
- [ ] Admin attendance view across all employees, date navigation
- [ ] Time Off: employee applies, sees own records only
- [ ] Time Off types: Paid, Sick, Unpaid. Sick supports certificate attachment.
- [ ] Leave balance display (Paid available, Sick available) driven by allocations, not constants
- [ ] Allocation tab for Admin (grant days to an employee for a validity period)
- [ ] Admin approve / reject with comment
- [ ] Employee calendar view of own time off
- [ ] Attendance is the basis of payroll. Unpaid leave and missing attendance reduce payable days.

### 2.2 Differentiators (build in this order, only after 2.1 is green)

1. **Payslip PDF generation.** Earnings from the component engine, payable days from attendance, LOP deduction, PF, professional tax, net pay. Downloadable.
2. **Realtime status dots.** Supabase Realtime on the attendance table. Check-in on one client updates every other client instantly.
3. **Attendance regularization.** Forgotten check-out silently costs money under this spec. Employee raises a correction request with a reason, HR approves, payable days recompute.
4. **Salary audit trail.** Every wage or component mutation logs actor, field, old value, new value, timestamp. Surfaces as a History section on Salary Info.
5. **Coverage overlay on approvals.** When HR opens a request, show who else on the team is off in that window.

### 2.3 Explicitly out of scope

Dark mode. Landing page. Chatbot. Biometric or QR check-in. Multi-currency. Mobile app. Anything requiring a new SDK after hour 12.

---

## 3. Stack (locked, no debate)

| Layer | Choice | Note |
| --- | --- | --- |
| Framework | Next.js 15, App Router, TypeScript | Server Actions for mutations |
| Styling | Tailwind v4 | Tokens in `@theme`, Section 4 |
| Components | shadcn/ui, restyled to tokens | Do not ship default shadcn look |
| DB | Supabase Postgres | RLS is the auth layer |
| Auth | Supabase Auth (email + password) | `employees.id` = `auth.users.id` |
| Realtime | Supabase Realtime | Attendance channel only |
| Storage | Supabase Storage | Buckets: `avatars`, `logos`, `leave-docs`, `payslips` |
| PDF | `@react-pdf/renderer` server-side | Payslip only |
| Icons | lucide-react | |
| Deploy | Vercel | Deploy at hour 3, not hour 23 |

Why not Prisma: RLS is the demo moment, and Supabase client plus generated types gets there faster. Use `supabase gen types typescript` and commit the output.

Environment:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only, employee creation + payslip generation
```

Service role key is used in exactly two server actions: `createEmployee` and `generatePayslip`. Nowhere else. Never in a client component.

---

## 4. Design system: 2B, Two Plums Tinted

One hue carries the whole identity. A lighter plum does the job an accent colour normally does. Success green is the only outside signal colour.

### 4.1 Tokens

```css
@theme {
  --color-primary:   #5C3D54;  /* nav, primary action, headline emphasis, selected */
  --color-plum:      #875A7B;  /* tints, chips, hover, secondary buttons, illustration */
  --color-ink:       #201A1E;  /* headlines and body */
  --color-line:      #EDE5EB;  /* dividers, table stripes, card fills */
  --color-paper:     #FBF9FB;  /* page background */
  --color-success:   #17A67F;  /* confirmation, positive delta only */
  --color-warn:      #B4552D;  /* clay, resolves the palette gap, 4.5:1 on paper */

  --font-display: "Manrope", sans-serif;
  --font-body:    "Source Serif 4", serif;
  --font-mono:    "IBM Plex Mono", monospace;

  --radius-pill: 999px;
  --radius-card: 4px;
}
```

### 4.2 Type scale

| Token | Face | Size / line-height | Tracking | Use |
| --- | --- | --- | --- | --- |
| Display | Manrope 800 | 44 / 1.04 | -0.03em | Page headline, empty states |
| Section | Manrope 800 | 30 / 1.08 | -0.02em | Dashboard section heads |
| Title | Manrope 700 | 25 / 1.1 | -0.02em | Card and panel titles |
| Body | Source Serif 4 400 | 15 / 1.6 | 0 | Descriptions, help text, resume prose |
| UI | Manrope 600 | 14 / 1.4 | 0 | Buttons, labels, table headers, form fields |
| Meta | IBM Plex Mono 500 | 11 / 1.3 | .12em, uppercase | Login IDs, status chips, eyebrows, dates |

### 4.3 Application rules

- Buttons and status chips: `border-radius: 999px`. Cards, panels, tables: `4px`.
- Primary button: filled `--color-primary`, paper text. Secondary: outlined plum at 35% border opacity.
- Table stripes and dividers: `--color-line`. Never a grey from Tailwind's default ramp.
- Every number column gets `font-variant-numeric: tabular-nums`. Salary tables especially.
- Login ID, employee ID, payslip reference: mono, uppercase, tracked. This is the signature move, identifiers look like records.
- Body text never below 13px. Dense screens keep 1.6 line-height.
- `--color-success` only for check-in confirmed, approved status, and positive salary delta. Nothing else.
- `--color-warn` for rejected, absent, and pending-too-long. Never plum for alarm.
- Never pure white or pure black anywhere.

### 4.4 Status dot vocabulary (from the mockup)

| State | Indicator | Meaning |
| --- | --- | --- |
| Present | Filled dot, `--color-success` | Checked in, in office |
| On leave | Plane icon, `--color-plum` | Approved time off today |
| Absent | Filled dot, `--color-warn` | No check-in and no approved leave |

### 4.5 Copy rules

Active voice. Buttons name the outcome: "Approve request", not "Submit". The action keeps its name through the flow, so "Approve request" produces "Request approved". Errors say what happened and what to do. Empty states invite the next action ("No time off yet. Apply for your first leave."). Never apologise in an error.

---

## 5. Data model

Full SQL. Apply as migrations in this order.

### 5.1 Enums and company

```sql
create type app_role as enum ('admin','employee');
create type attendance_status as enum ('present','absent','half_day','leave','holiday','weekend');
create type request_status as enum ('pending','approved','rejected');
create type computation_type as enum ('fixed','percent_of_wage','percent_of_component','balance');

create table companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  code         char(2) not null unique,      -- first two letters, used in login id
  logo_url     text,
  created_at   timestamptz default now()
);
```

### 5.2 Employees

```sql
create table employees (
  id                  uuid primary key references auth.users(id) on delete cascade,
  company_id          uuid not null references companies(id),
  login_id            text not null unique,
  first_name          text not null,
  last_name           text not null,
  work_email          text not null unique,
  personal_email      text,
  phone               text,
  role                app_role not null default 'employee',
  manager_id          uuid references employees(id),
  department          text,
  job_title           text,
  joining_date        date not null,
  dob                 date,
  gender              text,
  marital_status      text,
  nationality         text,
  address             text,
  avatar_url          text,
  bank_account_no     text,
  bank_name           text,
  ifsc_code           text,
  pan_no              text,
  uan_no              text,
  esic_code           text,
  must_change_password boolean not null default true,
  is_active           boolean not null default true,
  created_at          timestamptz default now()
);

create table employee_resume (
  employee_id     uuid primary key references employees(id) on delete cascade,
  about           text,
  love_about_job  text,
  interests       text,
  skills          jsonb default '[]',
  certifications  jsonb default '[]'
);
```

### 5.3 Salary

The wireframe's rules, encoded. `base_component_code` is what makes HRA-as-percent-of-Basic work.

```sql
create table payroll_config (
  company_id         uuid primary key references companies(id),
  pf_employee_rate   numeric(5,2) not null default 12.00,
  pf_employer_rate   numeric(5,2) not null default 12.00,
  professional_tax   numeric(10,2) not null default 200.00,
  pf_wage_ceiling    numeric(10,2) default 15000.00
);

create table salary_structures (
  id                    uuid primary key default gen_random_uuid(),
  employee_id           uuid not null references employees(id) on delete cascade,
  wage_type             text not null default 'fixed',
  monthly_wage          numeric(12,2) not null,
  yearly_wage           numeric(12,2) generated always as (monthly_wage * 12) stored,
  working_days_month    int not null default 22,
  break_hours           numeric(4,2) default 1.0,
  effective_from        date not null default current_date,
  is_current            boolean not null default true,
  created_at            timestamptz default now()
);

create table salary_components (
  id                    uuid primary key default gen_random_uuid(),
  structure_id          uuid not null references salary_structures(id) on delete cascade,
  code                  text not null,          -- BASIC, HRA, STD, PERF, LTA, FIXED
  name                  text not null,
  computation           computation_type not null,
  percent_value         numeric(6,3),           -- when percent_*
  base_component_code   text,                   -- when percent_of_component
  fixed_amount          numeric(12,2),          -- when fixed
  sequence              int not null,           -- resolution order
  unique (structure_id, code)
);
```

Default component set seeded on employee creation:

| Seq | Code | Name | Computation | Value |
| --- | --- | --- | --- | --- |
| 10 | BASIC | Basic Salary | percent_of_wage | 50% |
| 20 | HRA | House Rent Allowance | percent_of_component (BASIC) | 50% |
| 30 | STD | Standard Allowance | percent_of_wage | 4% |
| 40 | PERF | Performance Bonus | percent_of_wage | 8.33% |
| 50 | LTA | Leave Travel Allowance | percent_of_wage | 8.33% |
| 99 | FIXED | Fixed Allowance | balance | wage minus sum of all others |

### 5.4 Attendance

```sql
create table holidays (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id),
  holiday_date  date not null,
  name          text not null,
  unique (company_id, holiday_date)
);

create table attendance (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  work_date     date not null,
  check_in      timestamptz,
  check_out     timestamptz,
  work_hours    numeric(5,2),
  extra_hours   numeric(5,2) default 0,
  status        attendance_status not null default 'present',
  is_anomaly    boolean not null default false,   -- checked in, never checked out
  notes         text,
  unique (employee_id, work_date)
);

create table regularization_requests (
  id                  uuid primary key default gen_random_uuid(),
  attendance_id       uuid not null references attendance(id) on delete cascade,
  employee_id         uuid not null references employees(id),
  proposed_check_in   timestamptz,
  proposed_check_out  timestamptz,
  reason              text not null,
  status              request_status not null default 'pending',
  reviewed_by         uuid references employees(id),
  review_comment      text,
  created_at          timestamptz default now()
);
```

### 5.5 Time off (ledger, not counters)

```sql
create table leave_types (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references companies(id),
  code                 text not null,      -- PAID, SICK, UNPAID
  name                 text not null,
  is_paid              boolean not null default true,
  requires_attachment  boolean not null default false,
  unique (company_id, code)
);

-- credits
create table leave_allocations (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees(id) on delete cascade,
  leave_type_id  uuid not null references leave_types(id),
  days           numeric(5,2) not null,
  valid_from     date not null,
  valid_to       date not null,
  note           text,
  allocated_by   uuid references employees(id),
  created_at     timestamptz default now()
);

-- debits
create table leave_requests (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references employees(id) on delete cascade,
  leave_type_id   uuid not null references leave_types(id),
  start_date      date not null,
  end_date        date not null,
  day_count       numeric(5,2) not null,
  remarks         text,
  attachment_url  text,
  status          request_status not null default 'pending',
  reviewed_by     uuid references employees(id),
  review_comment  text,
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);
```

Balance is never stored. Always:

```sql
create view leave_balances as
select
  a.employee_id,
  a.leave_type_id,
  sum(a.days) as allocated,
  coalesce((
    select sum(r.day_count) from leave_requests r
    where r.employee_id = a.employee_id
      and r.leave_type_id = a.leave_type_id
      and r.status = 'approved'
  ), 0) as taken,
  sum(a.days) - coalesce((
    select sum(r.day_count) from leave_requests r
    where r.employee_id = a.employee_id
      and r.leave_type_id = a.leave_type_id
      and r.status = 'approved'
  ), 0) as available
from leave_allocations a
where current_date between a.valid_from and a.valid_to
group by a.employee_id, a.leave_type_id;
```

### 5.6 Payslips and audit

```sql
create table payslips (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees(id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  working_days   numeric(5,2) not null,
  payable_days   numeric(5,2) not null,
  lop_days       numeric(5,2) not null default 0,
  earnings       jsonb not null,      -- [{code,name,full,prorated}]
  deductions     jsonb not null,      -- [{code,name,amount}]
  gross          numeric(12,2) not null,
  total_deduct   numeric(12,2) not null,
  net_pay        numeric(12,2) not null,
  pdf_url        text,
  generated_at   timestamptz default now(),
  unique (employee_id, period_start)
);

create table audit_log (
  id           bigserial primary key,
  company_id   uuid not null references companies(id),
  actor_id     uuid references employees(id),
  entity       text not null,        -- 'salary_structures', 'employees', ...
  entity_id    uuid not null,
  field        text not null,
  old_value    text,
  new_value    text,
  changed_at   timestamptz default now()
);
```

Attach a trigger to `salary_structures` and `salary_components` that writes a row per changed field. Do not do this in application code, a judge can bypass application code.

---

## 6. Business rules

These are where the marks are. Implement each as a pure, unit-testable function.

### 6.1 Login ID generation

Format, per the mockup note:

```
[COMPANY_CODE 2][FIRST_NAME 2][LAST_NAME 2][YEAR_OF_JOINING 4][SERIAL 4]
```

Example: Odoo India, employee Nikhil Ammisetty, joined 2026, third joiner that year:

```
OD NI AM 2026 0003   ->   ODNIAM20260003
```

Rules:

- Uppercase, strip non-alpha characters from names.
- If a name is a single character, right-pad with `X`.
- Serial is per company per joining year, zero-padded to 4.
- Generation must be atomic. Use a Postgres function with a row lock or an `insert ... on conflict` retry loop. Two admins creating employees at once must not collide.

**Verify the exact segment order against the problem statement before building.** The scan is low resolution. If the actual order differs, only this function changes.

### 6.2 Employee creation flow

1. Admin fills the employee form (name, work email, joining date, department, job title, wage).
2. Server action (service role) generates login ID, generates a random 12-character password.
3. Creates `auth.users`, then `employees` row with `must_change_password = true`.
4. Seeds the six default salary components for the new structure.
5. Seeds default leave allocations for the current year (Paid 24, Sick 9, per the mockup).
6. Emails credentials. If email is not wired, show the generated password in a one-time modal with a copy button and a warning that it will not be shown again. That is an acceptable hackathon fallback and demos fine.
7. First login redirects to a forced password change screen. No other route is reachable until changed.

### 6.3 Salary component resolution

Dependency graph, resolved in `sequence` order.

```
resolve(wage, components):
  resolved = {}
  for c in components sorted by sequence:
    switch c.computation:
      fixed:                 amount = c.fixed_amount
      percent_of_wage:       amount = wage * c.percent_value / 100
      percent_of_component:  amount = resolved[c.base_component_code] * c.percent_value / 100
      balance:               amount = wage - sum(resolved.values())
    resolved[c.code] = round2(amount)
  return resolved
```

Worked example from the spec, use this as your test case:

- Wage = 50,000. Basic = 50% of wage = **25,000**. HRA = 50% of Basic = **12,500**.
- Standard 4% of wage = 2,000. Performance 8.33% = 4,165. LTA 8.33% = 4,165.
- Fixed Allowance = 50,000 minus (25,000 + 12,500 + 2,000 + 4,165 + 4,165) = **2,170**.
- Gross = 50,000 exactly.

Validation, enforced in the UI and in a DB check:

- Sum of all components must equal the wage. If a percent edit pushes the total over 100%, block the save and show which component overflows.
- If a `percent_of_component` references a code with a higher sequence number, reject. No forward references.
- Changing the wage recomputes everything live, no save required to see the new numbers.

Deductions, computed after earnings:

- PF employee = `pf_employee_rate%` of BASIC (cap at `pf_wage_ceiling` if the ceiling is enabled).
- PF employer = same rate, shown but not deducted from net.
- Professional tax = flat `professional_tax`.
- Net = gross (prorated) minus PF employee minus professional tax.

### 6.4 Attendance computation

- `work_hours = (check_out - check_in) - break_hours`, floored at 0.
- `extra_hours = max(0, work_hours - standard_day_hours)` where standard day hours defaults to 8.
- Status derivation for a given date:
  - Company holiday → `holiday`
  - Weekend → `weekend`
  - Approved leave covering the date → `leave`
  - Attendance row with work_hours >= 4 and < standard → `half_day`
  - Attendance row with work_hours >= standard → `present`
  - No row, no leave, working day → `absent`
- Checked in but never checked out by end of day → `is_anomaly = true`, surfaced to the employee as a regularization prompt. Do not silently mark absent.

### 6.5 Payable days and LOP

```
working_days   = calendar days in period, minus weekends, minus company holidays
lop_days       = absent days + approved unpaid-leave days + unresolved anomaly days
payable_days   = working_days - lop_days
per_day_rate   = component_amount / working_days
prorated       = per_day_rate * payable_days
```

Half-days count 0.5 toward LOP. Paid and sick leave do not reduce payable days. Unpaid leave does. This is the causal chain the demo shows on stage.

### 6.6 Time off rules

- Day count excludes weekends and company holidays by default.
- **Sandwich rule:** if leave falls on the working day before and the working day after a weekend or holiday, the intervening non-working days count as leave. Apply to unpaid leave only, and make it a config flag so you can toggle it on stage.
- Sick leave requires an attachment when the request exceeds 2 days.
- Applying is blocked when `available` balance in `leave_balances` is insufficient, with a message naming the shortfall. Unpaid leave has no balance check.
- Approving writes the debit implicitly (the view recomputes). Never mutate a stored balance.
- Overlapping requests for the same employee are rejected at insert time with an exclusion constraint.

### 6.7 Coverage overlay

When an admin opens a pending request, query approved leave for the same department overlapping the date range. Render as "3 of 5 in Engineering are off 12 to 14 Sep". Purely informational, does not block.

---

## 7. Row Level Security

This is a scored feature, not plumbing. Write it early.

Helper functions:

```sql
create or replace function auth_role() returns app_role
language sql stable security definer as $$
  select role from employees where id = auth.uid()
$$;

create or replace function auth_company() returns uuid
language sql stable security definer as $$
  select company_id from employees where id = auth.uid()
$$;
```

Policy matrix:

| Table | Employee | Admin |
| --- | --- | --- |
| `employees` | select all in own company (directory needs it), update only own `phone`, `address`, `avatar_url` | full within company |
| `employee_resume` | select all in company, update own | full within company |
| `salary_structures` | select **own row only** | full within company |
| `salary_components` | select only where parent structure is own | full within company |
| `attendance` | select own, insert own for today only, no update | full within company |
| `leave_requests` | select own, insert own, update own only while `pending` | full within company |
| `leave_allocations` | select own | full within company |
| `payslips` | select own | full within company |
| `audit_log` | no access | select within company |

Example, the one you will demo:

```sql
alter table salary_structures enable row level security;

create policy salary_self_read on salary_structures
  for select using (
    employee_id = auth.uid() or auth_role() = 'admin'
  );

create policy salary_admin_write on salary_structures
  for all using (
    auth_role() = 'admin'
    and employee_id in (select id from employees where company_id = auth_company())
  );
```

Every table also gets a company scoping clause. Multi-tenancy is free once companies exist, and it is the difference between a school project and a product.

---

## 8. Screens

Route map:

```
/(auth)/sign-in
/(auth)/sign-up               company + admin creation only
/(auth)/change-password       forced on first login
/(app)/employees              landing for both roles, avatar grid + search + status dots
/(app)/employees/[id]         read-only profile (Resume / Private Info / Salary Info / Security)
/(app)/me                     own profile, editable fields only
/(app)/attendance             role-aware list view
/(app)/time-off               role-aware, list + calendar
/(app)/time-off/allocation    admin only
/(app)/payroll/[id]           admin: structure editor. employee: read-only own
```

Top nav, per the mockup: Company Logo | Employees | Attendance | Time Off | (right) avatar with dropdown.

### 8.1 Employee grid

Avatar card per employee. Name, job title, department. Status dot top-right per Section 4.4. Search filters live. `NEW` button, admin only. Cards click through to read-only profile. Do not make the grid a table, the mockup is explicit about cards.

### 8.2 Check In / Check Out

Two buttons stacked with the current session time between them. On successful check-in the dot animates to green once, 200ms, then holds. Reduced motion respected. This is the only animation in the app.

### 8.3 Attendance list

Columns: Date, Check In, Check Out, Work Hours, Extra Hours. Tabular numerals. Date navigation with prev/next and a Day/Week/Month toggle. Employee header shows three counters: days present, leaves taken, total working days. Anomaly rows get a clay left border and a "Request correction" action.

### 8.4 Time off

Employee: two balance cards (Paid available, Sick available), a `NEW` button, own request list, and a year calendar with colour-coded days. Admin: all requests with approve and reject buttons inline, plus the Allocation tab.

Request modal fields, exactly as mocked: Employee, Time Off Type, Validity Period (From, To), Allocation (Days, auto-computed and editable for half days), Attachment. Buttons: Submit, Discard.

### 8.5 Salary Info

Left column: wage type, monthly wage, yearly wage (read-only, derived), working days per month, break hours. Centre: component table with computation type, value, and computed amount, live-recalculating. Right: PF contribution and tax deductions. Below: History (audit trail). Employee sees this read-only on their own profile and cannot reach it for anyone else.

---

## 9. Build order

Deploy to Vercel at the end of Phase 1. Never later.

| Phase | Hours | Output |
| --- | --- | --- |
| 0 | 0 to 1 | Repo, Supabase project, Tailwind tokens, nav shell, deployed hello world |
| 1 | 1 to 4 | Full schema + RLS + seed script, types generated, sign-up and sign-in working |
| 2 | 4 to 8 | Employee CRUD, login ID generator, forced password change, employee grid, profile tabs |
| 3 | 8 to 13 | Salary structure editor and component engine with live recompute |
| 4 | 13 to 17 | Attendance: check in/out, list views, status derivation, anomaly flag |
| 5 | 17 to 21 | Time off: apply, allocate, approve, balances view, calendar |
| 6 | 21 to 26 | Payable days + payslip PDF |
| 7 | 26 to 30 | Realtime dots, regularization, audit trail UI, coverage overlay |
| 8 | 30 to 34 | Seed realistic data, polish empty states, mobile pass |
| 9 | 34 to 38 | Demo script, record video, README, submit |

If you are behind at hour 21, cut in this order: coverage overlay, then audit trail UI (keep the trigger, it still logs), then regularization. Never cut the payslip.

Parallelisation for a team of 3 or 4:

- **A:** schema, RLS, auth, employee CRUD, login ID
- **B:** salary engine, payroll config, payslip PDF
- **C:** attendance and time off
- **D:** design system implementation, shared components, empty states, seed data, demo

Shared component library gets built by D in Phase 1 so nobody hand-rolls a button.

---

## 10. Seed data

Empty screens lose. Seed before you polish.

- 1 company: Odoo India, code `OD`, logo uploaded.
- 25 employees across 4 departments, realistic Indian names, joining dates spread over 2022 to 2026 so the login ID serial is visibly working.
- 1 admin, 1 manager per department, rest employees.
- 6 months of attendance: mostly present, a scatter of half days, 3 absences, 2 unresolved anomalies (for the regularization demo).
- Leave allocations: Paid 24, Sick 9 per employee per year.
- 12 approved leave requests spread across the year, 4 pending (so the approval queue is not empty on stage).
- Wages between 35,000 and 180,000 so the component engine shows range.
- 3 company holidays in the current month.

Write this as `scripts/seed.ts`, idempotent, runnable in under 30 seconds. You will run it more than once.

---

## 11. Demo script (3 minutes, rehearse twice)

**0:00 Open on the employee grid, already populated.** One line: "Dayflow is an HRMS where attendance is not a log, it is the input to payroll."

**0:20 Two browsers side by side.** Employee checks in. The dot flips green on the admin's screen with no refresh. Say nothing, let it land.

**0:45 Salary Info.** Change the wage from 50,000 to 80,000. Every component recomputes live. Point at Fixed Allowance absorbing the balance. "Components reference each other. HRA is 50% of Basic, not of wage."

**1:20 Approve an unpaid leave request.** Cut to the payslip. Payable days dropped, net pay dropped. "The spec says attendance is the basis for payroll. This is that sentence, working."

**1:50 The anomaly.** Show an employee who forgot to check out. "Under a naive implementation this person silently loses a day of pay. We added regularization." Raise it, approve it, payable days correct themselves.

**2:20 RLS.** Open devtools as the employee, query another employee's salary row through the API. Empty. "Access control is in the database, not in the UI. You cannot get around it by opening the network tab."

**2:45 Audit trail.** Show the salary History with old and new values. "Every salary change is attributable."

Close with the positioning line. Do not list features. Do not say "in the future we would".

---

## 12. Anti-patterns

- Building a marketing landing page.
- A chatbot in the corner.
- Dark mode toggle.
- Storing `leave_balance` as an integer column.
- Six hardcoded salary fields instead of a component table.
- Hiding the Salary Info tab in React while the API still returns the row.
- Public employee sign-up because it was the default template.
- Empty tables during the demo.
- Starting the video at hour 36.
- Any dependency added after hour 20.
- Using default shadcn styling. It is instantly recognisable and reads as "we did not design this."

---

## 13. README requirements

Judges read this before they run anything.

1. One-paragraph what it is, leading with the payroll-from-attendance thesis.
2. Two GIFs: live component recompute, and the payslip changing after leave approval.
3. Demo credentials for both roles, visible, working.
4. Setup in under 5 commands.
5. A short "Design decisions" section covering the component dependency graph, the leave ledger, and RLS. This is where you show your reasoning to a judge who will not read your code.
6. Schema diagram.

---

## 14. Open items to confirm before hour 2

- [ ] Exact Login ID segment order and company code length
- [ ] Whether Odoo expects an actual Odoo module integration or a standalone app (changes nothing structurally, but affects pitch framing)
- [ ] Judging rubric weights, especially whether database design is scored separately
- [ ] Submission format: repo, video length, deck required
- [ ] Whether email sending is expected or a modal fallback is acceptable
