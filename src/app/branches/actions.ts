"use server";

import { createClient } from "@/lib/supabase/server";

type BranchInput = {
  name: string;
  code: string;
  city?: string;
  address?: string;
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

export async function createBranch(
  input: BranchInput
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

    if (
      !(await checkPermission(
        supabase,
        "locations.create"
      ))
    ) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية إضافة الفروع.",
      };
    }

    const name = input.name.trim();
    const code = input.code.trim();

    if (!name) {
      return {
        success: false,
        error: "اسم الفرع مطلوب.",
      };
    }

    if (!code) {
      return {
        success: false,
        error: "رمز الفرع مطلوب.",
      };
    }

    const { data: existing } =
      await supabase
        .from("locations")
        .select("id")
        .eq(
          "company_id",
          profile.company_id
        )
        .eq("code", code)
        .maybeSingle();

    if (existing) {
      return {
        success: false,
        error:
          "رمز الفرع مستخدم مسبقًا.",
      };
    }

    const { data, error } =
      await supabase
        .from("locations")
        .insert({
          company_id:
            profile.company_id,
          name,
          code,
          type: "branch",
          city:
            input.city?.trim() || null,
          address:
            input.address?.trim() || null,
          is_active: true,
        })
        .select("id")
        .single();

    if (error || !data) {
      return {
        success: false,
        error:
          error?.message ||
          "تعذر إنشاء الفرع.",
      };
    }

    return {
      success: true,
      branchId: data.id,
    };
  } catch (error) {
    console.error(
      "createBranch:",
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

export async function updateBranch(
  id: string,
  input: BranchInput
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

    if (
      !(await checkPermission(
        supabase,
        "locations.update"
      ))
    ) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية تعديل الفروع.",
      };
    }

    const name = input.name.trim();
    const code = input.code.trim();

    if (!name) {
      return {
        success: false,
        error: "اسم الفرع مطلوب.",
      };
    }

    if (!code) {
      return {
        success: false,
        error: "رمز الفرع مطلوب.",
      };
    }

    const { data: existing } =
      await supabase
        .from("locations")
        .select("id")
        .eq(
          "company_id",
          profile.company_id
        )
        .eq("code", code)
        .neq("id", id)
        .maybeSingle();

    if (existing) {
      return {
        success: false,
        error:
          "رمز الفرع مستخدم مسبقًا.",
      };
    }

    const { error } =
      await supabase
        .from("locations")
        .update({
          name,
          code,
          city:
            input.city?.trim() || null,
          address:
            input.address?.trim() || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .eq(
          "company_id",
          profile.company_id
        )
        .eq("type", "branch");

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
      "updateBranch:",
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

export async function setBranchStatus(
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

    if (
      !(await checkPermission(
        supabase,
        "locations.update"
      ))
    ) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية تعديل الفروع.",
      };
    }

    const { error } =
      await supabase
        .from("locations")
        .update({
          is_active: isActive,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .eq(
          "company_id",
          profile.company_id
        )
        .eq("type", "branch");

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
      "setBranchStatus:",
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

export async function deleteBranch(
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

    if (
      !(await checkPermission(
        supabase,
        "locations.delete"
      ))
    ) {
      return {
        success: false,
        error:
          "ليس لديك صلاحية حذف الفروع.",
      };
    }

    const { data: branch } =
      await supabase
        .from("locations")
        .select("id, name")
        .eq("id", id)
        .eq(
          "company_id",
          profile.company_id
        )
        .eq("type", "branch")
        .maybeSingle();

    if (!branch) {
      return {
        success: false,
        error: "الفرع غير موجود.",
      };
    }

    const { error } =
      await supabase
        .from("locations")
        .delete()
        .eq("id", id)
        .eq(
          "company_id",
          profile.company_id
        )
        .eq("type", "branch");

    if (error) {
      return {
        success: false,
        error:
          "لا يمكن حذف الفرع. قد يكون مرتبطًا ببيانات أخرى.",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "deleteBranch:",
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
