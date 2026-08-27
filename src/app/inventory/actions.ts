"use server";

import { createClient } from "@/lib/supabase/server";

export async function adjustProductStock(input: {
  productId: string;
  locationId: string;
  adjustmentDelta: number;
  reason: string;
}) {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول أولًا.",
      };
    }

    if (!input.productId) {
      return {
        success: false,
        error: "المنتج مطلوب.",
      };
    }

    if (!input.locationId) {
      return {
        success: false,
        error: "الموقع مطلوب.",
      };
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("users")
      .select("company_id, role_id, location_id")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .single();

    if (profileError || !profile?.company_id) {
      return {
        success: false,
        error: "تعذر التحقق من الشركة المرتبطة بالمستخدم.",
      };
    }

    const {
      data: role,
      error: roleError,
    } = await supabase
      .from("roles")
      .select("name")
      .eq("id", profile.role_id)
      .single();

    if (roleError || !role) {
      return {
        success: false,
        error: "تعذر التحقق من صلاحية المستخدم.",
      };
    }

    const isAdmin = role.name === "admin";

    if (!isAdmin && profile.location_id !== input.locationId) {
      return {
        success: false,
        error: "يمكنك تعديل مخزون موقعك فقط.",
      };
    }

    const [
      { data: product, error: productError },
      { data: location, error: locationError },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id")
        .eq("id", input.productId)
        .eq("company_id", profile.company_id)
        .maybeSingle(),
      supabase
        .from("locations")
        .select("id")
        .eq("id", input.locationId)
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (productError || !product) {
      return {
        success: false,
        error: productError?.message ?? "المنتج غير متاح ضمن الشركة.",
      };
    }

    if (locationError || !location) {
      return {
        success: false,
        error: locationError?.message ?? "الموقع غير متاح ضمن الشركة.",
      };
    }

    if (
      !Number.isFinite(
        input.adjustmentDelta
      ) ||
      input.adjustmentDelta === 0
    ) {
      return {
        success: false,
        error:
          "يجب أن تكون كمية التعديل أكبر أو أقل من صفر.",
      };
    }

    const reason =
      input.reason.trim();

    if (!reason) {
      return {
        success: false,
        error: "سبب التعديل مطلوب.",
      };
    }

    // التحقق من الصلاحية
    const {
      data: hasPermission,
      error: permissionError,
    } = await supabase.rpc(
      "has_permission",
      {
        permission_code:
          "stock.adjust",
      }
    );

    if (
      permissionError ||
      hasPermission !== true
    ) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية تعديل المخزون.",
      };
    }

    // تنفيذ تعديل المخزون من خلال دالة قاعدة البيانات
    const {
      data,
      error,
    } = await supabase.rpc(
      "adjust_stock",
      {
        target_product_id:
          input.productId,

        target_location_id:
          input.locationId,

        adjustment_delta:
          input.adjustmentDelta,

        adjustment_reason:
          reason,
      }
    );

    if (error) {
      console.error(
        "adjustProductStock:",
        error
      );

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      adjustment: data,
    };
  } catch (error) {
    console.error(
      "adjustProductStock:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع.",
    };
  }
}
