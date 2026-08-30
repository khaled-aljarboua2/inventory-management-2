import { describe, expect, it } from "vitest";

import {
  calculateCountAdjustment,
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
        currentAvailable: 12,
      })
    ).toEqual({
      difference: -2,
      quantityAfter: 10,
    });
  });

  it("يمنع تسوية تجعل الرصيد سالبًا", () => {
    expect(() =>
      calculateCountAdjustment({
        systemQuantity: 10,
        countedQuantity: 0,
        currentAvailable: 5,
      })
    ).toThrow("تسوية الجرد ستجعل الرصيد سالبًا");
  });
});

describe("طلبات النقل", () => {
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
