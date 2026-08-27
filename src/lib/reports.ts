import { firstRelation } from "@/lib/supabase/relations";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type Relation<T> = T | T[] | null;

type ProductRef = {
  id: string;
  sku: string;
  name: string;
};

type LocationRef = {
  id: string;
  name: string;
  code: string;
};

type RawBalance = {
  id: string;
  product_id: string;
  location_id: string;
  available_quantity: number | null;
  reserved_quantity: number | null;
  minimum_quantity: number | null;
  maximum_quantity: number | null;
  updated_at: string | null;
  products: Relation<ProductRef>;
  locations: Relation<LocationRef>;
};

type RawTransaction = {
  id: string;
  product_id: string;
  location_id: string;
  transaction_type: string;
  quantity: number | null;
  created_at: string | null;
  products: Relation<ProductRef>;
  locations: Relation<LocationRef>;
};

type ProductUnitRow = {
  product_id: string;
  is_base: boolean;
  units: Relation<{
    name: string;
    symbol: string | null;
  }>;
};

type ProductBarcodeRow = {
  product_id: string;
  barcode: string;
  is_default: boolean;
};

export type ReportAccess = {
  companyId: string;
  locationId: string | null;
  isAdmin: boolean;
};

export type ReportBalance = Omit<RawBalance, "products" | "locations"> & {
  products: ProductRef | null;
  locations: LocationRef | null;
  unitName: string;
  barcode: string;
};

export type ReportTransaction = Omit<RawTransaction, "products" | "locations"> & {
  products: ProductRef | null;
  locations: LocationRef | null;
  unitName: string;
};

export type ReportData = {
  balances: ReportBalance[];
  transactions: ReportTransaction[];
};

export const TRANSACTION_LABELS: Record<string, string> = {
  opening_balance: "رصيد افتتاحي",
  purchase: "شراء",
  transfer_in: "نقل وارد",
  transfer_out: "نقل صادر",
  sale: "بيع",
  adjustment: "تسوية",
  stock_count: "جرد",
  return: "مرتجع",
};

const PAGE_SIZE = 1000;
const PRODUCT_METADATA_BATCH_SIZE = 500;
const UNKNOWN_UNIT = "وحدة غير محددة";

export function formatReportNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatReportDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function splitIntoBatches<T>(items: T[], batchSize = PRODUCT_METADATA_BATCH_SIZE) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }

  return batches;
}

export async function getReportAccess(): Promise<
  | { supabase: SupabaseServerClient; access: ReportAccess; error: null }
  | { supabase: null; access: null; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase: null, access: null, error: "يجب تسجيل الدخول أولًا." };
  }

  const { data: dbUser, error: userError } = await supabase
    .from("users")
    .select("company_id, role_id, location_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser?.company_id) {
    return { supabase: null, access: null, error: "تعذر التحقق من بيانات المستخدم." };
  }

  const [{ data: role, error: roleError }, { data: canViewStock }] = await Promise.all([
    supabase.from("roles").select("name").eq("id", dbUser.role_id).single(),
    supabase.rpc("has_permission", { permission_code: "stock.view" }),
  ]);

  if (roleError || !role) {
    return { supabase: null, access: null, error: "تعذر التحقق من صلاحية المستخدم." };
  }

  if (canViewStock !== true) {
    return { supabase: null, access: null, error: "ليس لديك صلاحية عرض تقارير المخزون." };
  }

  const isAdmin = role.name === "admin";

  if (!isAdmin && !dbUser.location_id) {
    return { supabase: null, access: null, error: "المستخدم غير مرتبط بموقع." };
  }

  return {
    supabase,
    access: {
      companyId: dbUser.company_id,
      locationId: dbUser.location_id ?? null,
      isAdmin,
    },
    error: null,
  };
}

async function getAllBalances(supabase: SupabaseServerClient, access: ReportAccess) {
  const balances: RawBalance[] = [];
  let from = 0;

  while (true) {
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
        updated_at,
        products!inner (id, sku, name, company_id),
        locations!inner (id, name, code, company_id)
      `)
      .eq("products.company_id", access.companyId)
      .eq("locations.company_id", access.companyId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (!access.isAdmin && access.locationId) {
      query = query.eq("location_id", access.locationId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const batch = (data ?? []).map((row) => ({
      ...row,
      products: firstRelation(row.products),
      locations: firstRelation(row.locations),
    })) as RawBalance[];

    balances.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return balances;
    }

    from += PAGE_SIZE;
  }
}

async function getRecentTransactions(
  supabase: SupabaseServerClient,
  access: ReportAccess,
  since: string
) {
  const transactions: RawTransaction[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("stock_transactions")
      .select(`
        id,
        product_id,
        location_id,
        transaction_type,
        quantity,
        created_at,
        products!inner (id, sku, name, company_id),
        locations!inner (id, name, code, company_id)
      `)
      .eq("company_id", access.companyId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (!access.isAdmin && access.locationId) {
      query = query.eq("location_id", access.locationId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const batch = (data ?? []).map((row) => ({
      ...row,
      products: firstRelation(row.products),
      locations: firstRelation(row.locations),
    })) as RawTransaction[];

    transactions.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return transactions;
    }

    from += PAGE_SIZE;
  }
}

async function getProductMetadata(
  supabase: SupabaseServerClient,
  productIds: string[],
  includeBarcodes: boolean
) {
  const unitNameByProduct = new Map<string, string>();
  const barcodeByProduct = new Map<string, string>();
  const productBatches = splitIntoBatches(productIds);

  const [unitResponses, barcodeResponses] = await Promise.all([
    Promise.all(
      productBatches.map((ids) =>
        supabase
          .from("product_units")
          .select("product_id, is_base, units(name, symbol)")
          .in("product_id", ids)
          .order("is_base", { ascending: false })
      )
    ),
    includeBarcodes
      ? Promise.all(
          productBatches.map((ids) =>
            supabase
              .from("product_barcodes")
              .select("product_id, barcode, is_default")
              .in("product_id", ids)
              .order("is_default", { ascending: false })
          )
        )
      : Promise.resolve([]),
  ]);

  for (const response of unitResponses) {
    if (response.error) {
      throw response.error;
    }

    for (const row of (response.data ?? []) as ProductUnitRow[]) {
      const unit = Array.isArray(row.units)
        ? row.units[0] ?? null
        : row.units;
      const unitName = unit?.symbol || unit?.name || UNKNOWN_UNIT;

      if (!unitNameByProduct.has(row.product_id) || row.is_base) {
        unitNameByProduct.set(row.product_id, unitName);
      }
    }
  }

  for (const response of barcodeResponses) {
    if (response.error) {
      throw response.error;
    }

    for (const row of (response.data ?? []) as ProductBarcodeRow[]) {
      const barcode = row.barcode?.trim();

      if (barcode && !barcodeByProduct.has(row.product_id)) {
        barcodeByProduct.set(row.product_id, barcode);
      }
    }
  }

  return { unitNameByProduct, barcodeByProduct };
}

export async function loadReportData(
  supabase: SupabaseServerClient,
  access: ReportAccess,
  { includeBarcodes = false }: { includeBarcodes?: boolean } = {}
): Promise<ReportData> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [rawBalances, rawTransactions] = await Promise.all([
    getAllBalances(supabase, access),
    getRecentTransactions(supabase, access, since),
  ]);

  const productIds = Array.from(
    new Set([
      ...rawBalances.map((item) => item.product_id),
      ...rawTransactions.map((item) => item.product_id),
    ])
  );
  const { unitNameByProduct, barcodeByProduct } = await getProductMetadata(
    supabase,
    productIds,
    includeBarcodes
  );

  return {
    balances: rawBalances.map((item) => {
      const products = Array.isArray(item.products)
        ? item.products[0] ?? null
        : item.products;
      const locations = Array.isArray(item.locations)
        ? item.locations[0] ?? null
        : item.locations;

      return {
        ...item,
        products,
        locations,
        unitName: unitNameByProduct.get(item.product_id) ?? UNKNOWN_UNIT,
        barcode: barcodeByProduct.get(item.product_id) ?? "",
      };
    }),
    transactions: rawTransactions.map((item) => {
      const products = Array.isArray(item.products)
        ? item.products[0] ?? null
        : item.products;
      const locations = Array.isArray(item.locations)
        ? item.locations[0] ?? null
        : item.locations;

      return {
        ...item,
        products,
        locations,
        unitName: unitNameByProduct.get(item.product_id) ?? UNKNOWN_UNIT,
      };
    }),
  };
}

