-- Dayflow 0001 — enums and companies (Section 5.1)

create type app_role as enum ('admin','employee');
create type attendance_status as enum ('present','absent','half_day','leave','holiday','weekend');
create type request_status as enum ('pending','approved','rejected');
create type computation_type as enum ('fixed','percent_of_wage','percent_of_component','balance');

create table companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  code         char(2) not null unique,      -- first two letters, used in login id
  logo_url     text,
  created_at   timestamptz default now()
);

alter table companies enable row level security;
