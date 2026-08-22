"use client";

import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchEmployeeById } from "@/lib/supabase-db";
import { EMPLOYEES, type Employee } from "@/lib/mock-data";

type Role = "admin" | "employee";

type DemoSessionValue = {
  role: Role;
  currentEmployee: Employee;
  setRole: (role: Role) => void;
  loading: boolean;
};

const ADMIN_EMPLOYEE = EMPLOYEES[0]; // Aditi Rao, HR Director
const DEMO_EMPLOYEE = EMPLOYEES[2]; // Priya Sharma, Product Designer

const DemoSessionContext = createContext<DemoSessionValue | null>(null);

export function DemoSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<Role>("admin");
  const [currentEmployee, setCurrentEmployee] = useState<Employee>(ADMIN_EMPLOYEE);
  const [loading, setLoading] = useState(true);

  // Sync role updates back to employee stub if manually toggled in demo
  const handleSetRole = (newRole: Role) => {
    setRole(newRole);
    setCurrentEmployee(newRole === "admin" ? ADMIN_EMPLOYEE : DEMO_EMPLOYEE);
  };

  useEffect(() => {
    let mounted = true;

    async function syncSession(sessionUser: { id: string } | null | undefined) {
      if (!sessionUser) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const emp = await fetchEmployeeById(sessionUser.id);
        if (emp && mounted) {
          setCurrentEmployee(emp);
          setRole(emp.role);
        }
      } catch (err) {
        console.error("Error fetching logged in employee profile:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session?.user);
    });

    // Listen to changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session?.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ role, currentEmployee, setRole: handleSetRole, loading }),
    [role, currentEmployee, loading],
  );

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession(): DemoSessionValue {
  const ctx = useContext(DemoSessionContext);
  if (!ctx) {
    throw new Error("useDemoSession must be used within DemoSessionProvider");
  }
  return ctx;
}

