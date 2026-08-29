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

const PRODUCT_BATCH_SIZE = 500;

async function getCompanyProducts(
  supabase: any,
  companyId: string,
  search = "",
  productIds?: string[]
) {
  const products: Array<{ id: string; name: string; sku: string }> = [];

  if (productIds?.length) {
    for (let start = 0; start < productIds.length; start += PRODUCT_BATCH_SIZE) {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .in("id", productIds.slice(start, start + PRODUCT_BATCH_SIZE))
        .order("name");

      if (error) return { data: null, error };
      products.push(...(data ?? []));
    }

    return { data: products, error: null };
  }

  let from = 0;

  while (true) {
    let query = supabase
      .from("products")
      .select("id, name, sku")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name")
      .range(from, from + PRODUCT_BATCH_SIZE - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) return { data: null, error };

    const batch = data ?? [];
    products.push(...batch);

    if (batch.length < PRODUCT_BATCH_SIZE) break;
    from += PRODUCT_BATCH_SIZE;
  }

  return { data: products, error: null };
}

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

async function validateCountAccess(
  supabase: any,
  dbUser: any,
  countId: string
) {
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
        is_active
      )
    `)
    .eq("id", countId)
    .single();

  if (countError || !stockCount) {
    return {
      error: "الجرد غير موجود.",
      status: 404,
      stockCount: null,
    };
  }

  const location = Array.isArray(
    stockCount.locations
  )
    ? stockCount.locations[0]
    : stockCount.locations;

  if (
    !location ||
    location.company_id !==
      dbUser.company_id ||
    !location.is_active
  ) {
    return {
      error:
        "لا يمكنك الوصول إلى هذا الجرد.",
      status: 403,
      stockCount: null,
    };
  }

  if (stockCount.status === "completed") {
    return {
      error:
        "لا يمكن تعديل جرد مكتمل.",
      status: 400,
      stockCount: null,
    };
  }

  const { data: hasFullAccess } = await supabase.rpc(
    "has_full_location_access"
  );

  if (
    hasFullAccess !== true &&
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
// جلب أرصدة موقع الجرد
//
// مهم:
// لا نقرأ stock_balances مباشرة من العميل بسبب RLS.
// نستخدم RPC تتحقق من الشركة والصلاحية ثم ترجع
// رصيد الموقع المحدد فقط.
// ============================================================

async function getCountBalances(
  supabase: any,
  locationId: string
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "get_stock_count_balances",
    {
      target_location_id:
        locationId,
    }
  );

  if (error) {
    return {
      data: null,
      error,
    };
  }

  return {
    data: data ?? [],
    error: null,
  };
}

export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id: countId } =
      await params;

    const auth =
      await getAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

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
      .from("stock_count_items")
      .select("product_id")
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
        {
          status: 500,
        }
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

    const {
      data: products,
      error: productsError,
    } = await getCompanyProducts(
      auth.supabase,
      auth.dbUser.company_id,
      search
    );

    if (productsError) {
      return NextResponse.json(
        {
          error:
            productsError.message,
        },
        {
          status: 500,
        }
      );
    }

    // ==========================================================
    // أرصدة الفرع الخاص بالجرد
    // ==========================================================

    const {
      data: balances,
      error: balancesError,
    } =
      await getCountBalances(
        auth.supabase,
        access.stockCount
          .location_id
      );

    if (balancesError) {
      return NextResponse.json(
        {
          error:
            balancesError.message ||
            "تعذر تحميل أرصدة الموقع.",
        },
        {
          status: 500,
        }
      );
    }

    // ==========================================================
    // تحويل الأرصدة إلى Map
    // ==========================================================

    const balanceMap =
      new Map<
        string,
        number
      >(
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
    // بناء قائمة المنتجات
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

            name:
              product.name,

            sku:
              product.sku,

            // كمية النظام من نفس موقع الجرد
            system_quantity:
              balanceMap.get(
                product.id
              ) ?? 0,
          })
        );

    // ==========================================================
    // ذات رصيد
    // ==========================================================

    if (withStock) {
      result =
        result.filter(
          (product: any) =>
            Number(
              product.system_quantity
            ) > 0
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
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id: countId } =
      await params;

    const auth =
      await getAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

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

    const body =
      (await request.json()) as AddItemsBody;

    // ==========================================================
    // التحقق من طريقة الإضافة
    // ==========================================================

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
        {
          status: 400,
        }
      );
    }

    if (
      body.mode === "selected" &&
      (!Array.isArray(
        body.productIds
      ) ||
        body.productIds.length ===
          0)
    ) {
      return NextResponse.json(
        {
          error:
            "اختر منتجًا واحدًا على الأقل.",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================================
    // المنتجات الموجودة مسبقًا
    // ==========================================================

    const {
      data: existingItems,
      error: existingError,
    } = await auth.supabase
      .from("stock_count_items")
      .select("product_id")
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
        {
          status: 500,
        }
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

    const {
      data: products,
      error: productsError,
    } = await getCompanyProducts(
      auth.supabase,
      auth.dbUser.company_id,
      "",
      body.mode === "selected" ? body.productIds : undefined
    );

    if (productsError) {
      return NextResponse.json(
        {
          error:
            productsError.message,
        },
        {
          status: 500,
        }
      );
    }

    // ==========================================================
    // أرصدة نفس موقع الجرد
    // ==========================================================

    const {
      data: balances,
      error: balancesError,
    } =
      await getCountBalances(
        auth.supabase,
        access.stockCount
          .location_id
      );

    if (balancesError) {
      return NextResponse.json(
        {
          error:
            balancesError.message ||
            "تعذر تحميل أرصدة الموقع.",
        },
        {
          status: 500,
        }
      );
    }

    // ==========================================================
    // Map للأرصدة
    // ==========================================================

    const balanceMap =
      new Map<
        string,
        number
      >(
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
    // المنتجات المرشحة
    // ==========================================================

    let candidates =
      products ?? [];

    if (
      body.mode === "with_stock"
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
    // إنشاء بنود الجرد
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

            // ==================================================
            // كمية النظام الصحيحة من الفرع المحدد للجرد
            // ==================================================

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

    // ==========================================================
    // لا توجد منتجات
    // ==========================================================

    if (!items.length) {
      return NextResponse.json({
        success: true,

        addedCount: 0,

        message:
          "لا توجد منتجات جديدة لإضافتها إلى الجرد.",
      });
    }

    // ==========================================================
    // إدخال بنود الجرد
    // ==========================================================

    const {
      error: insertError,
    } = await auth.supabase
      .from(
        "stock_count_items"
      )
      .insert(items);

    if (insertError) {
      return NextResponse.json(
        {
          error:
            insertError.message,
        },
        {
          status: 500,
        }
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
      {
        status: 201,
      }
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
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id: countId } =
      await params;

    const auth =
      await getAuthenticatedUser();

    if (auth.response) {
      return auth.response;
    }

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
        {
          status: 400,
        }
      );
    }

    const {
      data: item,
      error: itemError,
    } = await auth.supabase
      .from(
        "stock_count_items"
      )
      .select("id")
      .eq("id", itemId)
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
        {
          status: 500,
        }
      );
    }

    if (!item) {
      return NextResponse.json(
        {
          error:
            "المنتج غير موجود في عملية الجرد.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      error: deleteError,
    } = await auth.supabase
      .from(
        "stock_count_items"
      )
      .delete()
      .eq("id", itemId)
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
        {
          status: 500,
        }
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
      {
        status: 500,
      }
    );
  }
}
