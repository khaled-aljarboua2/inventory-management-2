import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request
) {
  try {
    const supabase =
      await createClient();

    // ============================================================
    // 1) المستخدم الحالي
    // ============================================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "يجب تسجيل الدخول أولًا.",
        },
        { status: 401 }
      );
    }

    // ============================================================
    // 2) مستخدم النظام
    // ============================================================

    const {
      data: dbUser,
      error: userError,
    } = await supabase
      .from("users")
      .select(`
        id,
        company_id,
        location_id,
        role_id,
        is_active
      `)
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
      userError ||
      !dbUser
    ) {
      return NextResponse.json(
        {
          error:
            "لم يتم العثور على المستخدم في النظام.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // 3) صلاحية الجرد
    // ============================================================

    const { data: permission, error: permissionError } =
      await supabase.rpc("has_permission", {
        permission_code: "stock.count",
      });

    if (
      permissionError
    ) {
      return NextResponse.json(
        {
          error:
            "تعذر التحقق من صلاحية المستخدم.",
        },
        { status: 500 }
      );
    }

    if (permission !== true) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية إنشاء جرد.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // 4) بيانات الطلب
    // ============================================================

    const body =
      await request.json();

    const locationId =
      body?.locationId;

    const notes =
      typeof body?.notes ===
      "string"
        ? body.notes.trim() ||
          null
        : null;

    if (!locationId) {
      return NextResponse.json(
        {
          error:
            "اختر الموقع أولًا.",
        },
        { status: 400 }
      );
    }

    const { data: hasFullAccess, error: fullAccessError } =
      await supabase.rpc("has_full_location_access");

    if (fullAccessError) {
      return NextResponse.json(
        { error: "تعذر التحقق من نطاق وصول المستخدم." },
        { status: 403 }
      );
    }

    const canCountAnyLocation = hasFullAccess === true;

    if (
      !canCountAnyLocation &&
      dbUser.location_id !==
        locationId
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك إنشاء جرد إلا لموقعك المرتبط بحسابك.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // 7) التحقق من الموقع
    //
    // حتى admin لا يستطيع الوصول إلى موقع تابع لشركة أخرى.
    // ============================================================

    const {
      data: location,
      error:
        locationError,
    } = await supabase
      .from("locations")
      .select(`
        id,
        company_id,
        name,
        code,
        type,
        is_active
      `)
      .eq(
        "id",
        locationId
      )
      .eq(
        "company_id",
        dbUser.company_id
      )
      .eq(
        "is_active",
        true
      )
      .single();

    if (
      locationError ||
      !location
    ) {
      return NextResponse.json(
        {
          error:
            "الموقع غير موجود أو غير تابع للشركة.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // 8) منع وجود جرد مفتوح للموقع
    // ============================================================

    const {
      data: existingCount,
      error:
        existingError,
    } = await supabase
      .from("stock_counts")
      .select(
        "id, status"
      )
      .eq(
        "location_id",
        locationId
      )
      .neq(
        "status",
        "completed"
      )
      .limit(1)
      .maybeSingle();

    if (
      existingError
    ) {
      return NextResponse.json(
        {
          error:
            existingError.message,
        },
        { status: 500 }
      );
    }

    if (existingCount) {
      return NextResponse.json(
        {
          error:
            "يوجد جرد مفتوح لهذا الموقع بالفعل.",
        },
        { status: 409 }
      );
    }

    // ============================================================
    // 9) إنشاء الجرد
    //
    // يبدأ الجرد فارغًا.
    // لا تتم إضافة المنتجات هنا.
    // ============================================================

    const {
      data: stockCount,
      error:
        createError,
    } = await supabase
      .from("stock_counts")
      .insert({
        location_id:
          locationId,

        created_by:
          dbUser.id,

        status:
          "in_progress",

        notes,
      })
      .select(`
        id,
        location_id,
        created_by,
        status,
        notes,
        created_at,
        completed_at
      `)
      .single();

    if (
      createError ||
      !stockCount
    ) {
      if (createError?.code === "23505") {
        return NextResponse.json(
          { error: "يوجد جرد مفتوح لهذا الموقع بالفعل." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error:
            createError?.message ||
            "تعذر إنشاء الجرد.",
        },
        { status: 500 }
      );
    }

    // ============================================================
    // 10) النجاح
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        count: stockCount,
        itemsCount: 0,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/inventory/counts:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر إنشاء الجرد.",
      },
      { status: 500 }
    );
  }
}
