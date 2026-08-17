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
    // 3) التحقق من صلاحية الجرد
    // ============================================================

    const {
      data: permission,
      error:
        permissionError,
    } = await supabase
      .from("role_permissions")
      .select(`
        permission_id,
        permissions!inner (
          id,
          code
        )
      `)
      .eq(
        "role_id",
        dbUser.role_id
      )
      .eq(
        "permissions.code",
        "stock.count"
      )
      .maybeSingle();

    if (
      permissionError
    ) {
      console.error(
        "Permission check error:",
        permissionError
      );

      return NextResponse.json(
        {
          error:
            "تعذر التحقق من صلاحية المستخدم.",
        },
        { status: 500 }
      );
    }

    if (!permission) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية إنشاء جرد.",
        },
        { status: 403 }
      );
    }

    // ============================================================
    // 4) البيانات القادمة من الواجهة
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

    // ============================================================
    // 5) تحديد دور المستخدم
    // ============================================================

    const {
      data: role,
      error: roleError,
    } = await supabase
      .from("roles")
      .select(
        "id, name"
      )
      .eq(
        "id",
        dbUser.role_id
      )
      .single();

    if (
      roleError ||
      !role
    ) {
      return NextResponse.json(
        {
          error:
            "تعذر تحديد دور المستخدم.",
        },
        { status: 403 }
      );
    }

    const isGeneralManager =
      role.name ===
      "General Manager";

    // ============================================================
    // 6) المستخدم غير المدير العام:
    // لا يستطيع جرد إلا موقعه
    // ============================================================

    if (
      !isGeneralManager &&
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
    // 8) منع وجود جرد مفتوح للموقع نفسه
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
      throw existingError;
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
      throw (
        createError ??
        new Error(
          "تعذر إنشاء الجرد."
        )
      );
    }

    // ============================================================
    // 10) جلب جميع المنتجات النشطة في الشركة
    //
    // مهم:
    // لا نعتمد على stock_balances هنا.
    // حتى المنتج الذي ليس له رصيد بعد يظهر في الجرد.
    // ============================================================

    const {
      data: products,
      error:
        productsError,
    } = await supabase
      .from("products")
      .select(`
        id,
        is_active,
        company_id
      `)
      .eq(
        "company_id",
        dbUser.company_id
      )
      .eq(
        "is_active",
        true
      )
      .order("name");

    if (
      productsError
    ) {
      await supabase
        .from("stock_counts")
        .delete()
        .eq(
          "id",
          stockCount.id
        );

      throw productsError;
    }

    // ============================================================
    // 11) جلب أرصدة الموقع
    // ============================================================

    const {
      data: balances,
      error:
        balancesError,
    } = await supabase
      .from("stock_balances")
      .select(`
        product_id,
        available_quantity
      `)
      .eq(
        "location_id",
        locationId
      );

    if (
      balancesError
    ) {
      await supabase
        .from("stock_counts")
        .delete()
        .eq(
          "id",
          stockCount.id
        );

      throw balancesError;
    }

    // ============================================================
    // 12) تحويل الأرصدة إلى Map
    // ============================================================

    const balanceMap =
      new Map(
        (balances ?? []).map(
          (balance) => [
            balance.product_id,
            Number(
              balance.available_quantity ??
                0
            ),
          ]
        )
      );

    // ============================================================
    // 13) إنشاء بند جرد لكل منتج نشط
    //
    // إذا ما له رصيد:
    // system_quantity = 0
    // ============================================================

    const items =
      (products ?? []).map(
        (product) => ({
          id:
            crypto.randomUUID(),

          stock_count_id:
            stockCount.id,

          product_id:
            product.id,

          system_quantity:
            balanceMap.get(
              product.id
            ) ?? 0,

          counted_quantity:
            null,

          difference_quantity:
            null,

          notes:
            null,
        })
      );

    // ============================================================
    // 14) إدخال البنود
    // ============================================================

    if (
      items.length > 0
    ) {
      const {
        error:
          itemsError,
      } = await supabase
        .from(
          "stock_count_items"
        )
        .insert(items);

      if (
        itemsError
      ) {
        await supabase
          .from(
            "stock_counts"
          )
          .delete()
          .eq(
            "id",
            stockCount.id
          );

        throw itemsError;
      }
    }

    // ============================================================
    // 15) النتيجة
    // ============================================================

    return NextResponse.json(
      {
        success: true,

        count:
          stockCount,

        itemsCount:
          items.length,
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
      {
        status: 500,
      }
    );
  }
}