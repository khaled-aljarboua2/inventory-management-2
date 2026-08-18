"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  ShieldPlus,
  ShieldCheck,
  X,
  Check,
  Loader2,
} from "lucide-react";

import {
  createRole,
  updateRole,
} from "./actions";

type Permission = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

type Role = {
  id: string;
  name: string;
  description: string | null;
};

type Props = {
  role?: Role | null;
  permissions: Permission[];
  selectedPermissionIds?: string[];
  onClose: () => void;
};

const GROUPS = [
  {
    key: "dashboard",
    label: "لوحة التحكم",
  },
  {
    key: "stock",
    label: "المخزون",
  },
  {
    key: "transfers",
    label: "النقل",
  },
  {
    key: "purchases",
    label: "المشتريات",
  },
  {
    key: "suppliers",
    label: "الموردون",
  },
  {
    key: "products",
    label: "المنتجات",
  },
  {
    key: "locations",
    label: "المواقع",
  },
  {
    key: "users",
    label: "المستخدمون",
  },
  {
    key: "settings",
    label: "الإعدادات",
  },
] as const;

function getGroup(
  code: string
) {
  return (
    GROUPS.find(
      (group) =>
        code.startsWith(
          `${group.key}.`
        )
    )?.key ??
    "other"
  );
}

export default function RoleModal({
  role,
  permissions,
  selectedPermissionIds =
    [],
  onClose,
}: Props) {
  const isEditing =
    Boolean(role);

  const [name, setName] =
    useState(
      role?.name ?? ""
    );

  const [description, setDescription] =
    useState(
      role?.description ?? ""
    );

  const [selected, setSelected] =
    useState<Set<string>>(
      new Set(
        selectedPermissionIds
      )
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const groupedPermissions =
    useMemo(() => {
      const groups: Record<
        string,
        Permission[]
      > = {};

      for (
        const permission of permissions
      ) {
        const group =
          getGroup(
            permission.code
          );

        if (!groups[group]) {
          groups[group] = [];
        }

        groups[group].push(
          permission
        );
      }

      return groups;
    }, [permissions]);

  function togglePermission(
    permissionId: string
  ) {
    setSelected(
      (previous) => {
        const next =
          new Set(previous);

        if (
          next.has(
            permissionId
          )
        ) {
          next.delete(
            permissionId
          );
        } else {
          next.add(
            permissionId
          );
        }

        return next;
      }
    );
  }

  function toggleGroup(
    permissionList: Permission[]
  ) {
    setSelected(
      (previous) => {
        const next =
          new Set(previous);

        const allSelected =
          permissionList.every(
            (permission) =>
              next.has(
                permission.id
              )
          );

        for (
          const permission of
            permissionList
        ) {
          if (allSelected) {
            next.delete(
              permission.id
            );
          } else {
            next.add(
              permission.id
            );
          }
        }

        return next;
      }
    );
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const permissionIds =
        Array.from(
          selected
        );

      const result =
        isEditing
          ? await updateRole({
              roleId:
                role!.id,
              name,
              description,
              permissionIds,
            })
          : await createRole({
              name,
              description,
              permissionIds,
            });

      if (!result.success) {
        setError(
          result.error ??
            "تعذر حفظ الدور."
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
      setLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* ====================================================
            Header
        ===================================================== */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              {isEditing ? (
                <ShieldCheck
                  size={21}
                />
              ) : (
                <ShieldPlus
                  size={21}
                />
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing
                  ? "تعديل الدور"
                  : "دور جديد"}
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {isEditing
                  ? "تعديل بيانات الدور والصلاحيات المرتبطة به."
                  : "إنشاء دور جديد وتحديد صلاحياته."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* ====================================================
            Body
        ===================================================== */}

        <form
          onSubmit={handleSubmit}
          className="min-h-0 overflow-y-auto"
        >
          <div className="space-y-6 p-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* بيانات الدور */}

            <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
              <div className="mb-4">
                <h3 className="font-bold text-slate-900">
                  بيانات الدور
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  الاسم والوصف الأساسي للدور.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    اسم الدور
                  </label>

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="مثال: مدير فرع"
                    disabled={loading}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    الوصف
                  </label>

                  <input
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="وصف مختصر للدور"
                    disabled={loading}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>
            </section>

            {/* الصلاحيات */}

            <section>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">
                    صلاحيات الدور
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    حدد العمليات التي يستطيع المستخدمون بهذا الدور تنفيذها.
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600">
                  {selected.size} من{" "}
                  {permissions.length}{" "}
                  صلاحية
                </div>
              </div>

              <div className="space-y-4">
                {GROUPS.map(
                  (group) => {
                    const groupPermissions =
                      groupedPermissions[
                        group.key
                      ] ?? [];

                    if (
                      groupPermissions.length ===
                      0
                    ) {
                      return null;
                    }

                    const allSelected =
                      groupPermissions.every(
                        (permission) =>
                          selected.has(
                            permission.id
                          )
                      );

                    return (
                      <div
                        key={group.key}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                          <div>
                            <h4 className="font-bold text-slate-800">
                              {
                                group.label
                              }
                            </h4>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {
                                groupPermissions.length
                              }{" "}
                              صلاحيات
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              toggleGroup(
                                groupPermissions
                              )
                            }
                            disabled={
                              loading
                            }
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                          >
                            {allSelected
                              ? "إلغاء الكل"
                              : "تحديد الكل"}
                          </button>
                        </div>

                        <div className="grid gap-2 p-4 md:grid-cols-2 xl:grid-cols-3">
                          {groupPermissions.map(
                            (
                              permission
                            ) => {
                              const checked =
                                selected.has(
                                  permission.id
                                );

                              return (
                                <button
                                  key={
                                    permission.id
                                  }
                                  type="button"
                                  onClick={() =>
                                    togglePermission(
                                      permission.id
                                    )
                                  }
                                  disabled={
                                    loading
                                  }
                                  className={`group flex items-start gap-3 rounded-xl border p-3 text-right transition ${
                                    checked
                                      ? "border-blue-200 bg-blue-50/70"
                                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  <span
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                      checked
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-300 bg-white text-transparent"
                                    }`}
                                  >
                                    <Check
                                      size={
                                        13
                                      }
                                      strokeWidth={
                                        3
                                      }
                                    />
                                  </span>

                                  <span className="min-w-0">
                                    <span
                                      className={`block text-sm font-semibold ${
                                        checked
                                          ? "text-blue-700"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      {
                                        permission.name
                                      }
                                    </span>

                                    <span className="mt-1 block font-mono text-[10px] text-slate-400">
                                      {
                                        permission.code
                                      }
                                    </span>

                                    {permission.description && (
                                      <span className="mt-1 block text-[11px] leading-5 text-slate-400">
                                        {
                                          permission.description
                                        }
                                      </span>
                                    )}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          </div>

          {/* ==================================================
              Footer
          =================================================== */}

          <div className="sticky bottom-0 flex gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                !name.trim()
              }
              className="flex-1 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  جاري الحفظ...
                </span>
              ) : isEditing ? (
                "حفظ التعديلات"
              ) : (
                "إنشاء الدور"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}