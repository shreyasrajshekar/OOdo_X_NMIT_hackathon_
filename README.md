# Dayflow — HRMS

> Every workday, perfectly aligned.

A role-based HRMS where attendance is the input to payroll, not just a log. Admins create
employees, set salary structures and approve time off; employees check in, apply for leave,
and can see their own record and nobody else's — enforced in the database, not the UI.

Built for the Odoo hackathon. `DAYFLOW_BUILD_GUIDE.md` is the source of truth for the spec.

## What it does

**Admin / HR** — company sign-up, then create employees (there's no public registration).
Login IDs and first passwords are generated and a password change is forced on first login.
Set salary structures out of components that can be a percentage of wage or a percentage of
another component, with PF and professional tax config. Approve time off, allocate leave
days, review attendance.

**Employee** — check in and out, with work hours and overtime computed for you. Apply for
leave against a real balance. See your own profile, salary and payslips.

The demo is built around three moments:

1. An admin changes a wage. Every salary component recomputes and the payslip regenerates
   with the new numbers.
2. An employee checks in. The status dot flips green on the admin's screen, no refresh.
3. Someone opens the browser console and tries to fetch a colleague's salary row. The
   database returns nothing — the UI was never what was stopping them.

## Status

Database, auth and the screens are in and talking to each other: sign-in and sign-up,
the employee directory and profiles, attendance, time off, and the automation layer
(notifications, the audit log and the scheduled jobs behind them).

Still open: the salary component engine and payslip generation, realtime on the status
dots, and sign-in by Login ID against the database rather than mock data — `profiles`
has no `login_id` column yet. See [Next steps](#next-steps).

## Stack

- Next.js 15, App Router, TypeScript
- Tailwind v4, tokens defined in `src/app/globals.css` under `@theme`
- Fonts: Manrope (display/UI), Source Serif 4 (body), IBM Plex Mono (identifiers/meta) via `next/font`

## Getting started

```bash
npm install
cp .env.example .env.local    # fill in from the Supabase dashboard
npm run seed                  # optional: 25 people and a month of attendance
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to `/sign-in`.

The keys aren't committed — the repo is public, so grab them from the team chat.
`.env.local` is required: the screens read from Supabase on load, so without it the app
throws on the first render rather than degrading. `npm run seed` additionally needs the
service-role key, since people are created through the admin auth API.

Migrations apply in filename order, `001` → `009`. Full breakdown in
[`supabase/README.md`](supabase/README.md).

## Structure

```
src/app/(auth)/sign-in            sign in with Login ID or email
src/app/(auth)/sign-up            company + admin creation
src/app/(auth)/change-password    forced on first login
src/app/(app)/employees           avatar grid landing page
src/app/(app)/employees/[id]      read-only profile (Resume / Private Info / Salary Info / Security)
src/app/(app)/me                  own profile
src/app/(app)/attendance          check in/out, attendance list
src/app/(app)/time-off            balances, requests, calendar
src/app/(app)/time-off/allocation admin: grant leave days
src/app/(app)/payroll/[id]        salary structure
```

`src/components/nav.tsx`, `src/components/status-dot.tsx`, and `src/components/ui/button.tsx`
are the shared primitives every screen builds on — restyle here, not per-page.

## Design decisions

- **No shadcn/ui yet.** The build guide calls for shadcn restyled to tokens; this scaffold
  hand-rolls the two primitives it needed (`Button`, `StatusDot`) so Phase 0 has zero UI
  dependencies. Add shadcn when a screen actually needs a component it doesn't make sense
  to hand-roll (select, dialog, tabs).
- **No landing page.** Root route redirects straight to `/sign-in` — a marketing page is
  explicitly out of scope.
- **Tokens live in one place.** `@theme` in `globals.css` mirrors Section 4.1 of the build
  guide verbatim; `next/font` variables are named separately (`--font-manrope`, etc.) and
  mapped into the token names so the guide's `--font-display` / `--font-body` / `--font-mono`
  contract never changes even if the underlying font loader does.

See `DAYFLOW_BUILD_GUIDE.md` and `2b-two-plums-design-system.md` for the full spec.

## Database

Ten tables, thirty RLS policies, five triggers, eight scheduled jobs and four storage
buckets. The rules that matter live in Postgres rather than in the app, so they hold
whichever screen writes the row:

- Attendance hours are computed by a trigger on check-out, not by the client.
- Approving leave decrements the balance and writes the attendance rows in one
  transaction.
- Notifications are rate-limited in the database — `notification_caps` holds a cooldown
  per type and `should_notify()` is the gate, so a noisy rule can't spam anyone.
- Eight `pg_cron` jobs run the unattended half: mark absent, auto check-out, chase stale
  approvals, morning brief, monthly payroll prep.
- Salary RLS is row-scoped: an employee sees their own structure and nothing else.

Setup steps and the full breakdown are in [`supabase/README.md`](supabase/README.md).

## Next steps

- Salary component engine + payslip generation
- Realtime attendance on the status dots
- `login_id` on `profiles`, so signing in by Login ID stops going through mock data
- Forced password change — `profiles` has no `must_change_password` column, so the
  `/change-password` route exists but nothing routes you to it
- Clean up the enums and functions left behind by the old schema (see
  [`supabase/README.md`](supabase/README.md))
