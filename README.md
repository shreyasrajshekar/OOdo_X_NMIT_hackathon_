# Dayflow — HRMS

Dayflow is a role-based HRMS where attendance is the input to payroll, not just a log.

This is the Phase 0 scaffold: repo, the 2B "Two Plums, Tinted" design tokens, the nav shell,
and route stubs for every screen in the build guide. No backend yet — Supabase (schema, RLS,
auth), the salary component engine, and realtime attendance come next.

## Stack

- Next.js 15, App Router, TypeScript
- Tailwind v4, tokens defined in `src/app/globals.css` under `@theme`
- Fonts: Manrope (display/UI), Source Serif 4 (body), IBM Plex Mono (identifiers/meta) via `next/font`

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It redirects to `/sign-in`.

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

## Next steps (Phase 1)

- Supabase project, schema + RLS from Section 5/7 of the build guide
- Auth wiring, login ID generator, forced password change
- `supabase gen types typescript`, committed
