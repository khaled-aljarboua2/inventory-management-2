import { NextResponse } from "next/server";

import { firstRelation } from "@/lib/supabase/relations";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const SOURCE_LIMIT = 100;

const PRODUCT_SELECT = `
  id,
  name,
  sku,
  is_active,
  product_units (
    id,
    unit_id,
    conversion_factor,
    is_base,
    units (
      id,
      name,
      symbol
    )
  ),
  product_barcodes (
    barcode
  )
`;

function boundedLimit(value: string | null) {
  const parsed = Number(value ?? DEFAULT_LIMIT);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول أولًا." },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (profileError || !profile?.company_id) {
    return NextResponse.json(
      { error: "تعذر العثور على الشركة المرتبطة بالمستخدم." },
      { status: 403 }
    );
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const limit = boundedLimit(url.searchParams.get("limit"));

    const baseQuery = (sourceLimit = limit) =>
      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("name")
        .limit(sourceLimit);

    if (!query) {
      const { data, error } = await baseQuery();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        products: normalizeProducts(data ?? []),
      });
    }

    const [byName, bySku, barcodeMatches] = await Promise.all([
      baseQuery(SOURCE_LIMIT).ilike("name", `%${query}%`),
      baseQuery(SOURCE_LIMIT).ilike("sku", `%${query}%`),
      supabase
        .from("product_barcodes")
        .select("product_id, products!inner(company_id)")
        .eq("products.company_id", profile.company_id)
        .ilike("barcode", `%${query}%`)
        .limit(SOURCE_LIMIT),
    ]);

    if (byName.error || bySku.error || barcodeMatches.error) {
      throw byName.error ?? bySku.error ?? barcodeMatches.error;
    }

    const barcodeProductIds = Array.from(
      new Set(
        (barcodeMatches.data ?? [])
          .map((item) => item.product_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const byBarcode = barcodeProductIds.length
      ? await baseQuery(SOURCE_LIMIT).in("id", barcodeProductIds)
      : { data: [], error: null };

    if (byBarcode.error) {
      throw byBarcode.error;
    }

    const productsById = new Map<string, unknown>();

    for (const product of [
      ...(byName.data ?? []),
      ...(bySku.data ?? []),
      ...(byBarcode.data ?? []),
    ]) {
      productsById.set(product.id, product);
    }

    const normalizedQuery = query.toLocaleLowerCase();
    const products = normalizeProducts(
      Array.from(productsById.values()) as Parameters<
        typeof normalizeProducts
      >[0]
    )
      .sort((left, right) => {
        const leftExact =
          left.sku.toLocaleLowerCase() === normalizedQuery ||
          left.barcodes.some(
            (barcode) => barcode.toLocaleLowerCase() === normalizedQuery
          );
        const rightExact =
          right.sku.toLocaleLowerCase() === normalizedQuery ||
          right.barcodes.some(
            (barcode) => barcode.toLocaleLowerCase() === normalizedQuery
          );

        if (leftExact !== rightExact) {
          return leftExact ? -1 : 1;
        }

        return left.name.localeCompare(right.name, "ar");
      })
      .slice(0, limit);

    return NextResponse.json({ products });
  } catch (error) {
    console.error("GET /api/products/search:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر البحث في المنتجات.",
      },
      { status: 500 }
    );
  }
}

function normalizeProducts(
  products: Array<{
    id: string;
    name: string;
    sku: string;
    is_active: boolean;
    product_units?: Array<{
      id: string;
      unit_id: string;
      conversion_factor: number | string;
      is_base: boolean;
      units:
        | {
            id: string;
            name: string;
            symbol: string | null;
          }
        | Array<{
            id: string;
            name: string;
            symbol: string | null;
          }>
        | null;
    }>;
    product_barcodes?: Array<{
      barcode: string | null;
    }>;
  }>
) {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    is_active: product.is_active,
    product_units: (product.product_units ?? []).map((unit) => ({
      ...unit,
      units: firstRelation(unit.units),
    })),
    barcodes: (product.product_barcodes ?? [])
      .map((item) => item.barcode?.trim())
      .filter((barcode): barcode is string => Boolean(barcode)),
  }));
}
