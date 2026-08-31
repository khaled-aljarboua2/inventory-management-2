import { NextRequest, NextResponse } from "next/server";

import { firstRelation } from "@/lib/supabase/relations";
import { getReportAccess } from "@/lib/reports";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const UNKNOWN_UNIT = "وحدة غير محددة";

function cleanSearch(value: string) {
  return value.replace(/[%,()]/g, " ").trim();
}

async function matchingProductIds(
  supabase: NonNullable<Awaited<ReturnType<typeof getReportAccess>>["supabase"]>,
  companyId: string,
  search: string
) {
  const q = cleanSearch(search);
  if (!q) return null;

  const [{ data: products, error: productError }, { data: barcodes, error: barcodeError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id")
        .eq("company_id", companyId)
        .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
        .limit(1000),
      supabase
        .from("product_barcodes")
        .select("product_id, products!inner(company_id)")
        .eq("products.company_id", companyId)
        .ilike("barcode", `%${q}%`)
        .limit(1000),
    ]);

  if (productError) throw productError;
  if (barcodeError) throw barcodeError;

  return Array.from(
    new Set([
      ...(products ?? []).map((row) => row.id),
      ...(barcodes ?? []).map((row) => row.product_id),
    ])
  );
}

export async function GET(request: NextRequest) {
  const session = await getReportAccess();

  if (session.error || !session.supabase || !session.access) {
    return NextResponse.json({ error: session.error ?? "غير مصرح." }, { status: 403 });
  }

  const { supabase, access } = session;
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT));
  const search = params.get("q")?.trim() ?? "";
  const locationId = params.get("location_id")?.trim() ?? "all";
  const status = params.get("status")?.trim().toLowerCase() ?? "all";

  try {
    if (!access.isAdmin && locationId !== "all" && locationId !== access.locationId) {
      return NextResponse.json({ error: "غير مصرح بعرض هذا الموقع." }, { status: 403 });
    }

    const productIds = search
      ? await matchingProductIds(supabase, access.companyId, search)
      : null;

    if (search && (!productIds || productIds.length === 0)) {
      return NextResponse.json({ balances: [], total: 0, page, limit, totalPages: 1 });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("stock_balances")
      .select(`
        id,
        product_id,
        location_id,
        available_quantity,
        reserved_quantity,
        minimum_quantity,
        maximum_quantity,
        last_count_date,
        updated_at,
        products!inner(id, name, sku, company_id),
        locations!inner(id, name, code, company_id)
      `, { count: "exact" })
      .eq("products.company_id", access.companyId)
      .eq("locations.company_id", access.companyId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true });

    if (!access.isAdmin && access.locationId) {
      query = query.eq("location_id", access.locationId);
    } else if (locationId !== "all") {
      query = query.eq("location_id", locationId);
    }

    if (productIds) {
      query = query.in("product_id", productIds);
    }

    if (status === "out") {
      query = query.lte("available_quantity", 0);
    } else if (status === "low") {
      query = query.gt("available_quantity", 0).gt("minimum_quantity", 0);
    } else if (status === "available") {
      query = query.gt("available_quantity", 0);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    let rows = (data ?? []).map((row) => ({
      ...row,
      products: firstRelation(row.products),
      locations: firstRelation(row.locations),
    }));

    if (status === "low") {
      rows = rows.filter((row) =>
        Number(row.available_quantity ?? 0) <= Number(row.minimum_quantity ?? 0)
      );
    } else if (status === "available") {
      rows = rows.filter((row) => {
        const available = Number(row.available_quantity ?? 0);
        const minimum = Number(row.minimum_quantity ?? 0);
        return available > 0 && !(minimum > 0 && available <= minimum);
      });
    }

    const ids = Array.from(new Set(rows.map((row) => row.product_id)));
    const unitByProduct = new Map<string, string>();
    const barcodesByProduct = new Map<string, string[]>();

    if (ids.length > 0) {
      const [{ data: units, error: unitsError }, { data: barcodes, error: barcodesError }] =
        await Promise.all([
          supabase
            .from("product_units")
            .select("product_id, is_base, units(name, symbol)")
            .in("product_id", ids)
            .order("is_base", { ascending: false }),
          supabase
            .from("product_barcodes")
            .select("product_id, barcode, is_default")
            .in("product_id", ids)
            .order("is_default", { ascending: false }),
        ]);

      if (unitsError) throw unitsError;
      if (barcodesError) throw barcodesError;

      for (const row of units ?? []) {
        const unit = firstRelation(row.units);
        const label = unit?.symbol || unit?.name || UNKNOWN_UNIT;
        if (!unitByProduct.has(row.product_id) || row.is_base) {
          unitByProduct.set(row.product_id, label);
        }
      }

      for (const row of barcodes ?? []) {
        const barcode = row.barcode?.trim();
        if (!barcode) continue;
        const current = barcodesByProduct.get(row.product_id) ?? [];
        if (!current.includes(barcode)) current.push(barcode);
        barcodesByProduct.set(row.product_id, current);
      }
    }

    const balances = rows.map((row) => ({
      ...row,
      available_quantity: Number(row.available_quantity ?? 0),
      reserved_quantity: Number(row.reserved_quantity ?? 0),
      minimum_quantity: Number(row.minimum_quantity ?? 0),
      maximum_quantity: row.maximum_quantity == null ? null : Number(row.maximum_quantity),
      unit_name: unitByProduct.get(row.product_id) ?? UNKNOWN_UNIT,
      barcodes: barcodesByProduct.get(row.product_id) ?? [],
    }));

    const total = count ?? 0;
    return NextResponse.json({
      balances,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("GET /api/inventory/balances:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تحميل أرصدة المخزون." },
      { status: 500 }
    );
  }
}
