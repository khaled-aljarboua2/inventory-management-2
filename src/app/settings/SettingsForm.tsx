"use client";

import { useState } from "react";
import {
  Save,
  ShieldCheck,
  PackageCheck,
  Languages,
  Clock3,
  Loader2,
} from "lucide-react";

import { updateSettings } from "./actions";

type SettingsData = {
  id: string;
  company_id: string | null;
  require_transfer_approval: boolean | null;
  allow_negative_stock: boolean | null;
  default_language: string | null;
  timezone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function SettingsForm({
  settings,
  canUpdate,
}: {
  settings: SettingsData;
  canUpdate: boolean;
}) {
  const [requireTransferApproval, setRequireTransferApproval] =
    useState(
      settings.require_transfer_approval ?? true
    );

  const [allowNegativeStock, setAllowNegativeStock] =
    useState(
      settings.allow_negative_stock ?? false
    );

  const [defaultLanguage, setDefaultLanguage] =
    useState(
      settings.default_language ?? "ar"
    );

  const [timezone, setTimezone] =
    useState(
      settings.timezone ?? "Asia/Riyadh"
    );

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canUpdate) {
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result =
        await updateSettings({
          require_transfer_approval:
            requireTransferApproval,
          allow_negative_stock:
            allowNegativeStock,
          default_language:
            defaultLanguage,
          timezone,
        });

      if (!result.success) {
        setError(
          result.error ??
            "تعذر حفظ الإعدادات."
        );
        return;
      }

      setMessage(
        "تم حفظ الإعدادات بنجاح."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 p-6"
    >
      {!canUpdate && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          لديك صلاحية عرض الإعدادات فقط، ولا تملك صلاحية تعديلها.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* ======================================================
          سياسات المخزون
      ======================================================= */}

      <div>
        <div className="mb-4">
          <h3 className="font-bold text-slate-900">
            سياسات النظام
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            إعداد قواعد العمل الأساسية للمخزون والنقل.
          </p>
        </div>

        <div className="space-y-3">
          <ToggleRow
            icon={<ShieldCheck size={19} />}
            title="طلب موافقة على عمليات النقل"
            description="يتطلب طلب النقل موافقة قبل اعتماده."
            checked={requireTransferApproval}
            disabled={!canUpdate || loading}
            onChange={setRequireTransferApproval}
          />

          <ToggleRow
            icon={<PackageCheck size={19} />}
            title="السماح بالمخزون السالب"
            description="السماح بإجراء عمليات تؤدي إلى رصيد مخزون أقل من صفر."
            checked={allowNegativeStock}
            disabled={!canUpdate || loading}
            onChange={setAllowNegativeStock}
          />
        </div>
      </div>

      {/* ======================================================
          اللغة والمنطقة
      ======================================================= */}

      <div className="border-t border-slate-100 pt-6">
        <div className="mb-4">
          <h3 className="font-bold text-slate-900">
            اللغة والمنطقة
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            تحديد اللغة والمنطقة الزمنية الافتراضية للنظام.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              اللغة الافتراضية
            </label>

            <div className="relative">
              <Languages
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={defaultLanguage}
                onChange={(event) =>
                  setDefaultLanguage(
                    event.target.value
                  )
                }
                disabled={!canUpdate || loading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="ar">
                  العربية
                </option>

                <option value="en">
                  English
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              المنطقة الزمنية
            </label>

            <div className="relative">
              <Clock3
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={timezone}
                onChange={(event) =>
                  setTimezone(
                    event.target.value
                  )
                }
                disabled={!canUpdate || loading}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="Asia/Riyadh">
                  الرياض — Asia/Riyadh
                </option>

                <option value="UTC">
                  UTC
                </option>

                <option value="Europe/London">
                  لندن — Europe/London
                </option>

                <option value="America/New_York">
                  نيويورك — America/New_York
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          الحفظ
      ======================================================= */}

      {canUpdate && (
        <div className="flex justify-end border-t border-slate-100 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            {loading
              ? "جاري الحفظ..."
              : "حفظ الإعدادات"}
          </button>
        </div>
      )}
    </form>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-5 rounded-2xl border p-4 transition ${
        disabled
          ? "cursor-not-allowed border-slate-100 bg-slate-50/70"
          : "cursor-pointer border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/30"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            checked
              ? "bg-teal-50 text-teal-600"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.checked)
          }
          className="peer sr-only"
        />

        <div
          className={`h-6 w-11 rounded-full transition ${
            checked
              ? "bg-teal-600"
              : "bg-slate-300"
          }`}
        />

        <div
          className={`pointer-events-none absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            checked
              ? "right-1"
              : "right-6"
          }`}
        />
      </div>
    </label>
  );
}
