"use server";

import { createClient } from "@/lib/supabase/server";

type CreateProductInput = {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  brand_id?: string;
  minimum_quantity: number;

  unit_id: string;
  conversion_factor: number;
  is_base: boolean;

  barcode?: string;
  barcode_unit_id?: string;
  barcode_is_default: boolean;
};

/* ============================================================
   جلب وحدات الشركة
============================================================ */

export async function getProductUnits() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      units: [],
      error: "يجب تسجيل الدخول أولًا.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("users")
    .select(
      "company_id, is_active"
    )
    .eq(
      "auth_user_id",
      user.id
    )
    .eq("is_active", true)
    .single();

  if (
    profileError ||
    !profile
  ) {
    return {
      success: false,
      units: [],
      error:
        "تعذر العثور على بيانات المستخدم.",
    };
  }

  const {
    data: units,
    error,
  } = await supabase
    .from("units")
    .select(
      "id, name, symbol"
    )
    .eq(
      "company_id",
      profile.company_id
    )
    .order("name");

  if (error) {
    return {
      success: false,
      units: [],
      error: error.message,
    };
  }

  return {
    success: true,
    units: units ?? [],
  };
}

/* ============================================================
   إنشاء منتج
============================================================ */

export async function createProduct(
  input: CreateProductInput
) {
  const supabase =
    await createClient();

  try {
    // ==========================================================
    // المستخدم الحالي
    // ==========================================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error:
          "يجب تسجيل الدخول أولًا.",
      };
    }

    // ==========================================================
    // المستخدم والشركة
    // ==========================================================

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("users")
      .select(
        "id, company_id, is_active"
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
      profileError ||
      !profile ||
      !profile.company_id
    ) {
      return {
        success: false,
        error:
          "تعذر العثور على الشركة المرتبطة بالمستخدم.",
      };
    }

    // ==========================================================
    // التحقق من البيانات
    // ==========================================================

    const sku =
      input.sku.trim();

    const name =
      input.name.trim();

    if (!sku) {
      return {
        success: false,
        error:
          "رمز المنتج مطلوب.",
      };
    }

    if (!name) {
      return {
        success: false,
        error:
          "اسم المنتج مطلوب.",
      };
    }

    if (!input.unit_id) {
      return {
        success: false,
        error:
          "الوحدة الأساسية مطلوبة.",
      };
    }

    if (
      !Number.isFinite(
        input.conversion_factor
      ) ||
      input.conversion_factor <= 0
    ) {
      return {
        success: false,
        error:
          "معامل التحويل يجب أن يكون أكبر من صفر.",
      };
    }

    if (
      input.is_base &&
      input.conversion_factor !== 1
    ) {
      return {
        success: false,
        error:
          "الوحدة الأساسية يجب أن يكون معاملها 1.",
      };
    }

    // ==========================================================
    // التحقق من الصلاحية
    // ==========================================================

    const {
      data: permissionResult,
      error: permissionError,
    } = await supabase.rpc(
      "has_permission",
      {
        permission_code:
          "products.create",
      }
    );

    if (
      permissionError ||
      permissionResult !== true
    ) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية إنشاء المنتجات.",
      };
    }

    // ==========================================================
    // منع تكرار SKU داخل الشركة
    // ==========================================================

    const {
      data: existingProduct,
    } =
      await supabase
        .from("products")
        .select("id")
        .eq(
          "company_id",
          profile.company_id
        )
        .eq("sku", sku)
        .maybeSingle();

    if (existingProduct) {
      return {
        success: false,
        error:
          "رمز المنتج (SKU) مستخدم مسبقًا.",
      };
    }

    // ==========================================================
    // إنشاء المنتج
    // ==========================================================

    const {
      data: product,
      error: productError,
    } =
      await supabase
        .from("products")
        .insert({
          company_id:
            profile.company_id,

          sku,

          name,

          description:
            input.description?.trim() ||
            null,

          category_id:
            input.category_id ||
            null,

          brand_id:
            input.brand_id ||
            null,

          minimum_quantity:
            Number(
              input.minimum_quantity
            ) || 0,
        })
        .select("id")
        .single();

    if (
      productError ||
      !product
    ) {
      return {
        success: false,
        error:
          productError?.message ||
          "تعذر إنشاء المنتج.",
      };
    }

    // ==========================================================
    // إضافة الوحدة
    // ==========================================================

    const {
      error: unitError,
    } = await supabase.rpc(
      "add_product_unit",
      {
        p_product_id:
          product.id,

        p_unit_id:
          input.unit_id,

        p_conversion_factor:
          input.conversion_factor,

        p_is_base:
          input.is_base,
      }
    );

    if (unitError) {
      await supabase
        .from("products")
        .delete()
        .eq(
          "id",
          product.id
        );

      return {
        success: false,
        error:
          unitError.message ||
          "تعذر إضافة وحدة المنتج.",
      };
    }

    // ==========================================================
    // إضافة الباركود إذا أدخله المستخدم
    // ==========================================================

    if (
      input.barcode?.trim()
    ) {
      const {
        error: barcodeError,
      } = await supabase.rpc(
        "add_product_barcode",
        {
          p_product_id:
            product.id,

          p_unit_id:
            input.barcode_unit_id ||
            input.unit_id,

          p_barcode:
            input.barcode.trim(),

          p_is_default:
            input.barcode_is_default,
        }
      );

      if (barcodeError) {
        return {
          success: false,
          error:
            "تم إنشاء المنتج والوحدة، لكن تعذر إضافة الباركود: " +
            barcodeError.message,
        };
      }
    }

    // ==========================================================
    // إنشاء أرصدة ابتدائية للمنتج
    //
    // يتم تنفيذها داخل PostgreSQL عبر SECURITY DEFINER.
    //
    // ينشأ رصيد 0 في جميع المواقع النشطة للشركة.
    //
    // لا يتم إنشاء أي حركة مخزون.
    // ==========================================================

    const {
      error: stockError,
    } = await supabase.rpc(
      "initialize_product_stock_balances",
      {
        p_product_id:
          product.id,

        p_company_id:
          profile.company_id,
      }
    );

    if (stockError) {
      return {
        success: false,
        error:
          "تم إنشاء المنتج والوحدة، لكن تعذر إنشاء أرصدة المخزون: " +
          stockError.message,
      };
    }

    // ==========================================================
    // النجاح
    // ==========================================================

    return {
      success: true,
      productId:
        product.id,
    };
  } catch (error) {
    console.error(
      "createProduct:",
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

/* ============================================================
   تغيير حالة المنتج
============================================================ */

export async function setProductStatus(
  productId: string,
  isActive: boolean
) {
  const supabase =
    await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error:
          "يجب تسجيل الدخول أولًا.",
      };
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("users")
        .select(
          "company_id, is_active"
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
      profileError ||
      !profile
    ) {
      return {
        success: false,
        error:
          "تعذر العثور على بيانات المستخدم.",
      };
    }

    const { error } =
      await supabase
        .from("products")
        .update({
          is_active:
            isActive,
        })
        .eq(
          "id",
          productId
        )
        .eq(
          "company_id",
          profile.company_id
        );

    if (error) {
      return {
        success: false,
        error:
          error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "setProductStatus:",
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

/* ============================================================
   تعديل المنتج
============================================================ */

export async function updateProduct(
  productId: string,
  input: {
    sku: string;
    name: string;
    description?: string;
    category_id?: string;
    brand_id?: string;
    minimum_quantity: number;
  }
) {
  const supabase =
    await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error:
          "يجب تسجيل الدخول أولًا.",
      };
    }

    const {
      data: profile,
      error: profileError,
    } =
      await supabase
        .from("users")
        .select(
          "company_id, is_active"
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
      profileError ||
      !profile?.company_id
    ) {
      return {
        success: false,
        error:
          "تعذر العثور على الشركة المرتبطة بالمستخدم.",
      };
    }

    const sku =
      input.sku.trim();

    const name =
      input.name.trim();

    if (!sku) {
      return {
        success: false,
        error:
          "رمز المنتج مطلوب.",
      };
    }

    if (!name) {
      return {
        success: false,
        error:
          "اسم المنتج مطلوب.",
      };
    }

    if (
      !Number.isFinite(
        input.minimum_quantity
      ) ||
      input.minimum_quantity < 0
    ) {
      return {
        success: false,
        error:
          "الحد الأدنى للمخزون يجب أن يكون صفرًا أو أكثر.",
      };
    }

    // ==========================================================
    // صلاحية التعديل
    // ==========================================================

    const {
      data: permissionResult,
      error: permissionError,
    } =
      await supabase.rpc(
        "has_permission",
        {
          permission_code:
            "products.update",
        }
      );

    if (
      permissionError ||
      permissionResult !== true
    ) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية تعديل المنتجات.",
      };
    }

    // ==========================================================
    // التأكد أن المنتج تابع للشركة
    // ==========================================================

    const {
      data: existingProduct,
      error: productError,
    } =
      await supabase
        .from("products")
        .select("id")
        .eq(
          "id",
          productId
        )
        .eq(
          "company_id",
          profile.company_id
        )
        .maybeSingle();

    if (productError) {
      return {
        success: false,
        error:
          productError.message,
      };
    }

    if (!existingProduct) {
      return {
        success: false,
        error:
          "المنتج غير موجود.",
      };
    }

    // ==========================================================
    // منع تكرار SKU
    // ==========================================================

    const {
      data: duplicateSku,
    } =
      await supabase
        .from("products")
        .select("id")
        .eq(
          "company_id",
          profile.company_id
        )
        .eq(
          "sku",
          sku
        )
        .neq(
          "id",
          productId
        )
        .maybeSingle();

    if (duplicateSku) {
      return {
        success: false,
        error:
          "رمز المنتج (SKU) مستخدم مسبقًا.",
      };
    }

    // ==========================================================
    // تحديث المنتج
    // ==========================================================

    const {
      error: updateError,
    } =
      await supabase
        .from("products")
        .update({
          sku,

          name,

          description:
            input.description?.trim() ||
            null,

          category_id:
            input.category_id ||
            null,

          brand_id:
            input.brand_id ||
            null,

          minimum_quantity:
            Number(
              input.minimum_quantity
            ) || 0,
        })
        .eq(
          "id",
          productId
        )
        .eq(
          "company_id",
          profile.company_id
        );

    if (updateError) {
      return {
        success: false,
        error:
          updateError.message ||
          "تعذر تحديث المنتج.",
      };
    }

    return {
      success: true,
      productId,
    };
  } catch (error) {
    console.error(
      "updateProduct:",
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