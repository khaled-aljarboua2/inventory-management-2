"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  X,
  ShieldCheck,
  Search,
  Check,
  Ban,
  RotateCcw,
  Loader2,
} from "lucide-react";

import {
  getUserPermissions,
  saveUserPermissions,
} from "./actions";

type Permission = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

type UserPermission = {
  permission_id: string;
  allowed: boolean;
};

type Mode = "role" | "allow" | "deny";

type Props = {
  userId: string;
  userName: string;
  onClose: () => void;
};

export default function UserPermissionsModal({
  userId,
  userName,
  onClose,
}: Props) {
  const [permissions, setPermissions] =
    useState<Permission[]>([]);

  const [rolePermissionIds, setRolePermissionIds] =
    useState<string[]>([]);

  const [userPermissions, setUserPermissions] =
    useState<UserPermission[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [changes, setChanges] =
    useState<Record<string, Mode>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const result = await getUserPermissions(userId);

      if (!result.success) {
        setError(
          result.error ?? "تعذر تحميل الصلاحيات."
        );
        setLoading(false);
        return;
      }

      setPermissions(result.permissions ?? []);

      setRolePermissionIds(
        result.rolePermissionIds ?? []
      );

      setUserPermissions(
        result.userPermissions ?? []
      );

      setLoading(false);
    }

    load();
  }, [userId]);

  const directMap = useMemo(() => {
    return new Map(
      userPermissions.map((item) => [
        item.permission_id,
        item.allowed,
      ])
    );
  }, [userPermissions]);

  function getMode(permissionId: string): Mode {
    if (changes[permissionId]) {
      return changes[permissionId];
    }

    if (directMap.has(permissionId)) {
      return directMap.get(permissionId)
        ? "allow"
        : "deny";
    }

    return "role";
  }

  function setMode(
    permissionId: string,
    mode: Mode
  ) {
    setChanges((current) => ({
      ...current,
      [permissionId]: mode,
    }));
  }

  const filteredPermissions =
    permissions.filter((permission) => {
      const query = search.trim().toLowerCase();

      if (!query) return true;

      return (
        permission.name
          .toLowerCase()
          .includes(query) ||
        permission.code
          .toLowerCase()
          .includes(query) ||
        (permission.description ?? "")
          .toLowerCase()
          .includes(query)
      );
    });

  async function handleSave() {
    setSaving(true);
    setError("");

    const payload = permissions.map(
      (permission) => ({
        permission_id: permission.id,
        mode: getMode(permission.id),
      })
    );

    const result = await saveUserPermissions(
      userId,
      payload
    );

    if (!result.success) {
      setError(
        result.error ??
          "تعذر حفظ الصلاحيات."
      );
      setSaving(false);
      return;
    }

    onClose();
    window.location.reload();
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

        {/* =====================================================
            الرأس
        ====================================================== */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-4 sm:px-6 sm:py-5">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <ShieldCheck size={21} />
            </div>

            <div className="min-w-0">

              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900">
                إدارة الصلاحيات
              </h2>

              <p className="mt-1 truncate text-xs text-slate-400">
                المستخدم:
                <span className="mr-1 font-semibold text-slate-600">
                  {userName}
                </span>
              </p>

            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>

        </div>

        {/* =====================================================
            البحث
        ====================================================== */}

        <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">

          <div className="relative">

            <Search
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="ابحث عن صلاحية..."
              className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
            />

          </div>

        </div>

        {/* =====================================================
            مفتاح الحالات
        ====================================================== */}

        <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-6">

          <Legend
            icon={<ShieldCheck size={14} />}
            label="من الدور"
            className="bg-teal-50 text-teal-700"
          />

          <Legend
            icon={<Check size={14} />}
            label="سماح مباشر"
            className="bg-emerald-50 text-emerald-700"
          />

          <Legend
            icon={<Ban size={14} />}
            label="منع مباشر"
            className="bg-red-50 text-red-700"
          />

        </div>

        {/* =====================================================
            الخطأ
        ====================================================== */}

        {error && (
          <div className="mx-4 mt-4 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700 sm:mx-6">
            {error}
          </div>
        )}

        {/* =====================================================
            المحتوى
        ====================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">

          {loading ? (

            <div className="flex min-h-60 items-center justify-center">

              <div className="flex flex-col items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">

                  <Loader2
                    size={25}
                    className="animate-spin"
                  />

                </div>

                <p className="text-sm text-slate-400">
                  جاري تحميل الصلاحيات...
                </p>

              </div>

            </div>

          ) : (

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

              {/* =================================================
                  الجدول
              ================================================== */}

              <div className="overflow-x-auto">

                <table className="w-full min-w-[850px] text-right">

                  <thead>

                    <tr className="border-b border-slate-100 bg-slate-50/80">

                      <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                        الصلاحية
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                        صلاحية الدور
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                        حالة المستخدم
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                        الإجراء
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredPermissions.length === 0 ? (

                      <tr>

                        <td
                          colSpan={4}
                          className="px-5 py-16 text-center"
                        >

                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                            <ShieldCheck size={24} />
                          </div>

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            لا توجد صلاحيات
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            لم يتم العثور على صلاحيات مطابقة للبحث.
                          </p>

                        </td>

                      </tr>

                    ) : (

                      filteredPermissions.map(
                        (permission) => {

                          const mode =
                            getMode(
                              permission.id
                            );

                          const hasRole =
                            rolePermissionIds.includes(
                              permission.id
                            );

                          return (

                            <tr
                              key={permission.id}
                              className="transition-colors hover:bg-slate-50/60"
                            >

                              {/* الصلاحية */}

                              <td className="px-5 py-4">

                                <div>

                                  <p className="font-semibold text-slate-800">
                                    {permission.name}
                                  </p>

                                  <p className="mt-1 inline-flex rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-400">
                                    {permission.code}
                                  </p>

                                  {permission.description && (
                                    <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
                                      {permission.description}
                                    </p>
                                  )}

                                </div>

                              </td>

                              {/* صلاحية الدور */}

                              <td className="px-5 py-4">

                                {hasRole ? (

                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">

                                    <ShieldCheck
                                      size={13}
                                    />

                                    موجودة

                                  </span>

                                ) : (

                                  <span className="text-xs text-slate-400">
                                    غير موجودة
                                  </span>

                                )}

                              </td>

                              {/* حالة المستخدم */}

                              <td className="px-5 py-4">

                                {mode === "allow" && (

                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">

                                    <Check size={13} />

                                    مسموح

                                  </span>

                                )}

                                {mode === "deny" && (

                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">

                                    <Ban size={13} />

                                    ممنوع

                                  </span>

                                )}

                                {mode === "role" && (

                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">

                                    <RotateCcw
                                      size={13}
                                    />

                                    حسب الدور

                                  </span>

                                )}

                              </td>

                              {/* الإجراء */}

                              <td className="px-5 py-4">

                                <select
                                  value={mode}
                                  onChange={(event) =>
                                    setMode(
                                      permission.id,
                                      event.target
                                        .value as Mode
                                    )
                                  }
                                  disabled={saving}
                                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                >

                                  <option value="role">
                                    حسب الدور
                                  </option>

                                  <option value="allow">
                                    سماح مباشر
                                  </option>

                                  <option value="deny">
                                    منع مباشر
                                  </option>

                                </select>

                              </td>

                            </tr>

                          );
                        }
                      )

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </div>

        {/* =====================================================
            الأزرار
        ====================================================== */}

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:px-6 sm:py-5">

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="flex-1 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-100 transition hover:bg-teal-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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

              "حفظ الصلاحيات"

            )}

          </button>

        </div>

      </div>
    </div>
  );
}

/* ============================================================
   Legend
============================================================ */

function Legend({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}