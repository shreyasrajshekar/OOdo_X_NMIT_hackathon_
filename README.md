# Dayflow — HRMS

> Every workday, perfectly aligned.

A role-based HR management system where **attendance is the input to payroll, not just a
log of it**. HR creates people, sets salary structures and approves leave; employees check
in, apply for time off, and can see their own record and nobody else's — enforced in the
database, not in the UI.

Built for the Odoo × NMIT hackathon. `DAYFLOW_BUILD_GUIDE.md` holds the full spec and
`2b-two-plums-design-system.md` the visual language.

---

## Contents

- [The idea in three moments](#the-idea-in-three-moments)
- [Feature tour](#feature-tour)
  - [Authentication and identity](#1-authentication-and-identity)
  - [Onboarding and the credentials email](#2-onboarding-and-the-credentials-email)
  - [My Workspace (employee home)](#3-my-workspace-employee-home)
  - [Employee directory](#4-employee-directory-adminhr)
  - [Employee profile](#5-employee-profile)
  - [Attendance](#6-attendance)
  - [Time off](#7-time-off)
  - [Payroll and payslips](#8-payroll-and-payslips)
  - [Analytics](#9-analytics-adminhr)
  - [Notifications and automations](#10-notifications-and-automations)
  - [Exports — CSV and PDF](#11-exports--csv-and-pdf)
- [Who can see what](#who-can-see-what)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Database](#database)
- [Design system](#design-system)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## The idea in three moments

1. **An admin changes a wage.** Every salary component recomputes and the payslip
   regenerates with the new numbers — percentages of wage, percentages of other
   components, and the balance component all follow.
2. **An employee checks in.** Hours accrue, and the same row that proves they were here is
   the row payroll pays against.
3. **Someone opens the browser console and fetches a colleague's salary.** The database
   returns nothing. The UI was never what was stopping them.

---

## Feature tour

### 1. Authentication and identity

- **Sign in with either a Login ID or an email.** A Login ID is resolved to the underlying
  account server-side (`src/app/actions/resolve-login.ts`) rather than through a public
  database function, so the lookup never becomes an email-enumeration oracle for anonymous
  callers.
- **Company sign-up** creates the company and its first admin: company name, logo upload,
  name, email, phone, password with show/hide toggles. There is no public employee
  registration — that is the point of the model.
- **Generated Login IDs.** Every person gets an ID in the format
  `[Company 2][First 2][Last 2][Year 4][Serial 4]` — *Odoo India*, *John Doe*, joined 2022,
  first joiner that year → **`OIJODO20220001`**. The serial continues per joining year.
- **Forced password change.** Accounts created by HR start on a system-generated password
  and are routed to `/change-password` before they can reach anything else.
- **Split auth screens** with an animated wave panel on the left and the form on the right;
  the DF mark is the app icon, the nav logo and the panel wordmark.

### 2. Onboarding and the credentials email

Adding a user is a single dialog, reachable from the nav on any page or from the directory:

1. HR fills in name, work email, mobile, **access level (Employee or Admin/HR)**,
   department, job title, joining date and monthly wage.
2. The system generates the Login ID and a first password
   (`generateTempPassword` uses the platform CSPRNG with rejection sampling, not
   `Math.random()`).
3. A server action creates the auth user with that password, so the credentials shown are
   credentials that actually work.
4. The employee is **emailed their Login ID and password** through Resend, using the same
   template the app renders everywhere else.
5. The confirmation screen reports whether the mail actually left, and still shows the
   credentials to copy if it did not — a mail failure never loses you the account.

`npm run send-credentials` rehearses this whole path end to end against a **disposable
mailbox** — see [Scripts](#scripts).

### 3. My Workspace (employee home)

Where everyone lands after signing in — their own record, not the company's.

- Greeting with Login ID, department, job title and manager.
- **Check in / check out** card showing live state ("Checked in since 9:14 AM") and hours
  logged today. Failures surface the real reason rather than a button that does nothing.
- **This month**: days present, hours logged (with overtime), days on leave, absences.
- **Leave balances** for every leave type, with taken-against-allocated bars.
- **My requests** — the last eight, with status — and an **Apply for leave** dialog that
  computes business days for the range and enforces attachment rules.
- **Export** the month as a personal PDF statement or a CSV.

### 4. Employee directory (Admin/HR)

- **Summary tiles that double as filters** — Total people, In office, On leave, Not in,
  Admin/HR. One click to answer "who is out today".
- **Table view** with avatar, name, work email, **Login ID**, **role badge**, department,
  job title, **live status**, joining date, and a View action.
- **Grid view** of cards for a more visual scan.
- **Search** across name, Login ID, email, department, job title and manager, plus
  department / role / status filters and four sort orders.
- Today's presence for the whole company is read in a single query, not one per person.
- **Export** the current view (filters included) as CSV or PDF.

### 5. Employee profile

Four tabs, each with its own visibility rule:

| Tab | Who sees it |
| --- | --- |
| **Resume** — about, what they love, interests, skills, certifications | Everyone |
| **Private Info** — DOB, address, personal email, bank, PAN, UAN | The owner and Admin/HR |
| **Salary Info** — structure and components | The owner and Admin/HR (editable by Admin/HR) |
| **Security** — change your own password | The owner only |

### 6. Attendance

**Employees** check in and out from the header or their workspace; work hours and overtime
are computed on check-out. Their own month is listed day by day.

**Admin/HR** get a company-wide view:

- Day / week / month ranges with a date stepper and a **Today** shortcut.
- Day view: check-in, check-out, hours, extra hours and a status pill per person.
- Week/month view: present, half day, absent, leave and days tracked per person, with an
  **attendance-rate bar that turns clay below 80 %** so patterns are visible without
  reading numbers.
- Summary tiles (Present / Half day / On leave / Absent / average hours) that filter the
  table on click, plus search and a department filter.

### 7. Time off

**Employees** apply for leave against a real balance; day counts are computed from the
range with weekends and holidays taken out, and leave types can require an attachment.

**Admin/HR** work a queue:

- Opens on **pending** — pending rows sort to the top whatever the filter.
- Tiles for Awaiting you (with total days requested), Approved, Rejected, All.
- Search by person, Login ID or reason; filter by status and leave type.
- **Approve / Reject** inline. The row updates optimistically and **rolls back if the write
  fails**, so the screen never claims something the database did not do.
- **Allocation** tab to grant leave days, and a year calendar with holidays.

### 8. Payroll and payslips

- **Salary structures** built from components that can be a fixed amount, a percentage of
  wage, a percentage of another component, or the balance — evaluated by
  `src/lib/salary/engine.ts`.
- **Payslip generation** (`src/app/actions/payroll.ts`) takes working days from the
  calendar and pulls absences, half days and approved unpaid leave out of attendance to get
  payable days and loss-of-pay, then prorates every component.
- PF, professional tax and other deductions come from payroll config.
- Payslips render to PDF through `@react-pdf/renderer` and can be persisted to storage.

### 9. Analytics (Admin/HR)

A month-by-month view across four tabs, read from live records:

- **Attendance** — rate, present/absent/half/leave totals, by department, by employee,
  daily trend, late check-ins.
- **Leave** — requested, approved, rejected, pending, approval rate, by type and
  department, monthly trend.
- **Payroll** — total payroll, deductions, net paid, average salary, by department,
  deduction breakdown, monthly trend.
- **Employees** — headcount by department and role, recent joiners, leave-balance
  distribution.

Exports as a six-table PDF report or a flat CSV of metrics.

### 10. Notifications and automations

- **In-app notifications** with an unread bell in the header.
- **Rate limiting lives in the database**: `notification_caps` holds a cooldown per type
  and `should_notify()` is the gate, so a noisy rule cannot spam anyone.
- **Scheduled jobs** (`pg_cron`) run the unattended half — mark absent, auto check-out,
  chase stale approvals, morning brief, monthly payroll prep.
- **Automation log** at `/admin/automations` records every rule that fired, what it did,
  how long it took, and whether it failed.

### 11. Exports — CSV and PDF

Every screen with data exports in both formats from one **Export** menu.

PDFs are structured reports, not screenshots: a branded header repeated on every page, a
meta row recording the exact scope (generated timestamp, period, **every filter applied**,
row counts), headline figures as tiles, tables with repeating headers, zebra rows and
right-aligned numerics, and a footer with page numbers.

| Screen | PDF contains |
| --- | --- |
| Employees | Counts + the filtered directory |
| Attendance | Daily log, or per-person totals with attendance % |
| Time off | Queue counts + the filtered register |
| Analytics | Six tables across attendance, leave, payroll and joiners |
| My Workspace | Personal monthly statement: stats, leave balance, attendance, requests |

Exports always reflect what is on screen — filter to Engineering and the PDF says so in its
own header. `@react-pdf/renderer` is imported lazily at click time so it costs nothing on
page load.

---

## Who can see what

Role comes from the signed-in user's employee record. There is no role switcher.

| Route | Admin / HR | Employee |
| --- | --- | --- |
| `/dashboard` — My Workspace | ✅ | ✅ |
| `/me` — own profile | ✅ | ✅ |
| `/employees` — directory | ✅ | ❌ redirected |
| `/employees/[id]` — profile | ✅ | own only |
| `/attendance` — company-wide | ✅ | ❌ redirected |
| `/time-off` — approval queue | ✅ | ❌ redirected |
| `/analytics` | ✅ | ❌ redirected |
| `/admin/automations` | ✅ | ❌ |

Employees act on their own record through My Workspace. Company-wide screens are wrapped in
`AdminGuard`, so typing the URL redirects rather than rendering — and Row Level Security
means the data would not arrive even if the guard were bypassed.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in from the Supabase dashboard
npm run seed                   # optional: demo company, people, a month of attendance
npm run dev
```

Open <http://localhost:3000> — it redirects to `/sign-in`.

`.env.local` is required: the screens read from Supabase on load, so without it the app
throws on first render rather than degrading quietly. `npm run seed` additionally needs the
service-role key, since people are created through the admin auth API.

Apply `supabase/migrations/*.sql` in filename order (or paste `supabase/seed/demo_data.sql`
if you have no service-role key). Full breakdown in [`supabase/README.md`](supabase/README.md).

---

## Environment variables

| Variable | Required | What it is for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Browser-safe key (older projects call it `ANON_KEY`; either name is read) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Creating employees, payslip generation, seeding. Never exposed to the browser |
| `RESEND_API_KEY` | optional | Sends the credentials email. Without it accounts are still created and HR passes credentials on manually |
| `RESEND_FROM` | optional | Verified sender, e.g. `"Dayflow <onboarding@resend.dev>"` |
| `NEXT_PUBLIC_APP_URL` | optional | Builds the sign-in link inside emails |

> **Resend note:** the shared `onboarding@resend.dev` sender only delivers to the address
> that owns the Resend account. To reach real employee inboxes, verify a domain at
> resend.com/domains and point `RESEND_FROM` at it.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run seed` | Builds the demo company: people, a month of attendance with deliberate anomalies, and a pending request sitting in the admin queue. Idempotent — each run wipes the previous one, keyed on the seed email domain |
| `npm run send-credentials` | Rehearses the onboarding email end to end |

### `send-credentials` in detail

```bash
npm run send-credentials -- --name "Nikhil Rao" --wait
npm run send-credentials -- --name "Asha Menon" --to asha@example.com
npm run send-credentials -- --name "Nikhil Rao" --dry-run
```

Generates the Login ID and password with the app's own code, provisions a **throwaway
mailbox on mail.tm** (no signup, no key, nothing to clean up), renders the real template,
sends it through Resend, then with `--wait` polls that mailbox and asserts the credentials
survived into the delivered body. Copies of the sent and received HTML land in `.tmp/`.

Flags: `--name`, `--company`, `--to`, `--serial`, `--wait`, `--dry-run`.

---

## Project structure

```
src/app/(auth)/sign-in                 sign in by Login ID or email
src/app/(auth)/sign-up                 company + first admin
src/app/(auth)/change-password         forced on first login
src/app/(app)/dashboard                My Workspace — everyone's home
src/app/(app)/employees                directory (admin)
src/app/(app)/employees/[id]           profile — Resume / Private / Salary / Security
src/app/(app)/me                       own profile
src/app/(app)/attendance               company-wide attendance (admin)
src/app/(app)/time-off                 approval queue + allocation (admin)
src/app/(app)/analytics                month analytics (admin)
src/app/(app)/payroll/[id]             salary structure and payslip
src/app/admin/automations              automation log
src/app/notifications                  notification inbox
src/app/actions/                       server actions: employees, payroll, login resolve

src/components/ui/data-ui.tsx          shared admin furniture: header, tiles, toolbar,
                                       table shell, empty state, export menu
src/components/ui/brand.tsx            logo and wordmark
src/components/ui/auth-waves.tsx       animated wave fields on the auth screens
src/components/demo-session-provider   resolves the signed-in user and their real role
src/components/admin-guard.tsx         redirects non-admins away from company screens
src/components/admin-actions-provider  hosts the Add User dialog once, app-wide

src/lib/login-id.ts                    Login ID format and serials
src/lib/password.ts                    CSPRNG temporary passwords
src/lib/email.ts                       Resend transport + credentials template
src/lib/salary/engine.ts               salary component evaluation
src/lib/payroll/days.ts                working days, payable days, loss of pay
src/lib/leaves/sandwich.ts             sandwich-leave rules
src/lib/attendance/status.ts           attendance status derivation
src/lib/analytics.ts                   analytics aggregation
src/lib/pdf/report-document.tsx        generic structured report PDF
src/lib/pdf/payslip-document.tsx       payslip PDF
src/lib/pdf/export-report.tsx          client-side PDF/CSV download helpers
src/lib/supabase-db.ts                 data access used by the screens
```

Restyle in `src/components/ui/`, not per page — all three admin screens share the same
primitives on purpose.

---

## Database

Twenty migrations. The rules that matter live in Postgres rather than the app, so they hold
whichever screen writes the row:

- Attendance hours are computed by a trigger on check-out, not by the client.
- Approving leave decrements the balance and writes the attendance rows in one transaction.
- Notification rate limits are enforced by `should_notify()` against `notification_caps`.
- `pg_cron` jobs run the unattended half of the product.
- Salary RLS is row-scoped: an employee sees their own structure and nothing else.

Setup steps and the full table-by-table breakdown are in
[`supabase/README.md`](supabase/README.md).

---

## Design system

**2B — Two Plums, Tinted.** One hue carries the whole product; a lighter plum does the work
an accent colour usually does.

| Token | Hex | Use |
| --- | --- | --- |
| `--color-primary` | `#5C3D54` | Navigation, primary action, selected state |
| `--color-plum` | `#875A7B` | Tints, chips, hover, secondary buttons |
| `--color-ink` | `#201A1E` | Headlines and body |
| `--color-line` | `#EDE5EB` | Dividers, table stripes, card fills |
| `--color-paper` | `#FBF9FB` | Page background |
| `--color-success` | `#17A67F` | Confirmation and positive delta only |
| `--color-warn` | `#B4552D` | Clay — the one colour outside the hue family |

Type: **Manrope** (display and UI), **Source Serif 4** (reading), **IBM Plex Mono**
(identifiers, status chips, eyebrows). Buttons and chips are fully rounded; cards use a
12 px radius. Tokens are defined once in `@theme` in `src/app/globals.css`.

All decorative motion — the auth waves, the entrance stagger — is disabled under
`prefers-reduced-motion`.

---

## Testing

```bash
npm test
```

Vitest covers the logic worth being sure about: Login ID generation and serials, temporary
password entropy, salary component evaluation, payroll day maths, sandwich-leave rules and
attendance status derivation.

---

## Troubleshooting

**"Supabase is not configured"** — `.env.local` is missing or empty. Copy `.env.example`
and fill in the URL and publishable key.

**Employee creation succeeds but they cannot sign in** — `SUPABASE_SERVICE_ROLE_KEY` is not
set, so no auth user was created. Add it and re-create the person.

**The credentials email does not send** — either `RESEND_API_KEY` is unset (the dialog says
so and shows the credentials to copy), or you are sending from `onboarding@resend.dev` to
an address that does not own the Resend account. Verify a domain and set `RESEND_FROM`.

**Check-in does nothing** — the header now surfaces the real error. `attendance` is unique
on `(employee_id, date)`; the app reads today's row before writing, so a second check-in
reopens the day rather than failing on the duplicate key.

**"No employee record"** after signing in — the auth user has no matching row in the
employees table. Ask an admin to add them, or re-run `npm run seed`.
