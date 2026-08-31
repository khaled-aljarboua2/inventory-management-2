import { NextRequest, NextResponse } from "next/server";

import { firstRelation } from "@/lib/supabase/relations";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type ProductRef = {
  id: string;
  name: string;
  sku: string;
};

type LocationRef = {
  id: string;
  name: string;
  code: string;
};

type UserRef = {
  id: string;
  full_name: string;
};

function escapeLike(value: string) {
  return value.replace(/[%,]/g, "");
}

async function getMatchingProductIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  search: string
) {
  const query = escapeLike(search.trim());

  if (!query) {
    return null;
  }

  const [{ data: products, error: productsError }, { data: barcodes, error: barcodesError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id")
        .eq("company_id", companyId)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(500),
      supabase
        .from("product_barcodes")
        .select("product_id, products!inner(company_id)")
        .eq("products.company_id", companyId)
        .ilike("barcode", `%${query}%`)
        .limit(500),
    ]);

  if (productsError) {
    throw productsError;
  }

  if (barcodesError) {
    throw barcodesError;
  }

  return Array.from(
    new Set([
      ...(products ?? []).map((item) => item.id),
      ...(barcodes ?? []).map((item) => item.product_id),
    ])
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }

  const { data: dbUser, error: userError } = await supabase
    .from("users")
    .select("id, company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser?.company_id) {
    return NextResponse.json(
      { error: "تعذر التحقق من بيانات المستخدم." },
      { status: 403 }
    );
  }

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(params.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );
  const search = params.get("q")?.trim() ?? "";
  const locationId = params.get("location_id")?.trim() ?? "all";
  const transactionType = params.get("type")?.trim().toLowerCase() ?? "all";
  const direction = params.get("direction")?.trim().toLowerCase() ?? "all";

  try {
    const matchingProductIds = search
      ? await getMatchingProductIds(supabase, dbUser.company_id, search)
      : null;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("stock_transactions")
      .select(
        `
          id,
          company_id,
          product_id,
          location_id,
          transaction_type,
          reference_type,
          reference_id,
          quantity,
          quantity_before,
          quantity_after,
          notes,
          user_id,
          created_at,
          products (id, name, sku),
          locations (id, name, code),
          users (id, full_name)
        `,
        { count: "exact" }
      )
      .eq("company_id", dbUser.company_id)
      .order("created_at", { ascending: false });

    if (locationId !== "all") {
      query = query.eq("location_id", locationId);
    }

    if (transactionType !== "all") {
      query = query.eq("transaction_type", transactionType);
    }

    if (direction === "in") {
      query = query.gt("quantity", 0);
    } else if (direction === "out") {
      query = query.lt("quantity", 0);
    }

    if (search) {
      if (!matchingProductIds || matchingProductIds.length === 0) {
        return NextResponse.json({
          transactions: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
        });
      }

      query = query.in("product_id", matchingProductIds);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw error;
    }

    const transactions = (data ?? []).map((item) => ({
      id: item.id,
      company_id: item.company_id,
      product_id: item.product_id,
      location_id: item.location_id,
      transaction_type: String(item.transaction_type ?? ""),
      reference_type: item.reference_type ?? null,
      reference_id: item.reference_id ?? null,
      quantity: Number(item.quantity ?? 0),
      quantity_before: Number(item.quantity_before ?? 0),
      quantity_after: Number(item.quantity_after ?? 0),
      notes: item.notes ?? null,
      user_id: item.user_id ?? null,
      created_at: item.created_at,
      products: firstRelation(item.products) as ProductRef | null,
      locations: firstRelation(item.locations) as LocationRef | null,
      users: firstRelation(item.users) as UserRef | null,
    }));

    const total = count ?? 0;

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("GET /api/inventory/transactions:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحميل حركة المخزون.",
      },
      { status: 500 }
    );
  }
}
