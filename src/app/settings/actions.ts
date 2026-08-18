"use server";

import { createClient } from "@/lib/supabase/server";

type UpdateSettingsInput = {
  require_transfer_approval: boolean;
  allow_negative_stock: boolean;
  default_language: string;
  timezone: string;
};

export async function updateSettings(
  input: UpdateSettingsInput
) {
  const supabase = await createClient();

  // ============================================================
  // المستخدم الحالي
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "يجب تسجيل الدخول أولًا.",
    };
  }

  // ============================================================
  // التحقق من صلاحية التعديل
  // ============================================================

  const {
    data: canUpdate,
    error: permissionError,
  } = await supabase.rpc("has_permission", {
    permission_code: "settings.update",
  });

  if (
    permissionError ||
    canUpdate !== true
  ) {
    return {
      success: false,
      error: "ليس لديك صلاحية تعديل إعدادات النظام.",
    };
  }

  // ============================================================
  // المستخدم الحالي
  // ============================================================

  const {
    data: currentUser,
    error: userError,
  } = await supabase
    .from("users")
    .select("id, company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (
    userError ||
    !currentUser
  ) {
    return {
      success: false,
      error: "لم يتم العثور على المستخدم الحالي.",
    };
  }

  // ============================================================
  // التحقق من القيم
  // ============================================================

  const allowedLanguages = [
    "ar",
    "en",
  ];

  const allowedTimezones = [
    "Asia/Riyadh",
    "UTC",
    "Europe/London",
    "America/New_York",
  ];

  if (
    !allowedLanguages.includes(
      input.default_language
    )
  ) {
    return {
      success: false,
      error: "اللغة المحددة غير صحيحة.",
    };
  }

  if (
    !allowedTimezones.includes(
      input.timezone
    )
  ) {
    return {
      success: false,
      error: "المنطقة الزمنية المحددة غير صحيحة.",
    };
  }

  // ============================================================
  // البحث عن إعدادات الشركة
  // ============================================================

  const {
    data: existingSettings,
    error: settingsError,
  } = await supabase
    .from("settings")
    .select("id")
    .eq("company_id", currentUser.company_id)
    .maybeSingle();

  if (settingsError) {
    return {
      success: false,
      error:
        "تعذر الوصول إلى إعدادات الشركة.",
    };
  }

  // ============================================================
  // تحديث
  // ============================================================

  if (existingSettings) {
    const {
      error: updateError,
    } = await supabase
      .from("settings")
      .update({
        require_transfer_approval:
          input.require_transfer_approval,

        allow_negative_stock:
          input.allow_negative_stock,

        default_language:
          input.default_language,

        timezone:
          input.timezone,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        existingSettings.id
      );

    if (updateError) {
      return {
        success: false,
        error:
          updateError.message ||
          "تعذر حفظ الإعدادات.",
      };
    }
  } else {
    // ==========================================================
    // إنشاء إعدادات الشركة لأول مرة
    // ==========================================================

    const {
      error: insertError,
    } = await supabase
      .from("settings")
      .insert({
        company_id:
          currentUser.company_id,

        require_transfer_approval:
          input.require_transfer_approval,

        allow_negative_stock:
          input.allow_negative_stock,

        default_language:
          input.default_language,

        timezone:
          input.timezone,
      });

    if (insertError) {
      return {
        success: false,
        error:
          insertError.message ||
          "تعذر إنشاء إعدادات الشركة.",
      };
    }
  }

  return {
    success: true,
  };
}