import { describe, expect, it } from "vitest";

import {
  formatReportDate,
  hasPositiveBalance,
  isLowStockBalance,
} from "./domain/report-rules";

describe("التقارير", () => {
  it("يعرض التاريخ بتوقيت الرياض", () => {
    const value = formatReportDate("2026-08-30T21:30:00.000Z");
    expect(value).toContain("٣١");
    expect(value).toMatch(/١٢:٣٠|12:30/);
  });

  it("يحسب المنتجات ذات الرصيد الموجب فقط", () => {
    expect(hasPositiveBalance({ available_quantity: 1 })).toBe(true);
    expect(hasPositiveBalance({ available_quantity: 0 })).toBe(false);
    expect(hasPositiveBalance({ available_quantity: -1 })).toBe(false);
  });

  it("يعتبر الرصيد عند الحد الأدنى أو أقل تنبيهًا", () => {
    expect(
      isLowStockBalance({ available_quantity: 0, minimum_quantity: 0 })
    ).toBe(true);
    expect(
      isLowStockBalance({ available_quantity: 3, minimum_quantity: 5 })
    ).toBe(true);
    expect(
      isLowStockBalance({ available_quantity: 6, minimum_quantity: 5 })
    ).toBe(false);
  });
});
