"use server";

import { createClient } from "@/lib/supabase/server";

type WarehouseInput = {
  name: string;
  code: string;
  city?: string;
  address?: string;
  parent_location_id?: string;
};

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null,
    };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  return {
    supabase,
    user,
    profile,
  };
}

async function checkPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  permission: string
) {
  const { data, error } = await supabase.rpc(
    "has_permission",
    {
      permission_code: permission,
    }
  );

  return !error && data === true;
}

export async function createWarehouse(
  input: WarehouseInput
) {
  try {
    const {
      supabase,
      user,
      profile,
    } = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول أولًا.",
      };
    }

    if (!profile?.company_id) {
      return {
        success: false,
        error:
          "تعذر العثور على الشركة المرتبطة بالمستخدم.",
      };
    }

    const allowed = await checkPermission(
      supabase,
      "locations.create"
    );

    if (!allowed) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية إضافة المستودعات.",
      };
    }

    const name = input.name.trim();
    const code = input.code.trim();

    if (!name) {
      return {
        success: false,
        error: "اسم المستودع مطلوب.",
      };
    }

    if (!code) {
      return {
        success: false,
        error: "رمز المستودع مطلوب.",
      };
    }

    // منع تكرار الرمز داخل الشركة
    const { data: existing } = await supabase
      .from("locations")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("code", code)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error:
          "رمز المستودع مستخدم مسبقًا.",
      };
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({
        company_id: profile.company_id,
        name,
        code,
        type: "warehouse",
        city: input.city?.trim() || null,
        address:
          input.address?.trim() || null,
        parent_location_id:
          input.parent_location_id || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        success: false,
        error:
          error?.message ||
          "تعذر إنشاء المستودع.",
      };
    }

    return {
      success: true,
      warehouseId: data.id,
    };
  } catch (error) {
    console.error(
      "createWarehouse:",
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

export async function updateWarehouse(
  id: string,
  input: WarehouseInput
) {
  try {
    const {
      supabase,
      user,
      profile,
    } = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول أولًا.",
      };
    }

    if (!profile?.company_id) {
      return {
        success: false,
        error:
          "تعذر العثور على الشركة المرتبطة بالمستخدم.",
      };
    }

    const allowed = await checkPermission(
      supabase,
      "locations.update"
    );

    if (!allowed) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية تعديل المستودعات.",
      };
    }

    const name = input.name.trim();
    const code = input.code.trim();

    if (!name) {
      return {
        success: false,
        error: "اسم المستودع مطلوب.",
      };
    }

    if (!code) {
      return {
        success: false,
        error: "رمز المستودع مطلوب.",
      };
    }

    const { data: existing } = await supabase
      .from("locations")
      .select("id")
      .eq("company_id", profile.company_id)
      .eq("code", code)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error:
          "رمز المستودع مستخدم مسبقًا.",
      };
    }

    const { error } = await supabase
      .from("locations")
      .update({
        name,
        code,
        city: input.city?.trim() || null,
        address:
          input.address?.trim() || null,
        parent_location_id:
          input.parent_location_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .eq("type", "warehouse");

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "updateWarehouse:",
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

export async function setWarehouseStatus(
  id: string,
  isActive: boolean
) {
  try {
    const {
      supabase,
      user,
      profile,
    } = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول أولًا.",
      };
    }

    if (!profile?.company_id) {
      return {
        success: false,
        error:
          "تعذر العثور على بيانات المستخدم.",
      };
    }

    const allowed = await checkPermission(
      supabase,
      "locations.update"
    );

    if (!allowed) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية تعديل المستودعات.",
      };
    }

    const { error } = await supabase
      .from("locations")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .eq("type", "warehouse");

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "setWarehouseStatus:",
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

export async function deleteWarehouse(
  id: string
) {
  try {
    const {
      supabase,
      user,
      profile,
    } = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: "يجب تسجيل الدخول أولًا.",
      };
    }

    if (!profile?.company_id) {
      return {
        success: false,
        error:
          "تعذر العثور على بيانات المستخدم.",
      };
    }

    const allowed = await checkPermission(
      supabase,
      "locations.delete"
    );

    if (!allowed) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية حذف المستودعات.",
      };
    }

    // التأكد أن الموقع مستودع تابع للشركة
    const { data: warehouse } =
      await supabase
        .from("locations")
        .select("id, name")
        .eq("id", id)
        .eq("company_id", profile.company_id)
        .eq("type", "warehouse")
        .maybeSingle();

    if (!warehouse) {
      return {
        success: false,
        error: "المستودع غير موجود.",
      };
    }

    /*
     * لاحقًا سنضيف هنا التحقق من وجود
     * حركات أو مخزون مرتبط بالمستودع.
     */

    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .eq("type", "warehouse");

    if (error) {
      return {
        success: false,
        error:
          "لا يمكن حذف المستودع. قد يكون مرتبطًا ببيانات أخرى.",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "deleteWarehouse:",
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
