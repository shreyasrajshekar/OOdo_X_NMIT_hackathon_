"use client";

import React from "react";
import type { ReportProps } from "./report-document";

/**
 * Renders a report to PDF in the browser and hands it to the user.
 *
 * @react-pdf is heavy and pulls in a renderer that only makes sense on the
 * client, so both it and the document are imported at click time rather than
 * with the page.
 */
export async function downloadReportPdf(
  props: ReportProps,
  filename: string,
): Promise<void> {
  const [{ pdf }, { ReportDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./report-document"),
  ]);

  const blob = await pdf(<ReportDocument {...props} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Same download dance for the CSV exports, so both paths agree. */
export function downloadCsv(
  header: string[],
  rows: (string | number)[][],
  filename: string,
): void {
  const cell = (value: string | number) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const body = [header.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  const blob = new Blob([body.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Timestamp line every report carries, so a printed copy dates itself. */
export function generatedAt(): string {
  return new Date().toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
