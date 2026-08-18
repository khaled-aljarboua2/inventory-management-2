"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/* ============================================================
   Admin Client
============================================================ */

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

/* ============================================================
   التحقق من المستخدم الحالي
============================================================ */

async function getCurrentUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const {
    data: currentUser,
    error,
  } = await supabase
    .from("users")
    .select(
      `
        id,
        auth_user_id,
        company_id,
        role_id,
        is_active,
        roles (
          id,
          name
        )
      `
    )
    .eq(
      "auth_user_id",
      user.id
    )
    .eq(
      "is_active",
      true
    )
    .single();

  if (error || !currentUser) {
    return null;
  }

  return currentUser;
}

/* ============================================================
   التحقق من صلاحية إدارة المستخدمين
============================================================ */

async function canManageUsers() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "has_permission",
      {
        permission_code:
          "users.manage_access",
      }
    );

  return (
    !error &&
    data === true
  );
}

/* ============================================================
   إنشاء مستخدم
============================================================ */

export async function createUser({
  full_name,
  email,
  phone,
  username,
  password,
  role_id,
  location_id,
}: {
  full_name: string;
  email: string;
  phone?: string;
  username?: string;
  password: string;
  role_id: string;
  location_id: string;
}) {
  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      error:
        "يجب تسجيل الدخول أولًا.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: canCreate,
    error: permissionError,
  } =
    await supabase.rpc(
      "has_permission",
      {
        permission_code:
          "users.create",
      }
    );

  if (
    permissionError ||
    canCreate !== true
  ) {
    return {
      success: false,
      error:
        "ليس لديك صلاحية إنشاء المستخدمين.",
    };
  }

  const admin =
    getAdminClient();

  /* ==========================================================
     التأكد من عدم تكرار اسم المستخدم
  ========================================================== */

  if (username?.trim()) {
    const {
      data: existingUsername,
    } = await admin
      .from("users")
      .select("id")
      .eq(
        "username",
        username.trim()
      )
      .maybeSingle();

    if (existingUsername) {
      return {
        success: false,
        error:
          "اسم المستخدم مستخدم بالفعل.",
      };
    }
  }

  /* ==========================================================
     التأكد من عدم تكرار البريد
  ========================================================== */

  const {
    data: existingEmail,
  } = await admin
    .from("users")
    .select("id")
    .eq(
      "email",
      email.trim().toLowerCase()
    )
    .maybeSingle();

  if (existingEmail) {
    return {
      success: false,
      error:
        "البريد الإلكتروني مستخدم بالفعل.",
    };
  }

  /* ==========================================================
     التحقق من الموقع
  ========================================================== */

  const {
    data: location,
    error: locationError,
  } = await admin
    .from("locations")
    .select(
      "id, company_id, is_active"
    )
    .eq(
      "id",
      location_id
    )
    .eq(
      "company_id",
      currentUser.company_id
    )
    .eq(
      "is_active",
      true
    )
    .single();

  if (
    locationError ||
    !location
  ) {
    return {
      success: false,
      error:
        "الموقع المحدد غير صالح.",
    };
  }

  /* ==========================================================
     التحقق من الدور
  ========================================================== */

  const {
    data: role,
    error: roleError,
  } =
    await admin
      .from("roles")
      .select(
        "id, name"
      )
      .eq(
        "id",
        role_id
      )
      .single();

  if (
    roleError ||
    !role
  ) {
    return {
      success: false,
      error:
        "الدور المحدد غير صالح.",
    };
  }

  /* ==========================================================
     إنشاء حساب Auth
  ========================================================== */

  const {
    data: authData,
    error: authError,
  } =
    await admin.auth.admin.createUser(
      {
        email:
          email
            .trim()
            .toLowerCase(),

        password,

        email_confirm:
          true,

        user_metadata: {
          full_name:
            full_name.trim(),

          username:
            username?.trim() ||
            null,
        },
      }
    );

  if (
    authError ||
    !authData.user
  ) {
    return {
      success: false,
      error:
        authError?.message ||
        "تعذر إنشاء حساب تسجيل الدخول.",
    };
  }

  /* ==========================================================
     إنشاء سجل المستخدم
  ========================================================== */

  const {
    data: createdUser,
    error: userError,
  } =
    await admin
      .from("users")
      .insert({
        auth_user_id:
          authData.user.id,

        company_id:
          currentUser.company_id,

        role_id,

        location_id,

        full_name:
          full_name.trim(),

        username:
          username?.trim() ||
          null,

        email:
          email
            .trim()
            .toLowerCase(),

        phone:
          phone?.trim() ||
          null,

        is_active: true,
      })
      .select("id")
      .single();

  if (
    userError ||
    !createdUser
  ) {
    /*
     * إذا فشل إنشاء سجل المستخدم،
     * نحذف حساب Auth حتى لا يبقى حساب معلق.
     */

    await admin.auth.admin.deleteUser(
      authData.user.id
    );

    return {
      success: false,
      error:
        userError?.message ||
        "تعذر إنشاء المستخدم.",
    };
  }

  return {
    success: true,
    userId:
      createdUser.id,
  };
}

/* ============================================================
   حذف مستخدم
============================================================ */

export async function deleteUser(
  userId: string
) {
  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      error:
        "يجب تسجيل الدخول أولًا.",
    };
  }

  const supabase =
    await createClient();

  const {
    data: canDelete,
    error: permissionError,
  } =
    await supabase.rpc(
      "has_permission",
      {
        permission_code:
          "users.delete",
      }
    );

  if (
    permissionError ||
    canDelete !== true
  ) {
    return {
      success: false,
      error:
        "ليس لديك صلاحية حذف المستخدمين.",
    };
  }

  if (
    userId ===
    currentUser.id
  ) {
    return {
      success: false,
      error:
        "لا يمكنك حذف حسابك الحالي.",
    };
  }

  const admin =
    getAdminClient();

  /* ==========================================================
     جلب المستخدم المراد حذفه
  ========================================================== */

  const {
    data: targetUser,
    error: targetError,
  } =
    await admin
      .from("users")
      .select(
        `
          id,
          auth_user_id,
          role_id,
          roles (
            id,
            name
          )
        `
      )
      .eq(
        "id",
        userId
      )
      .eq(
        "company_id",
        currentUser.company_id
      )
      .single();

  if (
    targetError ||
    !targetUser
  ) {
    return {
      success: false,
      error:
        "المستخدم غير موجود.",
    };
  }

  /* ==========================================================
     حماية General Manager
  ========================================================== */

  const targetRole =
    Array.isArray(
      targetUser.roles
    )
      ? targetUser.roles[0]
      : targetUser.roles;

  if (
    targetRole?.name ===
    "General Manager"
  ) {
    return {
      success: false,
      error:
        "لا يمكن حذف حساب General Manager.",
    };
  }

  /* ==========================================================
     حذف صلاحيات المستخدم المباشرة
  ========================================================== */

  await admin
    .from("user_permissions")
    .delete()
    .eq(
      "user_id",
      userId
    );

  /* ==========================================================
     حذف سجل المستخدم
  ========================================================== */

  const {
    error: userDeleteError,
  } =
    await admin
      .from("users")
      .delete()
      .eq(
        "id",
        userId
      )
      .eq(
        "company_id",
        currentUser.company_id
      );

  if (userDeleteError) {
    return {
      success: false,
      error:
        userDeleteError.message,
    };
  }

  /* ==========================================================
     حذف حساب Auth
  ========================================================== */

  const {
    error: authDeleteError,
  } =
    await admin.auth.admin.deleteUser(
      targetUser.auth_user_id
    );

  if (authDeleteError) {
    return {
      success: false,
      error:
        "تم حذف المستخدم من النظام، لكن تعذر حذف حساب تسجيل الدخول.",
    };
  }

  return {
    success: true,
  };
}

/* ============================================================
   جلب صلاحيات مستخدم معين
============================================================ */

export async function getUserPermissions(
  userId: string
) {
  const allowed =
    await canManageUsers();

  if (!allowed) {
    return {
      success: false,
      error:
        "ليس لديك صلاحية إدارة صلاحيات المستخدمين.",
    };
  }

  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      error:
        "يجب تسجيل الدخول أولًا.",
    };
  }

  const admin =
    getAdminClient();

  /* ==========================================================
     التأكد أن المستخدم من نفس الشركة
  ========================================================== */

  const {
    data: targetUser,
    error: targetUserError,
  } =
    await admin
      .from("users")
      .select(
        "id, company_id, role_id"
      )
      .eq(
        "id",
        userId
      )
      .single();

  if (
    targetUserError ||
    !targetUser
  ) {
    return {
      success: false,
      error:
        "المستخدم غير موجود.",
    };
  }

  if (
    targetUser.company_id !==
    currentUser.company_id
  ) {
    return {
      success: false,
      error:
        "لا يمكنك إدارة مستخدم خارج شركتك.",
    };
  }

  /* ==========================================================
     تحميل الصلاحيات
  ========================================================== */

  const [
    permissionsResult,
    rolePermissionsResult,
    userPermissionsResult,
  ] = await Promise.all([
    admin
      .from("permissions")
      .select(
        "id, name, code, description"
      )
      .order("code"),

    admin
      .from("role_permissions")
      .select(
        "permission_id"
      )
      .eq(
        "role_id",
        targetUser.role_id
      ),

    admin
      .from("user_permissions")
      .select(
        "permission_id, allowed"
      )
      .eq(
        "user_id",
        userId
      ),
  ]);

  if (
    permissionsResult.error
  ) {
    return {
      success: false,
      error:
        permissionsResult.error
          .message,
    };
  }

  if (
    rolePermissionsResult.error
  ) {
    return {
      success: false,
      error:
        rolePermissionsResult.error
          .message,
    };
  }

  if (
    userPermissionsResult.error
  ) {
    return {
      success: false,
      error:
        userPermissionsResult.error
          .message,
    };
  }

  return {
    success: true,

    permissions:
      permissionsResult.data ??
      [],

    rolePermissionIds:
      (
        rolePermissionsResult.data ??
        []
      ).map(
        (permission) =>
          permission.permission_id
      ),

    userPermissions:
      userPermissionsResult.data ??
      [],
  };
}

/* ============================================================
   حفظ صلاحيات مستخدم معين
============================================================ */

export async function saveUserPermissions(
  userId: string,
  changes: {
    permission_id: string;
    mode:
      | "role"
      | "allow"
      | "deny";
  }[]
) {
  const allowed =
    await canManageUsers();

  if (!allowed) {
    return {
      success: false,
      error:
        "ليس لديك صلاحية إدارة صلاحيات المستخدمين.",
    };
  }

  const currentUser =
    await getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      error:
        "يجب تسجيل الدخول أولًا.",
    };
  }

  const admin =
    getAdminClient();

  /* ==========================================================
     التأكد أن المستخدم من نفس الشركة
  ========================================================== */

  const {
    data: targetUser,
    error: targetError,
  } =
    await admin
      .from("users")
      .select(
        "id, company_id"
      )
      .eq(
        "id",
        userId
      )
      .single();

  if (
    targetError ||
    !targetUser
  ) {
    return {
      success: false,
      error:
        "المستخدم غير موجود.",
    };
  }

  if (
    targetUser.company_id !==
    currentUser.company_id
  ) {
    return {
      success: false,
      error:
        "لا يمكنك تعديل صلاحيات مستخدم خارج شركتك.",
    };
  }

  /* ==========================================================
     التحقق من الصلاحيات المرسلة
  ========================================================== */

  const permissionIds =
    changes.map(
      (change) =>
        change.permission_id
    );

  if (
    permissionIds.length > 0
  ) {
    const {
      data: validPermissions,
      error:
        permissionsError,
    } =
      await admin
        .from("permissions")
        .select("id")
        .in(
          "id",
          permissionIds
        );

    if (
      permissionsError
    ) {
      return {
        success: false,
        error:
          permissionsError.message,
      };
    }

    const validIds =
      new Set(
        (
          validPermissions ??
          []
        ).map(
          (permission) =>
            permission.id
        )
      );

    const invalid =
      permissionIds.some(
        (id) =>
          !validIds.has(id)
      );

    if (invalid) {
      return {
        success: false,
        error:
          "توجد صلاحية غير صالحة.",
      };
    }
  }

  /* ==========================================================
     حذف الاستثناءات القديمة
  ========================================================== */

  const {
    error: deleteError,
  } =
    await admin
      .from("user_permissions")
      .delete()
      .eq(
        "user_id",
        userId
      );

  if (deleteError) {
    return {
      success: false,
      error:
        deleteError.message,
    };
  }

  /* ==========================================================
     إنشاء الاستثناءات الجديدة فقط
     
     role  = لا يوجد override
     allow = allowed = true
     deny  = allowed = false
  ========================================================== */

  const overrides =
    changes
      .filter(
        (change) =>
          change.mode ===
            "allow" ||
          change.mode ===
            "deny"
      )
      .map(
        (change) => ({
          user_id:
            userId,

          permission_id:
            change.permission_id,

          allowed:
            change.mode ===
            "allow",
        })
      );

  if (
    overrides.length > 0
  ) {
    const {
      error: insertError,
    } =
      await admin
        .from(
          "user_permissions"
        )
        .insert(
          overrides
        );

    if (insertError) {
      return {
        success: false,
        error:
          insertError.message,
      };
    }
  }

  return {
    success: true,
  };
}