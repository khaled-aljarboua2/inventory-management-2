"use client";

import { useState } from "react";
import {
  UserPlus,
  X,
} from "lucide-react";
import { createUser } from "./actions";

type Role = {
  id: string;
  name: string;
  description: string | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
  type: string;
};

export default function UserModal({
  roles,
  locations,
  onClose,
}: {
  roles: Role[];
  locations: Location[];
  onClose: () => void;
}) {
  const [fullName, setFullName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [roleId, setRoleId] =
    useState("");

  const [locationId, setLocationId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result =
        await createUser({
          full_name: fullName,
          email,
          phone,
          username,
          password,
          role_id: roleId,
          location_id: locationId,
        });

      if (!result.success) {
        setError(
          result.error ??
            "تعذر إنشاء المستخدم."
        );
        return;
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* =====================================================
            Header
        ====================================================== */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <UserPlus size={21} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
                مستخدم جديد
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                إنشاء حساب وربطه بدور وموقع.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* =====================================================
            Form
        ====================================================== */}

        <form
          onSubmit={handleSubmit}
          className="min-h-0 overflow-y-auto space-y-6 p-4 sm:p-6"
        >
          {/* Error */}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />

              <span className="min-w-0 break-words">
                {error}
              </span>
            </div>
          )}

          {/* Basic information */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                بيانات المستخدم
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                أدخل البيانات الأساسية للحساب.
              </p>
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field
                label="الاسم الكامل"
                value={fullName}
                onChange={setFullName}
                placeholder="اسم المستخدم"
              />

              <Field
                label="اسم المستخدم"
                value={username}
                onChange={setUsername}
                placeholder="username"
              />

              <Field
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="user@example.com"
              />

              <Field
                label="رقم الجوال"
                value={phone}
                onChange={setPhone}
                placeholder="05xxxxxxxx"
              />

              <div className="min-w-0 md:col-span-2">
                <Field
                  label="كلمة المرور"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {/* Access */}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                الصلاحيات والوصول
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                حدد الدور والموقع المرتبطين بالمستخدم.
              </p>
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              {/* الدور */}

              <SelectField label="الدور">
                <select
                  value={roleId}
                  onChange={(e) =>
                    setRoleId(
                      e.target.value
                    )
                  }
                  disabled={loading}
                  required
                  className="select"
                >
                  <option value="">
                    اختر الدور
                  </option>

                  {roles.map((role) => (
                    <option
                      key={role.id}
                      value={role.id}
                    >
                      {role.name}
                    </option>
                  ))}
                </select>
              </SelectField>

              {/* الموقع */}

              <SelectField label="الموقع">
                <select
                  value={locationId}
                  onChange={(e) =>
                    setLocationId(
                      e.target.value
                    )
                  }
                  disabled={loading}
                  required
                  className="select"
                >
                  <option value="">
                    اختر الموقع
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name} —{" "}
                        {location.code}
                      </option>
                    )
                  )}
                </select>
              </SelectField>
            </div>
          </div>

          {/* Buttons */}

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-100 transition hover:bg-teal-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "جاري الإنشاء..."
                : "إنشاء المستخدم"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   Input Field
============================================================ */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        placeholder={placeholder}
        required={
          label !== "رقم الجوال" &&
          label !== "اسم المستخدم"
        }
        className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

/* ============================================================
   Select Field
============================================================ */

function SelectField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}