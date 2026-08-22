import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";

/** RLS-scoped client: every query runs as the signed-in user. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — middleware refreshes sessions
          }
        },
      },
    },
  );
}

export type Session = AsyncReturnType<typeof getSessionContext>;

async function getSessionContext() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { sb, user, profile };
}

type AsyncReturnType<T extends () => unknown> = T extends () => Promise<infer R>
  ? R
  : never;

/**
 * Guard used by every (app) page and action:
 * returns the session context or redirects.
 */
export async function requireSession(opts?: { admin?: boolean }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/sign-in");
  // No forced password change yet: profiles has no must_change_password column.
  if (opts?.admin && ctx.profile.role !== "admin") redirect("/employees");
  return { sb: ctx.sb, user: ctx.user, me: ctx.profile };
}
