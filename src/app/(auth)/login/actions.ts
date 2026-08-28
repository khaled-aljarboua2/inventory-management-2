"use server";

import { createClient } from "../../../lib/supabase/server";
import {
  createClient as createAdminClient,
} from "@supabase/supabase-js";

/* ============================================================
   Admin Client
============================================================ */

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

/* ============================================================
   تسجيل الدخول
============================================================ */

export async function loginWithUsernameOrEmail(
  identifier: string,
  password: string
) {
  const value =
    identifier.trim();

  if (!value || !password) {
    return {
      success: false,
      error:
        "يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور.",
    };
  }

  const admin =
    getAdminClient();

  let email = value;

  /* ==========================================================
     البحث عن المستخدم
  ========================================================== */

  let profile = null;

  /* ==========================================================
     Username
  ========================================================== */

  if (!value.includes("@")) {
    const {
      data,
      error,
    } = await admin
      .from("users")
      .select("id, auth_user_id, email, is_active")
      .eq(
        "username",
        value
      )
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error:
          "تعذر التحقق من بيانات المستخدم.",
      };
    }

    profile = data;
  }

  /* ==========================================================
     Email
  ========================================================== */

  if (value.includes("@")) {
    const {
      data,
      error,
    } = await admin
      .from("users")
      .select("id, auth_user_id, email, is_active")
      .eq(
        "email",
        value.toLowerCase()
      )
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error:
          "تعذر التحقق من بيانات المستخدم.",
      };
    }

    profile = data;
  }

  /* ==========================================================
     المستخدم غير موجود
  ========================================================== */

  if (
    !profile ||
    !profile.email
  ) {
    return {
      success: false,
      error:
        "اسم المستخدم أو كلمة المرور غير صحيحة.",
    };
  }

  /* ==========================================================
     الحساب غير نشط
  ========================================================== */

  if (!profile.is_active) {
    return {
      success: false,
      error:
        "حسابك غير نشط. يرجى التواصل مع مسؤول النظام.",
    };
  }

  email =
    profile.email;

  /* ==========================================================
     تسجيل الدخول في Supabase Auth
  ========================================================== */

  const supabase =
    await createClient();

  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.signInWithPassword(
      {
        email,
        password,
      }
    );

  if (authError) {
    return {
      success: false,
      error:
        "اسم المستخدم أو كلمة المرور غير صحيحة.",
    };
  }

  // signInWithPassword يعيد هوية المستخدم الموثقة؛ مطابقتها مع ملفه
  // الذي تم التحقق من نشاطه قبل الدخول يغني عن طلبي شبكة إضافيين.
  if (!authData.user || authData.user.id !== profile.auth_user_id) {
    await supabase.auth.signOut();

    return {
      success: false,
      error: "تعذر التحقق من حساب المستخدم.",
    };
  }

  return {
    success: true,
    error: null,
  };
}
