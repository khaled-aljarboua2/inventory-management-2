import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import UsersTable from "./UsersTable";

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

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

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

export default async function UsersPage() {
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
  // ملف المستخدم الحالي
  // ============================================================

  const [
    {
      data: currentUser,
      error: currentUserError,
    },
    {
      data: canViewUsers,
      error: permissionError,
    },
    {
      data: hasFullAccess,
      error: fullAccessError,
    },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, company_id, role_id, location_id, is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .single(),
    supabase.rpc("has_permission", {
      permission_code: "users.view",
    }),
    supabase.rpc("has_full_location_access"),
  ]);

  if (
    currentUserError ||
    !currentUser
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          لم يتم العثور على المستخدم الحالي.
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // التحقق من صلاحية عرض المستخدمين
  // ============================================================

  if (
    permissionError ||
    fullAccessError ||
    canViewUsers !== true
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700"
        >
          ليس لديك صلاحية عرض المستخدمين.
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // Admin Client
  // ============================================================

  const admin =
    getAdminClient();

  let usersQuery = admin
    .from("users")
    .select(
      `
        id,
        auth_user_id,
        company_id,
        role_id,
        location_id,
        full_name,
        username,
        email,
        phone,
        is_active,
        created_at,
        updated_at,
        roles (id, name, description),
        locations (id, name, code, type)
      `
    )
    .eq("company_id", currentUser.company_id);

  let locationsQuery = admin
    .from("locations")
    .select("id, name, code, type")
    .eq("company_id", currentUser.company_id)
    .eq("is_active", true);

  if (hasFullAccess !== true) {
    if (!currentUser.location_id) {
      return (
        <DashboardLayout>
          <div dir="rtl" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            المستخدم غير مرتبط بفرع صالح.
          </div>
        </DashboardLayout>
      );
    }

    usersQuery = usersQuery.eq("location_id", currentUser.location_id);
    locationsQuery = locationsQuery.eq("id", currentUser.location_id);
  }

  // ============================================================
  // تحميل المستخدمين
  // ============================================================

  const [
    {
      data: users,
      error: usersError,
    },
    {
      data: roles,
      error: rolesError,
    },
    {
      data: locations,
      error: locationsError,
    },
  ] = await Promise.all([
    usersQuery.order("created_at", { ascending: false }),
    admin
      .from("roles")
      .select("id, name, description")
      .order("name"),
    locationsQuery.order("name"),
  ]);

  if (usersError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="space-y-5"
        >
          <div>
            <div className="mb-2 text-sm text-slate-400">
              الإدارة / المستخدمون
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              المستخدمون
            </h1>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-semibold">
              تعذر تحميل المستخدمين.
            </p>

            <p className="mt-2 text-xs">
              {usersError.message}
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (rolesError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          تعذر تحميل الأدوار:
          <span className="mr-1">
            {rolesError.message}
          </span>
        </div>
      </DashboardLayout>
    );
  }

  if (locationsError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          تعذر تحميل المواقع:
          <span className="mr-1">
            {locationsError.message}
          </span>
        </div>
      </DashboardLayout>
    );
  }

  const normalizedUsers: UserRow[] = (
    users ?? []
  ).map((user) => ({
    ...user,
    roles: firstRelation(user.roles),
    locations: firstRelation(user.locations),
  }));

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* ======================================================
            رأس الصفحة
        ======================================================= */}

        <div>
          <div className="mb-2 text-sm text-slate-400">
            الإدارة / المستخدمون
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            المستخدمون
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            إدارة حسابات المستخدمين والأدوار والمواقع المرتبطة بهم.
          </p>
        </div>

        {/* ======================================================
            الجدول
        ======================================================= */}

        <UsersTable
          users={
            normalizedUsers
          }
          roles={
            (roles ?? []) as Role[]
          }
          locations={
            (locations ??
              []) as Location[]
          }
          currentUserId={
            currentUser.id
          }
        />
      </div>
    </DashboardLayout>
  );
}
