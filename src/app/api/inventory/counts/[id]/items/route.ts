import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AddItemsBody =
  | { mode: "all" }
  | { mode: "with_stock" }
  | {
      mode: "selected";
      productIds: string[];
    };

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// ============================================================
// المستخدم الحالي
// ============================================================

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      dbUser: null,
      response: NextResponse.json(
        {
          error: "يجب تسجيل الدخول أولًا.",
        },
        { status: 401 }
      ),
    };
  }

  const {
    data: dbUser,
    error,
  } = await supabase
    .from("users")
    .select(`
      id,
      company_id,
      location_id,
      role_id,
      is_active
    `)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !dbUser) {
    return {
      supabase,
      dbUser: null,
      response: NextResponse.json(
        {
          error:
            "لم يتم العثور على المستخدم في النظام.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    dbUser,
    response: null,
  };
}

// ============================================================
// التحقق من صلاحية الوصول للجرد
// ============================================================

async function validateCountAccess(
  supabase: any,
  dbUser: any,
  countId: string
) {
  // ==========================================================
  // صلاحية الجرد
  // ==========================================================

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
    .eq("role_id", dbUser.role_id)
    .eq("permissions.code", "stock.count")
    .maybeSingle();

  if (permissionError) {
    return {
      error:
        "تعذر التحقق من صلاحية المستخدم.",
      status: 500,
      stockCount: null,
    };
  }

  if (!permission) {
    return {
      error:
        "ليس لديك صلاحية إدارة أصناف الجرد.",
      status: 403,
      stockCount: null,
    };
  }

  // ==========================================================
  // جلب الجرد
  // ==========================================================

  const {
    data: stockCount,
    error: countError,
  } = await supabase
    .from("stock_counts")
    .select(`
      id,
      location_id,
      status,
      locations (
        id,
        company_id,
        name,
        code,
        is_active
      )
    `)
    .eq("id", countId)
    .single();

  if (countError || !stockCount) {
    return {
      error:
        countError?.message ||
        "الجرد غير موجود.",
      status: 404,
      stockCount: null,
    };
  }

  // ==========================================================
  // الموقع
  // ==========================================================

  const location = Array.isArray(
    stockCount.locations
  )
    ? stockCount.locations[0]
    : stockCount.locations;

  if (!location) {
    return {
      error:
        "لم يتم العثور على موقع الجرد.",
      status: 404,
      stockCount: null,
    };
  }

  // ==========================================================
  // عزل الشركة
  // ==========================================================

  if (
    location.company_id !==
    dbUser.company_id
  ) {
    return {
      error:
        "لا يمكنك الوصول إلى جرد تابع لشركة أخرى.",
      status: 403,
      stockCount: null,
    };
  }

  // ==========================================================
  // الموقع يجب أن يكون فعال
  // ==========================================================

  if (!location.is_active) {
    return {
      error:
        "موقع الجرد غير فعال.",
      status: 400,
      stockCount: null,
    };
  }

  // ==========================================================
  // منع تعديل جرد مكتمل
  // ==========================================================

  if (
    stockCount.status ===
    "completed"
  ) {
    return {
      error:
        "لا يمكن تعديل جرد مكتمل.",
      status: 400,
      stockCount: null,
    };
  }

  // ==========================================================
  // جلب الدور
  // ==========================================================

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

  if (roleError || !role) {
    return {
      error:
        "تعذر تحديد دور المستخدم.",
      status: 403,
      stockCount: null,
    };
  }

  // ==========================================================
  // تحديد الدور
  // ==========================================================

  const roleName =
    String(
      role.name ?? ""
    )
      .trim()
      .toLowerCase();

  const isAdmin =
    roleName === "admin";

  const isGeneralManager =
    roleName ===
    "general manager";

  // ==========================================================
  // Admin + General Manager
  // يستطيعون إدارة أي موقع داخل الشركة
  //
  // بقية المستخدمين:
  // موقعهم فقط
  // ==========================================================

  if (
    !isAdmin &&
    !isGeneralManager &&
    dbUser.location_id !==
      stockCount.location_id
  ) {
    return {
      error:
        "لا يمكنك إدارة جرد موقع آخر.",
      status: 403,
      stockCount: null,
    };
  }

  return {
    error: null,
    status: 200,
    stockCount,
  };
}

// ============================================================
// GET
// المنتجات المتاحة للإضافة للجرد
// ============================================================

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id: countId } =
      await params;

    // ==========================================================
    // المستخدم
    // ==========================================================

    const auth =
      await getAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    // ==========================================================
    // الصلاحية
    // ==========================================================

    const access =
      await validateCountAccess(
        auth.supabase,
        auth.dbUser,
        countId
      );

    if (access.error) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        }
      );
    }

    // ==========================================================
    // البحث
    // ==========================================================

    const url =
      new URL(request.url);

    const search =
      url.searchParams
        .get("search")
        ?.trim() ?? "";

    const withStock =
      url.searchParams.get(
        "withStock"
      ) === "true";

    // ==========================================================
    // المنتجات الموجودة مسبقًا في الجرد
    // ==========================================================

    const {
      data: existingItems,
      error: existingError,
    } = await auth.supabase
      .from(
        "stock_count_items"
      )
      .select(
        "product_id"
      )
      .eq(
        "stock_count_id",
        countId
      );

    if (existingError) {
      return NextResponse.json(
        {
          error:
            existingError.message,
        },
        { status: 500 }
      );
    }

    const existingIds =
      new Set(
        (existingItems ?? []).map(
          (item: any) =>
            item.product_id
        )
      );

    // ==========================================================
    // منتجات الشركة
    // ==========================================================

    let productsQuery =
      auth.supabase
        .from("products")
        .select(`
          id,
          name,
          sku
        `)
        .eq(
          "company_id",
          auth.dbUser.company_id
        )
        .eq(
          "is_active",
          true
        );

    if (search) {
      productsQuery =
        productsQuery.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%`
        );
    }

    const {
      data: products,
      error: productsError,
    } = await productsQuery
      .order("name")
      .limit(1000);

    if (productsError) {
      return NextResponse.json(
        {
          error:
            productsError.message,
        },
        { status: 500 }
      );
    }

    // ==========================================================
    // مخزون موقع الجرد فقط
    // ==========================================================

    const {
      data: balances,
      error: balancesError,
    } = await auth.supabase
      .from("stock_balances")
      .select(`
        product_id,
        available_quantity
      `)
      .eq(
        "location_id",
        access.stockCount
          .location_id
      );

    if (balancesError) {
      return NextResponse.json(
        {
          error:
            balancesError.message,
        },
        { status: 500 }
      );
    }

    const balanceMap =
      new Map(
        (balances ?? []).map(
          (balance: any) => [
            balance.product_id,
            Number(
              balance.available_quantity ??
                0
            ),
          ]
        )
      );

    // ==========================================================
    // النتيجة
    // ==========================================================

    let result =
      (products ?? [])
        .filter(
          (product: any) =>
            !existingIds.has(
              product.id
            )
        )
        .map(
          (product: any) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            system_quantity:
              balanceMap.get(
                product.id
              ) ?? 0,
          })
        );

    // ==========================================================
    // المنتجات التي لديها مخزون فقط
    // ==========================================================

    if (withStock) {
      result =
        result.filter(
          (product: any) =>
            product.system_quantity >
            0
        );
    }

    return NextResponse.json({
      success: true,
      products: result,
    });
  } catch (error) {
    console.error(
      "GET /api/inventory/counts/[id]/items:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحميل المنتجات.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST
// إضافة منتجات للجرد
// ============================================================

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id: countId } =
      await params;

    // ==========================================================
    // المستخدم
    // ==========================================================

    const auth =
      await getAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    // ==========================================================
    // الصلاحية
    // ==========================================================

    const access =
      await validateCountAccess(
        auth.supabase,
        auth.dbUser,
        countId
      );

    if (access.error) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        }
      );
    }

    // ==========================================================
    // الطلب
    // ==========================================================

    const body =
      (await request.json()) as AddItemsBody;

    if (
      body.mode !== "all" &&
      body.mode !== "with_stock" &&
      body.mode !== "selected"
    ) {
      return NextResponse.json(
        {
          error:
            "طريقة إضافة المنتجات غير صالحة.",
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // selected
    // ==========================================================

    if (
      body.mode ===
        "selected" &&
      (
        !Array.isArray(
          body.productIds
        ) ||
        body.productIds.length ===
          0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "اختر منتجًا واحدًا على الأقل.",
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // المنتجات الموجودة
    // ==========================================================

    const {
      data: existingItems,
      error: existingError,
    } = await auth.supabase
      .from(
        "stock_count_items"
      )
      .select(
        "product_id"
      )
      .eq(
        "stock_count_id",
        countId
      );

    if (existingError) {
      return NextResponse.json(
        {
          error:
            existingError.message,
        },
        { status: 500 }
      );
    }

    const existingIds =
      new Set(
        (existingItems ?? []).map(
          (item: any) =>
            item.product_id
        )
      );

    // ==========================================================
    // المنتجات
    // ==========================================================

    let productsQuery =
      auth.supabase
        .from("products")
        .select(`
          id,
          name,
          sku
        `)
        .eq(
          "company_id",
          auth.dbUser.company_id
        )
        .eq(
          "is_active",
          true
        );

    if (
      body.mode ===
      "selected"
    ) {
      productsQuery =
        productsQuery.in(
          "id",
          body.productIds
        );
    }

    const {
      data: products,
      error: productsError,
    } = await productsQuery
      .order("name")
      .limit(1000);

    if (productsError) {
      return NextResponse.json(
        {
          error:
            productsError.message,
        },
        { status: 500 }
      );
    }

    // ==========================================================
    // مخزون الفرع المحدد في الجرد
    // ==========================================================

    const {
      data: balances,
      error: balancesError,
    } = await auth.supabase
      .from("stock_balances")
      .select(`
        product_id,
        available_quantity
      `)
      .eq(
        "location_id",
        access.stockCount
          .location_id
      );

    if (balancesError) {
      return NextResponse.json(
        {
          error:
            balancesError.message,
        },
        { status: 500 }
      );
    }

    const balanceMap =
      new Map(
        (balances ?? []).map(
          (balance: any) => [
            balance.product_id,
            Number(
              balance.available_quantity ??
                0
            ),
          ]
        )
      );

    // ==========================================================
    // تحديد المنتجات
    // ==========================================================

    let candidates =
      products ?? [];

    if (
      body.mode ===
      "with_stock"
    ) {
      candidates =
        candidates.filter(
          (product: any) =>
            (
              balanceMap.get(
                product.id
              ) ?? 0
            ) > 0
        );
    }

    // ==========================================================
    // تجهيز البنود
    // ==========================================================

    const items =
      candidates
        .filter(
          (product: any) =>
            !existingIds.has(
              product.id
            )
        )
        .map(
          (product: any) => ({
            id:
              crypto.randomUUID(),

            stock_count_id:
              countId,

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

    if (!items.length) {
      return NextResponse.json({
        success: true,
        addedCount: 0,
        message:
          "لا توجد منتجات جديدة لإضافتها إلى الجرد.",
      });
    }

    // ==========================================================
    // الإدخال
    // ==========================================================

    const {
      error: insertError,
    } = await auth.supabase
      .from(
        "stock_count_items"
      )
      .insert(items);

    if (insertError) {
      console.error(
        "Insert stock count items:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        addedCount:
          items.length,
        message:
          `تمت إضافة ${items.length} منتج إلى الجرد.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/inventory/counts/[id]/items:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر إضافة المنتجات إلى الجرد.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE
// حذف منتج من الجرد
// ============================================================

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id: countId } =
      await params;

    // ==========================================================
    // المستخدم
    // ==========================================================

    const auth =
      await getAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

    // ==========================================================
    // الصلاحية
    // ==========================================================

    const access =
      await validateCountAccess(
        auth.supabase,
        auth.dbUser,
        countId
      );

    if (access.error) {
      return NextResponse.json(
        {
          error:
            access.error,
        },
        {
          status:
            access.status,
        }
      );
    }

    // ==========================================================
    // البيانات
    // ==========================================================

    const body =
      await request.json();

    const itemId =
      typeof body?.itemId ===
      "string"
        ? body.itemId.trim()
        : "";

    if (!itemId) {
      return NextResponse.json(
        {
          error:
            "معرّف بند الجرد مطلوب.",
        },
        { status: 400 }
      );
    }

    // ==========================================================
    // التأكد من أن البند تابع للجرد
    // ==========================================================

    const {
      data: item,
      error: itemError,
    } = await auth.supabase
      .from(
        "stock_count_items"
      )
      .select("id")
      .eq(
        "id",
        itemId
      )
      .eq(
        "stock_count_id",
        countId
      )
      .maybeSingle();

    if (itemError) {
      return NextResponse.json(
        {
          error:
            itemError.message,
        },
        { status: 500 }
      );
    }

    if (!item) {
      return NextResponse.json(
        {
          error:
            "المنتج غير موجود في عملية الجرد.",
        },
        { status: 404 }
      );
    }

    // ==========================================================
    // حذف
    // ==========================================================

    const {
      error: deleteError,
    } = await auth.supabase
      .from(
        "stock_count_items"
      )
      .delete()
      .eq(
        "id",
        itemId
      )
      .eq(
        "stock_count_id",
        countId
      );

    if (deleteError) {
      return NextResponse.json(
        {
          error:
            deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "تم حذف المنتج من عملية الجرد.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/inventory/counts/[id]/items:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر حذف المنتج من الجرد.",
      },
      { status: 500 }
    );
  }
}