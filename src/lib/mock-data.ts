import { generateLoginId, nextSerial } from "@/lib/login-id";

export const COMPANY_NAME = "Odoo India";
export const STANDARD_DAY_HOURS = 8;

export const DEPARTMENTS = ["Engineering", "Sales", "HR", "Finance"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export type Employee = {
  id: string;
  loginId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  personalEmail: string;
  mobile: string;
  role: "admin" | "employee";
  department: Department;
  jobTitle: string;
  manager: string;
  location: string;
  joiningDate: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  nationality: string;
  address: string;
  bankAccountNo: string;
  bankName: string;
  ifsc: string;
  pan: string;
  uan: string;
  monthlyWage: number;
  workingDaysPerWeek: number;
  breakHours: number;
  about: string;
  loveAboutJob: string;
  interests: string;
  skills: string[];
  certifications: string[];
};

type SeedEmployee = Omit<Employee, "id" | "loginId">;

const SEED: SeedEmployee[] = [
  {
    firstName: "Aditi",
    lastName: "Rao",
    workEmail: "aditi.rao@odooindia.com",
    personalEmail: "aditi.personal@gmail.com",
    mobile: "+91 98200 11122",
    role: "admin",
    department: "HR",
    jobTitle: "HR Director",
    manager: "—",
    location: "Bengaluru",
    joiningDate: "2021-03-01",
    dob: "1988-11-04",
    gender: "Female",
    maritalStatus: "Married",
    nationality: "Indian",
    address: "204 Indiranagar, Bengaluru, KA",
    bankAccountNo: "0091284471002",
    bankName: "HDFC Bank",
    ifsc: "HDFC0000091",
    pan: "AXBPR1234C",
    uan: "101223344556",
    monthlyWage: 180000,
    workingDaysPerWeek: 5,
    breakHours: 1,
    about: "Runs people ops for Odoo India end to end.",
    loveAboutJob: "Watching new hires find their footing in the first month.",
    interests: "Bharatanatyam, trail running, spreadsheets that don't break.",
    skills: ["People Ops", "Payroll Compliance", "Negotiation"],
    certifications: ["SHRM-CP"],
  },
  {
    firstName: "Rohan",
    lastName: "Mehta",
    workEmail: "rohan.mehta@odooindia.com",
    personalEmail: "rohan.m@gmail.com",
    mobile: "+91 98450 22334",
    role: "employee",
    department: "Engineering",
    jobTitle: "Senior Engineer",
    manager: "Aditi Rao",
    location: "Bengaluru",
    joiningDate: "2022-01-10",
    dob: "1993-06-18",
    gender: "Male",
    maritalStatus: "Single",
    nationality: "Indian",
    address: "12 Koramangala, Bengaluru, KA",
    bankAccountNo: "0091284471045",
    bankName: "ICICI Bank",
    ifsc: "ICIC0000091",
    pan: "BXBPR5678D",
    uan: "101223344590",
    monthlyWage: 145000,
    workingDaysPerWeek: 5,
    breakHours: 1,
    about: "Backend-leaning full-stack engineer, six years in.",
    loveAboutJob: "Shipping something on Friday and seeing it used on Monday.",
    interests: "Chess, home-brewed coffee, cricket stats.",
    skills: ["TypeScript", "Postgres", "System Design"],
    certifications: [],
  },
  {
    firstName: "Priya",
    lastName: "Sharma",
    workEmail: "priya.sharma@odooindia.com",
    personalEmail: "priya.s@gmail.com",
    mobile: "+91 99000 33445",
    role: "employee",
    department: "Engineering",
    jobTitle: "Product Designer",
    manager: "Rohan Mehta",
    location: "Pune",
    joiningDate: "2023-07-04",
    dob: "1996-02-27",
    gender: "Female",
    maritalStatus: "Single",
    nationality: "Indian",
    address: "45 Baner, Pune, MH",
    bankAccountNo: "0091284471078",
    bankName: "Axis Bank",
    ifsc: "UTIB0000091",
    pan: "CXBPR9012E",
    uan: "101223344623",
    monthlyWage: 95000,
    workingDaysPerWeek: 5,
    breakHours: 1,
    about: "Design systems and dense data screens, mostly.",
    loveAboutJob: "The two hours after standup when everyone's heads-down.",
    interests: "Pottery, long walks, type specimens.",
    skills: ["Figma", "Design Systems", "Accessibility"],
    certifications: ["Google UX Design"],
  },
  {
    firstName: "Karan",
    lastName: "Verma",
    workEmail: "karan.verma@odooindia.com",
    personalEmail: "karan.v@gmail.com",
    mobile: "+91 98110 44556",
    role: "employee",
    department: "Sales",
    jobTitle: "Sales Executive",
    manager: "Aditi Rao",
    location: "Mumbai",
    joiningDate: "2024-02-19",
    dob: "1998-09-09",
    gender: "Male",
    maritalStatus: "Single",
    nationality: "Indian",
    address: "78 Andheri West, Mumbai, MH",
    bankAccountNo: "0091284471091",
    bankName: "HDFC Bank",
    ifsc: "HDFC0000091",
    pan: "DXBPR3456F",
    uan: "101223344656",
    monthlyWage: 62000,
    workingDaysPerWeek: 6,
    breakHours: 1,
    about: "Closes mid-market deals across West India.",
    loveAboutJob: "The call where a prospect finally gets it.",
    interests: "Badminton, standup comedy, Marathi cinema.",
    skills: ["CRM", "Negotiation", "Cold Outreach"],
    certifications: [],
  },
  {
    firstName: "Neha",
    lastName: "Joshi",
    workEmail: "neha.joshi@odooindia.com",
    personalEmail: "neha.j@gmail.com",
    mobile: "+91 97700 55667",
    role: "employee",
    department: "Finance",
    jobTitle: "Finance Analyst",
    manager: "Aditi Rao",
    location: "Bengaluru",
    joiningDate: "2022-11-21",
    dob: "1994-12-30",
    gender: "Female",
    maritalStatus: "Married",
    nationality: "Indian",
    address: "9 Whitefield, Bengaluru, KA",
    bankAccountNo: "0091284471114",
    bankName: "SBI",
    ifsc: "SBIN0000091",
    pan: "EXBPR7890G",
    uan: "101223344689",
    monthlyWage: 88000,
    workingDaysPerWeek: 5,
    breakHours: 1,
    about: "Owns payroll reconciliation and vendor payouts.",
    loveAboutJob: "Closing the books without a single stray rupee.",
    interests: "Carnatic music, marathon training.",
    skills: ["Payroll", "Excel Modeling", "GST Compliance"],
    certifications: ["ACCA (in progress)"],
  },
  {
    firstName: "Arjun",
    lastName: "Nair",
    workEmail: "arjun.nair@odooindia.com",
    personalEmail: "arjun.n@gmail.com",
    mobile: "+91 96330 66778",
    role: "employee",
    department: "Engineering",
    jobTitle: "Backend Engineer",
    manager: "Rohan Mehta",
    location: "Kochi",
    joiningDate: "2025-05-12",
    dob: "1999-04-15",
    gender: "Male",
    maritalStatus: "Single",
    nationality: "Indian",
    address: "22 Kakkanad, Kochi, KL",
    bankAccountNo: "0091284471137",
    bankName: "Federal Bank",
    ifsc: "FDRL0000091",
    pan: "FXBPR2345H",
    uan: "101223344712",
    monthlyWage: 78000,
    workingDaysPerWeek: 5,
    breakHours: 1,
    about: "Newest on the platform team, owns the queue workers.",
    loveAboutJob: "Debugging a flaky job until it stops being flaky.",
    interests: "Kayaking, competitive programming.",
    skills: ["Node.js", "Redis", "Docker"],
    certifications: [],
  },
  {
    firstName: "Simran",
    lastName: "Kaur",
    workEmail: "simran.kaur@odooindia.com",
    personalEmail: "simran.k@gmail.com",
    mobile: "+91 95820 77889",
    role: "employee",
    department: "Sales",
    jobTitle: "Account Manager",
    manager: "Aditi Rao",
    location: "Delhi",
    joiningDate: "2023-09-01",
    dob: "1995-01-22",
    gender: "Female",
    maritalStatus: "Married",
    nationality: "Indian",
    address: "56 Saket, New Delhi, DL",
    bankAccountNo: "0091284471160",
    bankName: "ICICI Bank",
    ifsc: "ICIC0000091",
    pan: "GXBPR6789I",
    uan: "101223344745",
    monthlyWage: 71000,
    workingDaysPerWeek: 6,
    breakHours: 1,
    about: "Manages the top 20 enterprise accounts in the North.",
    loveAboutJob: "Turning a renewal risk into an expansion.",
    interests: "Golf, Hindi poetry.",
    skills: ["Account Management", "Upselling", "Salesforce"],
    certifications: [],
  },
  {
    firstName: "Vikram",
    lastName: "Singh",
    workEmail: "vikram.singh@odooindia.com",
    personalEmail: "vikram.s@gmail.com",
    mobile: "+91 94120 88990",
    role: "employee",
    department: "HR",
    jobTitle: "HR Executive",
    manager: "Aditi Rao",
    location: "Bengaluru",
    joiningDate: "2026-01-15",
    dob: "2000-07-08",
    gender: "Male",
    maritalStatus: "Single",
    nationality: "Indian",
    address: "31 HSR Layout, Bengaluru, KA",
    bankAccountNo: "0091284471183",
    bankName: "HDFC Bank",
    ifsc: "HDFC0000091",
    pan: "HXBPR0123J",
    uan: "101223344778",
    monthlyWage: 42000,
    workingDaysPerWeek: 5,
    breakHours: 1,
    about: "Handles onboarding and the first-week experience.",
    loveAboutJob: "A new hire's Slack message on day one going well.",
    interests: "Football, quizzing.",
    skills: ["Onboarding", "HRIS", "Documentation"],
    certifications: [],
  },
];

function buildEmployees(): Employee[] {
  const employees: Employee[] = [];
  const loginIdsSoFar: string[] = [];

  for (const seed of SEED) {
    const joiningYear = new Date(seed.joiningDate).getFullYear();
    const serial = nextSerial(loginIdsSoFar, joiningYear);
    const loginId = generateLoginId({
      companyName: COMPANY_NAME,
      firstName: seed.firstName,
      lastName: seed.lastName,
      joiningYear,
      serial,
    });
    loginIdsSoFar.push(loginId);
    employees.push({ id: loginId.toLowerCase(), loginId, ...seed });
  }

  return employees;
}

export const EMPLOYEES: Employee[] = buildEmployees();

export function getEmployee(id: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.id === id);
}

export function employeeName(employee: Employee): string {
  return `${employee.firstName} ${employee.lastName}`;
}

export function employeeInitials(employee: Employee): string {
  return `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();
}

// --- Leave types, allocations, requests -------------------------------

export type LeaveTypeCode = "PAID" | "SICK" | "UNPAID";

export type LeaveType = {
  code: LeaveTypeCode;
  name: string;
  isPaid: boolean;
  requiresAttachment: boolean;
};

export const LEAVE_TYPES: LeaveType[] = [
  { code: "PAID", name: "Paid Time Off", isPaid: true, requiresAttachment: false },
  { code: "SICK", name: "Sick Leave", isPaid: true, requiresAttachment: true },
  { code: "UNPAID", name: "Unpaid Leave", isPaid: false, requiresAttachment: false },
];

export type LeaveAllocation = {
  id: string;
  employeeId: string;
  leaveType: LeaveTypeCode;
  days: number;
  validFrom: string;
  validTo: string;
  note?: string;
};

export const LEAVE_ALLOCATIONS: LeaveAllocation[] = EMPLOYEES.flatMap((e) => [
  {
    id: `alloc-${e.id}-paid`,
    employeeId: e.id,
    leaveType: "PAID" as const,
    days: 24,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
  },
  {
    id: `alloc-${e.id}-sick`,
    employeeId: e.id,
    leaveType: "SICK" as const,
    days: 9,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
  },
]);

export type RequestStatus = "pending" | "approved" | "rejected";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveType: LeaveTypeCode;
  startDate: string;
  endDate: string;
  dayCount: number;
  remarks?: string;
  status: RequestStatus;
};

const [, rohan, priya, karan, neha, arjun, simran] = EMPLOYEES;

export const LEAVE_REQUESTS: LeaveRequest[] = [
  { id: "lr-1", employeeId: rohan.id, leaveType: "PAID", startDate: "2026-06-15", endDate: "2026-06-17", dayCount: 3, remarks: "Family trip", status: "approved" },
  { id: "lr-2", employeeId: priya.id, leaveType: "SICK", startDate: "2026-07-02", endDate: "2026-07-02", dayCount: 1, remarks: "Fever", status: "approved" },
  { id: "lr-3", employeeId: karan.id, leaveType: "UNPAID", startDate: "2026-08-05", endDate: "2026-08-06", dayCount: 2, remarks: "Personal", status: "approved" },
  { id: "lr-4", employeeId: neha.id, leaveType: "PAID", startDate: "2026-08-25", endDate: "2026-08-26", dayCount: 2, remarks: "Wedding", status: "pending" },
  { id: "lr-5", employeeId: arjun.id, leaveType: "SICK", startDate: "2026-08-20", endDate: "2026-08-21", dayCount: 2, remarks: "Flu, certificate attached", status: "pending" },
  { id: "lr-6", employeeId: simran.id, leaveType: "PAID", startDate: "2026-05-10", endDate: "2026-05-10", dayCount: 1, remarks: "", status: "rejected" },
  { id: "lr-7", employeeId: priya.id, leaveType: "PAID", startDate: "2026-09-14", endDate: "2026-09-16", dayCount: 3, remarks: "Festival travel", status: "pending" },
];

export function leaveRequestsFor(
  employeeId: string,
  requests: LeaveRequest[] = LEAVE_REQUESTS,
): LeaveRequest[] {
  return requests.filter((r) => r.employeeId === employeeId);
}

export function leaveBalance(
  employeeId: string,
  leaveType: LeaveTypeCode,
  allocations: LeaveAllocation[] = LEAVE_ALLOCATIONS,
  requests: LeaveRequest[] = LEAVE_REQUESTS,
) {
  const now = today();
  const allocated = allocations
    .filter(
      (a) =>
        a.employeeId === employeeId &&
        a.leaveType === leaveType &&
        now >= a.validFrom &&
        now <= a.validTo,
    )
    .reduce((sum, a) => sum + a.days, 0);
  const taken = requests
    .filter(
      (r) =>
        r.employeeId === employeeId &&
        r.leaveType === leaveType &&
        r.status === "approved",
    )
    .reduce((sum, r) => sum + r.dayCount, 0);
  return { allocated, taken, available: allocated - taken };
}

// --- Holidays -----------------------------------------------------------

export type Holiday = { date: string; name: string };

export const HOLIDAYS: Holiday[] = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-06", name: "Holi" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-10-21", name: "Diwali" },
  { date: "2026-12-25", name: "Christmas" },
];

export function isHoliday(dateISO: string): Holiday | undefined {
  return HOLIDAYS.find((h) => h.date === dateISO);
}

export function businessDaysBetween(
  startISO: string,
  endISO: string,
  workingDaysPerWeek = 5,
): number {
  if (!startISO || !endISO || endISO < startISO) return 0;
  let count = 0;
  const cursor = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  while (cursor <= end) {
    const iso = toISODate(cursor);
    if (!isWeekend(cursor, workingDaysPerWeek) && !isHoliday(iso)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function isWeekend(date: Date, workingDaysPerWeek: number): boolean {
  const day = date.getDay(); // 0 Sun .. 6 Sat
  if (workingDaysPerWeek >= 6) return day === 0;
  return day === 0 || day === 6;
}

// --- Attendance (deterministic mock generator) --------------------------

export type AttendanceStatus =
  | "present"
  | "half_day"
  | "absent"
  | "leave"
  | "holiday"
  | "weekend";

export type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number;
  extraHours: number;
};

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function approvedLeaveOn(employeeId: string, dateISO: string): boolean {
  return LEAVE_REQUESTS.some(
    (r) =>
      r.employeeId === employeeId &&
      r.status === "approved" &&
      dateISO >= r.startDate &&
      dateISO <= r.endDate,
  );
}

export function getAttendanceRecord(
  employee: Employee,
  dateISO: string,
  today: string,
): AttendanceRecord {
  const date = new Date(`${dateISO}T00:00:00`);
  const holiday = isHoliday(dateISO);
  const weekend = isWeekend(date, employee.workingDaysPerWeek);
  const onLeave = approvedLeaveOn(employee.id, dateISO);
  const empty: AttendanceRecord = {
    date: dateISO,
    status: "present",
    checkIn: null,
    checkOut: null,
    workHours: 0,
    extraHours: 0,
  };

  if (holiday) return { ...empty, status: "holiday" };
  if (weekend) return { ...empty, status: "weekend" };
  if (onLeave) return { ...empty, status: "leave" };
  if (dateISO > today) return { ...empty, status: "absent", checkIn: null, checkOut: null };

  const roll = seededRandom(`${employee.id}-${dateISO}`);

  if (roll < 0.06) {
    return { ...empty, status: "absent" };
  }

  const isHalfDay = roll < 0.14;
  const checkInHour = 9 + Math.floor(seededRandom(`${dateISO}-in-${employee.id}`) * 1.5);
  const checkInMinute = Math.floor(seededRandom(`${dateISO}-inm-${employee.id}`) * 59);
  const workHours = isHalfDay
    ? 4 + Math.round(seededRandom(`${dateISO}-wh-${employee.id}`) * 20) / 10
    : STANDARD_DAY_HOURS +
      Math.round(seededRandom(`${dateISO}-wh-${employee.id}`) * 25) / 10 -
      employee.breakHours;

  const checkIn = new Date(date);
  checkIn.setHours(checkInHour, checkInMinute, 0, 0);
  const checkOut = new Date(checkIn);
  checkOut.setMinutes(checkOut.getMinutes() + Math.round((workHours + employee.breakHours) * 60));

  const extraHours = Math.max(0, Math.round((workHours - STANDARD_DAY_HOURS) * 10) / 10);

  return {
    date: dateISO,
    status: isHalfDay ? "half_day" : "present",
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    workHours: Math.max(0, Math.round(workHours * 10) / 10),
    extraHours,
  };
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function today(): string {
  return toISODate(new Date());
}

export function getMonthAttendance(
  employee: Employee,
  year: number,
  month: number, // 0-indexed
  today: string,
): AttendanceRecord[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const records: AttendanceRecord[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateISO = toISODate(date);
    if (dateISO > today) break;
    records.push(getAttendanceRecord(employee, dateISO, today));
  }
  return records;
}

export function currentStatus(
  employee: Employee,
  today: string,
): "present" | "leave" | "absent" {
  const record = getAttendanceRecord(employee, today, today);
  if (record.status === "leave") return "leave";
  if (record.status === "present" || record.status === "half_day") return "present";
  return "absent";
}
