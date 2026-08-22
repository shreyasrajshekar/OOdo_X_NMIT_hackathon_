-- Dayflow 0004 — attendance (Section 5.4)

create table holidays (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id),
  holiday_date  date not null,
  name          text not null,
  unique (company_id, holiday_date)
);

create table attendance (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  work_date     date not null,
  check_in      timestamptz,
  check_out     timestamptz,
  work_hours    numeric(5,2),
  extra_hours   numeric(5,2) default 0,
  status        attendance_status not null default 'present',
  is_anomaly    boolean not null default false,   -- checked in, never checked out
  notes         text,
  unique (employee_id, work_date)
);

create index attendance_employee_date_idx on attendance(employee_id, work_date desc);
create index attendance_work_date_idx on attendance(work_date);

create table regularization_requests (
  id                  uuid primary key default gen_random_uuid(),
  attendance_id       uuid not null references attendance(id) on delete cascade,
  employee_id         uuid not null references employees(id),
  proposed_check_in   timestamptz,
  proposed_check_out  timestamptz,
  reason              text not null,
  status              request_status not null default 'pending',
  reviewed_by         uuid references employees(id),
  review_comment      text,
  created_at          timestamptz default now()
);

create index regularization_pending_idx on regularization_requests(status) where status = 'pending';

alter table holidays enable row level security;
alter table attendance enable row level security;
alter table regularization_requests enable row level security;
