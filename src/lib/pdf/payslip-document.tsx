// Payslip PDF (Section 2.2 #1). Server-side only — imported exclusively by
// actions/payroll.ts. Colours mirror Section 4 tokens because @react-pdf has
// no access to CSS variables.

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import React from "react";

const C = {
  primary: "#5C3D54",
  plum: "#875A7B",
  ink: "#201A1E",
  line: "#EDE5EB",
  paper: "#FBF9FB",
  warn: "#B4552D",
};

export interface PayslipPdfProps {
  companyName: string;
  employeeName: string;
  loginId: string;
  jobTitle: string;
  department: string;
  periodStart: string;
  periodEnd: string;
  reference: string;
  workingDays: number;
  payableDays: number;
  lopDays: number;
  earnings: { code: string; name: string; full: number; prorated: number }[];
  deductions: { code: string; name: string; amount: number }[];
  gross: number;
  totalDeduct: number;
  netPay: number;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingHorizontal: 52,
    paddingBottom: 44,
    backgroundColor: C.paper,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.ink,
    lineHeight: 1.5,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    paddingBottom: 12,
  },
  company: { fontSize: 20, fontWeight: 700, color: C.primary },
  kindLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: C.plum,
    textTransform: "uppercase",
  },
  refRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  refText: { fontSize: 8.5, letterSpacing: 1.6, color: C.plum },
  empBlock: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    backgroundColor: "#FFFFFFFA",
  },
  empName: { fontSize: 13, fontWeight: 700, color: C.primary },
  empMeta: { marginTop: 3, color: C.plum },
  sectionHead: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
    color: C.primary,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 5,
    fontWeight: 700,
    fontSize: 9,
    letterSpacing: 1,
    color: C.primary,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.7,
    borderBottomColor: C.line,
  },
  colCode: { width: "16%", letterSpacing: 1, fontSize: 8.5, color: C.primary },
  colName: { width: "42%" },
  colNum: { width: "21%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 7,
    borderTopWidth: 2,
    borderTopColor: C.primary,
    fontWeight: 700,
    color: C.primary,
  },
  summaryGrid: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    backgroundColor: "#FFFFFFFA",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 0.7,
    borderBottomColor: C.line,
  },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: `${C.primary}`,
    borderRadius: 4,
    color: "#FFFFFFF7",
  },
  netAmount: { fontSize: 15, fontWeight: 700 },
});

export function PayslipDocument(p: PayslipPdfProps): React.JSX.Element {
  const money = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Document title={`Payslip ${p.reference}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <Text style={styles.company}>{p.companyName}</Text>
          <Text style={styles.kindLabel}>Payslip</Text>
        </View>
        <View style={styles.refRow}>
          <Text style={styles.refText}>REF {p.reference}</Text>
          <Text style={styles.refText}>
            {p.periodStart} – {p.periodEnd}
          </Text>
        </View>

        <View style={styles.empBlock}>
          <Text style={styles.empName}>{p.employeeName}</Text>
          <Text style={styles.empMeta}>
            {p.jobTitle} · {p.department}
          </Text>
          <Text style={[styles.empMeta, { letterSpacing: 1.5 }]}>
            ID {p.loginId}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 28, marginTop: 14 }}>
          <Text>Working days {p.workingDays}</Text>
          <Text>LOP {p.lopDays}</Text>
          <Text>Payable {p.payableDays}</Text>
        </View>

        <Text style={styles.sectionHead}>Earnings</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colCode}>CODE</Text>
          <Text style={styles.colName}>COMPONENT</Text>
          <Text style={styles.colNum}>FULL</Text>
          <Text style={styles.colNum}>PRORATED</Text>
        </View>
        {p.earnings.map((e) => (
          <View key={e.code} style={styles.row} wrap={false}>
            <Text style={styles.colCode}>{e.code}</Text>
            <Text style={styles.colName}>{e.name}</Text>
            <Text style={styles.colNum}>{money(e.full)}</Text>
            <Text style={styles.colNum}>{money(e.prorated)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.colCode}>GROSS</Text>
          <Text style={styles.colName}> </Text>
          <Text style={styles.colNum}>{money(p.gross)}</Text>
          <Text style={styles.colNum}>{" "}</Text>
        </View>

        <Text style={styles.sectionHead}>Deductions</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.colCode}>CODE</Text>
          <Text style={styles.colName}>ITEM</Text>
          <Text style={styles.colNum}>AMOUNT</Text>
        </View>
        {p.deductions.map((d) => (
          <View key={d.code} style={styles.row} wrap={false}>
            <Text style={styles.colCode}>{d.code}</Text>
            <Text style={styles.colName}>{d.name}</Text>
            <Text style={styles.colNum}>{money(d.amount)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.colCode}>TOTAL</Text>
          <Text style={styles.colName}> </Text>
          <Text style={styles.colNum}>{money(p.totalDeduct)}</Text>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <Text>Gross (prorated)</Text>
            <Text>{money(p.gross)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text>Total deductions</Text>
            <Text>{`− ${money(p.totalDeduct)}`}</Text>
          </View>
        </View>

        <View style={[styles.netRow, { marginTop: 14 }]}>
          <Text style={{ fontSize: 11, letterSpacing: 2 }}>NET PAY</Text>
          <Text style={styles.netAmount}>{money(p.netPay)}</Text>
        </View>
      </Page>
    </Document>
  );
}
