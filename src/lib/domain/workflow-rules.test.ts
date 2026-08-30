import { describe, expect, it } from "vitest";

import {
  calculateCountAdjustment,
  canEditTransferStatus,
  canManageUserScope,
  getNextTransferStatus,
  validatePurchaseReceipt,
  validateTransferQuantities,
} from "./workflow-rules";

describe("الجرد", () => {
  it("يحسب الفرق والرصيد الجديد من لقطة الجرد", () => {
    expect(
      calculateCountAdjustment({
        systemQuantity: 10,
        countedQuantity: 8,
        currentAvailable: 10,
      })
    ).toEqual({
      difference: -2,
      quantityAfter: 8,
    });
  });

  it("يمنع إكمال الجرد إذا تغير الرصيد بعد أخذ اللقطة", () => {
    expect(() =>
      calculateCountAdjustment({
        systemQuantity: 10,
        countedQuantity: 8,
        currentAvailable: 12,
      })
    ).toThrow("تغير الرصيد بعد بدء الجرد");
  });

  it("يمنع إدخال كمية جرد سالبة", () => {
    expect(() =>
      calculateCountAdjustment({
        systemQuantity: 10,
        countedQuantity: -1,
        currentAvailable: 10,
      })
    ).toThrow("كميات الجرد يجب أن تكون أرقامًا غير سالبة");
  });
});

describe("طلبات النقل", () => {
  it("يمنع تعديل الطلب بعد الشحن", () => {
    expect(canEditTransferStatus("preparing")).toBe(true);
    expect(canEditTransferStatus("shipped")).toBe(false);
    expect(canEditTransferStatus("received")).toBe(false);
  });
  it("يسمح فقط بتسلسل الحالات النظامي", () => {
    expect(getNextTransferStatus("pending", "approve")).toBe("approved");
    expect(getNextTransferStatus("approved", "prepare")).toBe("preparing");
    expect(getNextTransferStatus("preparing", "ship")).toBe("shipped");
    expect(getNextTransferStatus("shipped", "receive")).toBe("received");
    expect(getNextTransferStatus("received", "ship")).toBeNull();
  });

  it("يمنع شحن أكثر من المعتمد واستلام أكثر من المشحون", () => {
    expect(
      validateTransferQuantities({
        requested: 10,
        approved: 8,
        shipped: 9,
      })
    ).not.toBeNull();

    expect(
      validateTransferQuantities({
        requested: 10,
        approved: 8,
        shipped: 8,
        received: 9,
      })
    ).not.toBeNull();
  });
});

describe("المشتريات", () => {
  it("يسمح بالاستلام الجزئي ويمنع تجاوز المطلوب", () => {
    expect(
      validatePurchaseReceipt({
        ordered: 10,
        previouslyReceived: 3,
        receivingNow: 4,
      })
    ).toBeNull();

    expect(
      validatePurchaseReceipt({
        ordered: 10,
        previouslyReceived: 7,
        receivingNow: 4,
      })
    ).not.toBeNull();
  });
});

describe("الصلاحيات", () => {
  it("يمنع إدارة مستخدم خارج الشركة", () => {
    expect(
      canManageUserScope({
        actorCompanyId: "company-a",
        actorLocationId: "location-a",
        hasFullLocationAccess: true,
        targetCompanyId: "company-b",
        targetLocationId: "location-a",
      })
    ).toBe(false);
  });

  it("يحصر مدير الفرع في موقعه ويسمح للمدير العام داخل شركته", () => {
    expect(
      canManageUserScope({
        actorCompanyId: "company-a",
        actorLocationId: "location-a",
        hasFullLocationAccess: false,
        targetCompanyId: "company-a",
        targetLocationId: "location-b",
      })
    ).toBe(false);

    expect(
      canManageUserScope({
        actorCompanyId: "company-a",
        actorLocationId: "location-a",
        hasFullLocationAccess: true,
        targetCompanyId: "company-a",
        targetLocationId: "location-b",
      })
    ).toBe(true);
  });
});
