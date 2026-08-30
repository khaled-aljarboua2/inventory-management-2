import { Buffer } from "node:buffer";

import {
  formatReportDate,
  isLowStockBalance,
  getReportAccess,
  resolveReportLocation,
  loadReportData,
  TRANSACTION_LABELS,
} from "@/lib/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CellValue = string | number;

type ExportTable = {
  title: string;
  fileName: string;
  columns: string[];
  rows: CellValue[][];
};

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function escapeXml(value: CellValue) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeCsv(value: CellValue) {
  const text = String(value);
  const safeText =
    typeof value === "string" && /^[=+@-]/.test(text) ? `'${text}` : text;

  return `"${safeText.replaceAll('"', '""')}"`;
}

function createCsv(table: ExportTable) {
  const rows = [table.columns, ...table.rows];
  return `\\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\\r\\n")}`;
}

function createSpreadsheetXml(table: ExportTable) {
  const xmlCell = (value: CellValue, isHeader = false) => {
    const type = typeof value === "number" ? "Number" : "String";
    const style = isHeader ? ' ss:StyleID="header"' : "";
    return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#CCFBF1" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(table.title)}">
  <Table>
   <Row>${table.columns.map((value) => xmlCell(value, true)).join("")}</Row>
   ${table.rows.map((row) => `<Row>${row.map((value) => xmlCell(value)).join("")}</Row>`).join("")}
  </Table>
 </Worksheet>
</Workbook>`;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(data: Buffer) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(entries: Array<{ name: string; data: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const checksum = crc32(entry.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(entry.data.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + entry.data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function createXlsx(table: ExportTable) {
  const xlsxCell = (value: CellValue, row: number, column: number) => {
    const ref = `${columnName(column)}${row}`;

    if (typeof value === "number") {
      return `<c r="${ref}" t="n"><v>${value}</v></c>`;
    }

    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
  };

  const allRows = [table.columns, ...table.rows];
  const sheetRows = allRows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) => xlsxCell(value, rowIndex + 1, columnIndex))
          .join("")}</row>`
    )
    .join("");

  const files = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`
      ),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
      ),
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(table.title)}" sheetId="1" r:id="rId1"/></sheets></workbook>`
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`
      ),
    },
  ];

  return createZip(files);
}

function buildTable(report: string, data: Awaited<ReturnType<typeof loadReportData>>): ExportTable {
  if (report === "movements") {
    return {
      title: "حركة المخزون",
      fileName: "stock-movements",
      columns: ["SKU", "المنتج", "النوع", "الكمية", "الوحدة", "الموقع", "التاريخ"],
      rows: data.transactions.map((item) => [
        item.products?.sku ?? "",
        item.products?.name ?? "",
        TRANSACTION_LABELS[item.transaction_type] ?? item.transaction_type,
        Number(item.quantity ?? 0),
        item.unitName,
        item.locations?.name ?? "",
        formatReportDate(item.created_at),
      ]),
    };
  }

  const balances =
    report === "low_stock"
      ? data.balances.filter(isLowStockBalance)
      : data.balances;

  return {
    title: report === "low_stock" ? "تنبيهات المخزون" : "الرصيد الحالي",
    fileName: report === "low_stock" ? "low-stock-alerts" : "inventory-balances",
    columns: [
      "SKU",
      "المنتج",
      "الباركود",
      "الوحدة",
      "الموقع",
      "المتاح",
      "المحجوز",
      "الحد الأدنى",
      "الحد الأعلى",
      "الحالة",
      "آخر تحديث",
    ],
    rows: balances.map((item) => {
      const available = Number(item.available_quantity ?? 0);
      const minimum = Number(item.minimum_quantity ?? 0);
      const status =
        available <= 0 ? "نافد" : minimum > 0 && available <= minimum ? "منخفض" : "متوفر";

      return [
        item.products?.sku ?? "",
        item.products?.name ?? "",
        item.barcode,
        item.unitName,
        item.locations?.name ?? "",
        available,
        Number(item.reserved_quantity ?? 0),
        minimum,
        item.maximum_quantity === null ? "غير محدد" : Number(item.maximum_quantity),
        status,
        formatReportDate(item.updated_at),
      ];
    }),
  };
}

export async function GET(request: Request) {
  const session = await getReportAccess();

  if (session.error || !session.supabase || !session.access) {
    return Response.json({ error: session.error ?? "غير مصرح" }, { status: 403 });
  }

  const url = new URL(request.url);
  const reportParam = url.searchParams.get("report");
  const formatParam = url.searchParams.get("format");
  const report = ["inventory", "low_stock", "movements"].includes(reportParam ?? "")
    ? (reportParam as string)
    : "inventory";
  const format = ["xlsx", "csv", "xml"].includes(formatParam ?? "")
    ? (formatParam as string)
    : "xlsx";

  try {
    const { location } = await resolveReportLocation(
      session.supabase,
      session.access,
      url.searchParams.get("location")
    );

    if (!location) {
      return Response.json({ error: "لا يوجد فرع متاح لإصدار التقرير." }, { status: 403 });
    }

    const data = await loadReportData(session.supabase, session.access, {
      includeBarcodes: true,
      locationId: location.id,
    });
    const table = buildTable(report, data);
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `${table.fileName}-${date}.${format}`;

    if (format === "csv") {
      return new Response(createCsv(table), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    if (format === "xml") {
      return new Response(createSpreadsheetXml(table), {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    return new Response(createXlsx(table), {
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "تعذر إصدار التقرير." },
      { status: 500 }
    );
  }
}
