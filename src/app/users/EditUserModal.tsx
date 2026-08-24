"use client";

import {
  useState,
} from "react";

import {
  X,
  UserCog,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  updateUser,
} from "./actions";

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

type User = {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  role_id: string | null;
  location_id: string | null;
  is_active: boolean;
};

type Props = {
  user: User;
  roles: Role[];
  locations: Location[];
  onClose: () => void;
};

export default function EditUserModal({
  user,
  roles,
  locations,
  onClose,
}: Props) {
  const [fullName, setFullName] =
    useState(user.full_name);

  const [username, setUsername] =
    useState(user.username ?? "");

  const [email, setEmail] =
    useState(user.email);

  const [phone, setPhone] =
    useState(user.phone ?? "");

  const [roleId, setRoleId] =
    useState(user.role_id ?? "");

  const [locationId, setLocationId] =
    useState(user.location_id ?? "");

  const [isActive, setIsActive] =
    useState(user.is_active);

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const result = await updateUser({
        userId: user.id,
        full_name: fullName,
        email,
        phone,
        username,
        password,
        role_id: roleId,
        location_id: locationId,
        is_active: isActive,
      });

      if (!result.success) {
        setError(
          result.error ??
            "تعذر تحديث المستخدم."
        );
        return;
      }

      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}

        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <UserCog size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                تعديل المستخدم
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                تحديث بيانات الحساب والصلاحيات.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto p-6"
        >
          {/* بيانات الحساب */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                بيانات الحساب
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                المعلومات الأساسية للمستخدم.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="الاسم الكامل"
                value={fullName}
                onChange={setFullName}
                required
              />

              <Field
                label="اسم المستخدم"
                value={username}
                onChange={setUsername}
                placeholder="اختياري"
              />

              <Field
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={setEmail}
                required
              />

              <Field
                label="رقم الجوال"
                value={phone}
                onChange={setPhone}
                placeholder="اختياري"
              />

              {/* كلمة المرور */}

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  كلمة مرور جديدة
                </label>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    placeholder="اتركها فارغة للإبقاء على كلمة المرور الحالية"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 pl-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    disabled={saving}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  اترك الحقل فارغًا إذا كنت لا تريد تغيير كلمة المرور.
                </p>
              </div>
            </div>
          </div>

          {/* الوصول والصلاحيات */}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                الوصول والصلاحيات
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                تحديد الدور والموقع وحالة الحساب.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* الدور */}

              <SelectField label="الدور">
                <select
                  value={roleId}
                  onChange={(event) =>
                    setRoleId(
                      event.target.value
                    )
                  }
                  required
                  disabled={saving}
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
                  onChange={(event) =>
                    setLocationId(
                      event.target.value
                    )
                  }
                  required
                  disabled={saving}
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

              {/* الحالة */}

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      حالة الحساب
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      المستخدم يستطيع تسجيل الدخول عندما يكون الحساب نشطًا.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsActive(
                        !isActive
                      )
                    }
                    disabled={saving}
                    aria-label={
                      isActive
                        ? "تعطيل الحساب"
                        : "تفعيل الحساب"
                    }
                    className={`relative h-7 w-12 rounded-full transition ${
                      isActive
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                        isActive
                          ? "right-1"
                          : "right-6"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Footer */}

          <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  جاري الحفظ...
                </span>
              ) : (
                "حفظ التعديلات"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   Field
============================================================ */

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
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
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}