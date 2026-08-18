import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import RolesTable from "./RolesTable";

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

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL غير موجود."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY غير موجود."
    );
  }

  return createAdminClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export default async function RolesPage() {
  const supabase =
    await createClient();

  // ============================================================
  // المستخدم الحالي
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          يجب تسجيل الدخول أولًا.
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // صلاحية إدارة الوصول
  // ============================================================

  const {
    data: canManageAccess,
    error: permissionError,
  } = await supabase.rpc(
    "has_permission",
    {
      permission_code:
        "users.manage_access",
    }
  );

  if (
    permissionError ||
    canManageAccess !== true
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700"
        >
          ليس لديك صلاحية إدارة الأدوار والصلاحيات.
        </div>
      </DashboardLayout>
    );
  }

  const admin =
    getAdminClient();

  // ============================================================
  // تحميل البيانات
  // ============================================================

  const [
    {
      data: roles,
      error: rolesError,
    },
    {
      data: permissions,
      error: permissionsError,
    },
    {
      data: rolePermissions,
      error: rolePermissionsError,
    },
    {
      data: users,
      error: usersError,
    },
  ] = await Promise.all([
    admin
      .from("roles")
      .select(
        "id, name, description, created_at"
      )
      .order("name"),

    admin
      .from("permissions")
      .select(
        "id, name, code, description"
      )
      .order("code"),

    admin
      .from("role_permissions")
      .select(
        "role_id, permission_id"
      ),

    admin
      .from("users")
      .select("role_id"),
  ]);

  if (
    rolesError ||
    permissionsError ||
    rolePermissionsError ||
    usersError
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          <p className="font-semibold">
            تعذر تحميل بيانات الأدوار والصلاحيات.
          </p>

          <p className="mt-2 text-xs">
            {rolesError?.message ||
              permissionsError?.message ||
              rolePermissionsError?.message ||
              usersError?.message}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // عدد الصلاحيات لكل دور
  // ============================================================

  const permissionCountMap =
    new Map<string, number>();

  for (
    const item of
      rolePermissions ?? []
  ) {
    permissionCountMap.set(
      item.role_id,
      (permissionCountMap.get(
        item.role_id
      ) ?? 0) + 1
    );
  }

  // ============================================================
  // عدد المستخدمين لكل دور
  // ============================================================

  const userCountMap =
    new Map<string, number>();

  for (
    const userRow of
      users ?? []
  ) {
    if (!userRow.role_id) {
      continue;
    }

    userCountMap.set(
      userRow.role_id,
      (userCountMap.get(
        userRow.role_id
      ) ?? 0) + 1
    );
  }

  // ============================================================
  // تجهيز الأدوار
  // ============================================================

  const roleList: Role[] =
    (roles ?? []).map(
      (role) => ({
        ...role,
        permissionCount:
          permissionCountMap.get(
            role.id
          ) ?? 0,
        userCount:
          userCountMap.get(
            role.id
          ) ?? 0,
      })
    );

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* ======================================================
            الرأس
        ======================================================= */}

        <div>
          <div className="mb-2 text-sm text-slate-400">
            الإدارة / الأدوار والصلاحيات
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            الأدوار والصلاحيات
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة أدوار المستخدمين وتحديد الصلاحيات المرتبطة بكل دور.
          </p>
        </div>

        {/* ======================================================
            الجدول
        ======================================================= */}

        <RolesTable
          roles={roleList}
          permissions={
            (permissions ??
              []) as Permission[]
          }
          rolePermissions={
            (rolePermissions ??
              []) as RolePermission[]
          }
        />
      </div>
    </DashboardLayout>
  );
}