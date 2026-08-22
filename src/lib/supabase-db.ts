import { supabase } from "./supabase";
import type { TablesUpdate } from "@/types/database";
import { 
  COMPANY_NAME, 
  EMPLOYEES, 
  LEAVE_ALLOCATIONS, 
  LEAVE_REQUESTS, 
  type Employee, 
  type LeaveRequest, 
  type LeaveAllocation, 
  type AttendanceRecord, 
  type AttendanceStatus, 
  type RequestStatus, 
  type Department, 
  type LeaveTypeCode 
} from "./mock-data";

// Helper to determine if a database error is a missing table (PGRST205)
function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!(error && (error.code === "PGRST205" || (error.message && error.message.includes("does not exist"))));
}

// --- DB Interfaces for strict typing ---
interface DbProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: "admin" | "employee";
  department: string | null;
  position: string | null;
  join_date: string | null;
  avatar_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
  salary_structure?: {
    basic: number;
    hra: number;
    da: number;
    allowance: number;
    pf_rate: number | null;
    tax_rate: number | null;
  } | null;
}

interface DbAttendance {
  id: number;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number | string | null;
  status: AttendanceStatus;
}

interface DbLeaveRequest {
  id: number;
  employee_id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_days: number;
  reason: string;
  status: RequestStatus;
}

interface DbLeaveBalance {
  id: number;
  employee_id: string;
  year: number;
  paid_leave: number | null;
  sick_leave: number | null;
  casual_leave: number | null;
  unpaid_leave: number | null;
}

// --- Company Scoping Helper (Mock tenant logic for single-tenant schema) ---

export async function fetchCompanyName(): Promise<string> {
  return COMPANY_NAME;
}

// --- Employees Queries & Mutations ---

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const { data: dbProfiles, error } = await supabase
      .from("profiles")
      // The FK must be named. salary_structure has two of them pointing at
      // profiles - employee_id and updated_by - so an unqualified embed is
      // ambiguous and PostgREST answers 300 (PGRST201) rather than guessing.
      // That 300 was being swallowed into the mock-data fallback below, which
      // is why this list looked like it worked while never once reading the
      // database.
      .select(`
        *,
        salary_structure!salary_structure_employee_id_fkey (basic, hra, da, allowance, pf_rate, tax_rate)
      `)
      .eq("is_active", true);

    if (error) {
      if (isMissingTableError(error)) {
        console.warn("Table 'profiles' not found in Supabase. Falling back to mock data.");
        return EMPLOYEES;
      }
      throw error;
    }

    if (!dbProfiles || dbProfiles.length === 0) {
      return EMPLOYEES;
    }

    const castedProfiles = dbProfiles as unknown as DbProfile[];

    return castedProfiles.map((prof) => {
      // Find matching mock employee to enrich profiles with descriptions/UAN
      const mockEmp = EMPLOYEES.find(
        (e) =>
          e.id.toLowerCase() === prof.id.toLowerCase() ||
          (prof.id === "aaaaaaaa-bbbb-cccc-dddd-eeee00000001" && e.id === "emp-2") || // Priya Sharma
          (prof.id === "aaaaaaaa-bbbb-cccc-dddd-eeee00000002" && e.id === "emp-1")    // Aditi Rao
      );

      const sal = prof.salary_structure;
      const monthlyWage = sal 
        ? (Number(sal.basic) + Number(sal.hra) + Number(sal.da) + Number(sal.allowance)) 
        : (mockEmp?.monthlyWage || 50000);
      
      const loginId = mockEmp?.loginId || (prof.first_name.substring(0,2) + prof.last_name.substring(0,2) + "2026").toUpperCase();

      return {
        id: prof.id,
        loginId,
        firstName: prof.first_name,
        lastName: prof.last_name,
        workEmail: mockEmp?.workEmail || `${prof.first_name.toLowerCase()}.${prof.last_name.toLowerCase()}@odoo.in`,
        personalEmail: mockEmp?.personalEmail || "",
        mobile: prof.phone || mockEmp?.mobile || "",
        role: prof.role,
        department: (prof.department as Department) || mockEmp?.department || "Engineering",
        jobTitle: prof.position || mockEmp?.jobTitle || "",
        manager: mockEmp?.manager || "—",
        location: mockEmp?.location || "Bengaluru",
        joiningDate: prof.join_date || mockEmp?.joiningDate || new Date().toISOString().split("T")[0],
        dob: mockEmp?.dob || "",
        gender: mockEmp?.gender || "",
        maritalStatus: mockEmp?.maritalStatus || "",
        nationality: mockEmp?.nationality || "",
        address: mockEmp?.address || "",
        bankAccountNo: mockEmp?.bankAccountNo || "",
        bankName: mockEmp?.bankName || "",
        ifsc: mockEmp?.ifsc || "",
        pan: mockEmp?.pan || "",
        uan: mockEmp?.uan || "",
        monthlyWage,
        workingDaysPerWeek: mockEmp?.workingDaysPerWeek || 5,
        breakHours: mockEmp?.breakHours || 1,
        about: mockEmp?.about || "",
        loveAboutJob: mockEmp?.loveAboutJob || "",
        interests: mockEmp?.interests || "",
        skills: mockEmp?.skills || [],
        certifications: mockEmp?.certifications || [],
      };
    });
  } catch (e) {
    // Log the actual PostgREST fields; console.error on the raw object prints
    // "Object" and tells you nothing about which query failed or why.
    const err = e as { message?: string; code?: string; details?: string; hint?: string };
    console.error(
      "fetchEmployees failed, falling back to mock data:",
      JSON.stringify(
        { message: err?.message, code: err?.code, details: err?.details, hint: err?.hint },
        null,
        2,
      ),
    );
    return EMPLOYEES;
  }
}

export async function fetchEmployeeById(id: string): Promise<Employee | undefined> {
  const employees = await fetchEmployees();
  return employees.find((e) => e.id.toLowerCase() === id.toLowerCase() || e.loginId.toLowerCase() === id.toLowerCase());
}

export async function createEmployeeInDb(
  data: Omit<Employee, "id">,
  companyId?: string,
  authUserId?: string,
): Promise<Employee> {
  const userId = authUserId || crypto.randomUUID();

  try {
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.mobile || null,
        role: data.role,
        department: data.department,
        position: data.jobTitle,
        join_date: data.joiningDate,
        is_active: true,
      });

    if (profileError) throw profileError;

    // Create salary structure row (calculate defaults based on gross monthlyWage)
    const basic = Math.round(data.monthlyWage * 0.5);
    const hra = Math.round(data.monthlyWage * 0.2);
    const da = Math.round(data.monthlyWage * 0.1);
    const allowance = data.monthlyWage - basic - hra - da;

    await supabase.from("salary_structure").insert({
      employee_id: userId,
      basic,
      hra,
      da,
      allowance,
      pf_rate: 12.00,
      tax_rate: 10.00,
    });

    // Create leave balance row
    await supabase.from("leave_balance").insert({
      employee_id: userId,
      year: new Date().getFullYear(),
      paid_leave: 12,
      sick_leave: 10,
      casual_leave: 6,
      unpaid_leave: 0,
    });

    return { ...data, id: userId };
  } catch (e) {
    console.error("createEmployeeInDb failed, returning fallback:", e);
    return { ...data, id: userId };
  }
}

export async function updateEmployeeInDb(id: string, updates: Partial<Employee>): Promise<boolean> {
  try {
    const dbUpdates: TablesUpdate<"profiles"> = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.mobile !== undefined) dbUpdates.phone = updates.mobile;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.jobTitle !== undefined) dbUpdates.position = updates.jobTitle;
    if (updates.joiningDate !== undefined) dbUpdates.join_date = updates.joiningDate;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from("profiles").update(dbUpdates).eq("id", id);
      if (error) throw error;
    }

    return true;
  } catch (e) {
    console.error("updateEmployeeInDb failed:", e);
    return false;
  }
}

// --- Attendance Queries & Mutations ---

export async function fetchAttendanceRecords(employeeId: string, monthISO: string): Promise<AttendanceRecord[]> {
  try {
    const { data: dbRecords, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .like("date", `${monthISO}%`);

    if (error) {
      if (isMissingTableError(error)) throw error;
      console.error("Attendance fetch error:", error);
      return [];
    }

    const castedRecs = (dbRecords || []) as unknown as DbAttendance[];

    return castedRecs.map((rec) => ({
      date: rec.date,
      status: rec.status,
      checkIn: rec.check_in,
      checkOut: rec.check_out,
      workHours: Number(rec.hours_worked) || 0,
      extraHours: Number(rec.hours_worked) > 8 ? (Number(rec.hours_worked) - 8) : 0,
    }));
  } catch (e) {
    console.warn("fetchAttendanceRecords failed:", e);
    return [];
  }
}

/** Result of a write, carrying the reason when it fails so the UI can say so. */
export type WriteResult = { ok: boolean; error?: string };

/**
 * Check in for the day.
 *
 * `attendance` is unique on (employee_id, date), so a plain insert fails the
 * moment a row already exists for today — which is what happens after a
 * check-out, or when a status row was written for the day by anything else.
 * Read the row first, then insert or update as appropriate.
 */
export async function checkInEmployee(
  employeeId: string,
  workDate: string,
): Promise<WriteResult> {
  const nowISO = new Date().toISOString();

  try {
    const { data: existing, error: readError } = await supabase
      .from("attendance")
      .select("id, check_in, check_out")
      .eq("employee_id", employeeId)
      .eq("date", workDate)
      .maybeSingle();

    if (readError) throw readError;

    const row = existing as
      | { id: number; check_in: string | null; check_out: string | null }
      | null;

    if (row) {
      // Re-opening the day: keep the original arrival time, clear the close.
      const { error } = await supabase
        .from("attendance")
        .update({
          check_in: row.check_in ?? nowISO,
          check_out: null,
          status: "present",
        })
        .eq("id", row.id);

      if (error) throw error;
      return { ok: true };
    }

    const { error } = await supabase.from("attendance").insert({
      employee_id: employeeId,
      date: workDate,
      check_in: nowISO,
      status: "present",
    });

    if (error) throw error;
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("checkInEmployee failed:", message);
    return { ok: false, error: message };
  }
}

/**
 * Check out. Returns the updated row so a filter that matched nothing is
 * reported as a failure instead of passing silently.
 */
export async function checkOutEmployee(
  employeeId: string,
  workDate: string,
  workHours: number,
  _extraHours: number,
): Promise<WriteResult> {
  void _extraHours;

  try {
    const { data, error } = await supabase
      .from("attendance")
      .update({
        check_out: new Date().toISOString(),
        hours_worked: workHours,
        status:
          workHours >= 8 ? "present" : workHours >= 4 ? "half_day" : "absent",
      })
      .eq("employee_id", employeeId)
      .eq("date", workDate)
      .select("id");

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        ok: false,
        error: "No check-in found for today, so there was nothing to close.",
      };
    }

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("checkOutEmployee failed:", message);
    return { ok: false, error: message };
  }
}

// --- Time Off Queries & Mutations ---

export async function fetchLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
  try {
    let query = supabase.from("leave_requests").select("*");

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { data: dbRequests, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        console.warn("Table 'leave_requests' not found. Returning mock requests.");
        return employeeId ? LEAVE_REQUESTS.filter(r => r.employeeId === employeeId) : LEAVE_REQUESTS;
      }
      throw error;
    }

    if (!dbRequests || dbRequests.length === 0) {
      return employeeId ? LEAVE_REQUESTS.filter(r => r.employeeId === employeeId) : LEAVE_REQUESTS;
    }

    const castedRequests = dbRequests as unknown as DbLeaveRequest[];

    return castedRequests.map((req) => ({
      id: String(req.id),
      employeeId: req.employee_id,
      leaveType: (req.leave_type.toUpperCase() as LeaveTypeCode) || "PAID",
      startDate: req.from_date,
      endDate: req.to_date,
      dayCount: Number(req.total_days),
      remarks: req.reason || "",
      status: req.status,
    }));
  } catch (e) {
    console.error("fetchLeaveRequests failed, returning mock data:", e);
    return employeeId ? LEAVE_REQUESTS.filter(r => r.employeeId === employeeId) : LEAVE_REQUESTS;
  }
}

export async function fetchLeaveAllocations(employeeId: string): Promise<LeaveAllocation[]> {
  try {
    const { data: dbAllocations, error } = await supabase
      .from("leave_balance")
      .select("*")
      .eq("employee_id", employeeId);

    if (error) {
      if (isMissingTableError(error)) {
        return LEAVE_ALLOCATIONS.filter((a) => a.employeeId === employeeId);
      }
      throw error;
    }

    if (!dbAllocations || dbAllocations.length === 0) {
      return LEAVE_ALLOCATIONS.filter((a) => a.employeeId === employeeId);
    }

    const castedAllocations = dbAllocations as unknown as DbLeaveBalance[];
    const result: LeaveAllocation[] = [];

    castedAllocations.forEach((alloc) => {
      // Maps singular yearly row to Paid + Sick leave allocations for the frontend
      result.push({
        id: `alloc-paid-${alloc.id}`,
        employeeId: alloc.employee_id,
        leaveType: "PAID",
        days: Number(alloc.paid_leave) || 12,
        validFrom: `${alloc.year}-01-01`,
        validTo: `${alloc.year}-12-31`,
        note: `Annual Paid Leave Allocation for ${alloc.year}`,
      });
      result.push({
        id: `alloc-sick-${alloc.id}`,
        employeeId: alloc.employee_id,
        leaveType: "SICK",
        days: Number(alloc.sick_leave) || 10,
        validFrom: `${alloc.year}-01-01`,
        validTo: `${alloc.year}-12-31`,
        note: `Annual Sick Leave Allocation for ${alloc.year}`,
      });
    });

    return result;
  } catch (e) {
    console.error("fetchLeaveAllocations failed, returning mock data:", e);
    return LEAVE_ALLOCATIONS.filter((a) => a.employeeId === employeeId);
  }
}

export async function createLeaveRequestInDb(request: Omit<LeaveRequest, "id" | "status">): Promise<LeaveRequest | null> {
  try {
    const { data: newReq, error } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: request.employeeId,
        leave_type: request.leaveType.toLowerCase(),
        from_date: request.startDate,
        to_date: request.endDate,
        total_days: request.dayCount,
        reason: request.remarks || "",
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    const row = newReq as unknown as DbLeaveRequest;
    return {
      id: String(row.id),
      employeeId: row.employee_id,
      leaveType: request.leaveType,
      startDate: row.from_date,
      endDate: row.to_date,
      dayCount: Number(row.total_days),
      remarks: row.reason || "",
      status: "pending",
    };
  } catch (e) {
    console.error("createLeaveRequestInDb failed:", e);
    return null;
  }
}

export async function updateLeaveRequestStatus(requestId: string, status: "approved" | "rejected", reviewerId: string, comment?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("leave_requests")
      .update({
        status,
        approved_by: reviewerId,
        admin_comment: comment || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(requestId, 10));

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("updateLeaveRequestStatus failed:", e);
    return false;
  }
}

export async function grantLeaveAllocation(alloc: Omit<LeaveAllocation, "id">): Promise<LeaveAllocation | null> {
  try {
    const year = new Date(alloc.validFrom).getFullYear();
    
    // Check if leave balance row exists
    const { data: existing } = await supabase
      .from("leave_balance")
      .select("*")
      .eq("employee_id", alloc.employeeId)
      .eq("year", year)
      .maybeSingle();

    let savedAlloc: DbLeaveBalance;

    if (existing) {
      const existingBalance = existing as DbLeaveBalance;
      const updateData: TablesUpdate<"leave_balance"> = {};
      if (alloc.leaveType === "PAID") {
        updateData.paid_leave = (existingBalance.paid_leave || 0) + alloc.days;
      } else if (alloc.leaveType === "SICK") {
        updateData.sick_leave = (existingBalance.sick_leave || 0) + alloc.days;
      }
      
      const { data, error } = await supabase
        .from("leave_balance")
        .update(updateData)
        .eq("id", existingBalance.id)
        .select()
        .single();
      if (error) throw error;
      savedAlloc = data as DbLeaveBalance;
    } else {
      const insertData = {
        employee_id: alloc.employeeId,
        year,
        paid_leave: alloc.leaveType === "PAID" ? alloc.days : 12,
        sick_leave: alloc.leaveType === "SICK" ? alloc.days : 10,
        casual_leave: 6,
        unpaid_leave: 0
      };

      const { data, error } = await supabase
        .from("leave_balance")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      savedAlloc = data as DbLeaveBalance;
    }

    return {
      id: `alloc-${savedAlloc.id}`,
      employeeId: savedAlloc.employee_id,
      leaveType: alloc.leaveType,
      days: Number(alloc.days),
      validFrom: alloc.validFrom,
      validTo: alloc.validTo,
    };
  } catch (e) {
    console.error("grantLeaveAllocation failed:", e);
    return null;
  }
}

// --- Salary Mutations ---

export async function updateSalaryWageInDb(employeeId: string, wage: number): Promise<boolean> {
  try {
    const basic = Math.round(wage * 0.5);
    const hra = Math.round(wage * 0.2);
    const da = Math.round(wage * 0.1);
    const allowance = wage - basic - hra - da;

    const { data: existing } = await supabase
      .from("salary_structure")
      .select("*")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("salary_structure")
        .update({ basic, hra, da, allowance })
        .eq("id", (existing as { id: number }).id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("salary_structure")
        .insert({
          employee_id: employeeId,
          basic,
          hra,
          da,
          allowance,
          pf_rate: 12.00,
          tax_rate: 10.00
        });
      if (error) throw error;
    }
    return true;
  } catch (e) {
    console.error("updateSalaryWageInDb failed:", e);
    return false;
  }
}
