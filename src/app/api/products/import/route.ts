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

type Summary = {
  created: number;
  updated: number;
  inventoryUpdated: number;
  skipped: number;
  errors: string[];
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function addError(summary: Summary, message: string) {
  summary.skipped += 1;

  if (summary.errors.length < 30) {
    summary.errors.push(message);
  }
}

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value;

  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const formulaValue = value as { result?: unknown; text?: unknown };

    if (formulaValue.result !== undefined) {
      return String(formulaValue.result).trim();
    }

    if (formulaValue.text !== undefined) {
      return String(formulaValue.text).trim();
    }
  }

  return cell.text.trim();
}

function getHeaders(worksheet: ExcelJS.Worksheet) {
  const headers = new Map<string, number>();
  const headerRow = worksheet.getRow(1);

  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const key = normalizeKey(cellText(headerRow.getCell(column)));

    if (key) {
      headers.set(key, column);
    }
  }

  return headers;
}

function field(row: ExcelJS.Row, headers: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const column = headers.get(normalizeKey(alias));

    if (column) {
      return cellText(row.getCell(column));
    }
  }

  return "";
}

function optionalNumber(value: string, label: string, rowNumber: number) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replaceAll(",", "").trim());

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`الصف ${rowNumber}: ${label} يجب أن يكون رقمًا صفر أو أكبر.`);
  }

  return parsed;
}

function optionalBoolean(value: string, rowNumber: number) {
  if (!value.trim()) {
    return null;
  }

  const normalized = normalizeKey(value);

  if (["true", "1", "yes", "نعم", "نشط"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "لا", "غيرنشط"].includes(normalized)) {
    return false;
  }

  throw new Error(`الصف ${rowNumber}: قيمة is_active يجب أن تكون true أو false.`);
}

function findSheet(workbook: ExcelJS.Workbook, names: string[], requiredHeaders: string[]) {
  const normalizedNames = new Set(names.map(normalizeKey));
  const namedSheet = workbook.worksheets.find((worksheet) =>
    normalizedNames.has(normalizeKey(worksheet.name))
  );

  if (namedSheet) {
    return namedSheet;
  }

  return workbook.worksheets.find((worksheet) => {
    const headers = getHeaders(worksheet);
    return requiredHeaders.every((header) => headers.has(normalizeKey(header)));
  });
}

function readProductsSheet(worksheet: ExcelJS.Worksheet | undefined) {
  const rows: ProductImportRow[] = [];

  if (!worksheet) {
    return rows;
  }

  const headers = getHeaders(worksheet);

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const sku = field(row, headers, ["sku", "productcode", "product_code", "رمز المنتج", "كود المنتج"]);

    if (!sku) {
      continue;
    }

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

  if (!worksheet) {
    return rows;
  }

  const headers = getHeaders(worksheet);

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const sku = field(row, headers, ["sku", "productcode", "product_code", "رمز المنتج", "كود المنتج"]);

    if (!sku) {
      continue;
    }

    const locationCode = field(row, headers, ["location_code", "locationcode", "location", "كود الموقع", "الموقع"]).trim();

    if (!locationCode) {
      throw new Error(`الصف ${rowNumber}: location_code مطلوب في ورقة المخزون.`);
    }

    const availableQuantity = optionalNumber(
      field(row, headers, ["available_quantity", "availablequantity", "quantity", "الكمية المتاحة", "الكمية"]),
      "available_quantity",
      rowNumber
    );

    if (availableQuantity === null) {
      throw new Error(`الصف ${rowNumber}: available_quantity مطلوب في ورقة المخزون.`);
    }

    rows.push({ rowNumber, sku: sku.trim(), locationCode, availableQuantity });
  }

  return rows;
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

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as ExistingProduct[];
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

async function getProductUnits(supabase: Awaited<ReturnType<typeof createClient>>, productIds: string[]) {
  const results: { product_id: string; unit_id: string; is_base: boolean | null }[] = [];

  for (const ids of chunks(productIds)) {
    const { data, error } = await supabase
      .from("product_units")
      .select("product_id, unit_id, is_base")
      .in("product_id", ids);

    if (error) {
      throw error;
    }

    results.push(...((data ?? []) as { product_id: string; unit_id: string; is_base: boolean | null }[]));
  }

  return results;
}

async function getBarcodes(supabase: Awaited<ReturnType<typeof createClient>>, productIds: string[]) {
  const results: { product_id: string; barcode: string }[] = [];

  for (const ids of chunks(productIds)) {
    const { data, error } = await supabase
      .from("product_barcodes")
      .select("product_id, barcode")
      .in("product_id", ids);

    if (error) {
      throw error;
    }

    results.push(...((data ?? []) as { product_id: string; barcode: string }[]));
  }

  return results;
}

async function getBalances(supabase: Awaited<ReturnType<typeof createClient>>) {
  const results: { product_id: string; location_id: string; available_quantity: number | null }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("stock_balances")
      .select("product_id, location_id, available_quantity")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = (data ?? []) as { product_id: string; location_id: string; available_quantity: number | null }[];
    results.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return results;
    }

    from += PAGE_SIZE;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id, role_id, location_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (profileError || !profile?.company_id) {
    return NextResponse.json({ error: "تعذر العثور على الشركة المرتبطة بالمستخدم." }, { status: 403 });
  }

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("name")
    .eq("id", profile.role_id)
    .single();

  if (roleError || !role) {
    return NextResponse.json({ error: "تعذر التحقق من صلاحية المستخدم." }, { status: 403 });
  }

  const isAdmin = role.name === "admin";

  const [{ data: canCreate }, { data: canUpdate }, { data: canAdjustStock }] = await Promise.all([
    supabase.rpc("has_permission", { permission_code: "products.create" }),
    supabase.rpc("has_permission", { permission_code: "products.update" }),
    supabase.rpc("has_permission", { permission_code: "stock.adjust" }),
  ]);

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "ملف Excel بصيغة .xlsx مطلوب." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "حجم الملف أكبر من 10 ميغابايت." }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      Buffer.from(await file.arrayBuffer()) as never
    );

    const productsSheet = findSheet(workbook, ["المنتجات", "products"], ["sku", "name"]);
    const inventorySheet = findSheet(workbook, ["المخزون", "inventory"], ["sku", "location_code"]);

    if (!productsSheet && !inventorySheet) {
      return NextResponse.json({ error: "لم يتم العثور على ورقة المنتجات أو المخزون في الملف." }, { status: 400 });
    }

    const productRows = readProductsSheet(productsSheet);
    const inventoryRows = readInventorySheet(inventorySheet);

    if (productRows.length + inventoryRows.length === 0) {
      return NextResponse.json({ error: "لا توجد صفوف صالحة للاستيراد." }, { status: 400 });
    }

    if (productRows.length > MAX_IMPORT_ROWS || inventoryRows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json({ error: `الحد الأقصى هو ${MAX_IMPORT_ROWS} صف في كل ورقة.` }, { status: 400 });
    }

    const productKeys = new Set<string>();
    const inventoryKeys = new Set<string>();

    for (const row of productRows) {
      const key = normalizeKey(row.sku);

      if (productKeys.has(key)) {
        throw new Error(`الصف ${row.rowNumber}: SKU مكرر داخل ورقة المنتجات.`);
      }

      productKeys.add(key);
    }

    for (const row of inventoryRows) {
      const key = `${normalizeKey(row.sku)}|${normalizeKey(row.locationCode)}`;

      if (inventoryKeys.has(key)) {
        throw new Error(`الصف ${row.rowNumber}: المنتج والموقع مكرران داخل ورقة المخزون.`);
      }

      inventoryKeys.add(key);
    }

    const summary: Summary = { created: 0, updated: 0, inventoryUpdated: 0, skipped: 0, errors: [] };
    let locationsQuery = supabase
      .from("locations")
      .select("id, code")
      .eq("company_id", profile.company_id)
      .eq("is_active", true);

    if (!isAdmin && profile.location_id) {
      locationsQuery = locationsQuery.eq("id", profile.location_id);
    }

    const locationsRequest = !isAdmin && !profile.location_id
      ? Promise.resolve({ data: [], error: null })
      : locationsQuery;

    const [existingProducts, unitsResponse, locationsResponse] = await Promise.all([
      getAllCompanyProducts(supabase, profile.company_id),
      supabase.from("units").select("id, name, symbol").eq("company_id", profile.company_id),
      locationsRequest,
    ]);

    if (unitsResponse.error) {
      throw unitsResponse.error;
    }

    if (locationsResponse.error) {
      throw locationsResponse.error;
    }

    const productsBySku = new Map(existingProducts.map((product) => [normalizeKey(product.sku), product]));
    const unitsByName = new Map<string, string>();

    for (const unit of unitsResponse.data ?? []) {
      unitsByName.set(normalizeKey(unit.name), unit.id);

      if (unit.symbol) {
        unitsByName.set(normalizeKey(unit.symbol), unit.id);
      }
    }

    const locationsByCode = new Map<string, string>();

    for (const location of locationsResponse.data ?? []) {
      if (location.code) {
        locationsByCode.set(normalizeKey(location.code), location.id);
      }
    }

    const existingIds = existingProducts.map((product) => product.id);
    const [productUnits, existingBarcodes] = await Promise.all([
      getProductUnits(supabase, existingIds),
      getBarcodes(supabase, existingIds),
    ]);
    const baseUnitByProduct = new Map<string, string>();

    for (const productUnit of productUnits) {
      if (productUnit.is_base) {
        baseUnitByProduct.set(productUnit.product_id, productUnit.unit_id);
      }
    }

    const barcodeKeys = new Set(existingBarcodes.map((barcode) => `${barcode.product_id}|${barcode.barcode}`));

    for (const row of productRows) {
      const existing = productsBySku.get(normalizeKey(row.sku));

      try {
        if (existing) {
          if (canUpdate !== true) {
            throw new Error("لا تملك صلاحية تحديث المنتجات.");
          }

          const update: Record<string, unknown> = {};

          if (row.name) update.name = row.name;
          if (row.description) update.description = row.description;
          if (row.minimumQuantity !== null) update.minimum_quantity = row.minimumQuantity;
          if (row.isActive !== null) update.is_active = row.isActive;

          if (Object.keys(update).length > 0) {
            const { error } = await supabase.from("products").update(update).eq("id", existing.id).eq("company_id", profile.company_id);

            if (error) {
              throw error;
            }
          }

          const barcodeKey = `${existing.id}|${row.barcode}`;

          if (row.barcode && !barcodeKeys.has(barcodeKey)) {
            const baseUnitId = baseUnitByProduct.get(existing.id);

            if (!baseUnitId) {
              throw new Error("لا توجد وحدة أساسية لهذا المنتج.");
            }

            const { error } = await supabase.rpc("add_product_barcode", {
              p_product_id: existing.id,
              p_unit_id: baseUnitId,
              p_barcode: row.barcode,
              p_is_default: false,
            });

            if (error) {
              throw error;
            }

            barcodeKeys.add(barcodeKey);
          }

          summary.updated += 1;
          continue;
        }

        if (canCreate !== true) {
          throw new Error("لا تملك صلاحية إضافة منتجات جديدة.");
        }

        if (!row.name || !row.unit) {
          throw new Error(!row.name ? "اسم المنتج مطلوب لإضافة SKU جديد." : "الوحدة مطلوبة لإضافة SKU جديد.");
        }

        const unitId = unitsByName.get(normalizeKey(row.unit));

        if (!unitId) {
          throw new Error(`الوحدة "${row.unit}" غير موجودة في النظام.`);
        }

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

        if (createError || !createdProduct) {
          throw createError ?? new Error("تعذر إضافة المنتج.");
        }

        const { error: unitError } = await supabase.rpc("add_product_unit", {
          p_product_id: createdProduct.id,
          p_unit_id: unitId,
          p_conversion_factor: 1,
          p_is_base: true,
        });

        if (unitError) {
          await supabase.from("products").delete().eq("id", createdProduct.id);
          throw unitError;
        }

        if (row.barcode) {
          const { error: barcodeError } = await supabase.rpc("add_product_barcode", {
            p_product_id: createdProduct.id,
            p_unit_id: unitId,
            p_barcode: row.barcode,
            p_is_default: true,
          });

          if (barcodeError) {
            throw barcodeError;
          }

          barcodeKeys.add(`${createdProduct.id}|${row.barcode}`);
        }

        const { error: balanceError } = await supabase.rpc("initialize_product_stock_balances", {
          p_product_id: createdProduct.id,
          p_company_id: profile.company_id,
        });

        if (balanceError) {
          throw balanceError;
        }

        const typedProduct = createdProduct as ExistingProduct;
        productsBySku.set(normalizeKey(typedProduct.sku), typedProduct);
        baseUnitByProduct.set(typedProduct.id, unitId);
        summary.created += 1;
      } catch (error) {
        addError(summary, `الصف ${row.rowNumber} (${row.sku}): ${error instanceof Error ? error.message : "تعذر معالجة المنتج."}`);
      }
    }

    if (inventoryRows.length > 0 && canAdjustStock !== true) {
      for (const row of inventoryRows) {
        addError(summary, `ورقة المخزون - الصف ${row.rowNumber}: ليس لديك صلاحية تحديث المخزون من ملف Excel.`);
      }
    }

    if (inventoryRows.length > 0 && canAdjustStock === true) {
      const balances = await getBalances(supabase);
      const balancesByKey = new Map(
        balances.map((balance) => [`${balance.product_id}|${balance.location_id}`, Number(balance.available_quantity ?? 0)])
      );

      for (const row of inventoryRows) {
        try {
          const product = productsBySku.get(normalizeKey(row.sku));
          const locationId = locationsByCode.get(normalizeKey(row.locationCode));

          if (!product) {
            throw new Error("SKU غير موجود. أضفه في ورقة المنتجات أولًا.");
          }

          if (!locationId) {
            throw new Error(`الموقع "${row.locationCode}" غير موجود أو غير نشط.`);
          }

          const balanceKey = `${product.id}|${locationId}`;
          const currentQuantity = balancesByKey.get(balanceKey);

          if (currentQuantity === undefined) {
            throw new Error("لا يوجد رصيد ابتدائي لهذا المنتج في الموقع.");
          }

          const delta = row.availableQuantity - currentQuantity;

          if (Math.abs(delta) < 0.000001) {
            continue;
          }

          const { error } = await supabase.rpc("adjust_stock", {
            target_product_id: product.id,
            target_location_id: locationId,
            adjustment_delta: delta,
            adjustment_reason: "تحديث من استيراد Excel",
          });

          if (error) {
            throw error;
          }

          balancesByKey.set(balanceKey, row.availableQuantity);
          summary.inventoryUpdated += 1;
        } catch (error) {
          addError(summary, `ورقة المخزون - الصف ${row.rowNumber} (${row.sku}): ${error instanceof Error ? error.message : "تعذر تحديث الرصيد."}`);
        }
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
