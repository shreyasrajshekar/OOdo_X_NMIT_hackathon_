-- Login IDs for real profiles.
-- Until now the only login IDs that existed were in src/lib/mock-data.ts, so
-- signing in by Login ID could never match an actual auth user (see the
-- "Known rough edges" note in supabase/README.md). This adds the column and
-- backfills it with the same algorithm as src/lib/login-id.ts.

alter table public.profiles
  add column if not exists login_id varchar(14);

-- [CompanyInitials 2][FirstName 2][LastName 2][JoiningYear 4][Serial 4]
-- e.g. Odoo India, John Doe, joined 2022, first joiner that year -> OIJODO20220001
create or replace function public.build_login_id(
  p_company_prefix text,
  p_first_name text,
  p_last_name text,
  p_joining_year int,
  p_serial int
) returns varchar(14)
language sql
immutable
as $$
  select (
    rpad(upper(substring(regexp_replace(coalesce(p_company_prefix,''), '[^A-Za-z]', '', 'g') from 1 for 2)), 2, 'X') ||
    rpad(upper(substring(regexp_replace(coalesce(p_first_name,''),    '[^A-Za-z]', '', 'g') from 1 for 2)), 2, 'X') ||
    rpad(upper(substring(regexp_replace(coalesce(p_last_name,''),     '[^A-Za-z]', '', 'g') from 1 for 2)), 2, 'X') ||
    lpad(p_joining_year::text, 4, '0') ||
    lpad(p_serial::text, 4, '0')
  )::varchar(14);
$$;

-- Backfill: serial runs per joining year, ordered by join date then name so the
-- result is deterministic on re-run. Only fills nulls, never overwrites.
with numbered as (
  select
    id,
    coalesce(extract(year from join_date)::int, extract(year from created_at)::int, 2026) as yr,
    row_number() over (
      partition by coalesce(extract(year from join_date)::int, extract(year from created_at)::int, 2026)
      order by join_date nulls last, first_name, last_name, id
    ) as serial
  from public.profiles
)
update public.profiles p
   set login_id = public.build_login_id('OI', p.first_name, p.last_name, n.yr, n.serial::int)
  from numbered n
 where n.id = p.id
   and p.login_id is null;

create unique index if not exists profiles_login_id_key
  on public.profiles (login_id)
  where login_id is not null;
