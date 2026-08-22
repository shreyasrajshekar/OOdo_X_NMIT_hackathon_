# Supabase

Schema, RLS, functions and storage buckets for Dayflow. The backend rules live
here rather than in the app — build guide, Section 0 rule 4.

## Setup

Copy `.env.example` to `.env.local` and fill in the values from the dashboard
(Project Settings → API). They aren't committed because this repo is public —
ping me for them.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only, never imported by a client component
```

## Migrations

Run `0001` → `0012` in order; they're dependency-ordered, so skipping around
fails on foreign keys. Either paste them into the SQL editor or:

```bash
supabase link --project-ref <ref>
supabase db push
```

| File | Contents |
| --- | --- |
| `0001` | Enums + `companies` |
| `0002` | `employees`, `employee_resume` |
| `0003` | `payroll_config`, `salary_structures`, `salary_components` |
| `0004` | `holidays`, `attendance`, `regularization_requests` |
| `0005` | Leave types, allocations, requests, `leave_balances` view |
| `0006` | `payslips`, `audit_log` |
| `0007` | Functions + triggers (login IDs, attendance maths, audit trail) |
| `0008` | Row Level Security — every policy |
| `0009` | Realtime publication + storage buckets |
| `0010` | `replace_salary_components` RPC for the salary editor |
| `0011` | `audit_history_for_employee` RPC for the history panel |
| `0012` | Tightened EXECUTE grants on the definer functions |

## Things worth knowing

**`employees.id` is `auth.users.id`.** One auth user per employee, same UUID.
Employee rows are created by the service-role client only — there's deliberately
no insert policy for them.

**Leave balances are never stored.** `leave_allocations` are credits,
`leave_requests` are debits, and `leave_balances` is a view that subtracts one
from the other, so there's nothing to drift out of sync. An exclusion
constraint (`leave_no_overlap`) rejects overlapping pending/approved requests at
insert time — double-booking is impossible rather than merely discouraged.

**Attendance is computed by a trigger,** not the app: `work_hours` is
checkout − checkin − break, `extra_hours` is anything past 8, and under 8 flips
the day to `half_day`. Checked in but never out sets `is_anomaly`.

**Salary changes write their own audit trail.** A trigger on
`salary_structures` and `salary_components` logs one `audit_log` row per changed
field, so the history panel gets real diffs without the app having to remember
to record anything.

**Login IDs are generated in the database** (`generate_login_id`) as
`[company 2][first 2][last 2][year 4][serial 4]` — e.g. `ACNISH20260001`. It
takes a row lock on the company so two concurrent signups can't collide, and the
unique constraint on `login_id` is the backstop.

## RLS

On for every table. Two helpers, `auth_role()` and `auth_company()`, read the
caller's row once, and every policy is written against them.

Employees read their company directory, their own attendance, their own leave
and their own payslips. Admins get the same, scoped to their company. Salary is
the strict one: an employee sees exactly their own row, never a colleague's.
Employees can edit only `phone`, `address` and `avatar_url` on their own record,
and that's enforced by a trigger as well as a policy, so it holds even if the
policy is later loosened.

Buckets: `avatars` and `logos` are public-read, `leave-docs` is uploader-scoped
with admin read, and `payslips` has no policies at all — it's reachable only
through signed URLs minted server-side.
