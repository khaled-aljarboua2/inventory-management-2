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
