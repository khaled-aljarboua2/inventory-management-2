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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserPlus size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
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
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
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

            <Field
              label="كلمة المرور"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                الدور
              </label>

              <select
                value={roleId}
                onChange={(e) =>
                  setRoleId(e.target.value)
                }
                disabled={loading}
                required
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                الموقع
              </label>

              <select
                value={locationId}
                onChange={(e) =>
                  setLocationId(
                    e.target.value
                  )
                }
                disabled={loading}
                required
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div>
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
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}