"use client";

import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Location = {
  id: string;
  name: string;
  code: string;
};

type ImportSummary = {
  created: number;
  updated: number;
  inventoryUpdated: number;
  skipped: number;
  errors: string[];
  settledRows: ImportReportRow[];
  unsettledRows: ImportReportRow[];
};

type ImportReportRow = {
  status: "settled" | "unchanged" | "skipped";
  rowNumber: number;
  source: string;
  productName: string;
  sku: string;
  barcode: string;
  daftraProductReference: string;
  unitName: string;
  importedQuantity: number | null;
  programQuantity: number | null;
  beforeQuantity: number | null;
  afterQuantity: number | null;
  difference: number | null;
  reason: string;
};

type ImportPreview = {
  valid: boolean;
  source: "Daftra Products Export" | "Daftra Stocktaking Report" | "ملف النظام";
  productRows: number;
  inventoryRows: number;
  productsToCreate: number;
  productsToUpdate: number;
  inventoryToAdjust: number;
  unchangedBalances: number;
  skippedRows: number;
  targetLocation: Location | null;
  issues: string[];
  notices: Array<{
    level: "info" | "warning";
    text: string;
  }>;
};

function fileKey(file: File | null, locationId: string) {
  return file ? `${file.name}-${file.size}-${file.lastModified}-${locationId}` : "";
}

function csvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function exportSettlementReport(
  kind: "settled" | "unsettled",
  rows: ImportReportRow[]
) {
  const title = kind === "settled" ? "تقرير الصفوف التي تمت تسويتها" : "تقرير الصفوف التي لم تتم تسويتها";
  const headers = [
    "الحالة", "الصف", "المصدر", "اسم المنتج", "SKU / الرقم التسلسلي", "الباركود", "رقم دفترة",
    "الوحدة", "كمية الملف", "كمية البرنامج", "الرصيد قبل", "الرصيد بعد", "فرق التسوية", "السبب / النتيجة",
  ];
  const values: Array<Array<string | number | null>> = rows.map((row) => [
    row.status === "settled" ? "تمت التسوية" : row.status === "unchanged" ? "مطابق - بلا حركة" : "لم تتم التسوية",
    row.rowNumber, row.source, row.productName, row.sku, row.barcode, row.daftraProductReference,
    row.unitName, row.importedQuantity, row.programQuantity, row.beforeQuantity, row.afterQuantity, row.difference, row.reason,
  ]);
  const lines: Array<Array<string | number | null>> = [[title], [`تاريخ الإصدار: ${new Date().toLocaleString("ar-SA")}`], [], headers, ...values];
  const csv = lines
    .map((line) => line.map(csvValue).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `${kind === "settled" ? "تمت-التسوية" : "لم-تتم-التسوية"}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export default function ProductImportExport({
  showExport = true,
  locations,
  selectedLocationId,
}: {
  showExport?: boolean;
  locations: Location[];
  selectedLocationId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetLocationId, setTargetLocationId] = useState(selectedLocationId);
  const [isWorking, setIsWorking] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewKey, setPreviewKey] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState("");

  const activeFileKey = fileKey(selectedFile, targetLocationId);
  const canApply = Boolean(selectedFile && preview?.valid && previewKey === activeFileKey);
  const previewHasChanges = Boolean(
    preview &&
      preview.productsToCreate + preview.productsToUpdate + preview.inventoryToAdjust > 0
  );
  const summaryHasChanges = Boolean(
    summary && summary.created + summary.updated + summary.inventoryUpdated + summary.settledRows.length > 0
  );

  function resetResult() {
    setPreview(null);
    setPreviewKey("");
    setSummary(null);
    setError("");
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setError("اختر ملف Excel بصيغة .xlsx أو CSV.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("حجم الملف أكبر من 10 ميغابايت.");
      return;
    }

    setSelectedFile(file);
    resetResult();
  }

  async function sendFile(mode: "preview" | "apply") {
    if (!selectedFile) {
      setError("اختر ملف Excel أو CSV أولًا.");
      return;
    }

    setIsWorking(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("target_location_id", targetLocationId);

      const response = await fetch(`/api/products/import?mode=${mode}`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (result.preview) {
        setPreview(result.preview as ImportPreview);
        setPreviewKey(activeFileKey);
      }

      if (!response.ok) {
        throw new Error(result.error ?? "تعذر فحص ملف Excel.");
      }

      if (mode === "preview") {
        return;
      }

      setSummary(result.summary as ImportSummary);
      setSelectedFile(null);
      setPreview(null);
      setPreviewKey("");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء الاستيراد."
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section dir="rtl" className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm shadow-teal-200">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">استيراد آمن للمنتجات والمخزون</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              لا يتم تعديل أي منتج أو رصيد عند رفع الملف؛ تظهر المعاينة أولًا ثم تعتمدها بنفسك.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/products/export?template=1&location=${encodeURIComponent(targetLocationId)}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
          >
            <Download size={15} />
            نموذج Excel
          </a>
          {showExport ? (
            <a
              href={`/api/products/export?location=${encodeURIComponent(targetLocationId)}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              <Download size={15} />
              تصدير بيانات الفرع
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isWorking}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={15} />
            اختر ملف Excel أو CSV
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl border border-teal-100 bg-white/80 p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <label htmlFor="import-location" className="text-xs font-bold text-slate-700">فرع المخزون المستهدف</label>
          <select
            id="import-location"
            value={targetLocationId}
            onChange={(event) => {
              setTargetLocationId(event.target.value);
              resetResult();
            }}
            disabled={locations.length <= 1 || isWorking}
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-default"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} ({location.code})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">آلية واضحة وآمنة</p>
          <p className="mt-1">1. اختر الفرع  2. ارفع الملف  3. راجع المعاينة  4. اعتمد الاستيراد</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-teal-100 bg-white/80 px-3 py-2 text-xs leading-5 text-slate-500">
        يدعم ملف النظام وملفات دفترة مباشرة: <strong>تصدير المنتجات</strong> للإضافة أو التحديث، و<strong>تقرير الجرد</strong> للتسوية. يُكتشف النوع من العناوين، والفرع يُختار من الشاشة.
      </div>

      {selectedFile ? (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="truncate text-xs font-medium text-slate-700">الملف المختار: {selectedFile.name}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => sendFile("preview")}
              disabled={isWorking}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-700 transition hover:bg-teal-100 disabled:opacity-60"
            >
              {isWorking ? <LoaderCircle size={15} className="animate-spin" /> : <Eye size={15} />}
              معاينة الملف
            </button>
            {canApply ? (
              <button
                type="button"
                onClick={() => sendFile("apply")}
                disabled={isWorking}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                <ShieldCheck size={15} />
                اعتماد الاستيراد
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className={`mt-3 rounded-xl border p-3 text-xs ${previewHasChanges ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`}>
          <div className="flex items-center gap-2 font-bold">
            {previewHasChanges ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {previewHasChanges
              ? preview.issues.length > 0
                ? "توجد عمليات جاهزة للإضافة — ستُتجاهل الصفوف ذات الملاحظات"
                : "توجد عمليات جاهزة للإضافة والاعتماد"
              : preview.valid
                ? "لا توجد إضافات أو تسويات جديدة — البيانات مطابقة للمسجل"
                : "لم تتم الإضافة — لا توجد صفوف آمنة للاعتماد"}
          </div>
          <p className="mt-2 text-slate-600">نوع الملف: <strong>{preview.source}</strong></p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <div className={`rounded-lg border p-2 ${preview.productsToCreate > 0 ? "border-emerald-200 bg-emerald-100/70" : "border-red-200 bg-red-100/70"}`}><p className="text-slate-600">منتجات جديدة</p><p className="mt-1 font-mono text-base font-bold">{preview.productsToCreate}</p></div>
            <div className={`rounded-lg border p-2 ${preview.productsToUpdate > 0 ? "border-emerald-200 bg-emerald-100/70" : "border-red-200 bg-red-100/70"}`}><p className="text-slate-600">منتجات محدثة</p><p className="mt-1 font-mono text-base font-bold">{preview.productsToUpdate}</p></div>
            <div className={`rounded-lg border p-2 ${preview.inventoryToAdjust > 0 ? "border-emerald-200 bg-emerald-100/70" : "border-red-200 bg-red-100/70"}`}><p className="text-slate-600">تسويات الرصيد</p><p className="mt-1 font-mono text-base font-bold">{preview.inventoryToAdjust}</p></div>
            <div className="rounded-lg bg-white/80 p-2"><p className="text-slate-500">أرصدة بلا تغيير</p><p className="mt-1 font-mono text-base font-bold">{preview.unchangedBalances}</p></div>
            <div className={`rounded-lg border p-2 ${preview.skippedRows === 0 ? "border-emerald-200 bg-emerald-100/70" : "border-red-200 bg-red-100/70"}`}><p className="text-slate-600">صفوف متجاهلة</p><p className="mt-1 font-mono text-base font-bold">{preview.skippedRows}</p></div>
          </div>
          {preview.targetLocation ? <p className="mt-3">الفرع: <strong>{preview.targetLocation.name}</strong> ({preview.targetLocation.code})</p> : null}
          {preview.issues.length > 0 ? (
            <ul className="mt-3 list-inside list-disc space-y-1 text-red-700">
              {preview.issues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          ) : null}
          {preview.notices.length > 0 ? (
            <div className="mt-3 space-y-2">
              {preview.notices.map((notice) => (
                <p
                  key={`${notice.level}-${notice.text}`}
                  className={`rounded-lg border px-3 py-2 ${
                    notice.level === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-sky-200 bg-sky-50 text-sky-800"
                  }`}
                >
                  {notice.text}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {summary ? (
        <div className={`mt-3 rounded-xl border px-3 py-3 text-xs ${summaryHasChanges ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>
          <div className="flex items-center gap-2 font-semibold">
            {summaryHasChanges ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {summaryHasChanges ? "تم اعتماد الملف وظهرت نتائج التسوية" : "لم تتم إضافة أو تسوية أي سجل"}
          </div>
          <p className="mt-1.5">جديد: {summary.created} · محدّث: {summary.updated} · أرصدة مسوّاة: {summary.inventoryUpdated} · متجاهل: {summary.skipped}</p>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white/80 p-3 text-slate-700">
            <p className="font-bold">تقارير نتيجة الاعتماد</p>
            <p className="mt-1 text-slate-500">الصفوف غير المقبولة لا تدخل في حركة المخزون؛ يظهر سبب كل صف في تقريرها.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportSettlementReport("settled", summary.settledRows)}
                disabled={summary.settledRows.length === 0}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={15} />
                تصدير ما تمت تسويته ({summary.settledRows.length})
              </button>
              <button
                type="button"
                onClick={() => exportSettlementReport("unsettled", summary.unsettledRows)}
                disabled={summary.unsettledRows.length === 0}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={15} />
                تصدير ما لم تتم تسويته ({summary.unsettledRows.length})
              </button>
              <a
                href="/inventory/transactions"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                عرض حركة المخزون
              </a>
            </div>
          </div>
          {!summaryHasChanges ? (
            <p className="mt-1 text-red-700">
              لم يُسجل سجل حركة لأن الكمية المستوردة لم تغيّر الرصيد الحالي. استخدم كمية مختلفة عن الرصيد لإنشاء تسوية وحركة مخزون.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
