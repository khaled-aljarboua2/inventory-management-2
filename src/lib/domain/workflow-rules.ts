export type TransferStatus =
  | "pending"
  | "approved"
  | "preparing"
  | "shipped"
  | "received"
  | "cancelled";

export type TransferAction =
  | "approve"
  | "prepare"
  | "ship"
  | "receive"
  | "cancel";

const TRANSFER_TRANSITIONS: Record<
  TransferStatus,
  Partial<Record<TransferAction, TransferStatus>>
> = {
  pending: {
    approve: "approved",
    cancel: "cancelled",
  },
  approved: {
    prepare: "preparing",
    cancel: "cancelled",
  },
  preparing: {
    ship: "shipped",
    cancel: "cancelled",
  },
  shipped: {
    receive: "received",
  },
  received: {},
  cancelled: {},
};

export function getNextTransferStatus(
  currentStatus: TransferStatus,
  action: TransferAction
) {
  return TRANSFER_TRANSITIONS[currentStatus][action] ?? null;
}

export function canEditTransferStatus(status: TransferStatus) {
  return ["pending", "approved", "preparing"].includes(status);
}

export function validateTransferQuantities(input: {
  requested: number;
  approved?: number | null;
  shipped?: number | null;
  received?: number | null;
}) {
  const {
    requested,
    approved = null,
    shipped = null,
    received = null,
  } = input;

  if (!Number.isFinite(requested) || requested <= 0) {
    return "الكمية المطلوبة يجب أن تكون أكبر من صفر.";
  }

  if (approved !== null && (approved < 0 || approved > requested)) {
    return "الكمية المعتمدة يجب أن تكون بين صفر والكمية المطلوبة.";
  }

  if (
    shipped !== null &&
    (shipped < 0 || approved === null || shipped > approved)
  ) {
    return "الكمية المشحونة لا يمكن أن تتجاوز الكمية المعتمدة.";
  }

  if (
    received !== null &&
    (received < 0 || shipped === null || received > shipped)
  ) {
    return "الكمية المستلمة لا يمكن أن تتجاوز الكمية المشحونة.";
  }

  return null;
}

export function calculateCountAdjustment(input: {
  systemQuantity: number;
  countedQuantity: number;
  currentAvailable: number;
}) {
  const { systemQuantity, countedQuantity, currentAvailable } = input;

  for (const value of [systemQuantity, countedQuantity, currentAvailable]) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("كميات الجرد يجب أن تكون أرقامًا غير سالبة.");
    }
  }

  if (currentAvailable !== systemQuantity) {
    throw new Error("تغير الرصيد بعد بدء الجرد ويجب تحديث لقطة الجرد أولًا.");
  }

  const difference = countedQuantity - systemQuantity;
  const quantityAfter = countedQuantity;

  if (quantityAfter < 0) {
    throw new Error("تسوية الجرد ستجعل الرصيد سالبًا.");
  }

  return {
    difference,
    quantityAfter,
  };
}

export function validatePurchaseReceipt(input: {
  ordered: number;
  previouslyReceived: number;
  receivingNow: number;
}) {
  const { ordered, previouslyReceived, receivingNow } = input;

  if (
    ![ordered, previouslyReceived, receivingNow].every(Number.isFinite) ||
    ordered <= 0 ||
    previouslyReceived < 0 ||
    receivingNow <= 0
  ) {
    return "كميات أمر الشراء غير صالحة.";
  }

  if (previouslyReceived + receivingNow > ordered) {
    return "الكمية المستلمة تتجاوز الكمية المطلوبة.";
  }

  return null;
}

export function canManageUserScope(input: {
  actorCompanyId: string;
  actorLocationId: string | null;
  hasFullLocationAccess: boolean;
  targetCompanyId: string;
  targetLocationId: string | null;
}) {
  if (input.actorCompanyId !== input.targetCompanyId) {
    return false;
  }

  return (
    input.hasFullLocationAccess ||
    input.actorLocationId === input.targetLocationId
  );
}
