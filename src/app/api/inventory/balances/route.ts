import { NextRequest, NextResponse } from "next/server";

import { getReportAccess } from "@/lib/reports";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type InventorySearchRow = {
  id: string;
  product_id: string;
  location_id: string;
  available_quantity: number | string | null;
  reserved_quantity: number | string | null;
  minimum_quantity: number | string | null;
  maximum_quantity: number | string | null;
  last_count_date: string | null;
  updated_at: string;
  product_name: string;
  product_sku: string;
  location_name: string;
  location_code: string;
  unit_name: string | null;
  barcodes: string[] | null;
  total_count: number | string | null;
};

export async function GET(request: NextRequest) {
  const session = await getReportAccess();

  if (session.error || !session.supabase || !session.access) {
    return NextResponse.json(
      { error: session.error ?? "غير مصرح." },
      { status: 403 }
    );
  }

  const { supabase, access } = session;
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(params.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );
  const search = params.get("q")?.trim() ?? "";
  const requestedLocationId = params.get("location_id")?.trim() ?? "all";
  const status = params.get("status")?.trim().toLowerCase() ?? "all";

  try {
    if (
      !access.isAdmin &&
      requestedLocationId !== "all" &&
      requestedLocationId !== access.locationId
    ) {
      return NextResponse.json(
        { error: "غير مصرح بعرض هذا الموقع." },
        { status: 403 }
      );
    }

    let locationId: string | null = null;
    let viewAllLocations = false;

    if (!access.isAdmin) {
      locationId = access.locationId;
    } else if (requestedLocationId !== "all") {
      locationId = requestedLocationId;
    } else {
      viewAllLocations = true;
    }

    const offset = (page - 1) * limit;

    const { data, error } = await supabase.rpc("search_inventory_balances", {
      p_company_id: access.companyId,
      p_location_id: locationId,
      p_view_all: viewAllLocations,
      p_search: search,
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;

    const rows = (data ?? []) as InventorySearchRow[];
    const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;

    const balances = rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      location_id: row.location_id,
      available_quantity: Number(row.available_quantity ?? 0),
      reserved_quantity: Number(row.reserved_quantity ?? 0),
      minimum_quantity: Number(row.minimum_quantity ?? 0),
      maximum_quantity:
        row.maximum_quantity == null ? null : Number(row.maximum_quantity),
      last_count_date: row.last_count_date ?? null,
      updated_at: row.updated_at,
      unit_name: row.unit_name ?? "وحدة غير محددة",
      barcodes: Array.isArray(row.barcodes) ? row.barcodes : [],
      products: {
        id: row.product_id,
        name: row.product_name,
        sku: row.product_sku,
      },
      locations: {
        id: row.location_id,
        name: row.location_name,
        code: row.location_code,
      },
    }));

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
      {
        error:
          error instanceof Error ? error.message : "تعذر تحميل أرصدة المخزون.",
      },
      { status: 500 }
    );
  }
}
