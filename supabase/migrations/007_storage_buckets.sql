-- Storage buckets.
--
-- These were created by 0009_realtime_storage.sql, which went away with the old
-- schema in #4. The buckets survived on our project because that migration had
-- already run, but nothing in the repo recreated them - so a fresh Supabase
-- project had no `logos` bucket and the logo upload on sign-up failed. This
-- puts them back, standalone, with no dependency on the old tables.

INSERT INTO storage.buckets (id, name, public) VALUES
    ('avatars',    'avatars',    true),
    ('logos',      'logos',      true),
    ('leave-docs', 'leave-docs', false),
    ('payslips',   'payslips',   false)
ON CONFLICT (id) DO NOTHING;

-- Public read for avatars and company logos.
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'logos');

-- Sign-up uploads a logo before anyone is signed in, so the insert has to be
-- open to anon. Read is public anyway.
DROP POLICY IF EXISTS "logos_write" ON storage.objects;
CREATE POLICY "logos_write" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'logos');

-- Signed-in users manage their own avatar, in a folder named by their user id.
DROP POLICY IF EXISTS "avatars_own_write" ON storage.objects;
CREATE POLICY "avatars_own_write" ON storage.objects
    FOR ALL
    USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Sick certificates: uploader-scoped folders.
DROP POLICY IF EXISTS "leavedocs_own_write" ON storage.objects;
CREATE POLICY "leavedocs_own_write" ON storage.objects
    FOR ALL
    USING (bucket_id = 'leave-docs' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'leave-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins read every leave document. The old version of this policy called
-- auth_role(), which still exists but reads the dropped employees table, so it
-- errored for everyone. Reads profiles now.
DROP POLICY IF EXISTS "leavedocs_admin_read" ON storage.objects;
CREATE POLICY "leavedocs_admin_read" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'leave-docs'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- payslips stays service-role only, on purpose: no policies at all. PDFs are
-- written server-side and served through signed URLs.
