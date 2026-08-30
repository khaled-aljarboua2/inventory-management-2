"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  Search,
  ShieldCheck,
  ShieldPlus,
  Users,
  KeyRound,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

import RoleModal from "./RoleModal";
import { deleteRole } from "./actions";

type Role = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  permissionCount: number;
  userCount: number;
};

type Permission = {
  id: string;
  name: string;
  code: string;
  description: string | null;
};

type RolePermission = {
  role_id: string;
  permission_id: string;
};

type Props = {
  roles: Role[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
};

export default function RolesTable({
  roles,
  permissions,
  rolePermissions,
}: Props) {
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingRole, setEditingRole] =
    useState<Role | null>(null);

  const [deletingRoleId, setDeletingRoleId] =
    useState<string | null>(null);

  const filteredRoles = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return roles;
    }

    return roles.filter(
      (role) =>
        role.name
          .toLowerCase()
          .includes(query) ||
        (role.description ?? "")
          .toLowerCase()
          .includes(query)
    );
  }, [roles, search]);

  const totalRoles = roles.length;

  const usedRoles = roles.filter(
    (role) => role.userCount > 0
  ).length;

  const totalPermissions =
    permissions.length;

  const assignedPermissions = new Set(
    rolePermissions.map(
      (item) => item.permission_id
    )
  ).size;

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(
      "ar-SA",
      {
        dateStyle: "medium",
        timeZone: "Asia/Riyadh",
      }
    ).format(new Date(value));
  }

  function openCreateModal() {
    setEditingRole(null);
    setModalOpen(true);
  }

  function openEditModal(role: Role) {
    setEditingRole(role);
    setModalOpen(true);
  }

  function getRolePermissionIds(
    roleId: string
  ) {
    return rolePermissions
      .filter(
        (item) =>
          item.role_id === roleId
      )
      .map(
        (item) =>
          item.permission_id
      );
  }

  async function handleDelete(
    role: Role
  ) {
    if (deletingRoleId !== null) {
      return;
    }

    if (
      role.name ===
      "General Manager"
    ) {
      window.alert(
        "لا يمكن حذف دور General Manager."
      );
      return;
    }

    if (role.userCount > 0) {
      window.alert(
        "لا يمكن حذف هذا الدور لأنه مرتبط بمستخدمين."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `هل أنت متأكد من حذف الدور "${role.name}"؟\n\nسيتم حذف الدور وصلاحياته المرتبطة به.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingRoleId(role.id);

    try {
      const result =
        await deleteRole(role.id);

      if (!result.success) {
        window.alert(
          result.error ??
            "تعذر حذف الدور."
        );
        return;
      }

      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "تعذر حذف الدور."
      );
    } finally {
      setDeletingRoleId(null);
    }
  }

  return (
    <>
      {/* =====================================================
          الإحصائيات
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={
            <ShieldCheck size={20} />
          }
          label="إجمالي الأدوار"
          value={totalRoles}
        />

        <StatCard
          icon={<Users size={20} />}
          label="أدوار مستخدمة"
          value={usedRoles}
        />

        <StatCard
          icon={<KeyRound size={20} />}
          label="إجمالي الصلاحيات"
          value={totalPermissions}
        />

        <StatCard
          icon={
            <ShieldPlus size={20} />
          }
          label="صلاحيات مستخدمة"
          value={assignedPermissions}
        />
      </div>

      {/* =====================================================
          الجدول
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                قائمة الأدوار
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredRoles.length} دور
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* البحث */}

              <div className="relative sm:w-80">
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
                  placeholder="ابحث عن دور..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
                />
              </div>

              {/* دور جديد */}

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-100"
              >
                <ShieldPlus size={17} />

                دور جديد
              </button>
            </div>
          </div>
        </div>

        {/* ===================================================
            الجدول
        ==================================================== */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الدور
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الصلاحيات
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  المستخدمون
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  تاريخ الإنشاء
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRoles.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-20 text-center"
                  >
                    <ShieldCheck
                      size={36}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="font-semibold text-slate-700">
                      لا توجد أدوار
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      لم يتم العثور على أدوار مطابقة للبحث.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRoles.map(
                  (role) => {
                    const isGeneralManager =
                      role.name ===
                      "General Manager";

                    const isDeleting =
                      deletingRoleId ===
                      role.id;

                    return (
                      <tr
                        key={role.id}
                        className="transition hover:bg-teal-50/30"
                      >
                        {/* الدور */}

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                              <ShieldCheck
                                size={19}
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800">
                                  {role.name}
                                </p>

                                {isGeneralManager && (
                                  <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-600">
                                    أساسي
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 max-w-md text-xs text-slate-400">
                                {role.description ??
                                  "بدون وصف"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* الصلاحيات */}

                        <td className="px-6 py-5">
                          <div className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
                            <KeyRound
                              size={15}
                            />

                            {
                              role.permissionCount
                            }

                            <span className="text-xs font-normal text-teal-500">
                              صلاحية
                            </span>
                          </div>
                        </td>

                        {/* المستخدمون */}

                        <td className="px-6 py-5">
                          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                            <Users
                              size={15}
                            />

                            {role.userCount}

                            <span className="text-xs font-normal text-slate-400">
                              مستخدم
                            </span>
                          </div>
                        </td>

                        {/* التاريخ */}

                        <td className="px-6 py-5 text-sm text-slate-500">
                          {formatDate(
                            role.created_at
                          )}
                        </td>

                        {/* الإجراءات */}

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  role
                                )
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                            >
                              <Pencil
                                size={15}
                              />

                              تعديل
                            </button>

                            {isGeneralManager ? (
                              <span className="px-2 text-xs text-slate-400">
                                محمي
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    role
                                  )
                                }
                                disabled={
                                  isDeleting ||
                                  deletingRoleId !==
                                    null
                                }
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2
                                    size={15}
                                  />
                                )}

                                {isDeleting
                                  ? "جاري الحذف..."
                                  : "حذف"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          نافذة الدور
      ====================================================== */}

      {modalOpen && (
        <RoleModal
          role={editingRole}
          permissions={permissions}
          selectedPermissionIds={
            editingRole
              ? getRolePermissionIds(
                  editingRole.id
                )
              : []
          }
          onClose={() =>
            setModalOpen(false)
          }
        />
      )}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-200/60">
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-teal-100/60 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>
    </div>
  );
}
