-- Dayflow 0006 — payslips and audit (Section 5.6)

create table payslips (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees(id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  working_days   numeric(5,2) not null,
  payable_days   numeric(5,2) not null,
  lop_days       numeric(5,2) not null default 0,
  earnings       jsonb not null,      -- [{code,name,full,prorated}]
  deductions     jsonb not null,      -- [{code,name,amount}]
  gross          numeric(12,2) not null,
  total_deduct   numeric(12,2) not null,
  net_pay        numeric(12,2) not null,
  pdf_url        text,
  generated_at   timestamptz default now(),
  unique (employee_id, period_start)
);

create table audit_log (
  id           bigserial primary key,
  company_id   uuid not null references companies(id),
  actor_id     uuid references employees(id),
  entity       text not null,        -- 'salary_structures', 'salary_components', ...
  entity_id    uuid not null,
  field        text not null,
  old_value    text,
  new_value    text,
  changed_at   timestamptz default now()
);

create index audit_entity_idx on audit_log(company_id, entity, entity_id, changed_at desc);

alter table payslips enable row level security;
alter table audit_log enable row level security;
