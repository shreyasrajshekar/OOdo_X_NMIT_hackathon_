-- Company holiday calendar.
--
-- src/lib/payroll/days.ts has always taken a holidays set - working_days is
-- calendar days minus weekends minus holidays - but there was no table to fill
-- it from, so generatePayslip passed an empty set and every public holiday was
-- counted as a working day. That inflates the divisor and underpays anyone
-- whose month contained one.

create table if not exists public.holidays (
  id         bigserial primary key,
  date       date not null unique,
  name       varchar(120) not null,
  kind       varchar(20) not null default 'public'
             check (kind in ('public', 'company', 'optional')),
  created_at timestamptz default now()
);

comment on table public.holidays is
  'Non-working days. Excluded from working_days in payslip computation.';
comment on column public.holidays.kind is
  'public = national/state holiday, company = company-declared, optional = restricted holiday the employee may choose';

alter table public.holidays enable row level security;

drop policy if exists holidays_select_all on public.holidays;
create policy holidays_select_all on public.holidays for select using (true);

drop policy if exists holidays_write_admin on public.holidays;
create policy holidays_write_admin on public.holidays for all
  using (exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'admin'))
  with check (exists (select 1 from public.profiles me where me.id = auth.uid() and me.role = 'admin'));

create index if not exists holidays_date_idx on public.holidays (date);

-- Fixed-date national holidays only. Festival dates move year to year and are
-- deliberately not hardcoded; add them per year through the admin UI.
insert into public.holidays (date, name, kind) values
  ('2026-01-26', 'Republic Day',           'public'),
  ('2026-05-01', 'Labour Day',             'public'),
  ('2026-08-15', 'Independence Day',       'public'),
  ('2026-10-02', 'Gandhi Jayanti',         'public'),
  ('2026-12-25', 'Christmas Day',          'public'),
  ('2026-07-17', 'Company Foundation Day', 'company')
on conflict (date) do nothing;
