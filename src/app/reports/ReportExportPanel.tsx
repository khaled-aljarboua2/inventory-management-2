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
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <Download size={19} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">تصدير البيانات</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            إصدار تقارير الموقع المحدد بصيغ جاهزة للاستخدام والمراجعة.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-500">الموقع الحالي</span>
          <span className="truncate font-bold text-slate-800">{locationName}</span>
        </div>
      </div>

      <div className="mt-4">
        <label
          className="mb-1.5 block text-xs font-bold text-slate-700"
          htmlFor="report-kind"
        >
          نوع التقرير
        </label>
        <select
          id="report-kind"
          value={report}
          onChange={(event) => setReport(event.target.value as ReportKind)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
        >
          {Object.entries(REPORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {FORMATS.map(({ value, label, icon: Icon }) => (
          <a
            key={value}
            href={`/api/reports/export?report=${report}&format=${value}&location=${encodeURIComponent(
              locationId
            )}`}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-teal-100 bg-teal-50/70 px-2 text-xs font-bold text-teal-700 transition hover:border-teal-200 hover:bg-teal-100 focus:outline-none focus:ring-4 focus:ring-teal-100"
          >
            <Icon size={15} />
            {label}
          </a>
        ))}
      </div>

      <p className="mt-auto pt-4 text-[11px] leading-5 text-slate-400">
        يتم تصدير التقرير حسب الموقع والصلاحيات الحالية دون تغيير بيانات المخزون.
      </p>
    </section>
  );
}
