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

Scaffold and database are in: design tokens, nav shell and route stubs for every screen,
plus the schema, RLS, functions and storage that live in `supabase/`. Not wired up
yet — auth, the salary engine and realtime attendance. See [Next steps](#next-steps-phase-1).

## Stack

- Next.js 15, App Router, TypeScript
- Tailwind v4, tokens defined in `src/app/globals.css` under `@theme`
- Fonts: Manrope (display/UI), Source Serif 4 (body), IBM Plex Mono (identifiers/meta) via `next/font`

## Getting started

```bash
npm install
cp .env.example .env.local    # fill in from the Supabase dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to `/sign-in`.

The keys aren't committed — the repo is public, so grab them from the team chat. Nothing
imports the Supabase client yet, so the screens still render without `.env.local`; you'll
need it the moment auth lands. Migrations apply `0001` → `0012` in order, in
[`supabase/`](supabase/README.md).

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

The migrations define 14 tables plus a derived `leave_balances` view, 4 enums, 33 RLS
policies, 9 triggers and 4 storage buckets. The rules that matter live in Postgres rather than in the app, so they hold
whichever screen writes the row:

- Leave balances are derived from allocations minus approved requests — no counter to drift
  — and a gist exclusion constraint rejects overlapping requests at insert.
- Attendance hours and the salary audit trail are triggers.
- Login IDs are generated under a row lock, so two signups at once can't collide.
- Salary RLS is row-scoped: an employee sees their own structure and nothing else.

Setup steps and the full breakdown are in [`supabase/README.md`](supabase/README.md).

## Next steps (Phase 1)

- Auth wiring: sign-in by login ID, forced password change, session middleware
- Employee create/edit against the real tables
- Salary component engine + payslip generation
- Realtime attendance on the status dots
