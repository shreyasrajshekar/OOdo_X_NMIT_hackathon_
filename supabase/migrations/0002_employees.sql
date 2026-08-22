-- Dayflow 0002 — employees (Section 5.2)
-- employees.id = auth.users.id: one Supabase Auth user per employee.

create table employees (
  id                  uuid primary key references auth.users(id) on delete cascade,
  company_id          uuid not null references companies(id),
  login_id            text not null unique,
  first_name          text not null,
  last_name           text not null,
  work_email          text not null unique,
  personal_email      text,
  phone               text,
  role                app_role not null default 'employee',
  manager_id          uuid references employees(id),
  department          text,
  job_title           text,
  joining_date        date not null,
  dob                 date,
  gender              text,
  marital_status      text,
  nationality         text,
  address             text,
  avatar_url          text,
  bank_account_no     text,
  bank_name           text,
  ifsc_code           text,
  pan_no              text,
  uan_no              text,
  esic_code           text,
  must_change_password boolean not null default true,
  is_active           boolean not null default true,
  created_at          timestamptz default now()
);

create index employees_company_idx on employees(company_id);

create table employee_resume (
  employee_id     uuid primary key references employees(id) on delete cascade,
  about           text,
  love_about_job  text,
  interests       text,
  skills          jsonb default '[]',
  certifications  jsonb default '[]'
);

alter table employees enable row level security;
alter table employee_resume enable row level security;
