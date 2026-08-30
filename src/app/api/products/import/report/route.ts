import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_ROWS = 5000;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ReportKind = "settled" | "unsettled";
type ReportRow = {
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

function safeText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[=+@-]/.test(text) ? `'${text}` : text;
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseRow(value: unknown): ReportRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const status = row.status;
  const rowNumber = safeNumber(row.rowNumber);
  if (!(["settled", "unchanged", "skipped"] as const).includes(status as ReportRow["status"]) || rowNumber === null) return null;
  return {
    status: status as ReportRow["status"],
    rowNumber,
    source: safeText(row.source),
    productName: safeText(row.productName),
    sku: safeText(row.sku),
    barcode: safeText(row.barcode),
    daftraProductReference: safeText(row.daftraProductReference),
    unitName: safeText(row.unitName),
    importedQuantity: safeNumber(row.importedQuantity),
    programQuantity: safeNumber(row.programQuantity),
    beforeQuantity: safeNumber(row.beforeQuantity),
    afterQuantity: safeNumber(row.afterQuantity),
    difference: safeNumber(row.difference),
    reason: safeText(row.reason),
  };
}

function statusText(status: ReportRow["status"]) {
  if (status === "settled") return "تمت التسوية";
  if (status === "unchanged") return "مطابق - بلا حركة";
  return "لم تتم التسوية";
}

async function workbookResponse(kind: ReportKind, rows: ReportRow[]) {
  const completed = kind === "settled";
  const title = completed ? "تقرير الصفوف التي تمت تسويتها" : "تقرير الصفوف التي لم تتم تسويتها";
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WAREVANCE";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(completed ? "تمت التسوية" : "لم تتم التسوية", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
  });
  worksheet.columns = [
    { header: "الحالة", key: "status", width: 20 },
    { header: "الصف", key: "rowNumber", width: 10 },
    { header: "المصدر", key: "source", width: 26 },
    { header: "اسم المنتج", key: "productName", width: 42 },
    { header: "SKU / الرقم التسلسلي", key: "sku", width: 25 },
    { header: "الباركود", key: "barcode", width: 22 },
    { header: "رقم دفترة", key: "daftraProductReference", width: 16 },
    { header: "الوحدة", key: "unitName", width: 18 },
    { header: "كمية الملف", key: "importedQuantity", width: 16 },
    { header: "كمية البرنامج", key: "programQuantity", width: 16 },
    { header: "الرصيد قبل", key: "beforeQuantity", width: 16 },
    { header: "الرصيد بعد", key: "afterQuantity", width: 16 },
    { header: "فرق التسوية", key: "difference", width: 16 },
    { header: "السبب / النتيجة", key: "reason", width: 56 },
  ];

  worksheet.mergeCells("A1:N1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: completed ? "FF047857" : "FFB91C1C" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 28;

  worksheet.mergeCells("A2:N2");
  const noteCell = worksheet.getCell("A2");
  noteCell.value = completed
    ? "يشمل الصفوف التي تم تعديل رصيدها، والصفوف المطابقة التي لم تحتج حركة مخزون."
    : "هذه الصفوف لم تعدّل أي رصيد ولم تسجل حركة مخزون؛ راجع السبب قبل إعادة الاستيراد.";
  noteCell.font = { italic: true, color: { argb: "FF475569" } };
  noteCell.alignment = { horizontal: "right" };

  worksheet.mergeCells("A3:N3");
  worksheet.getCell("A3").value = `تاريخ الإصدار: ${new Date().toLocaleString("ar-SA")}`;
  worksheet.getCell("A3").font = { color: { argb: "FF64748B" }, size: 10 };
  worksheet.getCell("A3").alignment = { horizontal: "right" };

  const headerRow = worksheet.getRow(4);
  headerRow.values = worksheet.columns.map((column) => column.header as string);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 28;

  for (const row of rows) {
    const dataRow = worksheet.addRow({ ...row, status: statusText(row.status) });
    dataRow.alignment = { vertical: "top", wrapText: true };
    const statusCell = dataRow.getCell("status");
    statusCell.font = { bold: true };
    statusCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: row.status === "settled" ? "FFD1FAE5" : row.status === "unchanged" ? "FFDBEAFE" : "FFFEE2E2" },
    };
    if (row.status === "skipped") dataRow.font = { color: { argb: "FF991B1B" } };
  }

  for (const key of ["importedQuantity", "programQuantity", "beforeQuantity", "afterQuantity", "difference"]) {
    worksheet.getColumn(key).numFmt = "#,##0.###";
  }
  for (const key of ["sku", "barcode", "daftraProductReference"]) worksheet.getColumn(key).numFmt = "@";
  worksheet.autoFilter = { from: "A4", to: `N${Math.max(4, rows.length + 4)}` };

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${completed ? "تمت-التسوية" : "لم-تتم-التسوية"}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });

  try {
    const payload = await request.json() as { kind?: unknown; rows?: unknown };
    if (payload.kind !== "settled" && payload.kind !== "unsettled") {
      return NextResponse.json({ error: "نوع التقرير غير صالح." }, { status: 400 });
    }
    if (!Array.isArray(payload.rows) || payload.rows.length > MAX_ROWS) {
      return NextResponse.json({ error: `يمكن تصدير حتى ${MAX_ROWS} صف.` }, { status: 400 });
    }
    const rows = payload.rows.map(parseRow).filter((row): row is ReportRow => row !== null);
    if (rows.length !== payload.rows.length) {
      return NextResponse.json({ error: "بيانات التقرير غير صالحة." }, { status: 400 });
    }
    return workbookResponse(payload.kind, rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر إصدار تقرير Excel." },
      { status: 400 }
    );
  }
}
