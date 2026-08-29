export type CsvRow = string[];

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const UNIT_ALIASES: Record<string, string> = {
  "كيلو": "كيلوغرام",
  "كيلوجرام": "كيلوغرام",
  "كجم": "كيلوغرام",
  "kg": "كيلوغرام",
  "جرام": "غرام",
  "جم": "غرام",
  "gram": "غرام",
  "g": "غرام",
  "مللي": "ملليلتر",
  "ملي": "ملليلتر",
  "مل": "ملليلتر",
  "ml": "ملليلتر",
};

export function normalizeDigits(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => ARABIC_DIGITS[digit] ?? digit);
}

export function normalizeHeader(value: string) {
  return normalizeDigits(value)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function normalizeTextKey(value: string) {
  return normalizeDigits(value)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function skuKey(value: string) {
  return normalizeTextKey(value);
}

export function barcodeKey(value: string) {
  return normalizeTextKey(value);
}

export function expandScientificNotation(value: string) {
  const text = normalizeDigits(value).trim();
  const match = text.match(/^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
  if (!match) return text;

  const [, sign, whole, fraction = "", exponentText] = match;
  const exponent = Number(exponentText);
  if (!Number.isSafeInteger(exponent)) return text;

  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "") || "0";
  const decimalIndex = whole.length + exponent;
  let expanded: string;

  if (decimalIndex <= 0) {
    expanded = `0.${"0".repeat(Math.abs(decimalIndex))}${digits}`;
  } else if (decimalIndex >= digits.length) {
    expanded = `${digits}${"0".repeat(decimalIndex - digits.length)}`;
  } else {
    expanded = `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
  }

  return `${sign === "-" ? "-" : ""}${expanded}`;
}

export function identifierText(value: unknown) {
  const text = expandScientificNotation(String(value ?? "").replace(/^\uFEFF/, "").trim());
  return ["", "-", "—", ".", "*", "null", "undefined", "nan"].includes(text.toLowerCase())
    ? ""
    : text;
}

export function parseNonNegativeNumber(value: string) {
  const normalized = normalizeDigits(value).replace(/[\u00a0\s]/g, "").trim();
  if (!normalized) return null;

  const decimal = normalized.includes(".")
    ? normalized.replaceAll(",", "")
    : normalized.replace(",", ".");
  const parsed = Number(decimal);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function unitLookupKeys(...values: Array<string | null | undefined>) {
  const keys = new Set<string>();
  for (const value of values) {
    const key = normalizeHeader(value ?? "");
    if (!key) continue;
    keys.add(key);
    keys.add(UNIT_ALIASES[key] ? normalizeHeader(UNIT_ALIASES[key]) : key);
  }
  return keys;
}

export function parseUnitLabel(value: string) {
  const text = normalizeDigits(value).trim();
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/);
  if (!match) return { multiplier: 1, unitText: text };

  const multiplier = parseNonNegativeNumber(match[1]);
  return multiplier && multiplier > 0
    ? { multiplier, unitText: match[2].trim() }
    : { multiplier: 1, unitText: text };
}

export function numbersClose(left: number, right: number) {
  return Math.abs(left - right) <= Math.max(0.000001, Math.abs(right) * 0.000001);
}

export function locationMatchesDaftraReference(
  reference: string,
  location: { name: string; code: string }
) {
  const normalizedReference = normalizeTextKey(reference);
  const normalizedCode = normalizeTextKey(location.code);
  if (!normalizedReference || !normalizedCode) return false;
  if (
    normalizedReference === normalizedCode ||
    normalizedReference === normalizeTextKey(location.name)
  ) {
    return true;
  }

  const numericTokens: string[] = normalizeDigits(reference).match(/\d+/g) ?? [];
  return numericTokens.includes(normalizedCode);
}

export function parseCsvDocument(text: string): CsvRow[] {
  text = text.replace(/^\uFEFF/, "");
  const rows: CsvRow[] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value.trim())) rows.push(row);
  }

  return rows;
}

export function unwrapNestedCsvRows(rows: CsvRow[]) {
  return rows.map((row) => {
    if (row.length !== 1 || !row[0].includes(",")) return row;
    const nested = parseCsvDocument(row[0]);
    return nested.length === 1 ? nested[0] : row;
  });
}

export type DaftraProductUnit = {
  unitId: string;
  conversionFactor: number;
};

export function resolveDaftraStocktakingFactor({
  unitName,
  countedQuantity,
  programQuantity,
  productUnits,
  resolveUnitId,
}: {
  unitName: string;
  countedQuantity: number;
  programQuantity: number | null;
  productUnits: DaftraProductUnit[];
  resolveUnitId: (value: string) => string | null;
}) {
  const candidates = new Map<string, number>();
  const directUnitId = resolveUnitId(unitName);
  for (const unit of productUnits) {
    if (unit.unitId === directUnitId) candidates.set(`exact:${unit.unitId}`, unit.conversionFactor);
  }

  const parsed = parseUnitLabel(unitName);
  if (parsed.multiplier !== 1) {
    const measuredUnitId = resolveUnitId(parsed.unitText);
    for (const unit of productUnits) {
      if (unit.unitId !== measuredUnitId) continue;
      candidates.set(`measured:${unit.unitId}`, unit.conversionFactor * parsed.multiplier);
    }
  }

  const factors = Array.from(new Set(
    Array.from(candidates.values())
      .filter((factor) => Number.isFinite(factor) && factor > 0)
      .map(String)
  )).map(Number);
  if (factors.length === 1) return factors[0];

  // The current balance may legitimately differ from the counted quantity.
  // Use it only to disambiguate multiple configured factors, never to reject
  // one confirmed product-unit conversion.
  if (programQuantity !== null) {
    const confirmed = factors.filter((factor) => numbersClose(countedQuantity * factor, programQuantity));
    if (confirmed.length === 1) return confirmed[0];
  }
  return null;
}
