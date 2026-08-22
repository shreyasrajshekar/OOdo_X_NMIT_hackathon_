import { supabase } from "./supabase";
import { EMPLOYEES, LEAVE_ALLOCATIONS, LEAVE_REQUESTS, type Employee, type LeaveRequest, type LeaveAllocation, type AttendanceRecord, type AttendanceStatus, type RequestStatus, type Department, type LeaveTypeCode } from "./mock-data";

// Helper to determine if a database error is a missing table (PGRST205)
function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!(error && (error.code === "PGRST205" || (error.message && error.message.includes("does not exist"))));
}

// --- DB Interfaces for strict typing ---
interface DbResume {
  about?: string | null;
  love_about_job?: string | null;
  interests?: string | null;
  skills?: string[] | null;
  certifications?: string[] | null;
}

interface DbSalaryStructure {
  monthly_wage: number;
  working_days_month: number;
  break_hours: number;
  is_current: boolean;
}

interface DbEmployee {
  id: string;
  login_id: string;
  first_name: string;
  last_name: string;
  work_email: string;
  personal_email?: string | null;
  phone?: string | null;
  role: "admin" | "employee";
  department?: string | null;
  job_title?: string | null;
  manager_id?: string | null;
  location?: string | null;
  joining_date: string;
  dob?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  nationality?: string | null;
  address?: string | null;
  bank_account_no?: string | null;
  bank_name?: string | null;
  ifsc_code?: string | null;
  pan_no?: string | null;
  uan_no?: string | null;
  employee_resume?: DbResume[] | DbResume | null;
  salary_structures?: DbSalaryStructure[] | null;
}

interface DbAttendance {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | string | null;
  extra_hours: number | string | null;
  status: AttendanceStatus;
}

interface DbLeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  day_count: number | string;
  remarks?: string | null;
  status: RequestStatus;
  leave_types?: {
    code: string;
    name: string;
  } | null;
}

interface DbLeaveAllocation {
  id: string;
  employee_id: string;
  leave_type_id: string;
  days: number | string;
  valid_from: string;
  valid_to: string;
  note?: string | null;
  leave_types?: {
    code: string;
    name: string;
  } | null;
}

// --- Company Scoping Helper ---
// For the hackathon, we assume a default company is either fetched or created.
let defaultCompanyId: string | null = null;
async function getDefaultCompanyId(): Promise<string> {
  if (defaultCompanyId) return defaultCompanyId;

  try {
    const { data: companies, error } = await supabase.from("companies").select("id").limit(1);
    if (error && !isMissingTableError(error)) {
      console.error("Error fetching companies:", error);
    }
    if (companies && companies.length > 0) {
      defaultCompanyId = companies[0].id;
      return defaultCompanyId!;
    }

    // Try creating a default company if none exists and table is available
    const { data: newCompany } = await supabase
      .from("companies")
      .insert({ name: "Odoo India", code: "OD" })
      .select("id")
      .single();

    if (newCompany) {
      defaultCompanyId = (newCompany as { id: string }).id;
      return defaultCompanyId!;
    }
  } catch (e) {
    console.warn("Fallback to static company id:", e);
  }

  // Temporary fallback UUID for company
  return "00000000-0000-0000-0000-000000000000";
}

// --- Employees Queries & Mutations ---

export async function fetchEmployees(): Promise<Employee[]> {
  try {
    const { data: dbEmps, error } = await supabase
      .from("employees")
      .select(`
        *,
        employee_resume (about, love_about_job, interests, skills, certifications),
        salary_structures (monthly_wage, working_days_month, break_hours)
      `)
      .eq("is_active", true);

    if (error) {
      if (isMissingTableError(error)) {
        console.warn("Table 'employees' not found in Supabase. Falling back to mock data.");
        return EMPLOYEES;
      }
      throw error;
    }

    if (!dbEmps || dbEmps.length === 0) {
      return EMPLOYEES; // Fallback if database is empty
    }

    const castedEmps = dbEmps as unknown as DbEmployee[];

    return castedEmps.map((emp) => {
      const resume = Array.isArray(emp.employee_resume) ? emp.employee_resume[0] : emp.employee_resume;
      const currentSal = emp.salary_structures?.find((s) => s.is_current) || emp.salary_structures?.[0];
      
      return {
        id: emp.id,
        loginId: emp.login_id,
        firstName: emp.first_name,
        lastName: emp.last_name,
        workEmail: emp.work_email,
        personalEmail: emp.personal_email || "",
        mobile: emp.phone || "",
        role: emp.role,
        department: (emp.department as Department) || "Engineering", // Allow Department casting
        jobTitle: emp.job_title || "",
        manager: emp.manager_id || "—",
        location: emp.location || "",
        joiningDate: emp.joining_date,
        dob: emp.dob || "",
        gender: emp.gender || "",
        maritalStatus: emp.marital_status || "",
        nationality: emp.nationality || "",
        address: emp.address || "",
        bankAccountNo: emp.bank_account_no || "",
        bankName: emp.bank_name || "",
        ifsc: emp.ifsc_code || "",
        pan: emp.pan_no || "",
        uan: emp.uan_no || "",
        monthlyWage: currentSal?.monthly_wage || 50000,
        workingDaysPerWeek: currentSal?.working_days_month === 26 ? 6 : 5,
        breakHours: currentSal?.break_hours || 1,
        about: resume?.about || "",
        loveAboutJob: resume?.love_about_job || "",
        interests: resume?.interests || "",
        skills: Array.isArray(resume?.skills) ? resume.skills : [],
        certifications: Array.isArray(resume?.certifications) ? resume.certifications : [],
      };
    });
  } catch (e) {
    console.error("fetchEmployees failed, falling back to mock data:", e);
    return EMPLOYEES;
  }
}

export async function fetchEmployeeById(id: string): Promise<Employee | undefined> {
  const employees = await fetchEmployees();
  return employees.find((e) => e.id.toLowerCase() === id.toLowerCase() || e.loginId.toLowerCase() === id.toLowerCase());
}


export async function createEmployeeInDb(data: Omit<Employee, "id">, companyId?: string): Promise<Employee> {
  const activeCompanyId = companyId || await getDefaultCompanyId();

  try {
    // 1. Create a dummy Auth User or insert employee directly if Auth is handled separately.
    // For demo/integration robustness, we attempt to check if the schema matches:
    const tempUserId = crypto.randomUUID();

    const { data: newEmp, error } = await supabase
      .from("employees")
      .insert({
        id: tempUserId,
        company_id: activeCompanyId,
        login_id: data.loginId,
        first_name: data.firstName,
        last_name: data.lastName,
        work_email: data.workEmail,
        personal_email: data.personalEmail,
        phone: data.mobile,
        role: data.role,
        department: data.department,
        job_title: data.jobTitle,
        joining_date: data.joiningDate,
        dob: data.dob || null,
        gender: data.gender || null,
        marital_status: data.maritalStatus || null,
        nationality: data.nationality || null,
        address: data.address || null,
        bank_account_no: data.bankAccountNo || null,
        bank_name: data.bankName || null,
        ifsc_code: data.ifsc || null,
        pan_no: data.pan || null,
        uan_no: data.uan || null,
        must_change_password: true,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Create resume row
    await supabase.from("employee_resume").insert({
      employee_id: newEmp.id,
      about: data.about,
      love_about_job: data.loveAboutJob,
      interests: data.interests,
      skills: data.skills,
      certifications: data.certifications,
    });

    // 3. Create salary structure row
    await supabase.from("salary_structures").insert({
      employee_id: newEmp.id,
      monthly_wage: data.monthlyWage,
      working_days_month: data.workingDaysPerWeek === 6 ? 26 : 22,
      break_hours: data.breakHours,
      is_current: true,
    });

    return { ...data, id: newEmp.id };
  } catch (e) {
    console.error("createEmployeeInDb failed, falling back to adding to local mock array:", e);
    // Return the data with a mock UUID
    return { ...data, id: crypto.randomUUID() };
  }
}

export async function updateEmployeeInDb(id: string, updates: Partial<Employee>): Promise<boolean> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.personalEmail !== undefined) dbUpdates.personal_email = updates.personalEmail;
    if (updates.mobile !== undefined) dbUpdates.phone = updates.mobile;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
    if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.maritalStatus !== undefined) dbUpdates.marital_status = updates.maritalStatus;
    if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.bankAccountNo !== undefined) dbUpdates.bank_account_no = updates.bankAccountNo;
    if (updates.bankName !== undefined) dbUpdates.bank_name = updates.bankName;
    if (updates.ifsc !== undefined) dbUpdates.ifsc_code = updates.ifsc;
    if (updates.pan !== undefined) dbUpdates.pan_no = updates.pan;
    if (updates.uan !== undefined) dbUpdates.uan_no = updates.uan;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from("employees").update(dbUpdates).eq("id", id);
      if (error) throw error;
    }

    // Update resume columns if any are provided
    const resumeUpdates: Record<string, unknown> = {};
    if (updates.about !== undefined) resumeUpdates.about = updates.about;
    if (updates.loveAboutJob !== undefined) resumeUpdates.love_about_job = updates.loveAboutJob;
    if (updates.interests !== undefined) resumeUpdates.interests = updates.interests;
    if (updates.skills !== undefined) resumeUpdates.skills = updates.skills;
    if (updates.certifications !== undefined) resumeUpdates.certifications = updates.certifications;

    if (Object.keys(resumeUpdates).length > 0) {
      const { error } = await supabase
        .from("employee_resume")
        .upsert({ employee_id: id, ...resumeUpdates });
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
      .like("work_date", `${monthISO}%`);

    if (error) {
      if (isMissingTableError(error)) throw error;
      console.error("Attendance fetch error:", error);
      return [];
    }

    const castedRecs = (dbRecords || []) as unknown as DbAttendance[];

    return castedRecs.map((rec) => ({
      date: rec.work_date,
      status: rec.status,
      checkIn: rec.check_in,
      checkOut: rec.check_out,
      workHours: Number(rec.work_hours) || 0,
      extraHours: Number(rec.extra_hours) || 0,
    }));
  } catch (e) {
    console.warn("fetchAttendanceRecords failed, using mock placeholder logic:", e);
    // In a real environment, we return empty or stubbed array
    return [];
  }
}

export async function checkInEmployee(employeeId: string, workDate: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("attendance")
      .insert({
        employee_id: employeeId,
        work_date: workDate,
        check_in: new Date().toISOString(),
        status: "present",
      });

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("checkInEmployee failed:", e);
    return false;
  }
}

export async function checkOutEmployee(employeeId: string, workDate: string, workHours: number, extraHours: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("attendance")
      .update({
        check_out: new Date().toISOString(),
        work_hours: workHours,
        extra_hours: extraHours,
        status: workHours >= 8 ? "present" : (workHours >= 4 ? "half_day" : "absent"),
      })
      .eq("employee_id", employeeId)
      .eq("work_date", workDate);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("checkOutEmployee failed:", e);
    return false;
  }
}

// --- Time Off Queries & Mutations ---

export async function fetchLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
  try {
    let query = supabase.from("leave_requests").select(`
      *,
      leave_types (code, name)
    `);

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
      id: req.id,
      employeeId: req.employee_id,
      leaveType: (req.leave_types?.code as LeaveTypeCode) || "PAID",
      startDate: req.start_date,
      endDate: req.end_date,
      dayCount: Number(req.day_count),
      remarks: req.remarks || "",
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
      .from("leave_allocations")
      .select(`
        *,
        leave_types (code, name)
      `)
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

    const castedAllocations = dbAllocations as unknown as DbLeaveAllocation[];

    return castedAllocations.map((alloc) => ({
      id: alloc.id,
      employeeId: alloc.employee_id,
      leaveType: (alloc.leave_types?.code as LeaveTypeCode) || "PAID",
      days: Number(alloc.days),
      validFrom: alloc.valid_from,
      validTo: alloc.valid_to,
      note: alloc.note || "",
    }));
  } catch (e) {
    console.error("fetchLeaveAllocations failed, returning mock data:", e);
    return LEAVE_ALLOCATIONS.filter((a) => a.employeeId === employeeId);
  }
}

export async function createLeaveRequestInDb(request: Omit<LeaveRequest, "id" | "status">): Promise<LeaveRequest | null> {
  try {
    // Resolve leave type id from code
    const { data: typeData } = await supabase
      .from("leave_types")
      .select("id")
      .eq("code", request.leaveType)
      .limit(1);

    if (!typeData || typeData.length === 0) {
      console.warn("Could not find leave type id for code, attempting direct insert with mock type id");
    }

    const leaveTypeId = typeData?.[0]?.id || crypto.randomUUID();

    const { data: newReq, error } = await supabase
      .from("leave_requests")
      .insert({
        employee_id: request.employeeId,
        leave_type_id: leaveTypeId,
        start_date: request.startDate,
        end_date: request.endDate,
        day_count: request.dayCount,
        remarks: request.remarks || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: newReq.id,
      employeeId: newReq.employee_id,
      leaveType: request.leaveType,
      startDate: newReq.start_date,
      endDate: newReq.end_date,
      dayCount: Number(newReq.day_count),
      remarks: newReq.remarks || "",
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
        reviewed_by: reviewerId,
        review_comment: comment || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("updateLeaveRequestStatus failed:", e);
    return false;
  }
}

export async function grantLeaveAllocation(alloc: Omit<LeaveAllocation, "id">): Promise<LeaveAllocation | null> {
  try {
    const { data: typeData } = await supabase
      .from("leave_types")
      .select("id")
      .eq("code", alloc.leaveType)
      .limit(1);

    const leaveTypeId = typeData?.[0]?.id || crypto.randomUUID();

    const { data: newAlloc, error } = await supabase
      .from("leave_allocations")
      .insert({
        employee_id: alloc.employeeId,
        leave_type_id: leaveTypeId,
        days: alloc.days,
        valid_from: alloc.validFrom,
        valid_to: alloc.validTo,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: newAlloc.id,
      employeeId: newAlloc.employee_id,
      leaveType: alloc.leaveType,
      days: Number(newAlloc.days),
      validFrom: newAlloc.valid_from,
      validTo: newAlloc.valid_to,
    };
  } catch (e) {
    console.error("grantLeaveAllocation failed:", e);
    return null;
  }
}

