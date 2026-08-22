"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type ResolveResult =
  | { ok: true; email: string }
  | { ok: false; reason: "not_found" | "unconfigured" };

/**
 * Turns a Login ID (OIJODO20220001) into the email auth.users holds.
 *
 * This runs server-side on purpose. The obvious alternative — a SECURITY
 * DEFINER function granted to `anon` — would hand anonymous callers an
 * email-enumeration oracle, and Login IDs are structured enough to guess.
 * Keeping it in a server action means the lookup is never part of the public
 * PostgREST surface and can be rate limited later if needed.
 *
 * Nothing but the email crosses the boundary, and a miss is reported as a
 * generic `not_found`.
 */
export async function resolveLoginIdentifier(
  identifier: string,
): Promise<ResolveResult> {
  const raw = identifier.trim();
  if (!raw) return { ok: false, reason: "not_found" };

  // Already an email: nothing to resolve.
  if (raw.includes("@")) return { ok: true, email: raw };

  let admin: ReturnType<typeof supabaseAdmin>;
  try {
    admin = supabaseAdmin();
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY missing — surfaced as a setup problem rather
    // than "no such account", which would send you chasing the wrong bug.
    return { ok: false, reason: "unconfigured" };
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, is_active")
    .eq("login_id", raw.toUpperCase())
    .maybeSingle();

  if (error || !profile || profile.is_active === false) {
    return { ok: false, reason: "not_found" };
  }

  const { data: user, error: userError } =
    await admin.auth.admin.getUserById(profile.id);

  if (userError || !user?.user?.email) return { ok: false, reason: "not_found" };
  return { ok: true, email: user.user.email };
}
