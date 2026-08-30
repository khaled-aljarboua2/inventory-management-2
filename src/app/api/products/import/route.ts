import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import {
  barcodeKey,
  identifierText,
  locationMatchesDaftraReference,
  normalizeHeader,
  numbersClose,
  parseCsvDocument,
  parseNonNegativeNumber,
  productNameKey,
  resolveDaftraStocktakingFactor,
  skuKey,
  unitLookupKeys,
  unwrapNestedCsvRows,
} from "@/lib/daftra-import";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const PAGE_SIZE = 500;
const MAX_IMPORT_ROWS = 5000;
const CONCURRENCY = 20;

type ImportKind = "standard" | "daftra_products" | "daftra_stocktaking";
type ProductImportRow = {
  rowNumber: number; sourceRowKey: string; sku: string; name: string; description: string;
  minimumQuantity: number | null; isActive: boolean | null; unit: string; barcode: string;
};
type InventoryImportRow = {
  rowNumber: number; sourceRowKey: string; source: ImportKind; sku: string; barcode: string;
  locationReference: string; inputQuantity: number; unitName: string; programQuantity: number | null;
  productName?: string; daftraProductReference?: string;
};
type ExistingProduct = {
  id: string; sku: string; name: string; description: string | null;
  minimum_quantity: number | null; is_active: boolean | null;
};
type Unit = { id: string; name: string; symbol: string | null };
type ProductUnit = { product_id: string; unit_id: string; conversion_factor: number | string; is_base: boolean | null };
type ProductBarcode = { product_id: string; barcode: string };
type ImportLocation = { id: string; name: string; code: string };
type ImportReportRow = {
  status: "settled" | "unchanged" | "skipped";
  rowNumber: number;
  source: string;
  productName: string;
  sku: string;
  barcode: string;
  daftraProductReference: string;
  unitName: string;
  importedQuantity: number | null;
  programQuantity: number | null;
  beforeQuantity: number | null;
  afterQuantity: number | null;
  difference: number | null;
  reason: string;
};
type ParsedImport = {
  kind: ImportKind; productRows: ProductImportRow[]; inventoryRows: InventoryImportRow[];
  issues: string[]; notices?: PreviewNotice[]; skippedRows: number; rejectedRows: ImportReportRow[];
};
type PreviewNotice = { level: "info" | "warning"; text: string };
type ResolvedInventoryRow = { row: InventoryImportRow; productSku: string; targetQuantity: number };
type Summary = {
  created: number; updated: number; inventoryUpdated: number; skipped: number; errors: string[];
  settledRows: ImportReportRow[]; unsettledRows: ImportReportRow[];
};
type ImportPreview = {
  valid: boolean; source: "Daftra Products Export" | "Daftra Stocktaking Report" | "ملف النظام";
  productRows: number; inventoryRows: number; productsToCreate: number; productsToUpdate: number;
  inventoryToAdjust: number; unchangedBalances: number; skippedRows: number;
  targetLocation: ImportLocation | null; issues: string[]; notices: PreviewNotice[];
};
type PreparedImport = {
  productRows: ProductImportRow[]; inventoryAdjustments: ResolvedInventoryRow[];
  productsBySku: Map<string, ExistingProduct>; unitsByKey: Map<string, string>;
  baseUnitByProduct: Map<string, string>; balancesByProductId: Map<string, number>;
  targetLocation: ImportLocation | null; preview: ImportPreview; rejectedRows: ImportReportRow[];
};

function addIssue(issues: string[], message: string) {
  if (issues.length < 30) issues.push(message);
}

function addNotice(notices: PreviewNotice[], level: PreviewNotice["level"], text: string) {
  if (notices.length < 30) notices.push({ level, text });
}

function rejectedReportRow({
  rowNumber,
  source,
  productName = "",
  sku = "",
  barcode = "",
  daftraProductReference = "",
  unitName = "",
  importedQuantity = null,
  programQuantity = null,
  reason,
}: Pick<ImportReportRow, "rowNumber" | "source" | "reason"> & Partial<Pick<ImportReportRow, "productName" | "sku" | "barcode" | "daftraProductReference" | "unitName" | "importedQuantity" | "programQuantity">>): ImportReportRow {
  return {
    status: "skipped", rowNumber, source, productName, sku, barcode, daftraProductReference, unitName,
    importedQuantity, programQuantity, beforeQuantity: null, afterQuantity: null, difference: null, reason,
  };
}

function rejectedInventoryRow(row: InventoryImportRow, reason: string): ImportReportRow {
  return rejectedReportRow({
    rowNumber: row.rowNumber,
    source: sourceLabel(row.source),
    productName: row.productName ?? "",
    sku: row.sku,
    barcode: row.barcode,
    daftraProductReference: row.daftraProductReference ?? "",
    unitName: row.unitName,
    importedQuantity: row.inputQuantity,
    programQuantity: row.programQuantity,
    reason,
  });
}

function rejectedProductRow(row: ProductImportRow, reason: string): ImportReportRow {
  return rejectedReportRow({
    rowNumber: row.rowNumber,
    source: "بيانات المنتجات",
    productName: row.name,
    sku: row.sku,
    barcode: row.barcode,
    unitName: row.unit,
    reason,
  });
}

function cellText(cell: ExcelJS.Cell) {
  const value = cell.value as unknown;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const formula = value as { result?: unknown; text?: unknown };
    if (formula.result !== undefined) return String(formula.result).trim();
    if (formula.text !== undefined) return String(formula.text).trim();
  }
  return cell.text.trim() || String(value).trim();
}

function cellIdentifier(cell: ExcelJS.Cell) {
  const value = cell.value as unknown;
  if (typeof value === "object" && value !== null) {
    const formula = value as { result?: unknown; text?: unknown };
    if (formula.result !== undefined) return identifierText(formula.result);
    if (formula.text !== undefined) return identifierText(formula.text);
  }
  return identifierText(cell.text || value);
}

function getHeaders(worksheet: ExcelJS.Worksheet) {
  const headers = new Map<string, number>();
  const header = worksheet.getRow(1);
  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const key = normalizeHeader(cellText(header.getCell(column)));
    if (key) headers.set(key, column);
  }
  return headers;
}

function field(row: ExcelJS.Row, headers: Map<string, number>, aliases: string[], reader: (cell: ExcelJS.Cell) => string = cellText) {
  for (const alias of aliases) {
    const column = headers.get(normalizeHeader(alias));
    if (column) return reader(row.getCell(column));
  }
  return "";
}

function optionalBoolean(value: string, rowNumber: number) {
  if (!value.trim()) return null;
  const normalized = normalizeHeader(value);
  if (["true", "1", "yes", "نعم", "نشط"].includes(normalized)) return true;
  if (["false", "0", "no", "لا", "غيرنشط"].includes(normalized)) return false;
  throw new Error(`الصف ${rowNumber}: قيمة is_active يجب أن تكون true أو false.`);
}

function findSheet(workbook: ExcelJS.Workbook, names: string[], requiredHeaders: string[]) {
  const named = workbook.worksheets.find((worksheet) => names.map(normalizeHeader).includes(normalizeHeader(worksheet.name)));
  if (named) return named;
  return workbook.worksheets.find((worksheet) => {
    const headers = getHeaders(worksheet);
    return requiredHeaders.every((header) => headers.has(normalizeHeader(header)));
  });
}

function sourceLabel(kind: ImportKind): ImportPreview["source"] {
  return kind === "daftra_products" ? "Daftra Products Export" : kind === "daftra_stocktaking" ? "Daftra Stocktaking Report" : "ملف النظام";
}

function readDaftraProductsSheet(worksheet: ExcelJS.Worksheet): ParsedImport {
  const productRows: ProductImportRow[] = [];
  const inventoryRows: InventoryImportRow[] = [];
  const issues: string[] = [];
  const notices: PreviewNotice[] = [];
  const rejectedRows: ImportReportRow[] = [];
  const headers = getHeaders(worksheet);
  let skippedRows = 0;
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const sku = field(row, headers, ["ProductCode"], cellIdentifier);
    if (!sku) {
      skippedRows += 1;
      const reason = "ProductCode فارغ، لذلك تم تجاهل الصف بأمان.";
      addIssue(issues, `دفترة - الصف ${rowNumber}: ${reason}`);
      rejectedRows.push(rejectedReportRow({ rowNumber, source: "Daftra Products Export", productName: field(row, headers, ["Name"]).trim(), reason }));
      continue;
    }
    const lowStockText = field(row, headers, ["LowStockThershol"]);
    const stockBalanceText = field(row, headers, ["StockBalance"]);
    const minimumQuantity = parseNonNegativeNumber(lowStockText);
    const stockBalance = parseNonNegativeNumber(stockBalanceText);
    if (lowStockText.trim() && minimumQuantity === null) {
      addNotice(notices, "warning", `دفترة - الصف ${rowNumber} (${sku}): LowStockThershol غير صالح؛ لم يتم تعديل الحد الأدنى.`);
    }
    productRows.push({
      rowNumber, sourceRowKey: `daftra-products:${rowNumber}`, sku,
      name: field(row, headers, ["Name"]).trim(),
      description: field(row, headers, ["Description"]).trim(),
      minimumQuantity, isActive: null,
      unit: field(row, headers, ["UnitTemplate"]).trim(),
      barcode: field(row, headers, ["Barcode"], cellIdentifier),
    });
    if (stockBalanceText.trim() && stockBalance === null) {
      addNotice(notices, "warning", `دفترة - الصف ${rowNumber} (${sku}): StockBalance غير صالح؛ لم يتم تعديل الرصيد.`);
    } else if (stockBalance !== null) {
      inventoryRows.push({
        rowNumber, sourceRowKey: `daftra-products:${rowNumber}`, source: "daftra_products", sku, barcode: "",
        locationReference: "", inputQuantity: stockBalance,
        unitName: field(row, headers, ["UnitTemplate"]).trim(), programQuantity: null,
      });
    }
  }
  return { kind: "daftra_products", productRows, inventoryRows, issues, notices, skippedRows, rejectedRows };
}

function readDaftraStocktakingSheet(worksheet: ExcelJS.Worksheet): ParsedImport {
  const inventoryRows: InventoryImportRow[] = [];
  const issues: string[] = [];
  const rejectedRows: ImportReportRow[] = [];
  const headers = getHeaders(worksheet);
  let skippedRows = 0;
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const daftraProductReference = field(row, headers, ["رقم المنتج"], cellIdentifier);
    const sku = field(row, headers, ["الرقم التسلسلي"], cellIdentifier);
    const barcode = field(row, headers, ["الباركود"], cellIdentifier);
    const productName = field(row, headers, ["منتج", "الاسم"]).trim();
    const unitName = field(row, headers, ["اسم الوحدة"]).trim();
    const locationReference = field(row, headers, ["الرقم التعريفي للفرع"]).trim();
    const programQuantity = parseNonNegativeNumber(field(row, headers, ["العدد بالبرنامج"]));
    const quantity = parseNonNegativeNumber(field(row, headers, ["العدد الفعلي"]));
    if (!sku && !barcode && !productName) {
      skippedRows += 1;
      const reason = "الرقم التسلسلي والباركود واسم المنتج فارغة؛ تم تجاهل الصف بأمان.";
      addIssue(issues, `الجرد - الصف ${rowNumber} (${daftraProductReference || "بدون رقم دفترة"}): ${reason}`);
      rejectedRows.push(rejectedReportRow({ rowNumber, source: "Daftra Stocktaking Report", productName, sku, barcode, daftraProductReference, unitName, importedQuantity: quantity, programQuantity, reason }));
      continue;
    }
    if (quantity === null) {
      skippedRows += 1;
      const reason = "العدد الفعلي غير صالح؛ تم تجاهل الصف.";
      addIssue(issues, `الجرد - الصف ${rowNumber} (${sku || barcode || daftraProductReference}): ${reason}`);
      rejectedRows.push(rejectedReportRow({ rowNumber, source: "Daftra Stocktaking Report", productName, sku, barcode, daftraProductReference, unitName, importedQuantity: null, programQuantity, reason }));
      continue;
    }
    inventoryRows.push({
      rowNumber, sourceRowKey: `daftra-stocktaking:${rowNumber}`, source: "daftra_stocktaking", sku, barcode,
      locationReference, inputQuantity: quantity, unitName, programQuantity,
      productName,
      daftraProductReference,
    });
  }
  return { kind: "daftra_stocktaking", productRows: [], inventoryRows, issues, skippedRows, rejectedRows };
}

function readStandardProductsSheet(worksheet: ExcelJS.Worksheet | undefined): ParsedImport {
  const productRows: ProductImportRow[] = [];
  const issues: string[] = [];
  const rejectedRows: ImportReportRow[] = [];
  if (!worksheet) return { kind: "standard", productRows, inventoryRows: [], issues, skippedRows: 0, rejectedRows };
  const headers = getHeaders(worksheet);
  let skippedRows = 0;
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const sku = field(row, headers, ["sku", "productcode", "product_code", "رمز المنتج", "كود المنتج"], cellIdentifier);
    if (!sku) continue;
    const minimumText = field(row, headers, ["minimum_quantity", "minimumquantity", "min_quantity", "الحد الأدنى", "الحدالادنى"]);
    const minimumQuantity = parseNonNegativeNumber(minimumText);
    if (minimumText.trim() && minimumQuantity === null) {
      skippedRows += 1;
      const reason = "minimum_quantity غير صالح؛ تم تجاهل الصف.";
      addIssue(issues, `المنتجات - الصف ${rowNumber} (${sku}): ${reason}`);
      rejectedRows.push(rejectedReportRow({ rowNumber, source: "بيانات المنتجات", sku, productName: field(row, headers, ["name", "productname", "product_name", "اسم المنتج"]).trim(), reason }));
      continue;
    }
    try {
      productRows.push({
        rowNumber, sourceRowKey: `products:${rowNumber}`, sku,
        name: field(row, headers, ["name", "productname", "product_name", "اسم المنتج"]).trim(),
        description: field(row, headers, ["description", "الوصف"]).trim(), minimumQuantity,
        isActive: optionalBoolean(field(row, headers, ["is_active", "isactive", "نشط", "الحالة"]), rowNumber),
        unit: field(row, headers, ["unit", "unit_name", "unitname", "الوحدة"]).trim(),
        barcode: field(row, headers, ["barcode", "الباركود"], cellIdentifier),
      });
    } catch (error) {
      skippedRows += 1;
      const reason = error instanceof Error ? error.message : "بيانات غير صالحة.";
      addIssue(issues, reason);
      rejectedRows.push(rejectedReportRow({ rowNumber, source: "بيانات المنتجات", sku, productName: field(row, headers, ["name", "productname", "product_name", "اسم المنتج"]).trim(), reason }));
    }
  }
  return { kind: "standard", productRows, inventoryRows: [], issues, skippedRows, rejectedRows };
}

function readStandardInventorySheet(worksheet: ExcelJS.Worksheet | undefined): ParsedImport {
  const inventoryRows: InventoryImportRow[] = [];
  const issues: string[] = [];
  const rejectedRows: ImportReportRow[] = [];
  if (!worksheet) return { kind: "standard", productRows: [], inventoryRows, issues, skippedRows: 0, rejectedRows };
  const headers = getHeaders(worksheet);
  let skippedRows = 0;
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const sku = field(row, headers, ["sku", "productcode", "product_code", "رمز المنتج", "كود المنتج"], cellIdentifier);
    if (!sku) continue;
    const quantity = parseNonNegativeNumber(field(row, headers, ["available_quantity", "availablequantity", "quantity", "الكمية المتاحة", "الكمية"]));
    if (quantity === null) {
      skippedRows += 1;
      const reason = "available_quantity مطلوب ويجب أن يكون رقمًا صفر أو أكبر.";
      addIssue(issues, `المخزون - الصف ${rowNumber} (${sku}): ${reason}`);
      rejectedRows.push(rejectedReportRow({ rowNumber, source: "ملف النظام", sku, importedQuantity: null, reason }));
      continue;
    }
    inventoryRows.push({
      rowNumber, sourceRowKey: `inventory:${rowNumber}`, source: "standard", sku, barcode: "",
      locationReference: field(row, headers, ["location_code", "locationcode", "location", "كود الموقع", "الموقع"]).trim(),
      inputQuantity: quantity, unitName: "", programQuantity: null,
    });
  }
  return { kind: "standard", productRows: [], inventoryRows, issues, skippedRows, rejectedRows };
}

function detectImport(workbook: ExcelJS.Workbook): ParsedImport {
  const daftraProducts = workbook.worksheets.find((worksheet) => {
    const headers = getHeaders(worksheet);
    return headers.has(normalizeHeader("ProductCode")) && headers.has(normalizeHeader("UnitTemplate"));
  });
  if (daftraProducts) return readDaftraProductsSheet(daftraProducts);
  const daftraStocktaking = workbook.worksheets.find((worksheet) => {
    const headers = getHeaders(worksheet);
    return headers.has(normalizeHeader("رقم المنتج")) && headers.has(normalizeHeader("العدد الفعلي"));
  });
  if (daftraStocktaking) return readDaftraStocktakingSheet(daftraStocktaking);
  const products = readStandardProductsSheet(findSheet(workbook, ["المنتجات", "products"], ["sku", "name"]));
  const inventory = readStandardInventorySheet(findSheet(workbook, ["المخزون", "inventory"], ["sku"]));
  if (products.productRows.length + inventory.inventoryRows.length === 0) {
    throw new Error("تعذر التعرف على عناوين ملف دفترة أو ورقة المنتجات/المخزون في النظام.");
  }
  return {
    kind: "standard", productRows: products.productRows, inventoryRows: inventory.inventoryRows,
    issues: [...products.issues, ...inventory.issues], skippedRows: products.skippedRows + inventory.skippedRows,
    rejectedRows: [...products.rejectedRows, ...inventory.rejectedRows],
  };
}

async function loadWorkbook(file: File) {
  const workbook = new ExcelJS.Workbook();
  const bytes = Buffer.from(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    await workbook.xlsx.load(bytes as never);
    return workbook;
  }
  const worksheet = workbook.addWorksheet("CSV");
  for (const row of unwrapNestedCsvRows(parseCsvDocument(bytes.toString("utf8")))) worksheet.addRow(row);
  return workbook;
}

function chunks<T>(items: T[], size = CONCURRENCY) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function inBatches<T, R>(items: T[], callback: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (const batch of chunks(items)) results.push(...(await Promise.all(batch.map(callback))));
  return results;
}

async function getAllCompanyProducts(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const products: ExistingProduct[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("products").select("id, sku, name, description, minimum_quantity, is_active").eq("company_id", companyId).order("sku").range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as ExistingProduct[];
    products.push(...page);
    if (page.length < PAGE_SIZE) return products;
  }
}

async function getAllUnits(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const units: Unit[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("units").select("id, name, symbol").eq("company_id", companyId).order("name").range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as Unit[];
    units.push(...page);
    if (page.length < PAGE_SIZE) return units;
  }
}

async function getAccessibleLocations(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, isAdmin: boolean, userLocationId: string | null) {
  const locations: ImportLocation[] = [];
  if (!isAdmin && !userLocationId) return locations;
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from("locations").select("id, name, code").eq("company_id", companyId).eq("is_active", true).order("code").range(from, from + PAGE_SIZE - 1);
    if (!isAdmin && userLocationId) query = query.eq("id", userLocationId);
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as ImportLocation[];
    locations.push(...page);
    if (page.length < PAGE_SIZE) return locations;
  }
}

async function getProductUnits(supabase: Awaited<ReturnType<typeof createClient>>, productIds: string[]) {
  const rows: ProductUnit[] = [];
  for (const ids of chunks(productIds, 200)) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase.from("product_units").select("product_id, unit_id, conversion_factor, is_base").in("product_id", ids).order("id").range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as ProductUnit[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }
  return rows;
}

async function getProductBarcodes(supabase: Awaited<ReturnType<typeof createClient>>, productIds: string[]) {
  const rows: ProductBarcode[] = [];
  for (const ids of chunks(productIds, 200)) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase.from("product_barcodes").select("product_id, barcode").in("product_id", ids).order("id").range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as ProductBarcode[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
  }
  return rows;
}

async function getBalancesForLocation(supabase: Awaited<ReturnType<typeof createClient>>, locationId: string) {
  const rows: { product_id: string; available_quantity: number | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("stock_balances").select("product_id, available_quantity").eq("location_id", locationId).order("product_id").range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as typeof rows;
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function findUnitId(value: string, unitsByKey: Map<string, string>) {
  for (const key of unitLookupKeys(value)) {
    const unitId = unitsByKey.get(key);
    if (unitId) return unitId;
  }
  return null;
}

function resolveProductBalanceFactor(unitName: string, productUnits: ProductUnit[], unitsByKey: Map<string, string>) {
  if (!unitName) {
    const base = productUnits.find((unit) => unit.is_base);
    return base ? Number(base.conversion_factor) : null;
  }
  const unitId = findUnitId(unitName, unitsByKey);
  const matches = productUnits.filter((unit) => unit.unit_id === unitId);
  if (matches.length !== 1) return null;
  const factor = Number(matches[0].conversion_factor);
  return Number.isFinite(factor) && factor > 0 ? factor : null;
}

function resolveStocktakingFactor(
  row: InventoryImportRow,
  productUnits: ProductUnit[],
  unitsByKey: Map<string, string>,
  unitsById: Map<string, Unit>
) {
  return resolveDaftraStocktakingFactor({
    unitName: row.unitName,
    countedQuantity: row.inputQuantity,
    programQuantity: row.programQuantity,
    productUnits: productUnits.map((unit) => {
      const configuredUnit = unitsById.get(unit.unit_id);
      return {
        unitId: unit.unit_id,
        conversionFactor: Number(unit.conversion_factor),
        unitName: configuredUnit?.name,
        unitSymbol: configuredUnit?.symbol,
      };
    }),
    resolveUnitId: (value) => findUnitId(value, unitsByKey),
  });
}

async function prepareImport({
  supabase, companyId, isAdmin, userLocationId, canCreate, canUpdate, canAdjustStock, parsed, targetLocationId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>; companyId: string; isAdmin: boolean; userLocationId: string | null;
  canCreate: boolean | null; canUpdate: boolean | null; canAdjustStock: boolean | null; parsed: ParsedImport; targetLocationId: string | null;
}): Promise<PreparedImport> {
  if (parsed.productRows.length + parsed.inventoryRows.length === 0) throw new Error("لا توجد صفوف صالحة للاستيراد.");
  if (parsed.productRows.length > MAX_IMPORT_ROWS || parsed.inventoryRows.length > MAX_IMPORT_ROWS) throw new Error(`الحد الأقصى هو ${MAX_IMPORT_ROWS} صف في كل ملف.`);

  const issues = [...parsed.issues];
  const notices = [...(parsed.notices ?? [])];
  const rejectedRows = [...parsed.rejectedRows];
  let skippedRows = parsed.skippedRows;
  const seenProductSkus = new Set<string>();
  const uniqueProductRows: ProductImportRow[] = [];
  for (const row of parsed.productRows) {
    const key = skuKey(row.sku);
    if (seenProductSkus.has(key)) {
      skippedRows += 1;
      const reason = "SKU مكرر داخل الملف؛ تم تجاهل التكرار.";
      addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): ${reason}`);
      rejectedRows.push(rejectedProductRow(row, reason));
    } else {
      seenProductSkus.add(key);
      uniqueProductRows.push(row);
    }
  }
  const usableDaftraProductRows = new Set(uniqueProductRows.map((row) => row.sourceRowKey));
  const inventoryRows = parsed.inventoryRows.filter((row) => row.source !== "daftra_products" || usableDaftraProductRows.has(row.sourceRowKey));

  const [existingProducts, units, locations] = await Promise.all([
    getAllCompanyProducts(supabase, companyId), getAllUnits(supabase, companyId),
    getAccessibleLocations(supabase, companyId, isAdmin, userLocationId),
  ]);
  const targetLocation = targetLocationId ? locations.find((location) => location.id === targetLocationId) ?? null : null;
  const productsBySku = new Map(existingProducts.map((product) => [skuKey(product.sku), product]));
  const productsById = new Map(existingProducts.map((product) => [product.id, product]));
  const activeProductsByName = new Map<string, ExistingProduct[]>();
  for (const product of existingProducts) {
    if (product.is_active === false) continue;
    const key = productNameKey(product.name);
    if (!key) continue;
    const matches = activeProductsByName.get(key) ?? [];
    matches.push(product);
    activeProductsByName.set(key, matches);
  }
  const unitsByKey = new Map<string, string>();
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  for (const unit of units) for (const key of unitLookupKeys(unit.name, unit.symbol)) unitsByKey.set(key, unit.id);
  const [allProductUnits, allProductBarcodes] = await Promise.all([
    getProductUnits(supabase, existingProducts.map((product) => product.id)),
    getProductBarcodes(supabase, existingProducts.map((product) => product.id)),
  ]);
  const productUnitsByProductId = new Map<string, ProductUnit[]>();
  const baseUnitByProduct = new Map<string, string>();
  for (const unit of allProductUnits) {
    const items = productUnitsByProductId.get(unit.product_id) ?? [];
    items.push(unit);
    productUnitsByProductId.set(unit.product_id, items);
    if (unit.is_base) baseUnitByProduct.set(unit.product_id, unit.unit_id);
  }
  const barcodeProductIdByKey = new Map<string, string>();
  for (const barcode of allProductBarcodes) barcodeProductIdByKey.set(barcodeKey(barcode.barcode), barcode.product_id);
  const barcodeCounts = new Map<string, number>();
  for (const row of uniqueProductRows) if (row.barcode) barcodeCounts.set(barcodeKey(row.barcode), (barcodeCounts.get(barcodeKey(row.barcode)) ?? 0) + 1);

  let productsToCreate = 0;
  let productsToUpdate = 0;
  const productRows: ProductImportRow[] = [];
  for (const row of uniqueProductRows) {
    const existing = productsBySku.get(skuKey(row.sku));
    const barcodeOwner = row.barcode ? barcodeProductIdByKey.get(barcodeKey(row.barcode)) : null;
    const duplicateBarcode = row.barcode && (barcodeCounts.get(barcodeKey(row.barcode)) ?? 0) > 1;
    const safeBarcode = !duplicateBarcode && (!barcodeOwner || barcodeOwner === existing?.id) ? row.barcode : "";
    if (duplicateBarcode) addNotice(notices, "warning", `المنتجات - الصف ${row.rowNumber} (${row.sku}): الباركود مكرر داخل الملف؛ لن يتم ربطه.`);
    if (barcodeOwner && barcodeOwner !== existing?.id) addNotice(notices, "warning", `المنتجات - الصف ${row.rowNumber} (${row.sku}): الباركود مرتبط بمنتج آخر؛ لن يتم ربطه.`);
    if (existing) {
      if (canUpdate === true) {
        productRows.push({ ...row, barcode: safeBarcode });
        productsToUpdate += 1;
      } else {
        skippedRows += 1;
        const reason = "لا تملك صلاحية تحديث بيانات المنتج.";
        addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): ${reason}`);
        rejectedRows.push(rejectedProductRow(row, reason));
      }
      continue;
    }
    if (canCreate !== true || !row.name || !findUnitId(row.unit, unitsByKey)) {
      skippedRows += 1;
      const reason = canCreate !== true
        ? "لا تملك صلاحية إضافة منتج جديد."
        : !row.name
          ? "اسم المنتج مطلوب."
          : `الوحدة "${row.unit}" غير موجودة في النظام.`;
      addIssue(issues, `المنتجات - الصف ${row.rowNumber} (${row.sku}): ${reason}`);
      rejectedRows.push(rejectedProductRow(row, reason));
      continue;
    }
    productRows.push({ ...row, barcode: safeBarcode });
    productsToCreate += 1;
  }
  const newProductRowsBySku = new Map(productRows.filter((row) => !productsBySku.has(skuKey(row.sku))).map((row) => [skuKey(row.sku), row]));
  let balancesByProductId = new Map<string, number>();
  if (targetLocation && inventoryRows.length > 0) {
    const balances = await getBalancesForLocation(supabase, targetLocation.id);
    balancesByProductId = new Map(balances.map((balance) => [balance.product_id, Number(balance.available_quantity ?? 0)]));
  }

  const resolvedRows: ResolvedInventoryRow[] = [];
  const seenAdjustmentProducts = new Set<string>();
  let inventoryToAdjust = 0;
  let unchangedBalances = 0;
  for (const row of inventoryRows) {
    if (canAdjustStock !== true) {
      skippedRows += 1;
      const reason = "لا تملك صلاحية تسوية المخزون.";
      addIssue(issues, `المخزون - الصف ${row.rowNumber}: ${reason}`);
      rejectedRows.push(rejectedInventoryRow(row, reason));
      continue;
    }
    if (!targetLocation) {
      skippedRows += 1;
      const reason = "اختر فرعًا صالحًا قبل اعتماد استيراد المخزون.";
      addIssue(issues, reason);
      rejectedRows.push(rejectedInventoryRow(row, reason));
      continue;
    }
    const invalidStandardLocation = row.source === "standard" && row.locationReference && skuKey(row.locationReference) !== skuKey(targetLocation.code);
    const invalidDaftraLocation = row.source === "daftra_stocktaking" && !locationMatchesDaftraReference(row.locationReference, targetLocation);
    if (invalidStandardLocation || invalidDaftraLocation) {
      skippedRows += 1;
      const reason = `فرع دفترة "${row.locationReference || "غير محدد"}" لا يطابق الفرع المختار (${targetLocation.name}).`;
      addIssue(issues, `المخزون - الصف ${row.rowNumber} (${row.sku || row.barcode}): ${reason}`);
      rejectedRows.push(rejectedInventoryRow(row, reason));
      continue;
    }
    let product = row.sku ? productsBySku.get(skuKey(row.sku)) ?? null : null;
    if (row.source === "daftra_stocktaking") {
      const productBySerialNumber = row.sku
        ? productsBySku.get(skuKey(row.sku)) ?? null
        : null;
      const barcodeProductId = row.barcode
        ? barcodeProductIdByKey.get(barcodeKey(row.barcode))
        : null;
      const productByBarcode = barcodeProductId
        ? productsById.get(barcodeProductId) ?? null
        : null;
      const reference = row.sku || row.barcode || row.daftraProductReference || "بدون معرّف";

      if (
        productBySerialNumber &&
        productByBarcode &&
        productBySerialNumber.id !== productByBarcode.id
      ) {
        skippedRows += 1;
        const reason = "الرقم التسلسلي والباركود يشيران إلى منتجين مختلفين؛ تم تجاهل الصف بأمان دون الاعتماد على اسم المنتج.";
        addIssue(issues, `المخزون - الصف ${row.rowNumber} (${reference}): ${reason}`);
        rejectedRows.push(rejectedInventoryRow(row, reason));
        continue;
      }

      product = productBySerialNumber ?? productByBarcode;

      if (!product) {
        const canUseNameFallback = !row.sku && !row.barcode && Boolean(row.productName);
        const nameMatches = canUseNameFallback
          ? (activeProductsByName.get(productNameKey(row.productName ?? "")) ?? [])
            .filter((candidate) => resolveStocktakingFactor(row, productUnitsByProductId.get(candidate.id) ?? [], unitsByKey, unitsById) !== null)
          : [];

        if (nameMatches.length === 1) {
          product = nameMatches[0];
          addNotice(notices, "info", `المخزون - الصف ${row.rowNumber}: تمت مطابقة المنتج بأمان بالاسم والوحدة بعد غياب الرقم التسلسلي والباركود (${product.sku}).`);
        } else {
          skippedRows += 1;
          let reason: string;
          if (canUseNameFallback && nameMatches.length > 1) {
            reason = "الاسم والوحدة يطابقان أكثر من منتج نشط؛ تم تجاهل الصف بأمان.";
          } else if (canUseNameFallback) {
            reason = "لم توجد مطابقة فريدة لاسم المنتج والوحدة؛ تم تجاهل الصف بأمان.";
          } else {
            reason = `لم يطابق الرقم التسلسلي SKU محليًا ولم يطابق الباركود أي منتج؛ رقم دفترة الداخلي (${row.daftraProductReference || "غير متوفر"}) محفوظ للتشخيص فقط.`;
          }
          addIssue(issues, `المخزون - الصف ${row.rowNumber} (${canUseNameFallback ? row.productName : reference}): ${reason}`);
          rejectedRows.push(rejectedInventoryRow(row, reason));
          continue;
        }
      }

      if (productBySerialNumber && productByBarcode) {
        addNotice(notices, "info", `المخزون - الصف ${row.rowNumber}: تمت مطابقة الرقم التسلسلي والباركود مع المنتج نفسه (${product.sku}).`);
      } else if (productBySerialNumber || productByBarcode) {
        addNotice(notices, "info", `المخزون - الصف ${row.rowNumber}: تمت مطابقة المنتج بأمان باستخدام ${productBySerialNumber ? "الرقم التسلسلي" : "الباركود"}.`);
      }
    }
    const newProduct = !product && row.source !== "daftra_stocktaking" ? newProductRowsBySku.get(skuKey(row.sku)) ?? null : null;
    if (!product && !newProduct) {
      skippedRows += 1;
      const reason = "لم تُطابق SKU أو الباركود مع منتج موجود.";
      addIssue(issues, `المخزون - الصف ${row.rowNumber} (${row.sku || row.barcode || row.daftraProductReference}): ${reason}`);
      rejectedRows.push(rejectedInventoryRow(row, reason));
      continue;
    }
    let factor = 1;
    if (product && row.source === "daftra_products") factor = resolveProductBalanceFactor(row.unitName, productUnitsByProductId.get(product.id) ?? [], unitsByKey) ?? 0;
    if (product && row.source === "daftra_stocktaking") factor = resolveStocktakingFactor(row, productUnitsByProductId.get(product.id) ?? [], unitsByKey, unitsById) ?? 0;
    if (!factor) {
      skippedRows += 1;
      const reason = `وحدة "${row.unitName || "غير محددة"}" أو معامل التحويل غير مؤكد؛ لم يُعدّل الرصيد.`;
      addIssue(issues, `المخزون - الصف ${row.rowNumber} (${row.sku || row.barcode}): ${reason}`);
      rejectedRows.push(rejectedInventoryRow(row, reason));
      continue;
    }
    const identity = product?.id ?? `new:${skuKey(newProduct!.sku)}`;
    if (seenAdjustmentProducts.has(identity)) {
      skippedRows += 1;
      const reason = "المنتج مكرر في نفس الاستيراد؛ تم تجاهل التكرار.";
      addIssue(issues, `المخزون - الصف ${row.rowNumber} (${row.sku || row.barcode}): ${reason}`);
      rejectedRows.push(rejectedInventoryRow(row, reason));
      continue;
    }
    seenAdjustmentProducts.add(identity);
    const targetQuantity = row.inputQuantity * factor;
    const currentQuantity = product ? balancesByProductId.get(product.id) ?? 0 : 0;
    if (numbersClose(targetQuantity, currentQuantity)) unchangedBalances += 1;
    else inventoryToAdjust += 1;
    resolvedRows.push({ row, productSku: product?.sku ?? newProduct!.sku, targetQuantity });
  }

  return {
    productRows, inventoryAdjustments: resolvedRows, productsBySku, unitsByKey, baseUnitByProduct, balancesByProductId, targetLocation, rejectedRows,
    preview: {
      valid: productRows.length > 0 || resolvedRows.length > 0, source: sourceLabel(parsed.kind),
      productRows: parsed.productRows.length, inventoryRows: parsed.inventoryRows.length,
      productsToCreate, productsToUpdate, inventoryToAdjust, unchangedBalances, skippedRows, targetLocation, issues, notices,
    },
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  const { data: profile, error: profileError } = await supabase.from("users").select("company_id, role_id, location_id, is_active").eq("auth_user_id", user.id).eq("is_active", true).single();
  if (profileError || !profile?.company_id) return NextResponse.json({ error: "تعذر العثور على الشركة المرتبطة بالمستخدم." }, { status: 403 });
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
    if (!(file instanceof File) || !/\.(xlsx|csv)$/i.test(file.name)) return NextResponse.json({ error: "ملف Excel (.xlsx) أو CSV مطلوب." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "حجم الملف أكبر من 10 ميغابايت." }, { status: 400 });
    const prepared = await prepareImport({
      supabase, companyId: profile.company_id, isAdmin: hasFullAccess === true, userLocationId: profile.location_id ?? null,
      canCreate, canUpdate, canAdjustStock, parsed: detectImport(await loadWorkbook(file)), targetLocationId,
    });
    const mode = new URL(request.url).searchParams.get("mode");
    if (mode === "preview") return NextResponse.json({ preview: prepared.preview });
    if (!prepared.preview.valid) return NextResponse.json({ error: "لا توجد صفوف آمنة يمكن اعتمادها. راجع الملاحظات في المعاينة.", preview: prepared.preview }, { status: 422 });

    const summary: Summary = {
      created: 0, updated: 0, inventoryUpdated: 0, skipped: prepared.preview.skippedRows, errors: [],
      settledRows: [], unsettledRows: [...prepared.rejectedRows],
    };
    const productResults = await inBatches(prepared.productRows, async (row) => {
      const existing = prepared.productsBySku.get(skuKey(row.sku));
      if (existing) {
        const update: Record<string, unknown> = {};
        if (row.name) update.name = row.name;
        if (row.description) update.description = row.description;
        if (row.minimumQuantity !== null) update.minimum_quantity = row.minimumQuantity;
        if (row.isActive !== null) update.is_active = row.isActive;
        if (Object.keys(update).length) {
          const { error } = await supabase.from("products").update(update).eq("id", existing.id).eq("company_id", profile.company_id);
          if (error) throw error;
        }
        if (row.barcode) {
          const unitId = prepared.baseUnitByProduct.get(existing.id);
          if (!unitId) throw new Error(`تعذر ربط باركود ${row.sku}: لا توجد وحدة أساسية للمنتج.`);
          const { error } = await supabase.rpc("add_product_barcode", { p_product_id: existing.id, p_unit_id: unitId, p_barcode: row.barcode, p_is_default: false });
          if (error && !/duplicate|unique/i.test(error.message)) throw error;
        }
        return { created: 0, updated: 1 };
      }
      const unitId = findUnitId(row.unit, prepared.unitsByKey);
      if (!unitId) throw new Error(`تعذر إيجاد وحدة المنتج ${row.sku}.`);
      const { data: createdProduct, error: createError } = await supabase.from("products").insert({
        company_id: profile.company_id, sku: row.sku, name: row.name, description: row.description || null,
        category_id: null, brand_id: null, minimum_quantity: row.minimumQuantity ?? 0, is_active: row.isActive ?? true,
      }).select("id, sku, name, description, minimum_quantity, is_active").single();
      if (createError || !createdProduct) throw createError ?? new Error("تعذر إضافة المنتج.");
      const { error: unitError } = await supabase.rpc("add_product_unit", { p_product_id: createdProduct.id, p_unit_id: unitId, p_conversion_factor: 1, p_is_base: true });
      if (unitError) throw unitError;
      if (row.barcode) {
        const { error: barcodeError } = await supabase.rpc("add_product_barcode", { p_product_id: createdProduct.id, p_unit_id: unitId, p_barcode: row.barcode, p_is_default: true });
        if (barcodeError) throw barcodeError;
      }
      const { error: balanceError } = await supabase.rpc("initialize_product_stock_balances", { p_product_id: createdProduct.id, p_company_id: profile.company_id });
      if (balanceError) throw balanceError;
      const typedProduct = createdProduct as ExistingProduct;
      prepared.productsBySku.set(skuKey(typedProduct.sku), typedProduct);
      prepared.baseUnitByProduct.set(typedProduct.id, unitId);
      prepared.balancesByProductId.set(typedProduct.id, 0);
      return { created: 1, updated: 0 };
    });
    summary.created = productResults.reduce((total, result) => total + result.created, 0);
    summary.updated = productResults.reduce((total, result) => total + result.updated, 0);

    const targetLocation = prepared.targetLocation;
    if (targetLocation) {
      const adjustments = await inBatches(prepared.inventoryAdjustments, async (adjustment) => {
        const product = prepared.productsBySku.get(skuKey(adjustment.productSku));
        if (!product) {
          const reason = `تعذر إيجاد المنتج ${adjustment.productSku} بعد تجهيز الاستيراد.`;
          return { updated: false, report: rejectedInventoryRow(adjustment.row, reason), error: reason };
        }
        const currentQuantity = prepared.balancesByProductId.get(product.id) ?? 0;
        const delta = adjustment.targetQuantity - currentQuantity;
        const baseReport = {
          rowNumber: adjustment.row.rowNumber,
          source: sourceLabel(adjustment.row.source),
          productName: product.name,
          sku: product.sku,
          barcode: adjustment.row.barcode,
          daftraProductReference: adjustment.row.daftraProductReference ?? "",
          unitName: adjustment.row.unitName,
          importedQuantity: adjustment.row.inputQuantity,
          programQuantity: adjustment.row.programQuantity,
          beforeQuantity: currentQuantity,
          afterQuantity: adjustment.targetQuantity,
          difference: delta,
        };
        if (numbersClose(delta, 0)) {
          return {
            updated: false,
            report: { ...baseReport, status: "unchanged" as const, reason: "تم التحقق: الرصيد الحالي مطابق للملف، لذلك لم تُنشأ حركة مخزون." },
          };
        }
        const { error } = await supabase.rpc("adjust_stock", {
          target_product_id: product.id, target_location_id: targetLocation.id, adjustment_delta: delta,
          adjustment_reason: `تسوية من استيراد ${prepared.preview.source}`,
        });
        if (error) {
          const reason = `تعذر تنفيذ التسوية: ${error.message}`;
          return { updated: false, report: { ...baseReport, status: "skipped" as const, reason }, error: reason };
        }
        prepared.balancesByProductId.set(product.id, adjustment.targetQuantity);
        return { updated: true, report: { ...baseReport, status: "settled" as const, reason: "تمت تسوية الرصيد وتسجيل حركة مخزون." } };
      });
      for (const adjustment of adjustments) {
        if (adjustment.report.status === "skipped") summary.unsettledRows.push(adjustment.report);
        else summary.settledRows.push(adjustment.report);
        if (adjustment.updated) summary.inventoryUpdated += 1;
        if (adjustment.error) summary.errors.push(adjustment.error);
      }
      summary.skipped += summary.unsettledRows.length - prepared.rejectedRows.length;
    }
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error("POST /api/products/import:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "تعذر استيراد الملف." }, { status: 400 });
  }
}
