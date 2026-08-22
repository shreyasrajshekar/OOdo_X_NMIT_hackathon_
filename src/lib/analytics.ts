import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export interface AttendanceAnalytics {
  summary: { total_employees: number, present_days: number, absent_days: number, half_days: number, leave_days: number, attendance_rate: number };
  by_department: Array<{ department: string, present: number, absent: number, half_day: number, leave: number, rate: number }>;
  by_employee: Array<{ employee_id: string, name: string, department: string, present: number, absent: number, half_day: number, leave: number, rate: number }>;
  daily_trend: Array<{ date: string, present: number, absent: number }>;
  late_checkins: Array<{ employee_id: string, name: string, department: string, date: string, check_in: string }>;
}

export interface LeaveAnalytics {
  summary: { total_requested: number, approved: number, rejected: number, pending: number, approval_rate: number };
  by_type: Array<{ type: string, count: number }>;
  by_department: Array<{ department: string, total: number, approved: number, rejected: number }>;
  monthly_trend: Array<{ month: string, approved: number, rejected: number }>;
}

export interface PayrollAnalytics {
  summary: { total_payroll: number, total_deductions: number, net_paid: number, employee_count: number, avg_salary: number };
  by_department: Array<{ department: string, total: number, avg: number }>;
  deduction_breakdown: { pf: number, tax: number, absence: number, other: number };
  monthly_trend: Array<{ month: string, total: number }>;
}

export interface EmployeeAnalytics {
  by_department: Array<{ department: string, count: number }>;
  by_role: Array<{ role: string, count: number }>;
  recent_joiners: Array<{ id: string, name: string, department: string, position: string, join_date: string }>;
  leave_balance_distribution: Array<{ range: string, count: number }>;
}

export interface AllAnalytics {
  attendance: AttendanceAnalytics;
  leave: LeaveAnalytics;
  payroll: PayrollAnalytics;
  employee: EmployeeAnalytics;
}

/**
 * Retrieves attendance analytics for a specific month and year.
 * Groups data by department, employee, and daily trends.
 * @param {number} [month] - 1-indexed month (1-12)
 * @param {number} [year] - Full year (e.g., 2026)
 * @returns {Promise<AttendanceAnalytics>}
 */
export async function getAttendanceAnalytics(month?: number, year?: number): Promise<AttendanceAnalytics> {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  const startDate = new Date(Date.UTC(y, m - 1, 1)).toISOString().split('T')[0];
  const endDate = new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0];

  const { data: attendanceData, error } = await supabase
    .from('attendance')
    .select(`
      date, status, check_in, employee_id,
      profiles!inner ( first_name, last_name, department )
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error || !attendanceData) {
    return {
      summary: { total_employees: 0, present_days: 0, absent_days: 0, half_days: 0, leave_days: 0, attendance_rate: 0 },
      by_department: [],
      by_employee: [],
      daily_trend: [],
      late_checkins: []
    };
  }

  const records = attendanceData as any[];
  const uniqueEmployees = new Set();
  let presentDays = 0, absentDays = 0, halfDays = 0, leaveDays = 0;
  
  const deptMap: Record<string, { present: number, absent: number, half_day: number, leave: number }> = {};
  const empMap: Record<string, { name: string, dept: string, present: number, absent: number, half_day: number, leave: number }> = {};
  const dailyMap: Record<string, { present: number, absent: number }> = {};
  const lateCheckins: AttendanceAnalytics['late_checkins'] = [];

  for (const row of records) {
    const empId = row.employee_id;
    uniqueEmployees.add(empId);
    
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const dept = profile?.department || 'Unknown';
    const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();

    if (!deptMap[dept]) deptMap[dept] = { present: 0, absent: 0, half_day: 0, leave: 0 };
    if (!empMap[empId]) empMap[empId] = { name, dept, present: 0, absent: 0, half_day: 0, leave: 0 };
    if (!dailyMap[row.date]) dailyMap[row.date] = { present: 0, absent: 0 };

    if (row.status === 'present') { presentDays++; deptMap[dept].present++; empMap[empId].present++; dailyMap[row.date].present++; }
    else if (row.status === 'absent') { absentDays++; deptMap[dept].absent++; empMap[empId].absent++; dailyMap[row.date].absent++; }
    else if (row.status === 'half_day') { halfDays++; deptMap[dept].half_day++; empMap[empId].half_day++; }
    else if (row.status === 'on_leave' || row.status === 'leave') { leaveDays++; deptMap[dept].leave++; empMap[empId].leave++; }

    // Check late check-in
    if (row.check_in) {
      const timeStr = row.check_in.split('T')[1] || row.check_in; // Handle ISO or time string
      const [hh, mm] = timeStr.split(':').map(Number);
      if (hh > 9 || (hh === 9 && mm > 30)) {
        lateCheckins.push({
          employee_id: empId,
          name,
          department: dept,
          date: row.date,
          check_in: row.check_in
        });
      }
    }
  }

  const calcRate = (p: number, h: number, a: number, l: number) => {
    const total = p + h + a + l;
    return total === 0 ? 0 : Math.round(((p + (h * 0.5)) / total) * 1000) / 10;
  };

  const attendance_rate = calcRate(presentDays, halfDays, absentDays, leaveDays);

  const by_department = Object.entries(deptMap).map(([department, counts]) => ({
    department,
    ...counts,
    rate: calcRate(counts.present, counts.half_day, counts.absent, counts.leave)
  })).sort((a, b) => a.department.localeCompare(b.department));

  const by_employee = Object.entries(empMap).map(([employee_id, data]) => ({
    employee_id,
    ...data,
    rate: calcRate(data.present, data.half_day, data.absent, data.leave)
  })).sort((a, b) => b.rate - a.rate);

  const daily_trend = Object.entries(dailyMap).map(([date, counts]) => ({
    date,
    ...counts
  })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary: {
      total_employees: uniqueEmployees.size,
      present_days: presentDays,
      absent_days: absentDays,
      half_days: halfDays,
      leave_days: leaveDays,
      attendance_rate
    },
    by_department,
    by_employee,
    daily_trend,
    late_checkins: lateCheckins.sort((a, b) => a.date.localeCompare(b.date))
  };
}

/**
 * Retrieves leave request analytics.
 * @param {number} [month] - 1-indexed month (1-12)
 * @param {number} [year] - Full year (e.g., 2026)
 * @returns {Promise<LeaveAnalytics>}
 */
export async function getLeaveAnalytics(month?: number, year?: number): Promise<LeaveAnalytics> {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();
  const endDate = new Date(Date.UTC(y, m, 0)).toISOString().split('T')[0];

  const sixMonthsAgoDate = new Date(Date.UTC(y, m - 6, 1));
  const sixMonthsAgo = sixMonthsAgoDate.toISOString().split('T')[0] + 'T00:00:00Z';

  const { data: allData } = await supabase
    .from('leave_requests')
    .select(`
      leave_type, status, created_at,
      profiles ( department )
    `)
    .gte('created_at', sixMonthsAgo)
    .lte('created_at', endDate + 'T23:59:59Z');

  const records = (allData || []) as any[];

  let totalRequested = 0, approved = 0, rejected = 0, pending = 0;
  const typeMap: Record<string, number> = {};
  const deptMap: Record<string, { total: number, approved: number, rejected: number }> = {};
  const trendMap: Record<string, { approved: number, rejected: number }> = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const k = d.toISOString().slice(0, 7);
    trendMap[k] = { approved: 0, rejected: 0 };
  }

  for (const row of records) {
    const rowDate = new Date(row.created_at);
    const rowY = rowDate.getUTCFullYear();
    const rowM = rowDate.getUTCMonth() + 1;
    const k = row.created_at.slice(0, 7);

    if (trendMap[k]) {
      if (row.status === 'approved') trendMap[k].approved++;
      else if (row.status === 'rejected') trendMap[k].rejected++;
    }

    if (rowY === y && rowM === m) {
      totalRequested++;
      if (row.status === 'approved') approved++;
      else if (row.status === 'rejected') rejected++;
      else if (row.status === 'pending') pending++;

      const lType = row.leave_type || 'other';
      typeMap[lType] = (typeMap[lType] || 0) + 1;

      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const dept = profile?.department || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, approved: 0, rejected: 0 };
      deptMap[dept].total++;
      if (row.status === 'approved') deptMap[dept].approved++;
      else if (row.status === 'rejected') deptMap[dept].rejected++;
    }
  }

  const approvalRate = (approved + rejected) === 0 ? 0 : Math.round((approved / (approved + rejected)) * 100);

  return {
    summary: { total_requested: totalRequested, approved, rejected, pending, approval_rate: approvalRate },
    by_type: Object.entries(typeMap).map(([type, count]) => ({ type, count })),
    by_department: Object.entries(deptMap).map(([department, counts]) => ({ department, ...counts })),
    monthly_trend: Object.entries(trendMap)
      .map(([monthStr, counts]) => ({ month: monthStr, ...counts }))
      .sort((a, b) => a.month.localeCompare(b.month))
  };
}

/**
 * Retrieves payroll analytics.
 * @param {number} [month] - 1-indexed month (1-12). Defaults to previous month.
 * @param {number} [year] - Full year.
 * @returns {Promise<PayrollAnalytics>}
 */
export async function getPayrollAnalytics(month?: number, year?: number): Promise<PayrollAnalytics> {
  const now = new Date();
  let m = month;
  let y = year;
  
  if (!m || !y) {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    m = m ?? lastMonth.getMonth() + 1;
    y = y ?? lastMonth.getFullYear();
  }

  const { data: allData } = await supabase
    .from('salary_records')
    .select(`
      month, year, basic, hra, da, allowance, pf_deduction, tax_deduction, other_deduction, net_pay, status,
      profiles ( department )
    `);

  const records = (allData || []) as any[];

  let totalPayroll = 0, pf = 0, tax = 0, absence = 0, other = 0, count = 0;
  const deptMap: Record<string, { total: number, count: number }> = {};
  const trendMap: Record<string, number> = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const k = d.toISOString().slice(0, 7);
    trendMap[k] = 0;
  }

  for (const row of records) {
    const rowM = row.month;
    const rowY = row.year;
    
    const rowDate = new Date(Date.UTC(rowY, rowM - 1, 1));
    const k = rowDate.toISOString().slice(0, 7);
    
    if (trendMap[k] !== undefined && row.status !== 'failed') {
      trendMap[k] += Number(row.net_pay || 0);
    }

    if (rowY === y && rowM === m && row.status !== 'failed') {
      count++;
      totalPayroll += Number(row.basic || 0) + Number(row.hra || 0) + Number(row.da || 0) + Number(row.allowance || 0);
      pf += Number(row.pf_deduction || 0);
      tax += Number(row.tax_deduction || 0);
      other += Number(row.other_deduction || 0);
      
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const dept = profile?.department || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0 };
      deptMap[dept].total += Number(row.net_pay || 0);
      deptMap[dept].count++;
    }
  }

  const netPaid = totalPayroll - (pf + tax + other);
  const avgSalary = count === 0 ? 0 : Math.round(netPaid / count);

  return {
    summary: {
      total_payroll: totalPayroll,
      total_deductions: pf + tax + other,
      net_paid: netPaid,
      employee_count: count,
      avg_salary: avgSalary
    },
    by_department: Object.entries(deptMap).map(([department, data]) => ({
      department,
      total: data.total,
      avg: data.count === 0 ? 0 : Math.round(data.total / data.count)
    })).sort((a, b) => a.department.localeCompare(b.department)),
    deduction_breakdown: { pf, tax, absence: 0, other },
    monthly_trend: Object.entries(trendMap)
      .map(([monthStr, total]) => ({ month: monthStr, total }))
      .sort((a, b) => a.month.localeCompare(b.month))
  };
}

/**
 * Retrieves employee analytics.
 * @returns {Promise<EmployeeAnalytics>}
 */
export async function getEmployeeAnalytics(): Promise<EmployeeAnalytics> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, department, role, position, join_date')
    .eq('is_active', true);

  const { data: balances } = await supabase
    .from('leave_balance')
    .select('employee_id, paid_leave, sick_leave, casual_leave')
    .eq('year', new Date().getFullYear());

  const records = (profiles || []) as any[];
  const balRecords = (balances || []) as any[];

  const deptMap: Record<string, number> = {};
  const roleMap: Record<string, number> = {};
  
  for (const row of records) {
    const dept = row.department || 'Unknown';
    const role = row.role || 'Unknown';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
    roleMap[role] = (roleMap[role] || 0) + 1;
  }

  const recent_joiners = records
    .sort((a, b) => new Date(b.join_date).getTime() - new Date(a.join_date).getTime())
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      department: r.department || 'Unknown',
      position: r.position || 'Unknown',
      join_date: r.join_date || ''
    }));

  let r0_3 = 0, r4_7 = 0, r8_15 = 0, r16 = 0;
  for (const bal of balRecords) {
    const total = Number(bal.paid_leave || 0) + Number(bal.sick_leave || 0) + Number(bal.casual_leave || 0);
    if (total <= 3) r0_3++;
    else if (total <= 7) r4_7++;
    else if (total <= 15) r8_15++;
    else r16++;
  }

  return {
    by_department: Object.entries(deptMap).map(([department, count]) => ({ department, count })),
    by_role: Object.entries(roleMap).map(([role, count]) => ({ role, count })),
    recent_joiners,
    leave_balance_distribution: [
      { range: '0-3 days', count: r0_3 },
      { range: '4-7 days', count: r4_7 },
      { range: '8-15 days', count: r8_15 },
      { range: '16+ days', count: r16 }
    ]
  };
}

/**
 * Retrieves all analytics data in parallel.
 * @param {number} [month] - 1-indexed month (1-12)
 * @param {number} [year] - Full year (e.g., 2026)
 * @returns {Promise<AllAnalytics>}
 */
export async function getAllAnalytics(month?: number, year?: number): Promise<AllAnalytics> {
  const [attendance, leave, payroll, employee] = await Promise.all([
    getAttendanceAnalytics(month, year),
    getLeaveAnalytics(month, year),
    getPayrollAnalytics(month, year),
    getEmployeeAnalytics()
  ]);

  return {
    attendance,
    leave,
    payroll,
    employee
  };
}
