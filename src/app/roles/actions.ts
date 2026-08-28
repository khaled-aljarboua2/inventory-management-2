"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

type ActionResult = {
  success: boolean;
  error?: string;
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

// ============================================================
// التحقق من الصلاحية
// ============================================================

async function canManageAccess() {
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

// ============================================================
// إنشاء دور
// ============================================================

export async function createRole(
  data: {
    name: string;
    description: string;
    permissionIds: string[];
  }
): Promise<ActionResult> {
  if (
    !(await canManageAccess())
  ) {
    return {
      success: false,
      error:
        "ليس لديك صلاحية إدارة الأدوار.",
    };
  }

  const name =
    data.name.trim();

  const description =
    data.description.trim();

  if (!name) {
    return {
      success: false,
      error:
        "اسم الدور مطلوب.",
    };
  }

  const admin =
    getAdminClient();

  // منع تكرار اسم الدور
  const {
    data: existingRole,
  } =
    await admin
      .from("roles")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

  if (existingRole) {
    return {
      success: false,
      error:
        "يوجد دور بهذا الاسم بالفعل.",
    };
  }

  // التحقق من الصلاحيات
  const permissionIds =
    Array.from(
      new Set(
        data.permissionIds
      )
    );

  if (
    permissionIds.length > 0
  ) {
    const {
      data: validPermissions,
      error: permissionsError,
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
          "تعذر التحقق من الصلاحيات.",
      };
    }

    if (
      (validPermissions ??
        []).length !==
      permissionIds.length
    ) {
      return {
        success: false,
        error:
          "توجد صلاحيات غير صالحة.",
      };
    }
  }

  // إنشاء الدور
  const {
    data: role,
    error: roleError,
  } =
    await admin
      .from("roles")
      .insert({
        name,
        description:
          description ||
          null,
      })
      .select(
        "id"
      )
      .single();

  if (
    roleError ||
    !role
  ) {
    return {
      success: false,
      error:
        roleError?.message ??
        "تعذر إنشاء الدور.",
    };
  }

  // إضافة الصلاحيات
  if (
    permissionIds.length > 0
  ) {
    const rows =
      permissionIds.map(
        (permissionId) => ({
          role_id:
            role.id,
          permission_id:
            permissionId,
        })
      );

    const {
      error:
        rolePermissionsError,
    } =
      await admin
        .from("role_permissions")
        .insert(rows);

    if (
      rolePermissionsError
    ) {
      // محاولة تنظيف الدور إذا فشلت إضافة الصلاحيات
      await admin
        .from("roles")
        .delete()
        .eq(
          "id",
          role.id
        );

      return {
        success: false,
        error:
          rolePermissionsError.message,
      };
    }
  }

  return {
    success: true,
  };
}

// ============================================================
// تعديل دور
// ============================================================

export async function updateRole(
  data: {
    roleId: string;
    name: string;
    description: string;
    permissionIds: string[];
  }
): Promise<ActionResult> {
  if (
    !(await canManageAccess())
  ) {
    return {
      success: false,
      error:
        "ليس لديك صلاحية إدارة الأدوار.",
    };
  }

  const roleId =
    data.roleId.trim();

  const name =
    data.name.trim();

  const description =
    data.description.trim();

  if (!roleId) {
    return {
      success: false,
      error:
        "معرف الدور غير موجود.",
    };
  }

  if (!name) {
    return {
      success: false,
      error:
        "اسم الدور مطلوب.",
    };
  }

  const admin =
    getAdminClient();

  // التحقق من وجود الدور
  const {
    data: existingRole,
    error:
      existingRoleError,
  } =
    await admin
      .from("roles")
      .select(
        "id, name"
      )
      .eq(
        "id",
        roleId
      )
      .single();

  if (
    existingRoleError ||
    !existingRole
  ) {
    return {
      success: false,
      error:
        "الدور غير موجود.",
    };
  }

  // منع تكرار الاسم
  const {
    data: duplicateRole,
  } =
    await admin
      .from("roles")
      .select("id")
      .ilike("name", name)
      .neq("id", roleId)
      .maybeSingle();

  if (duplicateRole) {
    return {
      success: false,
      error:
        "يوجد دور آخر بهذا الاسم.",
    };
  }

  const permissionIds =
    Array.from(
      new Set(
        data.permissionIds
      )
    );

  // التحقق من الصلاحيات
  if (
    permissionIds.length > 0
  ) {
    const {
      data: validPermissions,
      error: permissionsError,
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
          "تعذر التحقق من الصلاحيات.",
      };
    }

    if (
      (validPermissions ??
        []).length !==
      permissionIds.length
    ) {
      return {
        success: false,
        error:
          "توجد صلاحيات غير صالحة.",
      };
    }
  }

  // تحديث الدور
  const {
    error: roleError,
  } =
    await admin
      .from("roles")
      .update({
        name,
        description:
          description ||
          null,
      })
      .eq(
        "id",
        roleId
      );

  if (roleError) {
    return {
      success: false,
      error:
        roleError.message,
    };
  }

  // حذف الصلاحيات الحالية
  const {
    error:
      deletePermissionsError,
  } =
    await admin
      .from("role_permissions")
      .delete()
      .eq(
        "role_id",
        roleId
      );

  if (
    deletePermissionsError
  ) {
    return {
      success: false,
      error:
        "تم تحديث الدور لكن تعذر تحديث صلاحياته.",
    };
  }

  // إضافة الصلاحيات الجديدة
  if (
    permissionIds.length > 0
  ) {
    const rows =
      permissionIds.map(
        (permissionId) => ({
          role_id:
            roleId,
          permission_id:
            permissionId,
        })
      );

    const {
      error:
        insertPermissionsError,
    } =
      await admin
        .from("role_permissions")
        .insert(rows);

    if (
      insertPermissionsError
    ) {
      return {
        success: false,
        error:
          insertPermissionsError.message,
      };
    }
  }

  return {
    success: true,
  };
}

// ============================================================
// حذف دور
// ============================================================

export async function deleteRole(
  roleId: string
): Promise<ActionResult> {
  if (
    !(await canManageAccess())
  ) {
    return {
      success: false,
      error:
        "ليس لديك صلاحية إدارة الأدوار.",
    };
  }

  const admin =
    getAdminClient();

  // جلب الدور
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
        roleId
      )
      .single();

  if (
    roleError ||
    !role
  ) {
    return {
      success: false,
      error:
        "الدور غير موجود.",
    };
  }

  // حماية General Manager
  if (role.name.trim().toLowerCase() === "admin") {
    return {
      success: false,
      error:
        "لا يمكن حذف دور General Manager.",
    };
  }

  // التحقق من المستخدمين المرتبطين
  const {
    data: users,
    error: usersError,
  } =
    await admin
      .from("users")
      .select("id")
      .eq(
        "role_id",
        roleId
      )
      .limit(1);

  if (usersError) {
    return {
      success: false,
      error:
        "تعذر التحقق من المستخدمين المرتبطين بالدور.",
    };
  }

  if (
    users &&
    users.length > 0
  ) {
    return {
      success: false,
      error:
        "لا يمكن حذف هذا الدور لأنه مرتبط بمستخدمين. غيّر أدوار المستخدمين أولًا.",
    };
  }

  // حذف الصلاحيات أولًا
  const {
    error:
      rolePermissionsError,
  } =
    await admin
      .from("role_permissions")
      .delete()
      .eq(
        "role_id",
        roleId
      );

  if (
    rolePermissionsError
  ) {
    return {
      success: false,
      error:
        rolePermissionsError.message,
    };
  }

  // حذف الدور
  const {
    error: deleteError,
  } =
    await admin
      .from("roles")
      .delete()
      .eq(
        "id",
        roleId
      );

  if (deleteError) {
    return {
      success: false,
      error:
        deleteError.message,
    };
  }

  return {
    success: true,
  };
}
