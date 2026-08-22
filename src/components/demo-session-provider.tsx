"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { fetchEmployeeById } from "@/lib/supabase-db";
import { type Employee } from "@/lib/mock-data";

type Role = "admin" | "employee";

type SessionValue = {
  /** Role of the signed-in user, read from their employee record. */
  role: Role;
  isAdmin: boolean;
  currentEmployee: Employee;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

type Status =
  | { state: "loading" }
  | { state: "anonymous" }
  | { state: "orphaned"; email: string }
  | { state: "ready"; employee: Employee };

/**
 * Resolves the signed-in user to their employee record and exposes their real
 * role. There is no demo identity and no role switching: what you can see is
 * decided by the row in `employees` that matches your auth user id.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: "loading" });

  const load = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;
    if (!user) {
      setStatus({ state: "anonymous" });
      return;
    }

    const mustChange = user.user_metadata?.must_change_password;
    if (mustChange) {
      router.replace("/change-password");
      return;
    }


    try {
      const employee = await fetchEmployeeById(user.id);
      if (employee) {
        setStatus({ state: "ready", employee });
      } else {
        setStatus({ state: "orphaned", email: user.email ?? "" });
      }
    } catch (err) {
      console.error("Error loading the signed-in employee:", err);
      setStatus({ state: "orphaned", email: user.email ?? "" });
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT") {
        setStatus({ state: "anonymous" });
        return;
      }
      void load();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    if (status.state === "anonymous") {
      router.replace("/sign-in");
    }
  }, [status.state, router]);

  if (status.state === "loading" || status.state === "anonymous") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse font-display text-sm font-semibold text-ink/70">
          {status.state === "loading" ? "Loading your workspace…" : "Redirecting…"}
        </p>
      </div>
    );
  }

  if (status.state === "orphaned") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex max-w-md flex-col gap-3 rounded-card border border-line p-8 text-center">
          <h1 className="font-display text-[25px] font-bold tracking-tight text-ink">
            No employee record
          </h1>
          <p className="font-body text-[15px] text-ink/70">
            {status.email || "This account"} is signed in, but it isn&apos;t
            linked to an employee record yet. Ask your HR admin to add you, then
            sign in again.
          </p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/sign-in");
            }}
            className="mt-2 font-display text-sm font-semibold text-primary"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReadySession employee={status.employee} refresh={load}>
      {children}
    </ReadySession>
  );
}

function ReadySession({
  employee,
  refresh,
  children,
}: {
  employee: Employee;
  refresh: () => Promise<void>;
  children: React.ReactNode;
}) {
  const value = useMemo<SessionValue>(
    () => ({
      role: employee.role,
      isAdmin: employee.role === "admin",
      currentEmployee: employee,
      loading: false,
      refresh,
    }),
    [employee, refresh],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}

/** @deprecated kept so existing imports keep working. Use `useSession`. */
export const useDemoSession = useSession;

/** @deprecated kept so existing imports keep working. Use `SessionProvider`. */
export const DemoSessionProvider = SessionProvider;
