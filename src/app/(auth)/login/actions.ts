"use server";

import { createClient } from "../../../lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL غير موجود."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY غير موجود."
    );
  }

  return createAdminClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function loginWithUsernameOrEmail(
  identifier: string,
  password: string
) {
  const value = identifier.trim();

  if (!value || !password) {
    return {
      success: false,
      error:
        "يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور.",
    };
  }

  let email = value;

  // ============================================================
  // إذا كان المدخل Username
  // ============================================================

  if (!value.includes("@")) {
    const admin =
      getAdminClient();

    const {
      data: profile,
      error: profileError,
    } = await admin
      .from("users")
      .select(
        "email, is_active"
      )
      .eq(
        "username",
        value
      )
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      !profile.email ||
      !profile.is_active
    ) {
      return {
        success: false,
        error:
          "اسم المستخدم أو كلمة المرور غير صحيحة.",
      };
    }

    email = profile.email;
  }

  // ============================================================
  // تسجيل الدخول في Supabase Auth
  // ============================================================

  const supabase =
    await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    return {
      success: false,
      error:
        "اسم المستخدم أو كلمة المرور غير صحيحة.",
    };
  }

  return {
    success: true,
    error: null,
  };
}