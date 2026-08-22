# Supabase

Schema, RLS, triggers, scheduled jobs and storage for Dayflow. The backend
rules live here rather than in the app — build guide, Section 0 rule 4.

## Setup

Copy `.env.example` to `.env.local` and fill it from the dashboard
(Project Settings → API). Nothing is committed; the repo is public.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # shown as "anon" on older projects
SUPABASE_SERVICE_ROLE_KEY=              # server-only, never imported by a client component
```

Then either paste the migrations into the SQL editor in filename order, or:

```bash
supabase link --project-ref <ref>
supabase db push
npm run seed        # 25 people, a month of attendance, one pending unpaid leave
```

`npm run seed` needs the service-role key. `profiles.id` is a foreign key onto
`auth.users(id)`, so people can only be created through the admin auth API.

## Migrations

Applied in filename order.

| File | Contents |
| --- | --- |
| `001_core_tables` | `profiles`, `attendance`, `leave_balance`, `leave_requests`, `salary_structure`, `salary_records` — plus their indexes and RLS |
| `002_automation_tables` | `notifications`, `automation_logs`, `notification_caps`, `should_notify()` |
| `003_seed_data` | Demo rows for three fixed profile ids. Guarded — skips unless all three exist |
| `003b_notification_caps` | `notification_logs` and an earlier `should_notify()`. Sorts after `003`, so this definition is the one that wins |
| `004_leave_triggers` | `trg_leave_submitted` / `trg_leave_approved` / `trg_leave_rejected` |
| `005_attendance_salary_triggers` | `trg_check_out`, `trg_salary_paid` |
| `006_scheduled_attendance` | Auto check-out and mark-absent jobs |
| `007_scheduled_leave` | Low-balance and stale-approval jobs |
| `007_storage_buckets` | The four buckets and their policies |
| `008_morning_brief` | Morning brief job |
| `009_weekly_payroll_cron` | Weekly summary and monthly payroll prep; registers the `pg_cron` schedules |
| `fix-seed` | Demo rows for the two Test profiles. Guarded. Unnumbered, so it runs last |

Ten tables, no views. Twenty-four RLS policies in `public`, six more on
`storage.objects`.

## Things worth knowing

**`profiles.id` is `auth.users.id`.** One auth user per person, same UUID, and
no `ON DELETE CASCADE` between them — delete a profile before its auth user or
the delete fails on the foreign key. `npm run seed` does this in the right
order.

**Single tenant.** There is no `companies` table and no company scoping. `role`
on `profiles` is `admin` or `employee`, and every policy is written against
`auth.uid()` and that column directly.

**Leave balances are stored, not derived.** `leave_balance` holds one row per
person per year and `fn_on_leave_approved` decrements it. That means the
counter can drift if anything writes leave without going through the trigger —
worth knowing before adding a second write path.

**Attendance hours are computed by a trigger.** `fn_on_check_out` runs
`BEFORE UPDATE` on `attendance`, so writing `check_out` is what fills in
`hours_worked`. Seeding rows with an `INSERT` deliberately doesn't fire it.

**Notifications are rate-limited in the database.** `notification_caps` holds a
cooldown per notification type and `should_notify(user_id, type)` is the gate.
Cooldowns run from 1 hour for direct events up to 720 hours for the low-balance
warning.

**Eight `pg_cron` jobs** run the unattended half of the product:

| Job | Schedule |
| --- | --- |
| `cron-morning-brief` | 09:00, weekdays |
| `cron-low-balance` | 09:30, weekdays |
| `cron-mark-absent` | 10:00, weekdays |
| `cron-consecutive-absence` | 10:00, weekdays |
| `cron-stale-approvals` | 10:30, weekdays |
| `cron-auto-checkout` | 18:00, weekdays |
| `cron-weekly-summary` | 09:00, Mondays |
| `cron-payroll-prep` | 06:00, 1st of the month |

## RLS

On for every table in `public` except `notification_caps` and
`notification_logs`, which are readable configuration and a write-only log.

Employees read their own attendance, leave, balance, salary structure and
salary records, and the full profile directory. Admins read everything, gated
on `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`.
Salary is the strict one: an employee sees exactly their own row.

Buckets: `avatars` and `logos` are public-read, `leave-docs` is uploader-scoped
with admin read, and `payslips` has no policies at all — service-role writes,
signed URLs to read.

## Known rough edges

- Four enum types (`app_role`, `attendance_status`, `computation_type`,
  `request_status`) and nine functions (`auth_role()`, `generate_login_id()`,
  `do_check_in()` and friends) survive from the schema that `004_drop_old_tables`
  replaced. Dropping a table doesn't take function bodies with it, so they all
  still exist and all still query tables that don't. Nothing calls them; they
  want a cleanup migration.
- `002` and `003b` both define `notification_caps` and `should_notify()` with
  different bodies. `003b` sorts later and wins. Worth collapsing into one file.
- `profiles` has no `login_id` column, so signing in by Login ID currently
  resolves against mock data rather than the database.
