import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function cleanSearch(value: string) {
  return value.replace(/[%,()]/g, "").trim();
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }

  const { data: canViewProducts, error: permissionError } = await supabase.rpc(
    "has_permission",
    { permission_code: "products.view" }
  );

  if (permissionError || canViewProducts !== true) {
    return NextResponse.json({ error: "ليس لديك صلاحية عرض المنتجات." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(params.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );
  const search = cleanSearch(params.get("q") ?? "");
  const status = params.get("status") ?? "all";
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let barcodeProductIds: string[] = [];

    if (search) {
      const { data: barcodeRows, error: barcodeError } = await supabase
        .from("product_barcodes")
        .select("product_id")
        .ilike("barcode", `%${search}%`)
        .limit(500);

      if (barcodeError) throw barcodeError;

      barcodeProductIds = Array.from(
        new Set((barcodeRows ?? []).map((row) => row.product_id))
      );
    }

    let query = supabase
      .from("products")
      .select(
        `
          id,
          sku,
          name,
          description,
          minimum_quantity,
          is_active,
          created_at,
          product_barcodes (
            barcode,
            is_default
          )
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (status === "active") {
      query = query.eq("is_active", true);
    } else if (status === "inactive") {
      query = query.eq("is_active", false);
    }

    if (search) {
      const conditions = [
        `name.ilike.%${search}%`,
        `sku.ilike.%${search}%`,
      ];

      if (barcodeProductIds.length > 0) {
        conditions.push(`id.in.(${barcodeProductIds.join(",")})`);
      }

      query = query.or(conditions.join(","));
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    const products = (data ?? []).map((product) => {
      const barcodes = product.product_barcodes ?? [];
      const preferred =
        barcodes.find((barcode) => barcode.is_default === true) ??
        barcodes[0] ??
        null;

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        minimum_quantity: product.minimum_quantity,
        is_active: product.is_active,
        created_at: product.created_at,
        barcode: preferred?.barcode ?? null,
      };
    });

    const total = count ?? 0;

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("GET /api/products/list:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "تعذر تحميل المنتجات.",
      },
      { status: 500 }
    );
  }
}
