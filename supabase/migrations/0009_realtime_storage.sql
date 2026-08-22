-- Dayflow 0009 — Realtime + Storage.

-- Attendance is the one realtime channel (Section 3). Status dots listen here.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance'
  ) then
    alter publication supabase_realtime add table public.attendance;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leave_requests'
  ) then
    alter publication supabase_realtime add table public.leave_requests;
  end if;
end $$;

-- Buckets (Section 3)
insert into storage.buckets (id, name, public) values
  ('avatars',    'avatars',    true),
  ('logos',      'logos',      true),
  ('leave-docs', 'leave-docs', false),
  ('payslips',   'payslips',   false)
on conflict (id) do nothing;

-- Public read for avatars and logos.
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

-- Signed-in users manage their own avatar files (folder named by user id).
create policy "avatars_own_write" on storage.objects
  for all
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Sick certificates: uploader-scoped folders, readable by admins of the company.
create policy "leavedocs_own_write" on storage.objects
  for all
  using (bucket_id = 'leave-docs' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'leave-docs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "leavedocs_admin_read" on storage.objects
  for select using (
    bucket_id = 'leave-docs' and auth_role() = 'admin'
  );

-- payslips bucket stays service-role only (no policies): PDFs are written by
-- generatePayslip and served through signed URLs minted server-side.
