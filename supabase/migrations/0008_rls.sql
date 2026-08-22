-- Dayflow 0008 — Row Level Security (Section 7).
-- The scored feature. Every policy is company-scoped; salary is row-scoped.

alter table companies enable row level security;

-- companies -----------------------------------------------------------------
create policy companies_select on companies
  for select using (id = auth_company());

create policy companies_admin_update on companies
  for update using (auth_role() = 'admin' and id = auth_company())
  with check (auth_role() = 'admin' and id = auth_company());

-- employees -------------------------------------------------------------------
-- Employee: read the directory, edit only own row — and the guard trigger in
-- 0007 restricts that edit to phone / address / avatar_url at engine level.
create policy employees_select_company on employees
  for select using (company_id = auth_company());

create policy employees_self_update on employees
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy employees_admin_all on employees
  for all
  using (auth_role() = 'admin' and company_id = auth_company())
  with check (auth_role() = 'admin' and company_id = auth_company());
-- No insert policy: employee rows are created exclusively by the service-role action.

-- employee_resume -------------------------------------------------------------
create policy resume_select_company on employee_resume
  for select using (
    exists (
      select 1 from employees e
      where e.id = employee_resume.employee_id
        and e.company_id = auth_company()
    )
  );

create policy resume_self_write on employee_resume
  for all using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

create policy resume_admin_all on employee_resume
  for all using (
    auth_role() = 'admin'
    and exists (
      select 1 from employees e
      where e.id = employee_resume.employee_id
        and e.company_id = auth_company()
    )
  )
  with check (
    auth_role() = 'admin'
    and exists (
      select 1 from employees e
      where e.id = employee_resume.employee_id
        and e.company_id = auth_company()
    )
  );

-- payroll_config ---------------------------------------------------------------
create policy payroll_config_select on payroll_config
  for select using (company_id = auth_company());

create policy payroll_config_admin_all on payroll_config
  for all using (auth_role() = 'admin' and company_id = auth_company())
  with check (auth_role() = 'admin' and company_id = auth_company());

-- salary_structures ------------------------------------------------------------
-- THE demo policy (Section 7): employees see their own row only.
create policy salary_self_read on salary_structures
  for select using (
    employee_id = auth.uid()
    or (
      auth_role() = 'admin'
      and exists (
        select 1 from employees e
        where e.id = salary_structures.employee_id
          and e.company_id = auth_company()
      )
    )
  );

create policy salary_admin_write on salary_structures
  for all using (
    auth_role() = 'admin'
    and exists (
      select 1 from employees e
      where e.id = salary_structures.employee_id
        and e.company_id = auth_company()
    )
  )
  with check (
    auth_role() = 'admin'
    and exists (
      select 1 from employees e
      where e.id = salary_structures.employee_id
        and e.company_id = auth_company()
    )
  );

-- salary_components --------------------------------------------------------------
create policy components_read on salary_components
  for select using (
    exists (
      select 1 from salary_structures s
      where s.id = salary_components.structure_id
        and (
          s.employee_id = auth.uid()
          or (
            auth_role() = 'admin'
            and exists (
              select 1 from employees e
              where e.id = s.employee_id and e.company_id = auth_company()
            )
          )
        )
    )
  );

create policy components_admin_write on salary_components
  for all using (
    auth_role() = 'admin'
    and exists (
      select 1 from salary_structures s
      join employees e on e.id = s.employee_id
      where s.id = salary_components.structure_id
        and e.company_id = auth_company()
    )
  )
  with check (
    auth_role() = 'admin'
    and exists (
      select 1 from salary_structures s
      join employees e on e.id = s.employee_id
      where s.id = salary_components.structure_id
        and e.company_id = auth_company()
    )
  );

-- attendance ----------------------------------------------------------------------
create policy attendance_select on attendance
  for select using (
    employee_id = auth.uid()
    or (auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = attendance.employee_id and e.company_id = auth_company()
    ))
  );

create policy attendance_insert_own_today on attendance
  for insert with check (
    employee_id = auth.uid() and work_date = current_date
  );

create policy attendance_admin_all on attendance
  for all using (
    auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = attendance.employee_id and e.company_id = auth_company()
    )
  )
  with check (
    auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = attendance.employee_id and e.company_id = auth_company()
    )
  );
-- Employee has no UPDATE policy: checkout flows through do_check_out().

-- regularization_requests -----------------------------------------------------------
create policy reg_own_read on regularization_requests
  for select using (
    employee_id = auth.uid()
    or (auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = regularization_requests.employee_id and e.company_id = auth_company()
    ))
  );

create policy reg_own_insert on regularization_requests
  for insert with check (employee_id = auth.uid());

create policy reg_admin_review on regularization_requests
  for update using (
    auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = regularization_requests.employee_id and e.company_id = auth_company()
    )
  )
  with check (
    auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = regularization_requests.employee_id and e.company_id = auth_company()
    )
  );

-- holidays ----------------------------------------------------------------------------
create policy holidays_select on holidays
  for select using (company_id = auth_company());

create policy holidays_admin_all on holidays
  for all using (auth_role() = 'admin' and company_id = auth_company())
  with check (auth_role() = 'admin' and company_id = auth_company());

-- leave_types ---------------------------------------------------------------------------
create policy leave_types_select on leave_types
  for select using (company_id = auth_company());

create policy leave_types_admin_all on leave_types
  for all using (auth_role() = 'admin' and company_id = auth_company())
  with check (auth_role() = 'admin' and company_id = auth_company());

-- leave_allocations -----------------------------------------------------------------------
create policy allocations_select on leave_allocations
  for select using (
    employee_id = auth.uid()
    or (auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = leave_allocations.employee_id and e.company_id = auth_company()
    ))
  );

create policy allocations_admin_all on leave_allocations
  for all using (
    auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = leave_allocations.employee_id and e.company_id = auth_company()
    )
  )
  with check (
    auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = leave_allocations.employee_id and e.company_id = auth_company()
    )
  );

-- leave_requests ----------------------------------------------------------------------------
create policy leave_requests_select on leave_requests
  for select using (
    employee_id = auth.uid()
    or (auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = leave_requests.employee_id and e.company_id = auth_company()
    ))
  );

create policy leave_requests_apply on leave_requests
  for insert with check (employee_id = auth.uid());

-- Employee may withdraw while pending; admin reviews within company.
create policy leave_requests_withdraw on leave_requests
  for delete using (employee_id = auth.uid() and status = 'pending');

create policy leave_requests_self_edit on leave_requests
  for update using (employee_id = auth.uid() and status = 'pending')
  with check (employee_id = auth.uid() and status = 'pending');

create policy leave_requests_admin_review on leave_requests
  for update using (
    auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = leave_requests.employee_id and e.company_id = auth_company()
    )
  )
  with check (
    auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = leave_requests.employee_id and e.company_id = auth_company()
    )
  );

-- payslips -------------------------------------------------------------------------------------
create policy payslips_select on payslips
  for select using (
    employee_id = auth.uid()
    or (auth_role() = 'admin' and exists (
      select 1 from employees e
      where e.id = payslips.employee_id and e.company_id = auth_company()
    ))
  );
-- Written only by the service role inside generatePayslip.

-- audit_log -------------------------------------------------------------------------------------
-- Employees get nothing. Admin reads within company.
create policy audit_admin_read on audit_log
  for select using (auth_role() = 'admin' and company_id = auth_company());
