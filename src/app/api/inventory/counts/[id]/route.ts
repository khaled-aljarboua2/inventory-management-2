import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function getCurrentUser(supabase: any) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: dbUser, error } = await supabase
    .from("users")
    .select(`
      id,
      auth_user_id,
      company_id,
      location_id,
      role_id,
      is_active,
      roles (
        id,
        name
      )
    `)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !dbUser) {
    return null;
  }

  return dbUser;
}

async function canAccessCount(
  supabase: any,
  dbUser: any,
  locationId: string
) {
  const { data: hasFullAccess } = await supabase.rpc(
    "has_full_location_access"
  );

  if (hasFullAccess === true) {
    return true;
  }

  // المستخدم العادي: موقعه فقط
  return dbUser.location_id === locationId;
}


/*
|--------------------------------------------------------------------------
| GET
| تحميل تفاصيل الجرد
|--------------------------------------------------------------------------
*/

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const supabase = await createClient();

    const { id: countId } =
      await context.params;

    if (!countId) {
      return NextResponse.json(
        {
          error: "معرف الجرد غير موجود.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // المستخدم
    // ----------------------------------------------------------

    const dbUser =
      await getCurrentUser(supabase);

    if (!dbUser) {
      return NextResponse.json(
        {
          error:
            "يجب تسجيل الدخول أولًا.",
        },
        { status: 401 }
      );
    }

    // ----------------------------------------------------------
    // الصلاحية
    // ----------------------------------------------------------

    const {
      data: permission,
      error: permissionError,
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

    if (permissionError) {
      console.error(
        "Permission error:",
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
            "ليس لديك صلاحية إدارة الجرد.",
        },
        { status: 403 }
      );
    }

    // ----------------------------------------------------------
    // جلب الجرد
    // ----------------------------------------------------------

    const {
      data: stockCount,
      error: countError,
    } = await supabase
      .from("stock_counts")
      .select(`
        id,
        status,
        location_id,
        created_by,
        notes,
        created_at,
        completed_at,
        locations (
          id,
          name,
          code
        ),
        stock_count_items (
          id,
          product_id,
          system_quantity,
          counted_quantity,
          difference_quantity,
          notes,
          products (
            id,
            name,
            sku
          )
        )
      `)
      .eq("id", countId)
      .single();

    if (countError || !stockCount) {
      console.error(
        "Stock count load error:",
        countError
      );

      return NextResponse.json(
        {
          error:
            countError?.message ||
            "الجرد غير موجود.",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------------------------
    // التحقق من الشركة
    // ----------------------------------------------------------

    const { data: location } =
      await supabase
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
          stockCount.location_id
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

    if (!location) {
      return NextResponse.json(
        {
          error:
            "الجرد غير تابع للشركة الحالية.",
        },
        { status: 403 }
      );
    }

    // ----------------------------------------------------------
    // صلاحية الموقع
    // ----------------------------------------------------------

    const allowed =
      await canAccessCount(
        supabase,
        dbUser,
        stockCount.location_id
      );

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك الوصول إلى جرد هذا الموقع.",
        },
        { status: 403 }
      );
    }

    // ----------------------------------------------------------
    // تجهيز العناصر بالشكل الذي يتوقعه CountDetail
    // ----------------------------------------------------------

    const items =
      (stockCount.stock_count_items ?? []).map(
        (item: any) => ({
          id: item.id,
          product_id: item.product_id,
          system_quantity:
            Number(
              item.system_quantity ?? 0
            ),
          counted_quantity:
            item.counted_quantity === null
              ? null
              : Number(
                  item.counted_quantity
                ),
          difference_quantity:
            item.difference_quantity === null ||
            item.difference_quantity === undefined
              ? null
              : Number(
                  item.difference_quantity
                ),
          notes: item.notes ?? null,
          products: item.products
            ? {
                id: item.products.id,
                name: item.products.name,
                sku: item.products.sku,
              }
            : null,
        })
      );

    return NextResponse.json({
      success: true,

      count: {
        id: stockCount.id,
        status: stockCount.status,

        location_id:
          stockCount.location_id,

        locations: location
          ? {
              id: location.id,
              name: location.name,
              code: location.code,
            }
          : null,

        created_by:
          stockCount.created_by,

        notes:
          stockCount.notes,

        created_at:
          stockCount.created_at,

        completed_at:
          stockCount.completed_at,

        items,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/inventory/counts/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحميل الجرد.",
      },
      { status: 500 }
    );
  }
}


/*
|--------------------------------------------------------------------------
| PATCH
| حفظ الكميات الفعلية
|--------------------------------------------------------------------------
*/

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const supabase = await createClient();

    const { id: countId } =
      await context.params;

    if (!countId) {
      return NextResponse.json(
        {
          error:
            "معرف الجرد غير موجود.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // المستخدم
    // ----------------------------------------------------------

    const dbUser =
      await getCurrentUser(supabase);

    if (!dbUser) {
      return NextResponse.json(
        {
          error:
            "يجب تسجيل الدخول أولًا.",
        },
        { status: 401 }
      );
    }

    // ----------------------------------------------------------
    // الصلاحية
    // ----------------------------------------------------------

    const {
      data: permission,
      error: permissionError,
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
      permissionError ||
      !permission
    ) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية تعديل الجرد.",
        },
        { status: 403 }
      );
    }

    // ----------------------------------------------------------
    // جلب الجرد
    // ----------------------------------------------------------

    const {
      data: stockCount,
      error: countError,
    } = await supabase
      .from("stock_counts")
      .select(`
        id,
        status,
        location_id
      `)
      .eq(
        "id",
        countId
      )
      .single();

    if (
      countError ||
      !stockCount
    ) {
      return NextResponse.json(
        {
          error:
            "الجرد غير موجود.",
        },
        { status: 404 }
      );
    }

    // ----------------------------------------------------------
    // الموقع
    // ----------------------------------------------------------

    const { data: location } =
      await supabase
        .from("locations")
        .select(`
          id,
          company_id,
          is_active
        `)
        .eq(
          "id",
          stockCount.location_id
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

    if (!location) {
      return NextResponse.json(
        {
          error:
            "موقع الجرد غير تابع للشركة.",
        },
        { status: 403 }
      );
    }

    // ----------------------------------------------------------
    // صلاحية الموقع
    // ----------------------------------------------------------

    const allowed =
      await canAccessCount(
        supabase,
        dbUser,
        stockCount.location_id
      );

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك تعديل جرد موقع آخر.",
        },
        { status: 403 }
      );
    }

    // ----------------------------------------------------------
    // منع تعديل الجرد المكتمل
    // ----------------------------------------------------------

    if (
      stockCount.status ===
      "completed"
    ) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تعديل جرد مكتمل.",
        },
        { status: 409 }
      );
    }

    // ----------------------------------------------------------
    // بيانات الطلب
    // ----------------------------------------------------------

    const body =
      await request.json();

    const items =
      Array.isArray(body?.items)
        ? body.items
        : [];

    if (items.length === 0) {
      return NextResponse.json(
        {
          error:
            "لا توجد أصناف للحفظ.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // تحديث كل صنف
    // ----------------------------------------------------------

    for (const item of items) {
      if (!item?.id) {
        continue;
      }

      const countedQuantity =
        item.counted_quantity === null ||
        item.counted_quantity === undefined ||
        item.counted_quantity === ""
          ? null
          : Number(
              item.counted_quantity
            );

      if (
        countedQuantity !== null &&
        (
          !Number.isFinite(
            countedQuantity
          ) ||
          countedQuantity < 0
        )
      ) {
        return NextResponse.json(
          {
            error:
              "الكمية الفعلية يجب أن تكون رقمًا صحيحًا أو عشريًا موجبًا.",
          },
          { status: 400 }
        );
      }

      const {
        data: countItem,
        error: itemError,
      } = await supabase
        .from("stock_count_items")
        .select(`
          id,
          system_quantity
        `)
        .eq(
          "id",
          item.id
        )
        .eq(
          "stock_count_id",
          countId
        )
        .single();

      if (
        itemError ||
        !countItem
      ) {
        return NextResponse.json(
          {
            error:
              "أحد أصناف الجرد غير صحيح.",
          },
          { status: 400 }
        );
      }

      const systemQuantity =
        Number(
          countItem.system_quantity ?? 0
        );

      const difference =
        countedQuantity === null
          ? null
          : countedQuantity -
            systemQuantity;

      const {
        error: updateError,
      } = await supabase
        .from("stock_count_items")
        .update({
          counted_quantity:
            countedQuantity,

          difference_quantity:
            difference,

          notes:
            typeof item.notes ===
            "string"
              ? item.notes.trim() ||
                null
              : null,
        })
        .eq(
          "id",
          item.id
        )
        .eq(
          "stock_count_id",
          countId
        );

      if (updateError) {
        console.error(
          "Stock count item update error:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              updateError.message ||
              "تعذر حفظ كمية الصنف.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "تم حفظ كميات الجرد بنجاح.",
    });
  } catch (error) {
    console.error(
      "PATCH /api/inventory/counts/[id] error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر حفظ الكميات.",
      },
      { status: 500 }
    );
  }
}
