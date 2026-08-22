-- Dayflow 0010 — atomic component replacement for the salary editor.
-- Upserts by code so the audit trigger records real field-level diffs,
-- then removes codes the editor dropped. Admin-only.

create or replace function replace_salary_components(
  p_structure_id uuid,
  p_components   jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee uuid;
  r          jsonb;
begin
  select employee_id into v_employee from salary_structures where id = p_structure_id;
  if v_employee is null then
    raise exception 'replace_salary_components: unknown structure %', p_structure_id;
  end if;

  if auth_role() is distinct from 'admin' then
    raise exception 'Only admins may edit salary components';
  end if;

  for r in select * from jsonb_array_elements(p_components) loop
    insert into salary_components (
      structure_id, code, name, computation,
      percent_value, base_component_code, fixed_amount, sequence
    ) values (
      p_structure_id,
      r->>'code',
      r->>'name',
      (r->>'computation')::computation_type,
      nullif(r->>'percent_value', '')::numeric,
      nullif(r->>'base_component_code', ''),
      nullif(r->>'fixed_amount', '')::numeric,
      (r->>'sequence')::int
    )
    on conflict (structure_id, code) do update set
      name                = excluded.name,
      computation         = excluded.computation,
      percent_value       = excluded.percent_value,
      base_component_code = excluded.base_component_code,
      fixed_amount        = excluded.fixed_amount,
      sequence            = excluded.sequence;
  end loop;

  delete from salary_components
  where structure_id = p_structure_id
    and not exists (
      select 1
      from jsonb_array_elements(p_components) kept
      where kept->>'code' = salary_components.code
    );
end $$;
