"use client";

import { Code2, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";

type ReportKind = "inventory" | "low_stock" | "movements";

const REPORTS: Record<ReportKind, string> = {
  inventory: "الرصيد الحالي",
  low_stock: "تنبيهات المخزون",
  movements: "حركة آخر 30 يومًا",
};

const FORMATS = [
  { value: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { value: "csv", label: "CSV", icon: FileText },
  { value: "xml", label: "XML", icon: Code2 },
] as const;

export default function ReportExportPanel({
  locationId,
  locationName,
}: {
  locationId: string;
  locationName: string;
}) {
  const [report, setReport] = useState<ReportKind>("inventory");

  return (
    <section className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-teal-800">
            <Download size={17} />
            إصدار تقرير
          </div>
          <p className="mt-1 text-xs text-teal-700/80">
            يصدر التقرير للفرع المحدد فقط: {locationName}.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="report-kind">نوع التقرير</label>
          <select
            id="report-kind"
            value={report}
            onChange={(event) => setReport(event.target.value as ReportKind)}
            className="h-10 rounded-xl border border-teal-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
          >
            {Object.entries(REPORTS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            {FORMATS.map(({ value, label, icon: Icon }) => (
              <a
                key={value}
                href={`/api/reports/export?report=${report}&format=${value}&location=${encodeURIComponent(locationId)}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-teal-600 px-3 text-xs font-bold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-200"
              >
                <Icon size={15} />
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

