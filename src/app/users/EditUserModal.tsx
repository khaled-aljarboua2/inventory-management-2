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
  const [
    fullName,
    setFullName,
  ] = useState(
    user.full_name
  );

  const [
    username,
    setUsername,
  ] = useState(
    user.username ?? ""
  );

  const [
    email,
    setEmail,
  ] = useState(
    user.email
  );

  const [
    phone,
    setPhone,
  ] = useState(
    user.phone ?? ""
  );

  const [
    roleId,
    setRoleId,
  ] = useState(
    user.role_id ?? ""
  );

  const [
    locationId,
    setLocationId,
  ] = useState(
    user.location_id ?? ""
  );

  const [
    isActive,
    setIsActive,
  ] = useState(
    user.is_active
  );

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result =
        await updateUser({
          userId: user.id,
          full_name:
            fullName,
          email,
          phone,
          username,
          password,
          role_id:
            roleId,
          location_id:
            locationId,
          is_active:
            isActive,
        });

      if (!result.success) {
        setError(
          result.error ??
            "تعذر تحديث المستخدم."
        );

        setSaving(false);
        return;
      }

      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع."
      );

      setSaving(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="
        fixed inset-0 z-[70]
        flex items-center justify-center
        bg-slate-950/50
        p-4
        backdrop-blur-sm
      "
    >
      <div
        className="
          flex max-h-[90vh]
          w-full max-w-2xl
          flex-col
          overflow-hidden
          rounded-3xl
          bg-white
          shadow-2xl
        "
      >
        {/* Header */}

        <div
          className="
            flex items-center
            justify-between
            border-b border-slate-100
            px-6 py-5
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-11 w-11
                items-center justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
              "
            >
              <UserCog
                size={21}
              />
            </div>

            <div>
              <h2
                className="
                  text-lg font-bold
                  text-slate-900
                "
              >
                تعديل المستخدم
              </h2>

              <p
                className="
                  mt-1 text-xs
                  text-slate-400
                "
              >
                تعديل بيانات الحساب
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              rounded-xl p-2
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
              disabled:opacity-50
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="
            overflow-y-auto
            px-6 py-6
          "
        >
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            {/* Full name */}

            <Field
              label="الاسم الكامل"
              value={fullName}
              onChange={
                setFullName
              }
              required
            />

            {/* Username */}

            <Field
              label="اسم المستخدم"
              value={username}
              onChange={
                setUsername
              }
              placeholder="اختياري"
            />

            {/* Email */}

            <Field
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={
                setEmail
              }
              required
            />

            {/* Phone */}

            <Field
              label="رقم الجوال"
              value={phone}
              onChange={
                setPhone
              }
              placeholder="اختياري"
            />

            {/* Role */}

            <div>
              <label
                className="
                  mb-2 block
                  text-sm font-semibold
                  text-slate-700
                "
              >
                الدور
              </label>

              <select
                value={roleId}
                onChange={(event) =>
                  setRoleId(
                    event.target.value
                  )
                }
                required
                disabled={saving}
                className="
                  h-11 w-full
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-3
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:bg-slate-50
                "
              >
                <option value="">
                  اختر الدور
                </option>

                {roles.map(
                  (role) => (
                    <option
                      key={role.id}
                      value={role.id}
                    >
                      {role.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Location */}

            <div>
              <label
                className="
                  mb-2 block
                  text-sm font-semibold
                  text-slate-700
                "
              >
                الموقع
              </label>

              <select
                value={locationId}
                onChange={(event) =>
                  setLocationId(
                    event.target.value
                  )
                }
                required
                disabled={saving}
                className="
                  h-11 w-full
                  rounded-xl
                  border border-slate-200
                  bg-white
                  px-3
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:bg-slate-50
                "
              >
                <option value="">
                  اختر الموقع
                </option>

                {locations.map(
                  (location) => (
                    <option
                      key={
                        location.id
                      }
                      value={
                        location.id
                      }
                    >
                      {location.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Password */}

            <div className="sm:col-span-2">
              <label
                className="
                  mb-2 block
                  text-sm font-semibold
                  text-slate-700
                "
              >
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
                  className="
                    h-11 w-full
                    rounded-xl
                    border border-slate-200
                    bg-slate-50
                    pr-4 pl-11
                    text-sm
                    text-slate-700
                    outline-none
                    transition
                    focus:border-blue-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-50
                    disabled:opacity-60
                  "
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  disabled={saving}
                  className="
                    absolute
                    left-3 top-1/2
                    -translate-y-1/2
                    text-slate-400
                    transition
                    hover:text-slate-700
                    disabled:opacity-50
                  "
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                    />
                  ) : (
                    <Eye
                      size={18}
                    />
                  )}
                </button>
              </div>

              <p
                className="
                  mt-2 text-xs
                  text-slate-400
                "
              >
                اترك الحقل فارغًا إذا كنت لا تريد
                تغيير كلمة المرور.
              </p>
            </div>

            {/* Status */}

            <div
              className="
                sm:col-span-2
                flex items-center
                justify-between
                rounded-2xl
                border border-slate-200
                bg-slate-50
                px-4 py-4
              "
            >
              <div>
                <p
                  className="
                    text-sm font-semibold
                    text-slate-700
                  "
                >
                  حالة الحساب
                </p>

                <p
                  className="
                    mt-1 text-xs
                    text-slate-400
                  "
                >
                  المستخدم يستطيع تسجيل الدخول
                  عندما يكون الحساب نشطًا.
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
                className={`
                  relative
                  h-7 w-12
                  rounded-full
                  transition
                  ${
                    isActive
                      ? "bg-emerald-500"
                      : "bg-slate-300"
                  }
                `}
              >
                <span
                  className={`
                    absolute
                    top-1
                    h-5 w-5
                    rounded-full
                    bg-white
                    shadow
                    transition
                    ${
                      isActive
                        ? "right-1"
                        : "right-6"
                    }
                  `}
                />
              </button>
            </div>
          </div>

          {/* Error */}

          {error && (
            <div
              className="
                mt-5
                rounded-xl
                border border-red-200
                bg-red-50
                px-4 py-3
                text-sm
                text-red-700
              "
            >
              {error}
            </div>
          )}

          {/* Footer */}

          <div
            className="
              mt-6 flex gap-3
            "
          >
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="
                flex-1
                rounded-xl
                border border-slate-200
                px-5 py-3
                text-sm font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:opacity-50
              "
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving}
              className="
                flex-1
                rounded-xl
                bg-slate-900
                px-5 py-3
                text-sm font-semibold
                text-white
                transition
                hover:bg-blue-600
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {saving ? (
                <span
                  className="
                    flex items-center
                    justify-center gap-2
                  "
                >
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
      <label
        className="
          mb-2 block
          text-sm font-semibold
          text-slate-700
        "
      >
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
        placeholder={
          placeholder
        }
        required={required}
        className="
          h-11 w-full
          rounded-xl
          border border-slate-200
          bg-slate-50
          px-4
          text-sm
          text-slate-700
          outline-none
          transition
          placeholder:text-slate-400
          focus:border-blue-400
          focus:bg-white
          focus:ring-4
          focus:ring-blue-50
        "
      />
    </div>
  );
}