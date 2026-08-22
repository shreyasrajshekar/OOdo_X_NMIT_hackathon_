/**
 * Dayflow seed.
 *
 *   npm run seed
 *
 * Builds the OD demo company on the live schema: 25 people (1 admin + 24
 * employees), a month of attendance with deliberate anomalies, and a pending
 * unpaid leave request left sitting in the admin queue for the stage demo.
 *
 * Idempotent: every run wipes the previous one first, keyed on the seed email
 * domain, so nothing else in the project is touched.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY. profiles.id is a foreign key onto
 * auth.users(id), so people can only be created through the admin auth API.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "\nMissing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n\n" +
      "The service-role key is not the anon/publishable key and is not\n" +
      "readable through the API. Copy it from:\n" +
      "  Supabase -> Project Settings -> API Keys -> service_role (secret)\n" +
      "into .env.local, then run npm run seed again.\n",
  );
  process.exit(1);
}

const DOMAIN = "odooindia.dayflow.test";
const PASSWORD = "Dayflow!2026";
const YEAR = new Date().getUTCFullYear();

// ---------------------------------------------------------------------------
// deterministic helpers - same seed in, same demo out
// ---------------------------------------------------------------------------

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};
const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;
const pad2 = (n: number) => String(n).padStart(2, "0");
const stamp = (date: string, h: number, m: number) =>
  `${date}T${pad2(h)}:${pad2(m)}:00+05:30`;

// ---------------------------------------------------------------------------
// roster: 1 admin + 24 employees across 4 departments + management
// ---------------------------------------------------------------------------

interface Person {
  first: string;
  last: string;
  dept: string;
  title: string;
  isAdmin: boolean;
  joining: string;
  wage: number;
}

function buildRoster(): Person[] {
  const people: Person[] = [
    {
      first: "Priya",
      last: "Menon",
      dept: "Management",
      title: "Administrator",
      isAdmin: true,
      joining: "2022-01-10",
      wage: 175000,
    },
  ];

  const plan: Array<[string, string[], string]> = [
    ["Engineering", ["Rohan Iyer", "Ananya Sharma", "Vikram Rao", "Meera Nair", "Arjun Patel", "Divya Kulkarni", "Karthik Reddy", "Sneha Joshi", "Aditya Verma", "Tanvi Deshmukh"], "Software Engineer"],
    ["Sales", ["Neha Gupta", "Suresh Kumar", "Pooja Desai", "Rahul Mishra", "Aisha Khan", "Manikandan S", "Kavya Menon"], "Sales Executive"],
    ["HR", ["Lakshmi Prasad", "Farhan Ali", "Deepa Krishnan"], "HR Associate"],
    ["Finance", ["Gaurav Saxena", "Ritika Bansal", "Mohan Iyer", "Shreya Pillai"], "Accountant"],
  ];

  const years = [2022, 2023, 2024, 2025, 2026];
  let idx = 1;

  for (const [dept, names, baseTitle] of plan) {
    names.forEach((fullName, j) => {
      const [first, ...rest] = fullName.split(" ");
      const year = years[idx % years.length];
      const month = 1 + ((idx * 5) % 12);
      const day = 2 + ((idx * 11) % 26);
      people.push({
        first,
        last: rest.join(" ") || "Kumar",
        dept,
        title: j === 0 ? `${dept} Manager` : baseTitle,
        isAdmin: false,
        joining: iso(new Date(Date.UTC(year, month - 1, day))),
        wage: Math.round((35000 + ((idx * 9973) % 145001)) / 500) * 500,
      });
      idx += 1;
    });
  }
  return people;
}

const emailFor = (p: Person, i: number) =>
  `${p.first}.${p.last}.${i}`.toLowerCase().replace(/[^a-z0-9.]/g, "") + `@${DOMAIN}`;

// ---------------------------------------------------------------------------
// wipe the previous run
// ---------------------------------------------------------------------------

async function wipe(admin: SupabaseClient<Database>) {
  const ids: string[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    if (!data.users.length) break;
    ids.push(...data.users.filter((u) => u.email?.endsWith(`@${DOMAIN}`)).map((u) => u.id));
    if (data.users.length < 200) break;
  }
  if (!ids.length) return 0;

  // profiles has no ON DELETE CASCADE from auth.users, so the profile row has
  // to go first or the auth delete fails on the foreign key. Everything else
  // (attendance, leave, salary, notifications) cascades off profiles.
  const { error: profErr } = await admin.from("profiles").delete().in("id", ids);
  if (profErr) throw profErr;

  await admin.from("notification_logs").delete().in("user_id", ids);

  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;
  }
  return ids.length;
}

// ---------------------------------------------------------------------------

async function main() {
  const admin = createClient<Database>(SUPABASE_URL!, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const removed = await wipe(admin);
  if (removed) console.log(`wiped ${removed} people from the previous run`);

  const roster = buildRoster();
  const rng = makeRng(20260822);

  // --- people -------------------------------------------------------------
  const created: Array<{ id: string; person: Person }> = [];
  for (const [i, person] of roster.entries()) {
    const email = emailFor(person, i);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    created.push({ id: data.user.id, person });
  }
  console.log(`created ${created.length} people`);

  await admin.from("profiles").insert(
    created.map(({ id, person }) => ({
      id,
      first_name: person.first,
      last_name: person.last,
      phone: `+9198${String(40000000 + Math.floor(rng() * 9999999)).slice(0, 8)}`,
      role: person.isAdmin ? "admin" : "employee",
      department: person.dept,
      position: person.title,
      join_date: person.joining,
      is_active: true,
    })),
  ).throwOnError();

  // --- salary + leave balance --------------------------------------------
  await admin.from("salary_structure").insert(
    created.map(({ id, person }) => ({
      employee_id: id,
      basic: person.wage * 0.5,
      hra: person.wage * 0.2,
      da: person.wage * 0.2,
      allowance: person.wage * 0.1,
      pf_rate: 12,
      tax_rate: person.wage > 100000 ? 20 : 10,
    })),
  ).throwOnError();

  await admin.from("leave_balance").insert(
    created.map(({ id }) => ({
      employee_id: id,
      year: YEAR,
      paid_leave: 12,
      sick_leave: 10,
      casual_leave: 6,
      unpaid_leave: 0,
    })),
  ).throwOnError();

  // --- attendance, last 30 days, with anomalies ---------------------------
  type AttendanceInsert = Database["public"]["Tables"]["attendance"]["Insert"];
  const rows: AttendanceInsert[] = [];
  const today = new Date();
  let lateCount = 0;
  let missingOut = 0;
  let absentCount = 0;

  for (const [personIdx, { id }] of created.entries()) {
    for (let back = 30; back >= 1; back--) {
      const day = addDays(today, -back);
      if (isWeekend(day)) continue;
      const date = iso(day);
      const roll = rng();

      // one employee carries three consecutive absences, so the consecutive
      // absence rule has something real to fire on during the demo
      const streak = personIdx === 7 && back >= 3 && back <= 5;

      if (streak || roll < 0.04) {
        rows.push({ employee_id: id, date, status: "absent", check_in: null, check_out: null });
        absentCount += 1;
      } else if (roll < 0.08) {
        rows.push({
          employee_id: id, date, status: "half_day",
          check_in: stamp(date, 9, 0), check_out: stamp(date, 13, 0), hours_worked: 4,
        });
      } else if (roll < 0.14) {
        // forgot to check out
        rows.push({ employee_id: id, date, status: "present", check_in: stamp(date, 9, 10), check_out: null });
        missingOut += 1;
      } else if (roll < 0.26) {
        // late arrival
        const m = 35 + Math.floor(rng() * 50);
        rows.push({
          employee_id: id, date, status: "present",
          check_in: stamp(date, 9, m), check_out: stamp(date, 18, 15), hours_worked: 8.25,
        });
        lateCount += 1;
      } else {
        rows.push({
          employee_id: id, date, status: "present",
          check_in: stamp(date, 9, Math.floor(rng() * 12)), check_out: stamp(date, 18, 0), hours_worked: 8.75,
        });
      }
    }
  }

  for (let i = 0; i < rows.length; i += 500) {
    await admin.from("attendance").insert(rows.slice(i, i + 500)).throwOnError();
  }
  console.log(
    `attendance: ${rows.length} rows (${lateCount} late, ${missingOut} missing check-out, ${absentCount} absent)`,
  );

  // --- leave requests -----------------------------------------------------
  // The pending unpaid one is the stage moment: it sits unapproved in the
  // admin queue. Inserting it fires trg_leave_submitted, so the admin's
  // notification bell has something in it on a fresh seed.
  const stageEmployee = created[3];
  const approvedEmployee = created[5];
  const rejectedEmployee = created[9];
  const adminId = created[0].id;

  await admin.from("leave_requests").insert([
    {
      employee_id: stageEmployee.id,
      leave_type: "unpaid",
      from_date: iso(addDays(today, 4)),
      to_date: iso(addDays(today, 6)),
      total_days: 3,
      reason: "Family function out of town, no paid balance left for the year.",
      status: "pending",
    },
    {
      employee_id: approvedEmployee.id,
      leave_type: "sick",
      from_date: iso(addDays(today, -12)),
      to_date: iso(addDays(today, -11)),
      total_days: 2,
      reason: "Viral fever, doctor advised rest.",
      status: "approved",
      approved_by: adminId,
      admin_comment: "Get well soon.",
    },
    {
      employee_id: rejectedEmployee.id,
      leave_type: "casual",
      from_date: iso(addDays(today, -6)),
      to_date: iso(addDays(today, -6)),
      total_days: 1,
      reason: "Personal errand.",
      status: "rejected",
      approved_by: adminId,
      admin_comment: "Clashes with the quarter-end review.",
    },
  ]).throwOnError();

  console.log("leave: 1 pending unpaid (stage), 1 approved, 1 rejected");
  console.log(
    `\ndone. sign in as ${emailFor(roster[0], 0)} / ${PASSWORD}\n` +
      `all ${created.length} accounts share that password.\n`,
  );
}

main().catch((err) => {
  console.error("\nseed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
