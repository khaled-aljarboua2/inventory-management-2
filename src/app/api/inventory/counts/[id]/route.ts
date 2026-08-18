import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";

async function getCurrentUser() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولًا."
    );
  }

  const {
    data: dbUser,
    error,
  } = await supabase
    .from("users")
    .select(
      "id, company_id, is_active"
    )
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

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await params;

    const { supabase, user } =
      await getCurrentUser();

    const {
      data: count,
      error: countError,
    } = await supabase
      .from("stock_counts")
      .select(
        `
          id,
          location_id,
          created_by,
          status,
          notes,
          created_at,
          completed_at,

          locations (
            id,
            name,
            code,
            company_id
          )
        `
      )
      .eq("id", id)
      .single();

    if (countError || !count) {
      return NextResponse.json(
        {
          error:
            "الجرد غير موجود.",
        },
        { status: 404 }
      );
    }

    const countLocation =
      firstRelation(count.locations);

    if (
      !countLocation ||
      countLocation.company_id !==
        user.company_id
    ) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية الوصول لهذا الجرد.",
        },
        { status: 403 }
      );
    }

    const {
      data: items,
      error: itemsError,
    } = await supabase
      .from("stock_count_items")
      .select(
        `
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
        `
      )
      .eq(
        "stock_count_id",
        id
      )
      .order("id");

    if (itemsError) {
      return NextResponse.json(
        {
          error:
            itemsError.message,
        },
        { status: 500 }
      );
    }

    const normalizedItems = (items ?? []).map(
      (item) => ({
        ...item,
        products: firstRelation(item.products),
      })
    );

    return NextResponse.json({
      success: true,
      count: {
        ...count,
        locations: countLocation,
        items:
          normalizedItems,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await params;

    const { supabase, user } =
      await getCurrentUser();

    const body =
      await request.json();

    const items =
      Array.isArray(body?.items)
        ? body.items
        : [];

    if (!items.length) {
      return NextResponse.json(
        {
          error:
            "لا توجد أصناف لتحديثها.",
        },
        { status: 400 }
      );
    }

    const {
      data: count,
      error: countError,
    } = await supabase
      .from("stock_counts")
      .select(
        `
          id,
          location_id,
          status,

          locations (
            id,
            company_id
          )
        `
      )
      .eq("id", id)
      .single();

    if (countError || !count) {
      return NextResponse.json(
        {
          error:
            "الجرد غير موجود.",
        },
        { status: 404 }
      );
    }

    const countLocation =
      firstRelation(count.locations);

    if (
      !countLocation ||
      countLocation.company_id !==
        user.company_id
    ) {
      return NextResponse.json(
        {
          error:
            "الجرد لا يتبع لشركتك.",
        },
        { status: 403 }
      );
    }

    if (
      String(count.status).toLowerCase() ===
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

    const {
      data: hasPermission,
      error: permissionError,
    } = await supabase.rpc(
      "has_permission",
      {
        permission_code:
          "stock.count",
      }
    );

    if (permissionError) {
      return NextResponse.json(
        {
          error:
            permissionError.message,
        },
        { status: 500 }
      );
    }

    if (hasPermission !== true) {
      return NextResponse.json(
        {
          error:
            "ليس لديك صلاحية تعديل الجرد.",
        },
        { status: 403 }
      );
    }

    for (const item of items) {
      if (!item?.id) {
        continue;
      }

      let countedQuantity =
        item.counted_quantity;

      if (
        countedQuantity !== null &&
        countedQuantity !== undefined
      ) {
        countedQuantity =
          Number(
            countedQuantity
          );

        if (
          !Number.isFinite(
            countedQuantity
          ) ||
          countedQuantity < 0
        ) {
          return NextResponse.json(
            {
              error:
                "الكمية الفعلية يجب أن تكون صفرًا أو أكبر.",
            },
            { status: 400 }
          );
        }
      } else {
        countedQuantity = null;
      }

      const {
        error: updateError,
      } = await supabase
        .from("stock_count_items")
        .update({
          counted_quantity:
            countedQuantity,
          notes:
            typeof item.notes ===
            "string"
              ? item.notes.trim() ||
                null
              : null,
        })
        .eq("id", item.id)
        .eq(
          "stock_count_id",
          id
        );

      if (updateError) {
        return NextResponse.json(
          {
            error:
              updateError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع.",
      },
      { status: 500 }
    );
  }
}
