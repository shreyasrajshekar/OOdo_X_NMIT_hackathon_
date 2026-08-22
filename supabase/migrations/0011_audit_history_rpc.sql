-- Dayflow 0011 — audit history reader for the Salary Info History section.
-- Admins may read history for anyone in their company; employees only their own.

create or replace function audit_history_for_employee(p_employee_id uuid)
returns table(
  field       text,
  old_value   text,
  new_value   text,
  changed_at  timestamptz,
  actor       text,
  entity      text
)
language sql
stable
security definer
set search_path = public
as $$
  with visible as (
    select 1 as ok
    where p_employee_id = auth.uid()
       or (
         auth_role() = 'admin'
         and exists (
           select 1 from employees e
           where e.id = p_employee_id and e.company_id = auth_company()
         )
       )
  )
  select
    a.field,
    a.old_value,
    a.new_value,
    a.changed_at,
    (select e.first_name || ' ' || e.last_name
       from employees e where e.id = a.actor_id) as actor,
    a.entity
  from audit_log a
  join salary_structures s
    on s.id = a.entity_id and a.entity = 'salary_structures'
  where exists (select 1 from visible)
    and s.employee_id = p_employee_id

  union all

  select
    a.field,
    a.old_value,
    a.new_value,
    a.changed_at,
    (select e.first_name || ' ' || e.last_name
       from employees e where e.id = a.actor_id),
    a.entity
  from audit_log a
  join salary_components c
    on c.id = a.entity_id and a.entity = 'salary_components'
  join salary_structures s2 on s2.id = c.structure_id
  where exists (select 1 from visible)
    and s2.employee_id = p_employee_id

  order by changed_at desc
  limit 200;
$$;
