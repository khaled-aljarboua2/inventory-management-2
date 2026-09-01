import { NextRequest, NextResponse } from "next/server";

import { firstRelation } from "@/lib/supabase/relations";
import { getReportAccess, getReportLocations } from "@/lib/reports";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

type BalanceRow = {
  id: string;
  product_id: string;
  location_id: string;
  available_quantity: number | null;
  products:
    | { id: string; name: string; sku: string }
    | { id: string; name: string; sku: string }[]
    | null;
  locations:
    | { id: string; name: string; code: string }
    | { id: string; name: string; code: string }[]
    | null;
};

type ProductUnitRow = {
  product_id: string;
  is_base: boolean | null;
  units:
    | { name: string; symbol: string | null }
    | { name: string; symbol: string | null }[]
    | null;
};

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeSearch(value: string) {
  return value.replace(/[%,()]/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const session = await getReportAccess();

  if (session.error || !session.supabase || !session.access) {
    return NextResponse.json(
      { error: session.error ?? "غير مصرح." },
      { status: 403 }
    );
  }

  const page = parsePositiveInteger(request.nextUrl.searchParams.get("page"), 1);
  const requestedLimit = parsePositiveInteger(
    request.nextUrl.searchParams.get("limit"),
    DEFAULT_PAGE_SIZE
  );
  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);
  const search = escapeSearch(request.nextUrl.searchParams.get("q") ?? "");
  const requestedLocationId = request.nextUrl.searchParams.get("location_id")?.trim() || null;

  try {
    const locations = await getReportLocations(session.supabase, session.access);
    const allowedLocationIds = new Set(locations.map((location) => location.id));

    let locationId: string | null = null;

    if (!session.access.isAdmin) {
      locationId = session.access.locationId;
    } else if (requestedLocationId && requestedLocationId !== "all") {
      if (!allowedLocationIds.has(requestedLocationId)) {
        return NextResponse.json(
          { error: "الموقع غير متاح لهذا المستخدم." },
          { status: 403 }
        );
      }
      locationId = requestedLocationId;
    }

    let matchingProductIds: string[] | null = null;

    if (search) {
      const pattern = `%${search}%`;

      const [productResponse, barcodeResponse] = await Promise.all([
        session.supabase
          .from("products")
          .select("id")
          .eq("company_id", session.access.companyId)
          .or(`name.ilike.${pattern},sku.ilike.${pattern}`),
        session.supabase
          .from("product_barcodes")
          .select("product_id, products!inner(company_id)")
          .eq("products.company_id", session.access.companyId)
          .ilike("barcode", pattern),
      ]);

      if (productResponse.error) throw productResponse.error;
      if (barcodeResponse.error) throw barcodeResponse.error;

      matchingProductIds = Array.from(
        new Set([
          ...(productResponse.data ?? []).map((row) => row.id),
          ...(barcodeResponse.data ?? []).map((row) => row.product_id),
        ])
      );

      if (matchingProductIds.length === 0) {
        return NextResponse.json({
          balances: [],
          locations,
          pagination: { page: 1, limit, total: 0, totalPages: 1 },
        });
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let balancesQuery = session.supabase
      .from("stock_balances")
      .select(
        `
          id,
          product_id,
          location_id,
          available_quantity,
          products!inner (
            id,
            name,
            sku,
            company_id
          ),
          locations!inner (
            id,
            name,
            code,
            company_id
          )
        `,
        { count: "exact" }
      )
      .eq("products.company_id", session.access.companyId)
      .eq("locations.company_id", session.access.companyId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to);

    if (locationId) balancesQuery = balancesQuery.eq("location_id", locationId);
    if (matchingProductIds) balancesQuery = balancesQuery.in("product_id", matchingProductIds);

    const { data: balancesData, error: balancesError, count } = await balancesQuery;
    if (balancesError) throw balancesError;

    const balances = (balancesData ?? []) as BalanceRow[];
    const currentProductIds = Array.from(
      new Set(balances.map((balance) => balance.product_id))
    );
    const barcodesByProduct = new Map<string, string[]>();
    const baseUnitByProduct = new Map<
      string,
      { name: string; symbol: string | null }
    >();

    if (currentProductIds.length > 0) {
      const [barcodeResponse, unitResponse] = await Promise.all([
        session.supabase
          .from("product_barcodes")
          .select("product_id, barcode, is_default")
          .in("product_id", currentProductIds)
          .order("is_default", { ascending: false }),
        session.supabase
          .from("product_units")
          .select("product_id, is_base, units!inner(name, symbol)")
          .in("product_id", currentProductIds)
          .eq("is_base", true),
      ]);

      if (barcodeResponse.error) throw barcodeResponse.error;
      if (unitResponse.error) throw unitResponse.error;

      for (const row of barcodeResponse.data ?? []) {
        const barcode = row.barcode?.trim();
        if (!barcode) continue;

        const current = barcodesByProduct.get(row.product_id) ?? [];
        if (!current.includes(barcode)) {
          current.push(barcode);
          barcodesByProduct.set(row.product_id, current);
        }
      }

      for (const row of (unitResponse.data ?? []) as ProductUnitRow[]) {
        const unit = Array.isArray(row.units) ? row.units[0] : row.units;
        if (!unit) continue;

        baseUnitByProduct.set(row.product_id, {
          name: unit.name,
          symbol: unit.symbol,
        });
      }
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      balances: balances.map((balance) => ({
        id: balance.id,
        product_id: balance.product_id,
        location_id: balance.location_id,
        available_quantity: Number(balance.available_quantity ?? 0),
        product: firstRelation(balance.products),
        location: firstRelation(balance.locations),
        barcodes: barcodesByProduct.get(balance.product_id) ?? [],
        base_unit: baseUnitByProduct.get(balance.product_id) ?? null,
      })),
      locations,
      pagination: {
        page: Math.min(page, totalPages),
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/transfers/balances:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحميل أرصدة المنتجات.",
      },
      { status: 500 }
    );
  }
}
