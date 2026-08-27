"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type ImportSummary = {
  created: number;
  updated: number;
  inventoryUpdated: number;
  skipped: number;
  errors: string[];
};

export default function ProductImportExport({ showExport = true }: { showExport?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState("");

  function downloadExport() {
    window.location.assign("/api/products/export");
  }

  function downloadTemplate() {
    window.location.assign("/api/products/export?template=1");
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("اختر ملف Excel بصيغة .xlsx.");
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("حجم الملف أكبر من 10 ميغابايت.");
      event.target.value = "";
      return;
    }

    setIsImporting(true);
    setError("");
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "تعذر استيراد ملف Excel.");
      }

      setSummary(result.summary);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء الاستيراد."
      );
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  }

  return (
    <section
      dir="rtl"
      className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-200">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">استيراد المنتجات والمخزون</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              يحدّث المنتجات والمخزون حسب SKU، ويضيف أي SKU جديد مع وحدته وباركوده.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
          >
            <Download size={15} />
            نموذج Excel
          </button>
          {showExport ? (
            <button
              type="button"
              onClick={downloadExport}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <Download size={15} />
              تصدير البيانات
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isImporting}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
            {isImporting ? "جاري الاستيراد..." : "استيراد Excel"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-teal-100 bg-white/80 px-3 py-2 text-xs leading-5 text-slate-500">
        ورقة <strong>المنتجات</strong>: sku، name، description، minimum_quantity، is_active، unit، barcode. ورقة <strong>المخزون</strong>: sku، location_code، available_quantity.
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {summary ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} />
            اكتمل الاستيراد
          </div>
          <p className="mt-1.5">
            جديد: {summary.created} · محدّث: {summary.updated} · أرصدة محدّثة: {summary.inventoryUpdated} · متجاوز: {summary.skipped}
          </p>
          {summary.errors.length > 0 ? (
            <ul className="mt-2 list-inside list-disc space-y-1 text-amber-700">
              {summary.errors.slice(0, 5).map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
