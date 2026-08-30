"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  MapPin,
  UserPlus,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";

import UserModal from "./UserModal";
import EditUserModal from "./EditUserModal";
import UserPermissionsModal from "./UserPermissionsModal";
import { deleteUser } from "./actions";

type UserRow = {
  id: string;
  auth_user_id: string;
  company_id: string;
  role_id: string | null;
  location_id: string | null;
  full_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  roles:
    | {
        id: string;
        name: string;
        description: string | null;
      }
    | null;

  locations:
    | {
        id: string;
        name: string;
        code: string;
        type: string;
      }
    | null;
};

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

type Props = {
  users: UserRow[];
  roles: Role[];
  locations: Location[];
  currentUserId: string;
};

export default function UsersTable({
  users,
  roles,
  locations,
  currentUserId,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [permissionsUser, setPermissionsUser] =
    useState<UserRow | null>(null);
  const [deletingUserId, setDeletingUserId] =
    useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.username ?? "").toLowerCase().includes(query) ||
        (user.phone ?? "").toLowerCase().includes(query) ||
        (user.roles?.name ?? "").toLowerCase().includes(query) ||
        (user.locations?.name ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);

      const matchesRole =
        roleFilter === "all" || user.role_id === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  const activeUsers = users.filter((user) => user.is_active).length;
  const inactiveUsers = users.filter((user) => !user.is_active).length;

  const rolesCount = new Set(
    users.map((user) => user.role_id).filter(Boolean)
  ).size;

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeZone: "Asia/Riyadh",
    }).format(new Date(value));
  }

  async function handleDelete(user: UserRow) {
    if (deletingUserId !== null) return;

    if (user.id === currentUserId) {
      window.alert("لا يمكنك حذف حسابك الحالي.");
      return;
    }

    const roleName = user.roles?.name.trim().toLowerCase();
    const isSystemAdmin =
      user.location_id === null &&
      (roleName === "admin" || roleName === "general manager");

    if (isSystemAdmin) {
      window.alert(
        "لا يمكن حذف حساب الأدمن العام من هذه الصفحة."
      );
      return;
    }

    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المستخدم "${user.full_name}"؟\n\nسيتم حذف حسابه من النظام ومن تسجيل الدخول، ولا يمكن التراجع عن العملية.`
    );

    if (!confirmed) return;

    setDeletingUserId(user.id);

    try {
      const result = await deleteUser(user.id);

      if (!result.success) {
        window.alert(
          result.error || "تعذر حذف المستخدم."
        );
        return;
      }

      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "تعذر حذف المستخدم."
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <>
      {/* =====================================================
          الإحصائيات
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users size={20} />}
          label="إجمالي المستخدمين"
          value={users.length}
        />

        <StatCard
          icon={<UserCheck size={20} />}
          label="نشطون"
          value={activeUsers}
          variant="green"
        />

        <StatCard
          icon={<UserX size={20} />}
          label="غير نشطين"
          value={inactiveUsers}
          variant="amber"
        />

        <StatCard
          icon={<ShieldCheck size={20} />}
          label="الأدوار المستخدمة"
          value={rolesCount}
          variant="purple"
        />
      </div>

      {/* =====================================================
          الجدول
      ====================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* رأس الجدول */}

        <div className="border-b border-slate-100 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <Users size={19} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    قائمة المستخدمين
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    إدارة الحسابات والأدوار والمواقع
                  </p>
                </div>
              </div>

              <div className="mt-4 inline-flex rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
                {filteredUsers.length} مستخدم
              </div>
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
                    setSearch(event.target.value)
                  }
                  placeholder="ابحث بالاسم أو البريد أو الدور..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm text-slate-700 outline-none transition-all focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
                />
              </div>

              {/* الحالة */}

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
              </select>

              {/* الدور */}

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              >
                <option value="all">جميع الأدوار</option>

                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>

              {/* مستخدم جديد */}

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm shadow-teal-100 transition-all hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md"
              >
                <UserPlus size={17} />
                مستخدم جديد
              </button>
            </div>
          </div>
        </div>

        {/* الجدول */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  المستخدم
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الدور
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الموقع
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الجوال
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الحالة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  تاريخ الإضافة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-20 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <Users size={28} />
                      </div>

                      <p className="font-semibold text-slate-700">
                        لا يوجد مستخدمون
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        لم يتم العثور على مستخدمين مطابقين للبحث.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrentUser =
                    user.id === currentUserId;

                  const roleName =
                    user.roles?.name.trim().toLowerCase();

                  const isSystemAdmin =
                    user.location_id === null &&
                    (roleName === "admin" ||
                      roleName === "general manager");

                  const isDeleting =
                    deletingUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      {/* المستخدم */}

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition group-hover:bg-teal-100">
                            <Users size={19} />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-slate-800">
                                {user.full_name}
                              </p>

                              {isCurrentUser && (
                                <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-600">
                                  أنت
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                              {user.email}
                            </p>

                            {user.username && (
                              <p className="mt-1 font-mono text-[10px] text-slate-300">
                                @{user.username}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* الدور */}

                      <td className="px-6 py-5">
                        {user.roles ? (
                          <div>
                            <p className="font-medium text-slate-800">
                              {user.roles.name}
                            </p>

                            {user.roles.description && (
                              <p className="mt-1 max-w-48 text-xs leading-5 text-slate-400">
                                {user.roles.description}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            بدون دور
                          </span>
                        )}
                      </td>

                      {/* الموقع */}

                      <td className="px-6 py-5">
                        {user.locations ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                              <MapPin size={15} />
                            </div>

                            <div>
                              <p className="font-medium text-slate-700">
                                {user.locations.name}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {user.locations.code}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            غير محدد
                          </span>
                        )}
                      </td>

                      {/* الجوال */}

                      <td className="px-6 py-5 text-sm text-slate-500">
                        {user.phone ?? "—"}
                      </td>

                      {/* الحالة */}

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                            user.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.is_active
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />

                          {user.is_active
                            ? "نشط"
                            : "غير نشط"}
                        </span>
                      </td>

                      {/* التاريخ */}

                      <td className="px-6 py-5 text-sm text-slate-500">
                        {formatDate(user.created_at)}
                      </td>

                      {/* الإجراءات */}

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditUser(user)
                            }
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600"
                          >
                            <Pencil size={15} />
                            تعديل
                          </button>

                          {!isCurrentUser &&
                            !isSystemAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPermissionsUser(user)
                                }
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/30 px-3 text-xs font-semibold text-teal-600 transition hover:bg-teal-50 hover:border-teal-300"
                              >
                                <ShieldCheck size={15} />
                                الصلاحيات
                              </button>
                            )}

                          {isCurrentUser ||
                          isSystemAdmin ? (
                            <span className="px-2 text-xs text-slate-300">
                              —
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(user)
                              }
                              disabled={
                                isDeleting ||
                                deletingUserId !== null
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={15} />
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
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* إضافة مستخدم */}

      {modalOpen && (
        <UserModal
          roles={roles}
          locations={locations}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* تعديل مستخدم */}

      {editUser && (
        <EditUserModal
          user={editUser}
          roles={roles}
          locations={locations}
          onClose={() => setEditUser(null)}
        />
      )}

      {/* صلاحيات المستخدم */}

      {permissionsUser && (
        <UserPermissionsModal
          userId={permissionsUser.id}
          userName={permissionsUser.full_name}
          onClose={() => setPermissionsUser(null)}
        />
      )}
    </>
  );
}

/* ============================================================
   Stat Card
============================================================ */

function StatCard({
  icon,
  label,
  value,
  variant = "teal",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: "teal" | "green" | "amber" | "purple";
}) {
  const styles = {
    teal: {
      icon: "bg-teal-50 text-teal-600",
      glow: "bg-teal-100/60",
    },
    green: {
      icon: "bg-emerald-50 text-emerald-600",
      glow: "bg-emerald-100/60",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      glow: "bg-amber-100/60",
    },
    purple: {
      icon: "bg-purple-50 text-purple-600",
      glow: "bg-purple-100/60",
    },
  };

  const style = styles[variant];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`absolute -left-8 -top-8 h-24 w-24 rounded-full blur-2xl ${style.glow}`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
