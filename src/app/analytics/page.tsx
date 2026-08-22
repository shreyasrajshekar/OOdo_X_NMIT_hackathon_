"use client";

import { useState, useEffect } from "react";
import { getAllAnalytics, AllAnalytics } from "@/lib/analytics";
import { 
  BarChart3, 
  Users, 
  CalendarOff, 
  Wallet, 
  TrendingUp, 
  Clock, 
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  UserPlus,
  XCircle
} from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AnalyticsPage() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [data, setData] = useState<AllAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave' | 'payroll' | 'employee'>('attendance');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getAllAnalytics(selectedMonth, selectedYear)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Analytics fetch error:", err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedYear === currentYear && selectedMonth === currentMonth) {
      return;
    }
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const isNextDisabled = selectedYear === currentYear && selectedMonth === currentMonth;

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl">
        
        
        {/* PAGE HEADER */}
        <div className="flex items-center gap-3 mb-6 enter" style={{ "--enter-delay": "0ms" } as any}>
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-bold text-ink">Analytics</h1>
        </div>

        {/* MONTH/YEAR SELECTOR */}
        <div className="flex items-center justify-center gap-4 mb-8 enter" style={{ "--enter-delay": "0ms" } as any}>
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-card bg-line/50 hover:bg-line text-ink transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-xl font-display font-bold text-primary min-w-[200px] text-center tracking-tight">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </div>
          <button
            onClick={handleNextMonth}
            disabled={isNextDisabled}
            className={`p-2 rounded-card transition-colors ${
              isNextDisabled ? 'bg-line/20 text-ink/30 cursor-not-allowed' : 'bg-line/50 hover:bg-line text-ink'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* TAB BAR */}
        <div className="flex gap-2 bg-line/30 rounded-card p-1.5 mb-8 border border-line overflow-x-auto enter" style={{ "--enter-delay": "50ms" } as any}>
          {[
            { id: 'attendance', label: 'Attendance', icon: BarChart3 },
            { id: 'leave', label: 'Leave', icon: CalendarOff },
            { id: 'payroll', label: 'Payroll', icon: Wallet },
            { id: 'employee', label: 'Employees', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-display font-semibold rounded-[10px] transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-paper shadow-sm'
                    : 'text-ink/70 hover:text-primary hover:bg-line/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 enter" style={{ "--enter-delay": "100ms" } as any}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-line/60 rounded-card h-32" />
            ))}
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-64 text-ink/50 font-body enter" style={{ "--enter-delay": "100ms" } as any}>
            No data available for this period
          </div>
        ) : (
          <div className="enter opacity-100 transition-opacity duration-200" style={{ "--enter-delay": "100ms" } as any}>
            {activeTab === 'attendance' && <AttendanceTab data={data.attendance} />}
            {activeTab === 'leave' && <LeaveTab data={data.leave} />}
            {activeTab === 'payroll' && <PayrollTab data={data.payroll} />}
            {activeTab === 'employee' && <EmployeeTab data={data.employee} />}
          </div>
        )}
      </div>
    </div>
  );
}

function AttendanceTab({ data }: { data: AllAnalytics['attendance'] }) {
  const { summary, by_department, by_employee, daily_trend, late_checkins } = data;

  const max_present = daily_trend.reduce((max, day) => Math.max(max, day.present, 1), 1);

  return (
    <div>
      {/* ROW 1: Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="premium-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-display font-bold text-primary tracking-tight">{summary.attendance_rate}%</div>
              <div className="text-sm font-display font-semibold text-ink/60 mt-1">Attendance Rate</div>
            </div>
            {summary.attendance_rate >= 90 ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-warn" />
            )}
          </div>
        </div>
        
        <div className="premium-card p-5 flex flex-col justify-center border-b-4 border-b-success/80">
          <div className="text-3xl font-display font-bold text-success tracking-tight">{summary.present_days}</div>
          <div className="text-sm font-display font-semibold text-ink/60 mt-1">Present Days</div>
        </div>

        <div className="premium-card p-5 flex flex-col justify-center border-b-4 border-b-plum/80">
          <div className="text-3xl font-display font-bold text-plum tracking-tight">{summary.absent_days}</div>
          <div className="text-sm font-display font-semibold text-ink/60 mt-1">Absent Days</div>
        </div>

        <div className="premium-card p-5 flex flex-col justify-center border-b-4 border-b-warn/80">
          <div className="text-3xl font-display font-bold text-warn tracking-tight">{summary.half_days}</div>
          <div className="text-sm font-display font-semibold text-ink/60 mt-1">Half Days</div>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* LEFT: Department Breakdown */}
        <div className="premium-card p-6">
          <h3 className="text-base font-display font-bold text-primary mb-5">By Department</h3>
          <div className="flex flex-col gap-3">
            {by_department.map((dept) => {
              let colorClass = "bg-plum";
              if (dept.rate >= 90) colorClass = "bg-success";
              else if (dept.rate >= 70) colorClass = "bg-warn";

              return (
                <div key={dept.department} className="py-2 border-b border-line/60 last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-body text-ink/80 font-medium">{dept.department}</span>
                    <span className="text-sm font-mono font-medium text-ink">{dept.rate}%</span>
                  </div>
                  <div className="h-2 bg-line rounded-pill w-full overflow-hidden">
                    <div 
                      className={`h-full rounded-pill transition-all duration-700 ease-out ${colorClass}`} 
                      style={{ width: `${Math.min(dept.rate, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {by_department.length === 0 && (
              <div className="text-sm font-body text-ink/50 py-2">No department data available.</div>
            )}
          </div>
        </div>

        {/* RIGHT: Daily Trend */}
        <div className="premium-card p-6">
          <h3 className="text-base font-display font-bold text-primary mb-5">Daily Trend</h3>
          <div className="flex items-end gap-1.5 h-40 mt-4">
            {daily_trend.map((day) => {
              const presentHeight = (day.present / max_present) * 100;
              const absentHeight = (day.absent / max_present) * 100;
              const dayLabel = day.date.split('-').pop();

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="w-full flex flex-col justify-end h-[calc(100%-24px)] transition-opacity group-hover:opacity-80">
                    <div 
                      className="w-full bg-success/80 rounded-t-sm"
                      style={{ height: `${presentHeight}%` }}
                    />
                    <div 
                      className="w-full bg-plum/60 rounded-b-sm mt-[1px]"
                      style={{ height: `${absentHeight}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-ink/50 mt-1.5 h-[14px]">
                    {dayLabel}
                  </div>
                </div>
              );
            })}
            {daily_trend.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-sm font-body text-ink/50">
                No trend data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Late Check-ins */}
        <div className="premium-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-base font-display font-bold text-primary">Late Check-ins</h3>
          </div>
          
          {late_checkins.length === 0 ? (
            <div className="text-sm font-body text-ink/50 py-4">No late check-ins this month. Excellent!</div>
          ) : (
            <div className="flex flex-col">
              {late_checkins.slice(0, 5).map((late, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 border-b border-line/60 last:border-0 hover:bg-line/20 px-2 -mx-2 rounded-lg transition-colors">
                  <div>
                    <div className="text-sm font-display font-semibold text-ink">{late.name}</div>
                    <div className="text-xs font-body text-ink/60 mt-0.5">{late.department}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-body text-ink/60 mb-0.5">{late.date}</div>
                    <div className="text-xs font-mono font-semibold text-warn">
                      {late.check_in.split('T')[1]?.substring(0, 5) || late.check_in.substring(0, 5)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Employee Attendance List */}
        <div className="premium-card p-6">
          <h3 className="text-base font-display font-bold text-primary mb-5">By Employee</h3>
          <div className="max-h-72 overflow-y-auto pr-3 custom-scrollbar">
            {by_employee.map((emp) => {
              let colorClass = "text-plum";
              if (emp.rate >= 90) colorClass = "text-success";
              else if (emp.rate >= 70) colorClass = "text-warn";

              return (
                <div key={emp.employee_id} className="flex items-center justify-between py-3 border-b border-line/60 last:border-0 hover:bg-line/20 px-2 -mx-2 rounded-lg transition-colors">
                  <div>
                    <div className="text-sm font-display font-semibold text-ink">{emp.name}</div>
                    <div className="text-xs font-body text-ink/60 mt-0.5">{emp.department}</div>
                  </div>
                  <div className={`text-sm font-mono font-bold ${colorClass}`}>
                    {emp.rate}%
                  </div>
                </div>
              );
            })}
            {by_employee.length === 0 && (
              <div className="text-sm font-body text-ink/50 py-4">No employee data available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTab({ title, icon: Icon }: { title: string, icon: any }) {
  return (
    <div className="premium-card p-12 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-line/50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-primary/60" />
      </div>
      <h2 className="text-xl font-display font-bold text-primary">{title}</h2>
      <p className="text-sm font-body text-ink/60 mt-2">Coming soon in the next update.</p>
    </div>
  );
}


function formatCurrency(amount: number): string {
  return "₹" + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function LeaveTab({ data }: { data: AllAnalytics['leave'] }) {
  const { summary, by_type, by_department, monthly_trend } = data;
  if (summary.total_requested === 0) {
    return <div className="text-center text-ink/50 py-10 font-body">No leave data for this period</div>;
  }
  const max_count = by_type.reduce((m, item) => Math.max(m, item.count, 1), 1);
  const max_trend = monthly_trend.reduce((m, item) => Math.max(m, item.approved + item.rejected, 1), 1);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="premium-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-display font-bold text-primary tracking-tight">{summary.total_requested}</div>
              <div className="text-sm font-display font-semibold text-ink/60 mt-1">Total Requests</div>
            </div>
            <CalendarOff className="w-5 h-5 text-primary" />
          </div>
        </div>
        
        <div className="premium-card p-5 flex flex-col justify-between border-b-4 border-b-success/80">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-display font-bold text-success tracking-tight">{summary.approved}</div>
              <div className="text-sm font-display font-semibold text-ink/60 mt-1">Approved</div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
        </div>

        <div className="premium-card p-5 flex flex-col justify-between border-b-4 border-b-plum/80">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-display font-bold text-plum tracking-tight">{summary.rejected}</div>
              <div className="text-sm font-display font-semibold text-ink/60 mt-1">Rejected</div>
            </div>
            <XCircle className="w-5 h-5 text-plum" />
          </div>
        </div>

        <div className="premium-card p-5 flex flex-col justify-center border-b-4 border-b-primary/50">
          <div className={`text-3xl font-display font-bold tracking-tight ${summary.approval_rate >= 80 ? 'text-success' : summary.approval_rate >= 50 ? 'text-warn' : 'text-plum'}`}>
            {summary.approval_rate}%
          </div>
          <div className="text-sm font-display font-semibold text-ink/60 mt-1">Approval Rate</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="premium-card p-6">
          <h3 className="text-base font-display font-bold text-primary mb-5">By Leave Type</h3>
          <div className="flex flex-col gap-3">
            {[...by_type].sort((a, b) => b.count - a.count).map((item) => (
              <div key={item.type} className="flex items-center gap-3">
                <span className="text-sm font-body text-ink/80 font-medium w-24 shrink-0 capitalize">{item.type.replace('_', ' ')}</span>
                <div className="flex-1 h-6 bg-line rounded-pill relative overflow-hidden flex items-center">
                  <div 
                    className="h-full bg-primary rounded-pill transition-all duration-700 ease-out"
                    style={{ width: `${(item.count / max_count) * 100}%` }}
                  />
                  <span className="absolute right-3 text-xs font-mono font-medium text-paper">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-card p-6">
          <h3 className="text-base font-display font-bold text-primary mb-5">By Department</h3>
          <div className="flex flex-col">
            {[...by_department].sort((a, b) => b.total - a.total).map((dept) => (
              <div key={dept.department} className="flex items-center justify-between py-3 border-b border-line/60 last:border-0 hover:bg-line/20 px-2 -mx-2 rounded-lg transition-colors">
                <div className="text-sm font-body text-ink/80 font-medium">{dept.department}</div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-success font-medium">A: {dept.approved}</span>
                  <span className="text-xs font-mono text-plum font-medium">R: {dept.rejected}</span>
                  <span className="text-xs font-mono text-ink/50">({dept.total} total)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="premium-card p-6">
        <h3 className="text-base font-display font-bold text-primary mb-5">6-Month Trend</h3>
        <div className="flex items-end gap-2 h-40 mt-4">
          {monthly_trend.map((trend) => {
            const approvedHeight = (trend.approved / max_trend) * 100;
            const rejectedHeight = (trend.rejected / max_trend) * 100;
            const date = new Date(trend.month + "-01");
            const monthLabel = isNaN(date.getTime()) ? trend.month : new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);

            return (
              <div key={trend.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="w-full max-w-[40px] flex flex-col justify-end h-[calc(100%-24px)] transition-opacity group-hover:opacity-80">
                  <div 
                    className="w-full bg-success/80 rounded-t-sm"
                    style={{ height: `${approvedHeight}%` }}
                  />
                  <div 
                    className="w-full bg-plum/60 rounded-b-sm mt-[1px]"
                    style={{ height: `${rejectedHeight}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-ink/50 mt-1.5 h-[14px]">
                  {monthLabel}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success/80" />
            <span className="text-xs font-display font-semibold text-ink/60">Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-plum/60" />
            <span className="text-xs font-display font-semibold text-ink/60">Rejected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PayrollTab({ data }: { data: AllAnalytics['payroll'] }) {
  const { summary, by_department, deduction_breakdown, monthly_trend } = data;
  if (summary.total_payroll === 0) {
    return <div className="text-center text-ink/50 py-10 font-body">No payroll data for this period</div>;
  }
  const max_trend = monthly_trend.reduce((m, item) => Math.max(m, item.total, 1), 1);
  const total_deductions = deduction_breakdown.pf + deduction_breakdown.tax + deduction_breakdown.absence + deduction_breakdown.other;

  const deductionTypes = [
    { key: 'pf', label: 'Provident Fund', amount: deduction_breakdown.pf },
    { key: 'tax', label: 'Income Tax', amount: deduction_breakdown.tax },
    { key: 'absence', label: 'Absence', amount: deduction_breakdown.absence },
    { key: 'other', label: 'Other', amount: deduction_breakdown.other },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <div className="premium-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div className="text-xl font-display font-bold text-primary tracking-tight">{formatCurrency(summary.total_payroll)}</div>
            <Wallet className="w-5 h-5 text-primary shrink-0 ml-2" />
          </div>
          <div className="text-sm font-display font-semibold text-ink/60">Total Payroll</div>
        </div>
        
        <div className="premium-card p-5 flex flex-col justify-end border-b-4 border-b-success/80">
          <div className="text-xl font-display font-bold text-success tracking-tight mb-2">{formatCurrency(summary.net_paid)}</div>
          <div className="text-sm font-display font-semibold text-ink/60">Net Paid</div>
        </div>

        <div className="premium-card p-5 flex flex-col justify-end border-b-4 border-b-plum/80">
          <div className="text-xl font-display font-bold text-plum tracking-tight mb-2">{formatCurrency(summary.total_deductions)}</div>
          <div className="text-sm font-display font-semibold text-ink/60">Total Deductions</div>
        </div>

        <div className="premium-card p-5 flex flex-col justify-end border-b-4 border-b-primary/50">
          <div className="text-xl font-display font-bold text-primary tracking-tight mb-2">{formatCurrency(summary.avg_salary)}</div>
          <div className="text-sm font-display font-semibold text-ink/60">Avg Salary</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="premium-card p-6">
          <h3 className="text-base font-display font-bold text-primary mb-5">By Department</h3>
          <div className="flex flex-col">
            {[...by_department].sort((a, b) => b.total - a.total).map((dept) => (
              <div key={dept.department} className="flex items-center justify-between py-3 border-b border-line/60 last:border-0 hover:bg-line/20 px-2 -mx-2 rounded-lg transition-colors">
                <div className="text-sm font-body text-ink/80 font-medium">{dept.department}</div>
                <div className="text-right">
                  <div className="text-sm font-mono font-medium text-primary">{formatCurrency(dept.total)}</div>
                  <div className="text-xs font-mono text-ink/50">{formatCurrency(dept.avg)} avg</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col">
          <h3 className="text-base font-display font-bold text-primary mb-5">Deduction Breakdown</h3>
          <div className="flex flex-col gap-1 flex-1">
            {deductionTypes.map((type) => (
              <div key={type.key} className="py-2.5 border-b border-line/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-body text-ink/80 font-medium">{type.label}</span>
                  <span className="text-sm font-mono font-medium text-plum">{formatCurrency(type.amount)}</span>
                </div>
                <div className="h-1.5 bg-line rounded-pill w-full overflow-hidden">
                  <div 
                    className="h-full rounded-pill transition-all duration-700 ease-out bg-plum/70"
                    style={{ width: `${total_deductions > 0 ? (type.amount / total_deductions) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-4 mt-auto">
              <span className="text-sm font-display font-bold text-ink">Total</span>
              <span className="text-sm font-mono font-bold text-plum">{formatCurrency(total_deductions)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card p-6">
        <h3 className="text-base font-display font-bold text-primary mb-5">6-Month Payroll Trend</h3>
        <div className="flex items-end gap-2 h-40 mt-4">
          {monthly_trend.map((trend) => {
            const height = (trend.total / max_trend) * 100;
            const date = new Date(trend.month + "-01");
            const monthLabel = isNaN(date.getTime()) ? trend.month : new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
            
            let amountLabel = "";
            if (trend.total >= 10000000) amountLabel = (trend.total / 10000000).toFixed(1) + "Cr";
            else if (trend.total >= 100000) amountLabel = (trend.total / 100000).toFixed(1) + "L";
            else if (trend.total >= 1000) amountLabel = (trend.total / 1000).toFixed(1) + "k";
            else amountLabel = trend.total.toString();

            return (
              <div key={trend.month} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="w-full max-w-[48px] flex flex-col justify-end h-[calc(100%-24px)]">
                  <div className="text-[10px] font-mono text-ink/40 mb-1.5 text-center transition-opacity opacity-0 group-hover:opacity-100">{amountLabel}</div>
                  <div 
                    className="w-full bg-primary/70 rounded-t-sm transition-opacity group-hover:opacity-90"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-ink/50 mt-1.5 h-[14px]">
                  {monthLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmployeeTab({ data }: { data: AllAnalytics['employee'] }) {
  const { by_department, recent_joiners, leave_balance_distribution } = data;
  
  if (by_department.length === 0) {
    return <div className="text-center text-ink/50 py-10 font-body">No employee data available</div>;
  }

  // Calculate conic gradient
  const colors = ['#5c3d54', '#875a7b', '#17a67f', '#b4552d', '#4a4a4a', '#a67c52', '#3d545c'];
  const totalEmployees = by_department.reduce((sum, d) => sum + d.count, 0);
  
  let currentAngle = 0;
  const gradientStops = by_department.map((dept, index) => {
    const percentage = dept.count / totalEmployees;
    const degrees = percentage * 360;
    const start = currentAngle;
    const end = currentAngle + degrees;
    currentAngle += degrees;
    const color = colors[index % colors.length];
    return `${color} ${start}deg ${end}deg`;
  });
  
  const conicGradient = gradientStops.length > 0 
    ? `conic-gradient(${gradientStops.join(', ')})`
    : 'none';

  const maxLeaveCount = leave_balance_distribution.reduce((m, r) => Math.max(m, r.count, 1), 1);

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* LEFT: By Department Donut */}
        <div className="premium-card p-6">
          <h3 className="text-base font-display font-bold text-primary mb-6">Headcount by Department</h3>
          
          <div className="relative w-48 h-48 mx-auto mb-8">
            <div 
              className="w-full h-full rounded-full"
              style={{ background: conicGradient }}
            />
            <div className="absolute inset-5 bg-paper rounded-full shadow-inner" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-display font-bold text-primary tracking-tight">{totalEmployees}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            {by_department.map((dept, idx) => (
              <div key={dept.department} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span className="text-xs font-body font-medium text-ink/70">
                  {dept.department} <span className="font-mono text-ink/50">({dept.count})</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Leave Balance Distribution */}
        <div className="premium-card p-6">
          <h3 className="text-base font-display font-bold text-primary mb-1">Leave Balance Health</h3>
          <p className="text-xs font-body text-ink/50 mb-6">Combined balance per employee (current year)</p>
          
          <div className="flex flex-col gap-4">
            {leave_balance_distribution.map((item) => {
              let colorClass = "bg-primary";
              if (item.range === "0-3 days") colorClass = "bg-plum/90";
              else if (item.range === "4-7 days") colorClass = "bg-warn/90";
              else if (item.range === "8-15 days") colorClass = "bg-success/70";
              else if (item.range === "16+ days") colorClass = "bg-success";

              return (
                <div key={item.range} className="flex items-center gap-3">
                  <span className="text-xs font-body font-medium text-ink/70 w-20 shrink-0">{item.range}</span>
                  <div className="flex-1 h-5 bg-line rounded-pill overflow-hidden relative">
                    <div 
                      className={`h-full rounded-pill transition-all duration-700 ease-out ${colorClass}`}
                      style={{ width: `${(item.count / maxLeaveCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-ink w-8 text-right">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="premium-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <UserPlus className="w-5 h-5 text-primary" />
          <h3 className="text-base font-display font-bold text-primary">Recent Joiners</h3>
        </div>
        
        {recent_joiners.length === 0 ? (
          <div className="text-sm font-body text-ink/50 py-4">No recent joiners</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent_joiners.slice(0, 6).map((joiner) => {
              const initials = (joiner.name.split(' ')[0]?.[0] || '') + (joiner.name.split(' ')[1]?.[0] || '');
              const dateObj = new Date(joiner.join_date);
              const dateStr = isNaN(dateObj.getTime()) ? joiner.join_date : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div key={joiner.id} className="bg-line/30 rounded-card p-3 border border-line/60 flex items-center gap-3 hover:bg-line/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-display font-bold text-primary tracking-wide uppercase">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-display font-semibold text-ink truncate">{joiner.name}</div>
                    <div className="text-xs font-body text-ink/60 truncate">{joiner.position} · {joiner.department}</div>
                  </div>
                  <div className="text-[10px] font-mono text-ink/50 shrink-0 self-start mt-1">
                    {dateStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
