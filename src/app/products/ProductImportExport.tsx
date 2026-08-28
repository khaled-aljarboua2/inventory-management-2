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
};

type ImportPreview = {
  valid: boolean;
  productRows: number;
  inventoryRows: number;
  productsToCreate: number;
  productsToUpdate: number;
  inventoryToAdjust: number;
  unchangedBalances: number;
  targetLocation: Location | null;
  issues: string[];
};

function fileKey(file: File | null, locationId: string) {
  return file ? `${file.name}-${file.size}-${file.lastModified}-${locationId}` : "";
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
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("اختر ملف Excel بصيغة .xlsx.");
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
      setError("اختر ملف Excel أولًا.");
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
            اختر ملف Excel
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
        ورقة <strong>المنتجات</strong> اختيارية: sku، name، description، minimum_quantity، is_active، unit، barcode. ورقة <strong>المخزون</strong>: sku، available_quantity. الفرع يُختار من الشاشة، ولا تحتاج كتابة رمزه داخل الملف.
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
        <div className={`mt-3 rounded-xl border p-3 text-xs ${preview.valid ? "border-teal-200 bg-teal-50 text-teal-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <div className="flex items-center gap-2 font-bold">
            {preview.valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {preview.valid ? "المعاينة جاهزة للاعتماد" : "المعاينة تحتوي ملاحظات — لم يُنفذ أي تعديل"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-white/80 p-2"><p className="text-slate-500">منتجات جديدة</p><p className="mt-1 font-mono text-base font-bold">{preview.productsToCreate}</p></div>
            <div className="rounded-lg bg-white/80 p-2"><p className="text-slate-500">منتجات محدثة</p><p className="mt-1 font-mono text-base font-bold">{preview.productsToUpdate}</p></div>
            <div className="rounded-lg bg-white/80 p-2"><p className="text-slate-500">تسويات الرصيد</p><p className="mt-1 font-mono text-base font-bold">{preview.inventoryToAdjust}</p></div>
            <div className="rounded-lg bg-white/80 p-2"><p className="text-slate-500">أرصدة بلا تغيير</p><p className="mt-1 font-mono text-base font-bold">{preview.unchangedBalances}</p></div>
          </div>
          {preview.targetLocation ? <p className="mt-3">الفرع: <strong>{preview.targetLocation.name}</strong> ({preview.targetLocation.code})</p> : null}
          {preview.issues.length > 0 ? (
            <ul className="mt-3 list-inside list-disc space-y-1 text-amber-800">
              {preview.issues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
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
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} />
            {summary.inventoryUpdated > 0 ? "اكتمل الاستيراد والتسويات" : "اكتمل الاستيراد دون حركة مخزون"}
          </div>
          <p className="mt-1.5">جديد: {summary.created} · محدّث: {summary.updated} · أرصدة مسوّاة: {summary.inventoryUpdated}</p>
          {summary.inventoryUpdated === 0 ? (
            <p className="mt-1 text-emerald-700">
              لم يُسجل سجل حركة لأن الكمية المستوردة لم تغيّر الرصيد الحالي. استخدم كمية مختلفة عن الرصيد لإنشاء تسوية وحركة مخزون.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
