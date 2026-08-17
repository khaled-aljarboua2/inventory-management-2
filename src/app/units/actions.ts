"use server";

import { createClient } from "@/lib/supabase/server";

type UnitInput = {
  name: string;
  symbol?: string;
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

export async function createUnit(input: UnitInput) {
  const supabase = await createClient();
  const profile = await getActiveUser();

  if (!profile) {
    return {
      success: false,
      error: "يجب تسجيل الدخول أولًا.",
    };
  }

  const name = input.name.trim();
  const symbol = input.symbol?.trim() || null;

  if (!name) {
    return {
      success: false,
      error: "اسم الوحدة مطلوب.",
    };
  }

  const { data, error } = await supabase
    .from("units")
    .insert({
      company_id: profile.company_id,
      name,
      symbol,
    })
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    unitId: data.id,
  };
}

export async function updateUnit(
  unitId: string,
  input: UnitInput
) {
  const supabase = await createClient();
  const profile = await getActiveUser();

  if (!profile) {
    return {
      success: false,
      error: "يجب تسجيل الدخول أولًا.",
    };
  }

  const name = input.name.trim();
  const symbol = input.symbol?.trim() || null;

  if (!unitId || !name) {
    return {
      success: false,
      error: "بيانات الوحدة غير مكتملة.",
    };
  }

  const { error } = await supabase
    .from("units")
    .update({
      name,
      symbol,
    })
    .eq("id", unitId)
    .eq("company_id", profile.company_id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}

export async function deleteUnit(unitId: string) {
  const supabase = await createClient();
  const profile = await getActiveUser();

  if (!profile) {
    return {
      success: false,
      error: "يجب تسجيل الدخول أولًا.",
    };
  }

  const { error } = await supabase
    .from("units")
    .delete()
    .eq("id", unitId)
    .eq("company_id", profile.company_id);

  if (error) {
    return {
      success: false,
      error: "تعذر حذف الوحدة. قد تكون مرتبطة بمنتجات.",
    };
  }

  return {
    success: true,
  };
}
