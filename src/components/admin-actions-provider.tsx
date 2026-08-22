"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { NewEmployeeModal } from "@/components/employees/new-employee-modal";
import { useSession } from "@/components/demo-session-provider";
import { fetchEmployees } from "@/lib/supabase-db";
import { type Employee } from "@/lib/mock-data";

type AdminActionsValue = {
  /** True only for admin/HR users. */
  canAddUsers: boolean;
  /** Opens the "Add user" dialog from anywhere in the app. */
  openAddUser: () => void;
  /** Subscribe to employees created through that dialog. */
  onUserCreated: (listener: (employee: Employee) => void) => () => void;
};

const AdminActionsContext = createContext<AdminActionsValue | null>(null);

/**
 * Hosts the "Add user" dialog once, so both the nav and the employee
 * directory can open it.
 */
export function AdminActionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, currentEmployee } = useSession();
  const [open, setOpen] = useState(false);
  const [loginIds, setLoginIds] = useState<string[]>([]);
  const listeners = useRef(new Set<(employee: Employee) => void>());

  const openAddUser = useCallback(() => {
    if (!isAdmin) return;
    setOpen(true);
    // Existing IDs decide the next serial in the Login ID.
    fetchEmployees()
      .then((employees) => setLoginIds(employees.map((e) => e.loginId)))
      .catch((err) => console.warn("Could not read existing Login IDs:", err));
  }, [isAdmin]);

  const onUserCreated = useCallback(
    (listener: (employee: Employee) => void) => {
      listeners.current.add(listener);
      return () => {
        listeners.current.delete(listener);
      };
    },
    [],
  );

  const value = useMemo<AdminActionsValue>(
    () => ({ canAddUsers: isAdmin, openAddUser, onUserCreated }),
    [isAdmin, openAddUser, onUserCreated],
  );

  return (
    <AdminActionsContext.Provider value={value}>
      {children}
      {isAdmin && (
        <NewEmployeeModal
          open={open}
          onClose={() => setOpen(false)}
          existingLoginIds={loginIds}
          companyPrefix={currentEmployee.loginId.slice(0, 2)}
          onCreated={(employee) => {
            listeners.current.forEach((listener) => listener(employee));
          }}
        />
      )}
    </AdminActionsContext.Provider>
  );
}

export function useAdminActions(): AdminActionsValue {
  const ctx = useContext(AdminActionsContext);
  if (!ctx) {
    throw new Error("useAdminActions must be used within AdminActionsProvider");
  }
  return ctx;
}
