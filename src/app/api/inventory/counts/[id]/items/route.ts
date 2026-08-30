import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };
type AddItemsBody =
  | { mode: "all" }
  | { mode: "with_stock" }
  | { mode: "selected"; productIds: string[] };

function databaseError(message: string) {
  return NextResponse.json(
    { error: message },
    { status: message.includes("كثيرة جدًا") ? 429 : 400 }
  );
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseAddBody(value: unknown): AddItemsBody | null {
  if (!value || typeof value !== "object" || !("mode" in value)) return null;

  const input = value as Record<string, unknown>;
  if (input.mode === "all" || input.mode === "with_stock") {
    return { mode: input.mode };
  }

  if (input.mode !== "selected" || !Array.isArray(input.productIds)) return null;

  const productIds = Array.from(
    new Set(
      input.productIds.filter(
        (id): id is string => typeof id === "string" && Boolean(id.trim())
      )
    )
  );

  return productIds.length ? { mode: "selected", productIds } : null;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id: countId } = await params;
    const { supabase, user } = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
    }

    const url = new URL(request.url);
    const { data, error } = await supabase.rpc("search_stock_count_products", {
      target_stock_count_id: countId,
      search_query: url.searchParams.get("search")?.trim() ?? "",
      with_stock_only: url.searchParams.get("withStock") === "true",
      result_limit: 100,
    });

    if (error) return databaseError(error.message);

    return NextResponse.json({ success: true, products: data ?? [] });
  } catch (error) {
    console.error("GET /api/inventory/counts/[id]/items:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تحميل المنتجات." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id: countId } = await params;
    const { supabase, user } = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
    }

    const body = parseAddBody(await request.json());
    if (!body) {
      return NextResponse.json(
        { error: "طريقة إضافة المنتجات أو قائمة المنتجات غير صالحة." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("add_stock_count_items", {
      target_stock_count_id: countId,
      add_mode: body.mode,
      selected_product_ids: body.mode === "selected" ? body.productIds : null,
    });

    if (error) return databaseError(error.message);

    const addedCount = Number(data ?? 0);
    return NextResponse.json(
      {
        success: true,
        addedCount,
        message: addedCount
          ? `تمت إضافة ${addedCount} منتج إلى الجرد.`
          : "لا توجد منتجات جديدة لإضافتها إلى الجرد.",
      },
      { status: addedCount ? 201 : 200 }
    );
  } catch (error) {
    console.error("POST /api/inventory/counts/[id]/items:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر إضافة المنتجات إلى الجرد." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id: countId } = await params;
    const { supabase, user } = await requireUser();

    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
    }

    const value = (await request.json()) as { itemId?: unknown };
    const itemId = typeof value.itemId === "string" ? value.itemId.trim() : "";
    if (!itemId) {
      return NextResponse.json({ error: "معرّف بند الجرد مطلوب." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("remove_stock_count_item", {
      target_stock_count_id: countId,
      target_item_id: itemId,
    });

    if (error) return databaseError(error.message);
    if (data !== true) {
      return NextResponse.json(
        { error: "المنتج غير موجود في عملية الجرد." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حذف المنتج من عملية الجرد.",
    });
  } catch (error) {
    console.error("DELETE /api/inventory/counts/[id]/items:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حذف المنتج من الجرد." },
      { status: 500 }
    );
  }
}
