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

type Mode =
  | "role"
  | "allow"
  | "deny";

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

  const [
    rolePermissionIds,
    setRolePermissionIds,
  ] = useState<string[]>([]);

  const [
    userPermissions,
    setUserPermissions,
  ] = useState<UserPermission[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [changes, setChanges] =
    useState<
      Record<string, Mode>
    >({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const result =
        await getUserPermissions(
          userId
        );

      if (!result.success) {
        setError(
          result.error ??
            "تعذر تحميل الصلاحيات."
        );
        setLoading(false);
        return;
      }

      setPermissions(
        result.permissions ?? []
      );

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
      userPermissions.map(
        (item) => [
          item.permission_id,
          item.allowed,
        ]
      )
    );
  }, [userPermissions]);

  function getMode(
    permissionId: string
  ): Mode {
    if (
      changes[permissionId]
    ) {
      return changes[
        permissionId
      ];
    }

    if (
      directMap.has(
        permissionId
      )
    ) {
      return directMap.get(
        permissionId
      )
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
    permissions.filter(
      (permission) => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return true;
        }

        return (
          permission.name
            .toLowerCase()
            .includes(query) ||
          permission.code
            .toLowerCase()
            .includes(query) ||
          (
            permission.description ??
            ""
          )
            .toLowerCase()
            .includes(query)
        );
      }
    );

  async function handleSave() {
    setSaving(true);
    setError("");

    const payload =
      permissions.map(
        (permission) => ({
          permission_id:
            permission.id,
          mode: getMode(
            permission.id
          ),
        })
      );

    const result =
      await saveUserPermissions(
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck
                size={21}
              />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                إدارة الصلاحيات
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                المستخدم:{" "}
                <span className="font-semibold text-slate-600">
                  {userName}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="ابحث عن صلاحية..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-3">
          <Legend
            icon={
              <ShieldCheck
                size={14}
              />
            }
            label="من الدور"
            className="bg-blue-50 text-blue-700"
          />

          <Legend
            icon={
              <Check size={14} />
            }
            label="سماح مباشر"
            className="bg-emerald-50 text-emerald-700"
          />

          <Legend
            icon={
              <Ban size={14} />
            }
            label="منع مباشر"
            className="bg-red-50 text-red-700"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-blue-600"
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
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
                  {filteredPermissions.map(
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
                          key={
                            permission.id
                          }
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-800">
                              {
                                permission.name
                              }
                            </p>

                            <p className="mt-1 font-mono text-xs text-slate-400">
                              {
                                permission.code
                              }
                            </p>

                            {permission.description && (
                              <p className="mt-1 text-xs text-slate-400">
                                {
                                  permission.description
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {hasRole ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                                <ShieldCheck
                                  size={
                                    13
                                  }
                                />
                                موجودة
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">
                                غير موجودة
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {mode ===
                              "allow" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                <Check
                                  size={
                                    13
                                  }
                                />
                                مسموح
                              </span>
                            )}

                            {mode ===
                              "deny" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                                <Ban
                                  size={
                                    13
                                  }
                                />
                                ممنوع
                              </span>
                            )}

                            {mode ===
                              "role" && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                <RotateCcw
                                  size={
                                    13
                                  }
                                />
                                حسب الدور
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={mode}
                              onChange={(
                                event
                              ) =>
                                setMode(
                                  permission.id,
                                  event
                                    .target
                                    .value as Mode
                                )
                              }
                              disabled={
                                saving
                              }
                              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 bg-white px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={
              loading || saving
            }
            className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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