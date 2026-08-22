-- One payslip per employee per month. Without this, regenerating a payslip
-- appends a second row instead of replacing the first, and the upsert in
-- src/app/actions/payroll.ts has no conflict target to aim at.
delete from public.salary_records a
 using public.salary_records b
 where a.employee_id = b.employee_id
   and a.month = b.month
   and a.year  = b.year
   and a.id    > b.id;

create unique index if not exists salary_records_employee_period_key
  on public.salary_records (employee_id, month, year);
