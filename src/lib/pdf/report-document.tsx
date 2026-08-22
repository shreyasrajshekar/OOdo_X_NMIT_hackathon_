/**
 * Generic structured report PDF.
 *
 * The directory, attendance, time off, analytics and a person's own workspace
 * all export the same shape: a branded header, the scope the numbers were
 * taken under, optional headline figures, then one or more tables. Rendering
 * them through one document keeps every export recognisably the same paper.
 *
 * Colours are literal because @react-pdf cannot read CSS variables; they track
 * the Section 4 tokens, the same way the payslip document does.
 */

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
  success: "#17A67F",
  warn: "#B4552D",
};

export type ColumnAlign = "left" | "right";

export type ReportColumn = {
  header: string;
  /** Flex weight for the column; defaults to 1. */
  width?: number;
  align?: ColumnAlign;
};

export type ReportSection = {
  title?: string;
  note?: string;
  columns: ReportColumn[];
  rows: string[][];
  /** Shown instead of the table when there are no rows. */
  emptyLabel?: string;
};

export type ReportProps = {
  title: string;
  companyName: string;
  /** Scope of the data: date range, filters applied, who ran it. */
  meta: { label: string; value: string }[];
  summary?: { label: string; value: string; tone?: "default" | "success" | "warn" }[];
  sections: ReportSection[];
  footNote?: string;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingHorizontal: 40,
    paddingBottom: 46,
    backgroundColor: C.paper,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.ink,
    // No lineHeight here: setting it on the Page makes @react-pdf drop the
    // absolutely-positioned footer entirely. It lives on the text styles below.
  },

  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
    paddingBottom: 10,
  },
  wordmark: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.primary },
  company: { fontSize: 8, color: C.plum, marginTop: 2 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right" },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 18,
  },
  metaItem: { marginRight: 18, marginBottom: 4 },
  metaLabel: {
    fontSize: 6.5,
    letterSpacing: 1,
    color: C.plum,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: { fontSize: 9, lineHeight: 1.4 },

  summaryRow: { flexDirection: "row", marginTop: 14, gap: 8 },
  summaryTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 6.5,
    letterSpacing: 1,
    color: C.plum,
    fontFamily: "Helvetica-Bold",
  },
  summaryValue: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 3 },

  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    marginTop: 20,
    marginBottom: 2,
  },
  sectionNote: { fontSize: 8, color: C.plum, marginBottom: 6, lineHeight: 1.4 },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 4, marginTop: 8 },
  headRow: {
    flexDirection: "row",
    backgroundColor: C.line,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headCell: {
    fontSize: 6.5,
    letterSpacing: 0.8,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  rowAlt: { backgroundColor: "#FFFFFF" },
  cell: { fontSize: 8.5, lineHeight: 1.4 },
  empty: { padding: 14, fontSize: 9, color: C.plum, textAlign: "center" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 6,
  },
  footText: { fontSize: 7, color: C.plum },
});

const TONE_COLOR = {
  default: C.ink,
  success: C.success,
  warn: C.warn,
} as const;

function Table({ section }: { section: ReportSection }) {
  const { columns, rows } = section;

  return (
    <View style={styles.table} wrap>
      <View style={styles.headRow} fixed>
        {columns.map((column, i) => (
          <Text
            key={`${column.header}-${i}`}
            style={[
              styles.headCell,
              {
                flex: column.width ?? 1,
                textAlign: column.align ?? "left",
              },
            ]}
          >
            {column.header.toUpperCase()}
          </Text>
        ))}
      </View>

      {rows.length === 0 ? (
        <Text style={styles.empty}>
          {section.emptyLabel ?? "Nothing to report."}
        </Text>
      ) : (
        rows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={[styles.row, rowIndex % 2 === 1 ? styles.rowAlt : {}]}
            wrap={false}
          >
            {columns.map((column, colIndex) => (
              <Text
                key={colIndex}
                style={[
                  styles.cell,
                  {
                    flex: column.width ?? 1,
                    textAlign: column.align ?? "left",
                  },
                ]}
              >
                {row[colIndex] ?? "—"}
              </Text>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

export function ReportDocument({
  title,
  companyName,
  meta,
  summary,
  sections,
  footNote,
}: ReportProps) {
  return (
    <Document title={title} author="Dayflow">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.brandRow} fixed>
          <View>
            <Text style={styles.wordmark}>Dayflow</Text>
            <Text style={styles.company}>{companyName}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        <View style={styles.metaRow}>
          {meta.map((item) => (
            <View key={item.label} style={styles.metaItem}>
              <Text style={styles.metaLabel}>{item.label.toUpperCase()}</Text>
              <Text style={styles.metaValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {summary && summary.length > 0 && (
          <View style={styles.summaryRow}>
            {summary.map((tile) => (
              <View key={tile.label} style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>
                  {tile.label.toUpperCase()}
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: TONE_COLOR[tile.tone ?? "default"] },
                  ]}
                >
                  {tile.value}
                </Text>
              </View>
            ))}
          </View>
        )}

        {sections.map((section, i) => (
          <View key={i}>
            {section.title && (
              <Text style={styles.sectionTitle}>{section.title}</Text>
            )}
            {section.note && (
              <Text style={styles.sectionNote}>{section.note}</Text>
            )}
            <Table section={section} />
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text style={styles.footText}>
            {footNote ?? "Confidential — generated from Dayflow."}
          </Text>
          <Text
            style={styles.footText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
