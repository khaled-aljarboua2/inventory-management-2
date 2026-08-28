import { NextResponse } from "next/server";

import { firstRelation } from "@/lib/supabase/relations";
import { getReportAccess } from "@/lib/reports";

export const dynamic = "force-dynamic";

const BALANCE_PAGE_SIZE = 1000;
const PRODUCT_BATCH_SIZE = 500;

type BalanceRow = {
  id: string;
  product_id: string;
  location_id: string;
  available_quantity: number | null;
  products: {
    id: string;
    name: string;
    sku: string;
  } | {
    id: string;
    name: string;
    sku: string;
  }[] | null;
  locations: {
    id: string;
    name: string;
    code: string;
  } | {
    id: string;
    name: string;
    code: string;
  }[] | null;
};

function splitIntoBatches<T>(items: T[], size = PRODUCT_BATCH_SIZE) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

export async function GET() {
  const session = await getReportAccess();

  if (session.error || !session.supabase || !session.access) {
    return NextResponse.json(
      { error: session.error ?? "غير مصرح." },
      { status: 403 }
    );
  }

  try {
    const balances: BalanceRow[] = [];
    let from = 0;

    while (true) {
      let query = session.supabase
        .from("stock_balances")
        .select(`
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
        `)
        .eq("products.company_id", session.access.companyId)
        .eq("locations.company_id", session.access.companyId)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + BALANCE_PAGE_SIZE - 1);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const batch = (data ?? []) as BalanceRow[];
      balances.push(...batch);

      if (batch.length < BALANCE_PAGE_SIZE) {
        break;
      }

      from += BALANCE_PAGE_SIZE;
    }

    const productIds = Array.from(
      new Set(balances.map((balance) => balance.product_id))
    );
    const barcodesByProduct = new Map<string, string[]>();

    const barcodeResponses = await Promise.all(
      splitIntoBatches(productIds).map((ids) =>
        session.supabase
          .from("product_barcodes")
          .select("product_id, barcode, is_default")
          .in("product_id", ids)
          .order("is_default", { ascending: false })
      )
    );

    for (const response of barcodeResponses) {
      if (response.error) {
        throw response.error;
      }

      for (const row of response.data ?? []) {
        const barcode = row.barcode?.trim();

        if (!barcode) {
          continue;
        }

        const current = barcodesByProduct.get(row.product_id) ?? [];

        if (!current.includes(barcode)) {
          current.push(barcode);
          barcodesByProduct.set(row.product_id, current);
        }
      }
    }

    let locationsQuery = session.supabase
      .from("locations")
      .select("id, name, code")
      .eq("company_id", session.access.companyId)
      .eq("is_active", true)
      .order("name");

    const { data: locations, error: locationsError } = await locationsQuery;

    if (locationsError) {
      throw locationsError;
    }

    return NextResponse.json({
      balances: balances.map((balance) => ({
        id: balance.id,
        product_id: balance.product_id,
        location_id: balance.location_id,
        available_quantity: Number(balance.available_quantity ?? 0),
        product: firstRelation(balance.products),
        location: firstRelation(balance.locations),
        barcodes: barcodesByProduct.get(balance.product_id) ?? [],
      })),
      locations: locations ?? [],
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
