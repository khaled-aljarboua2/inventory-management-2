"use server";

import { createClient } from "@/lib/supabase/server";

type SupplierInput = {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
};

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولًا.");
  }

  const { data: dbUser, error } = await supabase
    .from("users")
    .select("id, company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !dbUser) {
    throw new Error(
      "لم يتم العثور على المستخدم في النظام."
    );
  }

  return {
    supabase,
    user: dbUser,
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

  if (error) {
    throw new Error(error.message);
  }

  if (data !== true) {
    throw new Error(
      "ليس لديك صلاحية تنفيذ هذه العملية."
    );
  }
}

export async function createSupplier(
  input: SupplierInput
) {
  try {
    const { supabase, user } =
      await getCurrentUser();

    await checkPermission(
      supabase,
      "suppliers.create"
    );

    const name = input.name.trim();

    if (!name) {
      throw new Error(
        "اسم المورد مطلوب."
      );
    }

    const { data: existingSupplier } =
      await supabase
        .from("suppliers")
        .select("id")
        .eq("company_id", user.company_id)
        .ilike("name", name)
        .maybeSingle();

    if (existingSupplier) {
      throw new Error(
        "يوجد مورد بنفس الاسم."
      );
    }

    const { data, error } =
      await supabase
        .from("suppliers")
        .insert({
          company_id: user.company_id,
          name,
          contact_person:
            input.contact_person.trim() ||
            null,
          phone:
            input.phone.trim() || null,
          email:
            input.email.trim() || null,
          address:
            input.address.trim() || null,
          is_active: true,
        })
        .select(
          "id, name, contact_person, phone, email, address, is_active"
        )
        .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      supplier: data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر إنشاء المورد.",
    };
  }
}

export async function updateSupplier(
  supplierId: string,
  input: SupplierInput
) {
  try {
    const { supabase, user } =
      await getCurrentUser();

    await checkPermission(
      supabase,
      "suppliers.update"
    );

    const name = input.name.trim();

    if (!name) {
      throw new Error(
        "اسم المورد مطلوب."
      );
    }

    const { data: existingSupplier } =
      await supabase
        .from("suppliers")
        .select("id")
        .eq("company_id", user.company_id)
        .ilike("name", name)
        .neq("id", supplierId)
        .maybeSingle();

    if (existingSupplier) {
      throw new Error(
        "يوجد مورد آخر بنفس الاسم."
      );
    }

    const { data, error } =
      await supabase
        .from("suppliers")
        .update({
          name,
          contact_person:
            input.contact_person.trim() ||
            null,
          phone:
            input.phone.trim() || null,
          email:
            input.email.trim() || null,
          address:
            input.address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplierId)
        .eq(
          "company_id",
          user.company_id
        )
        .select(
          "id, name, contact_person, phone, email, address, is_active"
        )
        .single();

    if (error || !data) {
      throw new Error(
        error?.message ??
          "تعذر تحديث المورد."
      );
    }

    return {
      success: true,
      supplier: data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر تحديث المورد.",
    };
  }
}

export async function toggleSupplierStatus(
  supplierId: string,
  isActive: boolean
) {
  try {
    const { supabase, user } =
      await getCurrentUser();

    await checkPermission(
      supabase,
      "suppliers.update"
    );

    const { error } =
      await supabase
        .from("suppliers")
        .update({
          is_active: isActive,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", supplierId)
        .eq(
          "company_id",
          user.company_id
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر تغيير حالة المورد.",
    };
  }
}

export async function deleteSupplier(
  supplierId: string
) {
  try {
    const { supabase, user } =
      await getCurrentUser();

    await checkPermission(
      supabase,
      "suppliers.delete"
    );

    const { error } =
      await supabase
        .from("suppliers")
        .delete()
        .eq("id", supplierId)
        .eq(
          "company_id",
          user.company_id
        );

    if (error) {
      throw new Error(
        "لا يمكن حذف المورد. قد يكون مرتبطًا بأوامر شراء أو سجلات أخرى."
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر حذف المورد.",
    };
  }
}
