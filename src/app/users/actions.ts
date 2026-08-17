"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

type CreateUserInput = {
  full_name: string;
  email: string;
  phone?: string;
  username?: string;
  password: string;
  role_id: string;
  location_id: string;
};

/* ============================================================
   المستخدم الحالي
============================================================ */

async function getCurrentUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولًا."
    );
  }

  const {
    data: dbUser,
    error,
  } =
    await supabase
      .from("users")
      .select(
        "id, company_id, role_id, is_active"
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

  if (
    error ||
    !dbUser
  ) {
    throw new Error(
      "لم يتم العثور على المستخدم في النظام."
    );
  }

  return {
    supabase,
    user: dbUser,
  };
}

/* ============================================================
   Admin Client
============================================================ */

function getAdminClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL غير موجود في .env.local"
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY غير موجود في .env.local"
    );
  }

  return createAdminClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken:
          false,
        persistSession:
          false,
      },
    }
  );
}

/* ============================================================
   إنشاء مستخدم
============================================================ */

export async function createUser(
  input: CreateUserInput
) {
  let createdAuthUserId:
    | string
    | null = null;

  try {
    const {
      supabase,
      user: currentUser,
    } =
      await getCurrentUser();

    const fullName =
      input.full_name.trim();

    const email =
      input.email
        .trim()
        .toLowerCase();

    const phone =
      input.phone?.trim() ||
      null;

    const username =
      input.username?.trim() ||
      null;

    if (!fullName) {
      throw new Error(
        "أدخل اسم المستخدم."
      );
    }

    if (!email) {
      throw new Error(
        "أدخل البريد الإلكتروني."
      );
    }

    if (
      !input.password ||
      input.password.length < 6
    ) {
      throw new Error(
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
      );
    }

    if (!input.role_id) {
      throw new Error(
        "اختر الدور."
      );
    }

    if (!input.location_id) {
      throw new Error(
        "اختر الموقع."
      );
    }

    /* --------------------------------------------------------
       صلاحية users.create
    -------------------------------------------------------- */

    const {
      data: hasPermission,
      error:
        permissionError,
    } =
      await supabase.rpc(
        "has_permission",
        {
          permission_code:
            "users.create",
        }
      );

    if (permissionError) {
      throw new Error(
        permissionError.message
      );
    }

    if (
      hasPermission !== true
    ) {
      throw new Error(
        "ليس لديك صلاحية إنشاء مستخدم."
      );
    }

    /* --------------------------------------------------------
       التحقق من الدور
    -------------------------------------------------------- */

    const {
      data: role,
      error: roleError,
    } =
      await supabase
        .from("roles")
        .select(
          "id, name, description"
        )
        .eq(
          "id",
          input.role_id
        )
        .single();

    if (
      roleError ||
      !role
    ) {
      throw new Error(
        "الدور المحدد غير صالح."
      );
    }

    /* --------------------------------------------------------
       التحقق من الموقع
    -------------------------------------------------------- */

    const {
      data: location,
      error:
        locationError,
    } =
      await supabase
        .from("locations")
        .select(
          "id, company_id, name, code, type, is_active"
        )
        .eq(
          "id",
          input.location_id
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
      throw new Error(
        "الموقع المحدد غير صالح أو لا يتبع لشركتك."
      );
    }

    /* --------------------------------------------------------
       التحقق من البريد داخل الشركة
    -------------------------------------------------------- */

    const {
      data: existingEmail,
      error:
        existingEmailError,
    } =
      await supabase
        .from("users")
        .select("id")
        .eq(
          "company_id",
          currentUser.company_id
        )
        .eq(
          "email",
          email
        )
        .maybeSingle();

    if (
      existingEmailError
    ) {
      throw new Error(
        existingEmailError.message
      );
    }

    if (existingEmail) {
      throw new Error(
        "يوجد مستخدم بهذا البريد الإلكتروني بالفعل."
      );
    }

    /* --------------------------------------------------------
       Admin Client
    -------------------------------------------------------- */

    const admin =
      getAdminClient();

    /* --------------------------------------------------------
       إنشاء حساب Supabase Auth
    -------------------------------------------------------- */

    const {
      data: authData,
      error: authError,
    } =
      await admin.auth.admin.createUser(
        {
          email,
          password:
            input.password,

          email_confirm:
            true,

          user_metadata: {
            full_name:
              fullName,

            username,

            phone,

            company_id:
              currentUser.company_id,

            location_id:
              input.location_id,

            role_id:
              input.role_id,
          },
        }
      );

    if (
      authError ||
      !authData.user
    ) {
      throw new Error(
        authError?.message ??
          "تعذر إنشاء حساب المستخدم."
      );
    }

    createdAuthUserId =
      authData.user.id;

    /* --------------------------------------------------------
       التحقق هل Trigger أنشأ profile تلقائيًا
    -------------------------------------------------------- */

    const {
      data: existingProfile,
      error:
        existingProfileError,
    } =
      await admin
        .from("users")
        .select(
          "id, auth_user_id, company_id"
        )
        .eq(
          "auth_user_id",
          createdAuthUserId
        )
        .maybeSingle();

    if (
      existingProfileError
    ) {
      throw new Error(
        existingProfileError.message
      );
    }

    /* --------------------------------------------------------
       إذا كان موجودًا: نحدثه
       إذا غير موجود: ننشئه
    -------------------------------------------------------- */

    if (
      existingProfile
    ) {
      const {
        error:
          profileUpdateError,
      } =
        await admin
          .from("users")
          .update({
            company_id:
              currentUser.company_id,

            role_id:
              input.role_id,

            location_id:
              input.location_id,

            full_name:
              fullName,

            username,

            email,

            phone,

            is_active:
              true,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingProfile.id
          );

      if (
        profileUpdateError
      ) {
        throw new Error(
          profileUpdateError.message
        );
      }
    } else {
      const {
        error:
          profileInsertError,
      } =
        await admin
          .from("users")
          .insert({
            id:
              crypto.randomUUID(),

            auth_user_id:
              createdAuthUserId,

            company_id:
              currentUser.company_id,

            role_id:
              input.role_id,

            location_id:
              input.location_id,

            full_name:
              fullName,

            username,

            email,

            phone,

            is_active:
              true,
          });

      if (
        profileInsertError
      ) {
        throw new Error(
          profileInsertError.message
        );
      }
    }

    revalidatePath(
      "/users"
    );

    return {
      success: true,
      userId:
        createdAuthUserId,
    };
  } catch (error) {
    /* --------------------------------------------------------
       تنظيف Auth إذا فشل إنشاء profile
    -------------------------------------------------------- */

    if (
      createdAuthUserId
    ) {
      try {
        const admin =
          getAdminClient();

        const {
          data: profile,
        } =
          await admin
            .from("users")
            .select("id")
            .eq(
              "auth_user_id",
              createdAuthUserId
            )
            .maybeSingle();

        if (profile) {
          await admin
            .from("users")
            .delete()
            .eq(
              "id",
              profile.id
            );
        }

        await admin.auth.admin.deleteUser(
          createdAuthUserId
        );
      } catch {
        // لا نخفي الخطأ الأصلي
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر إنشاء المستخدم.",
    };
  }
}

/* ============================================================
   حذف مستخدم
============================================================ */

export async function deleteUser(
  targetUserId: string
) {
  try {
    const {
      supabase,
      user: currentUser,
    } =
      await getCurrentUser();

    if (!targetUserId) {
      throw new Error(
        "معرف المستخدم غير صالح."
      );
    }

    /* --------------------------------------------------------
       صلاحية الحذف
    -------------------------------------------------------- */

    const {
      data: hasPermission,
      error:
        permissionError,
    } =
      await supabase.rpc(
        "has_permission",
        {
          permission_code:
            "users.delete",
        }
      );

    if (
      permissionError
    ) {
      throw new Error(
        permissionError.message
      );
    }

    if (
      hasPermission !== true
    ) {
      throw new Error(
        "ليس لديك صلاحية حذف المستخدمين."
      );
    }

    /* --------------------------------------------------------
       جلب المستخدم المطلوب
    -------------------------------------------------------- */

    const admin =
      getAdminClient();

    const {
      data: targetUser,
      error:
        targetUserError,
    } =
      await admin
        .from("users")
        .select(
          `
            id,
            auth_user_id,
            company_id,
            role_id,
            full_name,
            email,
            is_active,
            roles (
              id,
              name
            )
          `
        )
        .eq(
          "id",
          targetUserId
        )
        .eq(
          "company_id",
          currentUser.company_id
        )
        .single();

    if (
      targetUserError ||
      !targetUser
    ) {
      throw new Error(
        "المستخدم غير موجود."
      );
    }

    /* --------------------------------------------------------
       منع حذف الحساب الحالي
    -------------------------------------------------------- */

    if (
      targetUser.id ===
      currentUser.id
    ) {
      throw new Error(
        "لا يمكنك حذف حسابك الحالي."
      );
    }

    /* --------------------------------------------------------
       منع حذف General Manager
       لتجنب حذف الحساب الإداري الرئيسي بالخطأ.
    -------------------------------------------------------- */

    const roleName =
      Array.isArray(
        targetUser.roles
      )
        ? targetUser.roles[0]?.name
        : targetUser.roles?.name;

    if (
      roleName ===
      "General Manager"
    ) {
      throw new Error(
        "لا يمكن حذف حساب General Manager من هذه الصفحة."
      );
    }

    /* --------------------------------------------------------
       حذف سجل المستخدم أولًا
       حتى لا نترك Auth بدون profile.
    -------------------------------------------------------- */

    const {
      error: profileDeleteError,
    } =
      await admin
        .from("users")
        .delete()
        .eq(
          "id",
          targetUser.id
        );

    if (
      profileDeleteError
    ) {
      throw new Error(
        "تعذر حذف المستخدم من النظام. قد تكون هناك سجلات مرتبطة بهذا الحساب تمنع الحذف. عطّل الحساب بدلًا من حذفه في هذه الحالة.\n\n" +
          profileDeleteError.message
      );
    }

    /* --------------------------------------------------------
       حذف حساب Supabase Auth
    -------------------------------------------------------- */

    const {
      error: authDeleteError,
    } =
      await admin.auth.admin.deleteUser(
        targetUser.auth_user_id
      );

    if (
      authDeleteError
    ) {
      throw new Error(
        "تم حذف مستخدم النظام، لكن تعذر حذف حساب تسجيل الدخول: " +
          authDeleteError.message
      );
    }

    revalidatePath(
      "/users"
    );

    return {
      success: true,
      userId:
        targetUser.id,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر حذف المستخدم.",
    };
  }
}