import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PAGE_SIZE = 1000;

type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  minimum_quantity: number | null;
  is_active: boolean | null;
};

function normalizeRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function getAllProducts(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const products: Product[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, description, minimum_quantity, is_active")
      .eq("company_id", companyId)
      .order("sku")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as Product[];
    products.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return products;
    }

    from += PAGE_SIZE;
  }
}

function chunks<T>(items: T[], size = 400) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

function styleSheet(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  header.alignment = { horizontal: "center", vertical: "middle" };
  header.height = 22;
}

async function workbookResponse(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

function addProductSheet(workbook: ExcelJS.Workbook, rows: Array<Record<string, string | number | boolean>>) {
  const worksheet = workbook.addWorksheet("المنتجات");
  worksheet.columns = [
    { header: "sku", key: "sku", width: 20 },
    { header: "name", key: "name", width: 30 },
    { header: "description", key: "description", width: 35 },
    { header: "minimum_quantity", key: "minimum_quantity", width: 20 },
    { header: "is_active", key: "is_active", width: 14 },
    { header: "unit", key: "unit", width: 18 },
    { header: "barcode", key: "barcode", width: 22 },
  ];
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getColumn("sku").numFmt = "@";
  worksheet.getColumn("barcode").numFmt = "@";
  styleSheet(worksheet);
}

function addInventorySheet(workbook: ExcelJS.Workbook, rows: Array<Record<string, string | number>>) {
  const worksheet = workbook.addWorksheet("المخزون");
  worksheet.columns = [
    { header: "sku", key: "sku", width: 20 },
    { header: "location_code", key: "location_code", width: 22 },
    { header: "available_quantity", key: "available_quantity", width: 22 },
  ];
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getColumn("sku").numFmt = "@";
  styleSheet(worksheet);
}

function createTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "نظام إدارة المخزون";
  addProductSheet(workbook, [{
    sku: "PRD-001",
    name: "منتج تجريبي",
    description: "وصف اختياري",
    minimum_quantity: 5,
    is_active: true,
    unit: "حبة",
    barcode: "6280000000000",
  }]);
  addInventorySheet(workbook, [{ sku: "PRD-001", location_code: "MAIN", available_quantity: 50 }]);
  return workbook;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }

  const [{ data: profile, error: profileError }, { data: canViewProducts }] = await Promise.all([
    supabase.from("users").select("company_id, is_active").eq("auth_user_id", user.id).eq("is_active", true).single(),
    supabase.rpc("has_permission", { permission_code: "products.view" }),
  ]);

  if (profileError || !profile?.company_id || canViewProducts !== true) {
    return NextResponse.json({ error: "ليس لديك صلاحية تصدير المنتجات." }, { status: 403 });
  }

  try {
    if (new URL(request.url).searchParams.get("template") === "1") {
      return workbookResponse(createTemplate(), "products-import-template.xlsx");
    }

    const products = await getAllProducts(supabase, profile.company_id);
    const productIds = products.map((product) => product.id);
    const productUnits: Array<{ product_id: string; is_base: boolean | null; units: { name: string; symbol: string | null } | { name: string; symbol: string | null }[] | null }> = [];
    const barcodes: Array<{ product_id: string; barcode: string; is_default: boolean | null }> = [];
    const balances: Array<{ product_id: string; available_quantity: number | null; locations: { code: string | null } | { code: string | null }[] | null }> = [];

    for (const ids of chunks(productIds)) {
      const [unitsResponse, barcodesResponse, balancesResponse] = await Promise.all([
        supabase.from("product_units").select("product_id, is_base, units(name, symbol)").in("product_id", ids),
        supabase.from("product_barcodes").select("product_id, barcode, is_default").in("product_id", ids),
        supabase.from("stock_balances").select("product_id, available_quantity, locations(code)").in("product_id", ids),
      ]);

      if (unitsResponse.error) throw unitsResponse.error;
      if (barcodesResponse.error) throw barcodesResponse.error;
      if (balancesResponse.error) throw balancesResponse.error;

      productUnits.push(...(unitsResponse.data ?? []) as typeof productUnits);
      barcodes.push(...(barcodesResponse.data ?? []) as typeof barcodes);
      balances.push(...(balancesResponse.data ?? []) as typeof balances);
    }

    const baseUnitByProduct = new Map<string, string>();
    for (const productUnit of productUnits) {
      if (!productUnit.is_base) continue;
      const unit = normalizeRelation(productUnit.units);
      if (unit) baseUnitByProduct.set(productUnit.product_id, unit.name);
    }

    const barcodeByProduct = new Map<string, string>();
    for (const barcode of [...barcodes].sort((left, right) => Number(Boolean(right.is_default)) - Number(Boolean(left.is_default)))) {
      if (!barcodeByProduct.has(barcode.product_id)) barcodeByProduct.set(barcode.product_id, barcode.barcode);
    }

    const productById = new Map(products.map((product) => [product.id, product]));
    const inventoryRows: Array<Record<string, string | number>> = [];
    for (const balance of balances) {
      const product = productById.get(balance.product_id);
      const location = normalizeRelation(balance.locations);
      if (product && location?.code) {
        inventoryRows.push({
          sku: product.sku,
          location_code: location.code,
          available_quantity: Number(balance.available_quantity ?? 0),
        });
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "نظام إدارة المخزون";
    addProductSheet(workbook, products.map((product) => ({
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
      minimum_quantity: Number(product.minimum_quantity ?? 0),
      is_active: product.is_active !== false,
      unit: baseUnitByProduct.get(product.id) ?? "",
      barcode: barcodeByProduct.get(product.id) ?? "",
    })));
    addInventorySheet(workbook, inventoryRows);

    return workbookResponse(workbook, "inventory-products.xlsx");
  } catch (error) {
    console.error("GET /api/products/export:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر إنشاء ملف Excel." }, { status: 500 });
  }
}
