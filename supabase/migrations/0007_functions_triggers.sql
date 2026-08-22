-- Dayflow 0007 — functions and triggers.
-- Business rules live in the database, not the app (Section 0 rule 4):
--   * atomic login-id generation      (Section 6.1)
--   * attendance computation          (Section 6.4)
--   * salary audit trail              (Section 5.6)
--   * self-service column guard       (Section 7)

-- ---------------------------------------------------------------------------
-- Auth helpers used by every RLS policy (Section 7)
-- ---------------------------------------------------------------------------
create or replace function auth_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from employees where id = auth.uid()
$$;

create or replace function auth_company() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from employees where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Login ID generation (Section 6.1)
--   [COMPANY_CODE 2][FIRST_NAME 2][LAST_NAME 2][YEAR_OF_JOINING 4][SERIAL 4]
-- Atomicity: FOR UPDATE locks the company row, so two concurrent inserts for
-- the same company serialize here; max(serial)+1 keeps uniqueness even after
-- deletions. The unique constraint on login_id is the backstop.
-- ---------------------------------------------------------------------------
create or replace function generate_login_id(
  p_company_id    uuid,
  p_first_name    text,
  p_last_name     text,
  p_joining_date  date
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code     text;
  v_year     int;
  v_prefix   text;
  v_serial   int;
begin
  select code into v_code from companies where id = p_company_id for update;
  if not found then
    raise exception 'generate_login_id: unknown company %', p_company_id;
  end if;

  v_year   := extract(year from p_joining_date)::int;
  v_prefix :=
    v_code
    || rpad(left(regexp_replace(upper(coalesce(p_first_name,'')), '[^A-Z]', '', 'g'), 2), 2, 'X')
    || rpad(left(regexp_replace(upper(coalesce(p_last_name, '')), '[^A-Z]', '', 'g'), 2), 2, 'X')
    || v_year::text;

  select coalesce(max(substring(login_id from 11)::int), 0) + 1 into v_serial
  from employees
  where login_id like v_prefix || '%'
    and substring(login_id from 11) ~ '^[0-9]{4}$';

  return v_prefix || lpad(v_serial::text, 4, '0');
end $$;

-- ---------------------------------------------------------------------------
-- Sign-in helper: resolve a Login ID to its work email before signInWithPassword.
-- Security definer so it works pre-authentication; exposes only the email.
-- ---------------------------------------------------------------------------
create or replace function lookup_email_for_identifier(p_identifier text)
returns text
language sql stable security definer set search_path = public as $$
  select work_email
  from employees
  where login_id = upper(btrim(p_identifier))
     or work_email = lower(btrim(p_identifier))
  limit 1
$$;

-- Called after the forced password change succeeds (Section 6.2 step 7).
create or replace function complete_password_change()
returns void
language sql security definer set search_path = public as $$
  update employees set must_change_password = false where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Attendance RPCs (Section 7 matrix: employees insert own for today only,
-- no update — checkout goes through this definer instead).
-- ---------------------------------------------------------------------------
create or replace function do_check_in()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := auth.uid();
begin
  if v_emp is null then raise exception 'Not authenticated'; end if;

  if exists (
    select 1 from attendance
    where employee_id = v_emp and work_date = current_date and check_in is not null
  ) then
    raise exception 'Already checked in today';
  end if;

  insert into attendance (employee_id, work_date, check_in)
  values (v_emp, current_date, now())
  on conflict (employee_id, work_date) do update set check_in = now();
end $$;

create or replace function do_check_out()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := auth.uid();
begin
  if v_emp is null then raise exception 'Not authenticated'; end if;

  update attendance
  set check_out = now()
  where employee_id = v_emp and work_date = current_date and check_out is null;

  if not found then
    raise exception 'No open session today';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Attendance computation trigger (Section 6.4)
--   work_hours  = (check_out - check_in) - break_hours, floored at 0
--   extra_hours = max(0, work_hours - standard_day_hours), standard defaults 8
--   anomaly     = checked in, never out, day already over
-- ---------------------------------------------------------------------------
create or replace function attendance_compute()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_break numeric;
  v_std   constant numeric := 8;
begin
  select coalesce(s.break_hours, 1.0) into v_break
  from salary_structures s
  where s.employee_id = new.employee_id and s.is_current
  order by s.effective_from desc
  limit 1;
  v_break := coalesce(v_break, 1.0);

  if new.check_in is not null and new.check_out is not null then
    new.work_hours  := greatest(0, round((extract(epoch from (new.check_out - new.check_in)) / 3600.0)::numeric - v_break, 2));
    new.extra_hours := greatest(0, new.work_hours - v_std);
    new.status      := case when new.work_hours >= v_std then 'present'::attendance_status
                            else 'half_day'::attendance_status end;
    new.is_anomaly  := false;
  elsif new.check_in is not null and new.check_out is null and new.work_date < current_date then
    new.is_anomaly := true;
  end if;

  return new;
end $$;

create trigger trg_attendance_compute
before insert or update of check_in, check_out, employee_id on attendance
for each row execute function attendance_compute();

-- ---------------------------------------------------------------------------
-- Salary audit trail (Section 5.6): a trigger, not application code.
-- Writes one audit_log row per changed field on both salary tables.
-- INSERT -> single "(create)" row. DELETE -> single "(delete)" row.
-- ---------------------------------------------------------------------------
create or replace function salary_audit()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_entity  text := tg_table_name;
  v_row_id  uuid;
  v_o       jsonb;
  v_n       jsonb;
  k         text;
begin
  if tg_op = 'INSERT' then
    v_n := to_jsonb(new); v_o := '{}'::jsonb; v_row_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_n := to_jsonb(new); v_o := to_jsonb(old); v_row_id := new.id;
  else
    v_o := to_jsonb(old); v_n := '{}'::jsonb; v_row_id := old.id;
  end if;

  -- resolve owning company
  if v_entity = 'salary_structures' then
    select e.company_id into v_company
    from employees e
    where e.id = coalesce(v_n->>'employee_id', v_o->>'employee_id')::uuid;
  else
    select e.company_id into v_company
    from employees e
    join salary_structures s on s.employee_id = e.id
    where s.id = coalesce(v_n->>'structure_id', v_o->>'structure_id')::uuid;
  end if;

  if tg_op = 'INSERT' then
    insert into audit_log (company_id, actor_id, entity, entity_id, field, old_value, new_value)
    values (v_company, auth.uid(), v_entity, v_row_id, '(create)', null,
            left(coalesce(v_n->>'code', v_n->>'monthly_wage', ''), 500));
  elsif tg_op = 'DELETE' then
    insert into audit_log (company_id, actor_id, entity, entity_id, field, old_value, new_value)
    values (v_company, auth.uid(), v_entity, v_row_id, '(delete)',
            left(coalesce(v_o->>'code', v_o->>'monthly_wage', ''), 500), null);
  else
    for k in select jsonb_object_keys(v_n) loop
      continue when k in ('id','created_at');
      if v_n->k is distinct from v_o->k then
        insert into audit_log (company_id, actor_id, entity, entity_id, field, old_value, new_value)
        values (v_company, auth.uid(), v_entity, v_row_id, k,
                left(v_o->>k, 500), left(v_n->>k, 500));
      end if;
    end loop;
  end if;

  return coalesce(new, old);
end $$;

create trigger trg_salary_structures_audit
after insert or update or delete on salary_structures
for each row execute function salary_audit();

create trigger trg_salary_components_audit
after insert or update or delete on salary_components
for each row execute function salary_audit();

-- ---------------------------------------------------------------------------
-- Self-service guard (Section 7): an employee may update only their own
-- phone, address and avatar_url. Admins pass. Service-role connections carry
-- no JWT, auth_role() is null, and every admin flow through the app passes.
-- ---------------------------------------------------------------------------
create or replace function employees_guard_update()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role app_role;
  o      jsonb := to_jsonb(old);
  n      jsonb := to_jsonb(new);
  k      text;
begin
  select role into v_role from employees where id = auth.uid();
  if v_role is null or v_role = 'admin' then
    return new;
  end if;

  for k in select jsonb_object_keys(n) loop
    continue when k in ('phone','address','avatar_url');
    if n->k is distinct from o->k then
      raise exception 'Employees may update only phone, address and avatar_url';
    end if;
  end loop;

  return new;
end $$;

create trigger trg_employees_guard
before update on employees
for each row execute function employees_guard_update();
