"use server";

import { createClient } from "@/lib/supabase/server";

type ProductInput = {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  brand_id?: string;
  minimum_quantity?: number;
};

async function getActiveUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  return profile ?? null;
}

export async function createProduct(input: ProductInput) {
  const supabase = await createClient();
  const profile = await getActiveUser();

  if (!profile) {
    return { success: false, error: "يجب تسجيل الدخول أولًا." };
  }

  const sku = input.sku.trim();
  const name = input.name.trim();
  const minimumQuantity = Number(input.minimum_quantity ?? 0);

  if (!sku || !name) {
    return {
      success: false,
      error: "رمز المنتج واسم المنتج مطلوبان.",
    };
  }

  if (!Number.isFinite(minimumQuantity) || minimumQuantity < 0) {
    return {
      success: false,
      error: "الحد الأدنى للكمية غير صحيح.",
    };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      company_id: profile.company_id,
      sku,
      name,
      description: input.description?.trim() || null,
      category_id: input.category_id || null,
      brand_id: input.brand_id || null,
      minimum_quantity: minimumQuantity,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "رمز المنتج مستخدم مسبقًا.",
      };
    }

    return {
      success: false,
      error: "تعذر إنشاء المنتج.",
    };
  }

  return {
    success: true,
    productId: data.id,
  };
}

export async function updateProduct(
  productId: string,
  input: ProductInput
) {
  const supabase = await createClient();
  const profile = await getActiveUser();

  if (!profile) {
    return { success: false, error: "يجب تسجيل الدخول أولًا." };
  }

  const sku = input.sku.trim();
  const name = input.name.trim();
  const minimumQuantity = Number(input.minimum_quantity ?? 0);

  if (!productId || !sku || !name) {
    return {
      success: false,
      error: "بيانات المنتج غير مكتملة.",
    };
  }

  if (!Number.isFinite(minimumQuantity) || minimumQuantity < 0) {
    return {
      success: false,
      error: "الحد الأدنى للكمية غير صحيح.",
    };
  }

  const { error } = await supabase
    .from("products")
    .update({
      sku,
      name,
      description: input.description?.trim() || null,
      category_id: input.category_id || null,
      brand_id: input.brand_id || null,
      minimum_quantity: minimumQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("company_id", profile.company_id);

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "رمز المنتج مستخدم مسبقًا.",
      };
    }

    return {
      success: false,
      error: "تعذر تحديث المنتج.",
    };
  }

  return { success: true };
}

export async function setProductStatus(
  productId: string,
  isActive: boolean
) {
  const supabase = await createClient();
  const profile = await getActiveUser();

  if (!profile) {
    return { success: false, error: "يجب تسجيل الدخول أولًا." };
  }

  const { error } = await supabase
    .from("products")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("company_id", profile.company_id);

  if (error) {
    return {
      success: false,
      error: "تعذر تغيير حالة المنتج.",
    };
  }

  return { success: true };
}
