import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const PAGE_SIZE = 1000;
const MAX_IMPORT_ROWS = 5000;

type ProductImportRow = {
  rowNumber: number;
  sku: string;
  name: string;
  description: string;
  minimumQuantity: number | null;
  isActive: boolean | null;
  unit: string;
  barcode: string;
};

type InventoryImportRow = {
  rowNumber: number;
  sku: string;
  locationCode: string;
  availableQuantity: number;
};

type ExistingProduct = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  minimum_quantity: number | null;
  is_active: boolean | null;
};

type ImportLocation = { id: string; name: string; code: string };

type Summary = {
  created: number;
  updated: number;
  inventoryUpdated: number;
  skipped: number;
  errors: string[];
};

type ImportPreview = {
  valid: boolean;
  productRows: number;
  inventoryRows: number;
  productsToCreate: number;
  productsToUpdate: number;
  inventoryToAdjust: number;
  unchangedBalances: number;
  targetLocation: ImportLocation | null;
  issues: string[];
};

type PreparedImport = {
  productRows: ProductImportRow[];
  inventoryRows: InventoryImportRow[];
  productsBySku: Map<string, ExistingProduct>;
  unitsByName: Map<string, string>;
  baseUnitByProduct: Map<string, string>;
  targetLocation: ImportLocation | null;
  balancesByProductId: Map<string, number>;
  preview: ImportPreview;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value;

  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const formulaValue = value as { result?: unknown; text?: unknown };
    if (formulaValue.result !== undefined) return String(formulaValue.result).trim();
    if (formulaValue.text !== undefined) return String(formulaValue.text).trim();
  }

  return cell.text.trim();
}

function getHeaders(worksheet: ExcelJS.Worksheet) {
  const headers = new Map<string, number>();
  const headerRow = worksheet.getRow(1);

  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const key = normalizeKey(cellText(headerRow.getCell(column)));
    if (key) headers.set(key, column);
  }

  return headers;
}

function field(row: ExcelJS.Row, headers: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const column = headers.get(normalizeKey(alias));
    if (column) return cellText(row.getCell(column));
  }

  return "";
}

function optionalNumber(value: string, label: string, rowNumber: number) {
  if (!value.trim()) return null;

  const parsed = Number(value.replaceAll(",", "").trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`الصف ${rowNumber}: ${label} يجب أن يكون رقمًا صفر أو أكبر.`);
  }

  return parsed;
}

function optionalBoolean(value: string, rowNumber: number) {
  if (!value.trim()) return null;

  const normalized = normalizeKey(value);
  if (["true", "1", "yes", "نعم", "نشط"].includes(normalized)) return true;
  if (["false", "0", "no", "لا", "غيرنشط"].includes(normalized)) return false;

  throw new Error(`الصف ${rowNumber}: قيمة is_active يجب أن تكون true أو false.`);
}

function findSheet(workbook: ExcelJS.Workbook, names: string[], requiredHeaders: string[]) {
  const normalizedNames = new Set(names.map(normalizeKey));
  const namedSheet = workbook.worksheets.find((worksheet) =>
    normalizedNames.has(normalizeKey(worksheet.name))
  );

  if (namedSheet) return namedSheet;

  return workbook.worksheets.find((worksheet) => {
    const headers = getHeaders(worksheet);
    return requiredHeaders.every((header) => headers.has(normalizeKey(header)));
  });
}

function readProductsSheet(worksheet: ExcelJS.Worksheet | undefined) {
  const rows: ProductImportRow[] = [];
  if (!worksheet) return rows;

  const headers = getHeaders(worksheet);

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const sku = field(row, headers, ["sku", "productcode", "product_code", "رمز المنتج", "كود المنتج"]);
    if (!sku) continue;

    rows.push({
      rowNumber,
      sku: sku.trim(),
      name: field(row, headers, ["name", "productname", "product_name", "اسم المنتج"]).trim(),
      description: field(row, headers, ["description", "الوصف"]).trim(),
      minimumQuantity: optionalNumber(
        field(row, headers, ["minimum_quantity", "minimumquantity", "min_quantity", "الحد الأدنى", "الحدالادنى"]),
        "minimum_quantity",
        rowNumber
      ),
      isActive: optionalBoolean(field(row, headers, ["is_active", "isactive", "نشط", "الحالة"]), rowNumber),
      unit: field(row, headers, ["unit", "unit_name", "unitname", "الوحدة"]).trim(),
      barcode: field(row, headers, ["barcode", "الباركود"]).trim(),
    });
  }

  return rows;
}

function readInventorySheet(worksheet: ExcelJS.Worksheet | undefined) {
  const rows: InventoryImportRow[] = [];
  if (!worksheet) return rows;

  const headers = getHeaders(worksheet);

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const sku = field(row, headers, ["sku", "productcode", "product_code", "رمز المنتج", "كود المنتج"]);
    if (!sku) continue;

    const availableQuantity = optionalNumber(
      field(row, headers, ["available_quantity", "availablequantity", "quantity", "الكمية المتاحة", "الكمية"]),
      "available_quantity",
      rowNumber
    );

    if (availableQuantity === null) {
      throw new Error(`الصف ${rowNumber}: available_quantity مطلوب في ورقة المخزون.`);
    }

    rows.push({
      rowNumber,
      sku: sku.trim(),
      locationCode: field(row, headers, ["location_code", "locationcode", "location", "كود الموقع", "الموقع"]).trim(),
      availableQuantity,
    });
  }

  return rows;
}

function chunks<T>(items: T[], size = 400) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function getAllCompanyProducts(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const products: ExistingProduct[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, sku, name, description, minimum_quantity, is_active")
      .eq("company_id", companyId)
      .order("sku")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []) as ExistingProduct[];
    products.push(...batch);
    if (batch.length < PAGE_SIZE) return products;
    from += PAGE_SIZE;
  }
}

async function getProductUnits(supabase: Awaited<ReturnType<typeof createClient>>, productIds: string[]) {
  const results: { product_id: string; unit_id: string; is_base: boolean | null }[] = [];

  if (productIds.length === 0) return results;

  for (const ids of chunks(productIds)) {
    const { data, error } = await supabase
      .from("product_units")
      .select("product_id, unit_id, is_base")
      .in("product_id", ids);
    if (error) throw error;
    results.push(...((data ?? []) as typeof results));
  }

  return results;
}

async function getBalancesForLocation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  locationId: string
) {
  const results: { product_id: string; available_quantity: number | null }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("stock_balances")
      .select("product_id, available_quantity")
      .eq("location_id", locationId)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;

    const batch = (data ?? []) as typeof results;
    results.push(...batch);
    if (batch.length < PAGE_SIZE) return results;
    from += PAGE_SIZE;
  }
}

function addIssue(issues: string[], message: string) {
  if (issues.length < 30) issues.push(message);
}

async function prepareImport({
  supabase,
  companyId,
  isAdmin,
  userLocationId,
  canCreate,
  canUpdate,
  canAdjustStock,
  productRows,
  inventoryRows,
  targetLocationId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  companyId: string;
  isAdmin: boolean;
  userLocationId: string | null;
  canCreate: boolean | null;
  canUpdate: boolean | null;
  canAdjustStock: boolean | null;
  productRows: ProductImportRow[];
  inventoryRows: InventoryImportRow[];
  targetLocationId: string | null;
}): Promise<PreparedImport> {
  if (productRows.length + inventoryRows.length === 0) {
    throw new Error("لا توجد صفوف صالحة للاستيراد.");
  }
  if (productRows.length > MAX_IMPORT_ROWS || inventoryRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`الحد الأقصى هو ${MAX_IMPORT_ROWS} صف في كل ورقة.`);
  }

  const productKeys = new Set<string>();
  const inventoryKeys = new Set<string>();
  for (const row of productRows) {
    const key = normalizeKey(row.sku);
    if (productKeys.has(key)) throw new Error(`الصف ${row.rowNumber}: SKU مكرر داخل ورقة المنتجات.`);
    productKeys.add(key);
  }
  for (const row of inventoryRows) {
    const key = normalizeKey(row.sku);
    if (inventoryKeys.has(key)) throw new Error(`الصف ${row.rowNumber}: SKU مكرر داخل ورقة المخزون للفرع المحدد.`);
    inventoryKeys.add(key);
  }

  let locationsQuery = supabase
    .from("locations")
    .select("id, name, code")
    .eq("company_id", companyId)
    .eq("is_active", true);
  if (!isAdmin && userLocationId) locationsQuery = locationsQuery.eq("id", userLocationId);

  const locationsRequest = !isAdmin && !userLocationId
    ? Promise.resolve({ data: [], error: null })
    : locationsQuery;
  const [existingProducts, unitsResponse, locationsResponse] = await Promise.all([
    getAllCompanyProducts(supabase, companyId),
    supabase.from("units").select("id, name, symbol").eq("company_id", companyId),
    locationsRequest,
  ]);
  if (unitsResponse.error) throw unitsResponse.error;
  if (locationsResponse.error) throw locationsResponse.error;

  const locations = (locationsResponse.data ?? []) as ImportLocation[];
  const targetLocation = targetLocationId
    ? locations.find((location) => location.id === targetLocationId) ?? null
    : null;
  const productsBySku = new Map(existingProducts.map((product) => [normalizeKey(product.sku), product]));
  const unitsByName = new Map<string, string>();
  for (const unit of unitsResponse.data ?? []) {
    unitsByName.set(normalizeKey(unit.name), unit.id);
    if (unit.symbol) unitsByName.set(normalizeKey(unit.symbol), unit.id);
  }

  const productUnits = await getProductUnits(supabase, existingProducts.map((product) => product.id));
  const baseUnitByProduct = new Map<string, string>();
  for (const productUnit of productUnits) {
    if (productUnit.is_base) baseUnitByProduct.set(productUnit.product_id, productUnit.unit_id);
  }

  const issues: string[] = [];
  let productsToCreate = 0;
  let productsToUpdate = 0;
  for (const row of productRows) {
    const existing = productsBySku.get(normalizeKey(row.sku));
    if (existing) {
      productsToUpdate += 1;
      if (canUpdate !== true) addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): لا تملك صلاحية تحديث المنتجات.`);
      if (row.barcode && !baseUnitByProduct.has(existing.id)) {
        addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): لا توجد وحدة أساسية للمنتج.`);
      }
      continue;
    }

    productsToCreate += 1;
    if (canCreate !== true) addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): لا تملك صلاحية إضافة منتجات جديدة.`);
    if (!row.name) addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): اسم المنتج مطلوب لإضافة SKU جديد.`);
    if (!row.unit) {
      addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): الوحدة مطلوبة لإضافة SKU جديد.`);
    } else if (!unitsByName.has(normalizeKey(row.unit))) {
      addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): الوحدة "${row.unit}" غير موجودة في النظام.`);
    }
  }

  let balancesByProductId = new Map<string, number>();
  let inventoryToAdjust = 0;
  let unchangedBalances = 0;
  if (inventoryRows.length > 0) {
    if (canAdjustStock !== true) addIssue(issues, "ليس لديك صلاحية تسوية المخزون من ملف Excel.");
    if (!targetLocation) addIssue(issues, "اختر فرعًا صالحًا قبل استيراد ورقة المخزون.");
    if (targetLocation) {
      const balances = await getBalancesForLocation(supabase, targetLocation.id);
      balancesByProductId = new Map(
        balances.map((balance) => [balance.product_id, Number(balance.available_quantity ?? 0)])
      );
    }

    for (const row of inventoryRows) {
      const existing = productsBySku.get(normalizeKey(row.sku));
      const existsInProductsSheet = productKeys.has(normalizeKey(row.sku));
      if (!existing && !existsInProductsSheet) {
        addIssue(issues, `المخزون - الصف ${row.rowNumber} (${row.sku}): SKU غير موجود. أضفه في ورقة المنتجات أولًا.`);
        continue;
      }
      if (targetLocation && row.locationCode && normalizeKey(row.locationCode) !== normalizeKey(targetLocation.code)) {
        addIssue(issues, `المخزون - الصف ${row.rowNumber} (${row.sku}): كود الموقع "${row.locationCode}" لا يطابق الفرع المختار (${targetLocation.code}).`);
        continue;
      }

      const currentQuantity = existing ? balancesByProductId.get(existing.id) ?? 0 : 0;
      if (Math.abs(row.availableQuantity - currentQuantity) < 0.000001) {
        unchangedBalances += 1;
      } else {
        inventoryToAdjust += 1;
      }
    }
  }

  return {
    productRows,
    inventoryRows,
    productsBySku,
    unitsByName,
    baseUnitByProduct,
    targetLocation,
    balancesByProductId,
    preview: {
      valid: issues.length === 0,
      productRows: productRows.length,
      inventoryRows: inventoryRows.length,
      productsToCreate,
      productsToUpdate,
      inventoryToAdjust,
      unchangedBalances,
      targetLocation,
      issues,
    },
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role_id, location_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();
  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: "تعذر العثور على الشركة المرتبطة بالمستخدم." }, { status: 403 });
  }

  const [{ data: role, error: roleError }, { data: canCreate }, { data: canUpdate }, { data: canAdjustStock }, { data: hasFullAccess, error: fullAccessError }] = await Promise.all([
    supabase.from("roles").select("name").eq("id", profile.role_id).single(),
    supabase.rpc("has_permission", { permission_code: "products.create" }),
    supabase.rpc("has_permission", { permission_code: "products.update" }),
    supabase.rpc("has_permission", { permission_code: "stock.adjust" }),
    supabase.rpc("has_full_location_access"),
  ]);
  if (roleError || !role || fullAccessError) return NextResponse.json({ error: "تعذر التحقق من صلاحية المستخدم." }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const targetLocationId = String(formData.get("target_location_id") ?? "").trim() || null;
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "ملف Excel بصيغة .xlsx مطلوب." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "حجم الملف أكبر من 10 ميغابايت." }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);
    const productsSheet = findSheet(workbook, ["المنتجات", "products"], ["sku", "name"]);
    const inventorySheet = findSheet(workbook, ["المخزون", "inventory"], ["sku"]);
    if (!productsSheet && !inventorySheet) {
      return NextResponse.json({ error: "لم يتم العثور على ورقة المنتجات أو المخزون في الملف." }, { status: 400 });
    }

    const prepared = await prepareImport({
      supabase,
      companyId: profile.company_id,
      isAdmin: hasFullAccess === true,
      userLocationId: profile.location_id ?? null,
      canCreate,
      canUpdate,
      canAdjustStock,
      productRows: readProductsSheet(productsSheet),
      inventoryRows: readInventorySheet(inventorySheet),
      targetLocationId,
    });
    const mode = new URL(request.url).searchParams.get("mode");
    if (mode === "preview") return NextResponse.json({ preview: prepared.preview });

    if (!prepared.preview.valid) {
      return NextResponse.json(
        { error: "لم يتم تنفيذ الاستيراد. أصلح الملاحظات الظاهرة ثم اعرض المعاينة من جديد.", preview: prepared.preview },
        { status: 422 }
      );
    }

    const summary: Summary = { created: 0, updated: 0, inventoryUpdated: 0, skipped: 0, errors: [] };
    for (const row of prepared.productRows) {
      const existing = prepared.productsBySku.get(normalizeKey(row.sku));
      if (existing) {
        const update: Record<string, unknown> = {};
        if (row.name) update.name = row.name;
        if (row.description) update.description = row.description;
        if (row.minimumQuantity !== null) update.minimum_quantity = row.minimumQuantity;
        if (row.isActive !== null) update.is_active = row.isActive;
        if (Object.keys(update).length > 0) {
          const { error } = await supabase.from("products").update(update).eq("id", existing.id).eq("company_id", profile.company_id);
          if (error) throw error;
        }

        if (row.barcode) {
          const { data: existingBarcode, error: barcodeLookupError } = await supabase
            .from("product_barcodes")
            .select("id")
            .eq("product_id", existing.id)
            .eq("barcode", row.barcode)
            .maybeSingle();
          if (barcodeLookupError) throw barcodeLookupError;
          if (!existingBarcode) {
            const { error } = await supabase.rpc("add_product_barcode", {
              p_product_id: existing.id,
              p_unit_id: prepared.baseUnitByProduct.get(existing.id),
              p_barcode: row.barcode,
              p_is_default: false,
            });
            if (error) throw error;
          }
        }

        summary.updated += 1;
        continue;
      }

      const unitId = prepared.unitsByName.get(normalizeKey(row.unit));
      if (!unitId) throw new Error(`تعذر إيجاد وحدة المنتج ${row.sku}.`);
      const { data: createdProduct, error: createError } = await supabase
        .from("products")
        .insert({
          company_id: profile.company_id,
          sku: row.sku,
          name: row.name,
          description: row.description || null,
          category_id: null,
          brand_id: null,
          minimum_quantity: row.minimumQuantity ?? 0,
          is_active: row.isActive ?? true,
        })
        .select("id, sku, name, description, minimum_quantity, is_active")
        .single();
      if (createError || !createdProduct) throw createError ?? new Error("تعذر إضافة المنتج.");

      const { error: unitError } = await supabase.rpc("add_product_unit", {
        p_product_id: createdProduct.id,
        p_unit_id: unitId,
        p_conversion_factor: 1,
        p_is_base: true,
      });
      if (unitError) throw unitError;
      if (row.barcode) {
        const { error: barcodeError } = await supabase.rpc("add_product_barcode", {
          p_product_id: createdProduct.id,
          p_unit_id: unitId,
          p_barcode: row.barcode,
          p_is_default: true,
        });
        if (barcodeError) throw barcodeError;
      }
      const { error: balanceError } = await supabase.rpc("initialize_product_stock_balances", {
        p_product_id: createdProduct.id,
        p_company_id: profile.company_id,
      });
      if (balanceError) throw balanceError;

      const typedProduct = createdProduct as ExistingProduct;
      prepared.productsBySku.set(normalizeKey(typedProduct.sku), typedProduct);
      prepared.baseUnitByProduct.set(typedProduct.id, unitId);
      summary.created += 1;
    }

    if (prepared.inventoryRows.length > 0 && prepared.targetLocation) {
      for (const row of prepared.inventoryRows) {
        const product = prepared.productsBySku.get(normalizeKey(row.sku));
        if (!product) throw new Error(`تعذر إيجاد المنتج ${row.sku} بعد تجهيز الاستيراد.`);

        const currentQuantity = prepared.balancesByProductId.get(product.id) ?? 0;
        const delta = row.availableQuantity - currentQuantity;
        if (Math.abs(delta) < 0.000001) continue;

        const { error } = await supabase.rpc("adjust_stock", {
          target_product_id: product.id,
          target_location_id: prepared.targetLocation.id,
          adjustment_delta: delta,
          adjustment_reason: "تحديث من استيراد Excel",
        });
        if (error) throw error;
        prepared.balancesByProductId.set(product.id, row.availableQuantity);
        summary.inventoryUpdated += 1;
      }
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("POST /api/products/import:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر استيراد ملف Excel." },
      { status: 400 }
    );
  }
}
