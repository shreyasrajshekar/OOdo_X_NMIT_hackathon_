-- Dayflow 0005 — time off: a ledger, not counters (Section 5.5)

create extension if not exists btree_gist;

create table leave_types (
  id                   uuid primary key default gen_random_uuid(),
  company_id           uuid not null references companies(id),
  code                 text not null,      -- PAID, SICK, UNPAID
  name                 text not null,
  is_paid              boolean not null default true,
  requires_attachment  boolean not null default false,
  unique (company_id, code)
);

-- credits
create table leave_allocations (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees(id) on delete cascade,
  leave_type_id  uuid not null references leave_types(id),
  days           numeric(5,2) not null,
  valid_from     date not null,
  valid_to       date not null,
  note           text,
  allocated_by   uuid references employees(id),
  created_at     timestamptz default now()
);

-- debits
create table leave_requests (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references employees(id) on delete cascade,
  leave_type_id   uuid not null references leave_types(id),
  start_date      date not null,
  end_date        date not null,
  day_count       numeric(5,2) not null check (day_count > 0),
  remarks         text,
  attachment_url  text,
  status          request_status not null default 'pending',
  reviewed_by     uuid references employees(id),
  review_comment  text,
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);

-- Overlapping pending/approved requests for the same employee are rejected at
-- insert time. Rejected requests do not block.
alter table leave_requests
  add constraint leave_no_overlap
  exclude using gist (
    employee_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status <> 'rejected');

create index leave_allocations_emp_idx on leave_allocations(employee_id, leave_type_id);
create index leave_requests_emp_idx on leave_requests(employee_id, leave_type_id, status);

-- Balance is never stored. Always derived.
create view leave_balances as
select
  a.employee_id,
  a.leave_type_id,
  sum(a.days) as allocated,
  coalesce((
    select sum(r.day_count) from leave_requests r
    where r.employee_id = a.employee_id
      and r.leave_type_id = a.leave_type_id
      and r.status = 'approved'
  ), 0) as taken,
  sum(a.days) - coalesce((
    select sum(r.day_count) from leave_requests r
    where r.employee_id = a.employee_id
      and r.leave_type_id = a.leave_type_id
      and r.status = 'approved'
  ), 0) as available
from leave_allocations a
where current_date between a.valid_from and a.valid_to
group by a.employee_id, a.leave_type_id;

-- Views execute with the invoker's rights so RLS on the underlying tables holds.
alter view leave_balances set (security_invoker = true);

alter table leave_types enable row level security;
alter table leave_allocations enable row level security;
alter table leave_requests enable row level security;
