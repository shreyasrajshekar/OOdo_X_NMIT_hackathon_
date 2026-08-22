-- Dayflow 0003 — salary: config, structures, components (Section 5.3)
-- sandwich_unpaid_leaves is the config flag demanded by Section 6.6.

create table payroll_config (
  company_id         uuid primary key references companies(id),
  pf_employee_rate   numeric(5,2) not null default 12.00,
  pf_employer_rate   numeric(5,2) not null default 12.00,
  professional_tax   numeric(10,2) not null default 200.00,
  pf_wage_ceiling    numeric(10,2) default 15000.00,
  sandwich_unpaid_leaves boolean not null default true
);

alter table payroll_config enable row level security;

create table salary_structures (
  id                    uuid primary key default gen_random_uuid(),
  employee_id           uuid not null references employees(id) on delete cascade,
  wage_type             text not null default 'fixed',
  monthly_wage          numeric(12,2) not null,
  yearly_wage           numeric(12,2) generated always as (monthly_wage * 12) stored,
  working_days_month    int not null default 22,
  break_hours           numeric(4,2) default 1.0,
  effective_from        date not null default current_date,
  is_current            boolean not null default true,
  created_at            timestamptz default now(),
  unique (employee_id, is_current)
);

create index salary_structures_employee_idx on salary_structures(employee_id);

-- Wireframe rule encoded: HRA is percent-of-BASIC through base_component_code.
create table salary_components (
  id                    uuid primary key default gen_random_uuid(),
  structure_id          uuid not null references salary_structures(id) on delete cascade,
  code                  text not null,          -- BASIC, HRA, STD, PERF, LTA, FIXED
  name                  text not null,
  computation           computation_type not null,
  percent_value         numeric(6,3),           -- when percent_*
  base_component_code   text,                   -- when percent_of_component
  fixed_amount          numeric(12,2),          -- when fixed
  sequence              int not null,           -- resolution order
  unique (structure_id, code)
);

create index salary_components_structure_idx on salary_components(structure_id);

alter table salary_structures enable row level security;
alter table salary_components enable row level security;
