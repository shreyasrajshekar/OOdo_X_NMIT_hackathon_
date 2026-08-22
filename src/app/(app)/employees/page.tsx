"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmployeeCard } from "@/components/employee-card";
import { NewEmployeeModal } from "@/components/employees/new-employee-modal";
import { useDemoSession } from "@/components/demo-session-provider";
import { employeeName, type Employee } from "@/lib/mock-data";
import { fetchEmployees } from "@/lib/supabase-db";

export default function EmployeesPage() {
  const { role } = useDemoSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchEmployees().then((data) => {
      setEmployees(data);
      setLoading(false);
    });
  }, []);


  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      [
        employeeName(employee),
        employee.loginId,
        employee.department,
        employee.jobTitle,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [employees, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-display text-sm font-semibold text-ink/70 animate-pulse">
          Loading employees...
        </p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
            Employees
          </h1>
          <p className="mt-1 font-body text-[15px] text-ink/70">
            Everyone at the company, in one place.
          </p>
        </div>
        {role === "admin" && (
          <Button onClick={() => setModalOpen(true)}>New employee</Button>
        )}
      </div>

      <input
        type="search"
        placeholder="Search employees"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-pill border border-line px-4 py-2 font-display text-sm text-ink outline-none focus:border-plum"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line py-24 text-center">
          <p className="font-display text-sm font-semibold text-ink">
            No employees match &ldquo;{search}&rdquo;.
          </p>
          <p className="font-body text-[15px] text-ink/70">
            Try a different name, department, or Login ID.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      )}

      <NewEmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        existingLoginIds={employees.map((e) => e.loginId)}
        onCreated={(employee) =>
          setEmployees((current) => [...current, employee])
        }
      />
    </div>
  );
}
