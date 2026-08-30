type BalanceInput = {
  available_quantity: number | null;
};

type LowStockInput = BalanceInput & {
  minimum_quantity: number | null;
};

export function formatReportDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

export function hasPositiveBalance(balance: BalanceInput) {
  return Number(balance.available_quantity ?? 0) > 0;
}

export function isLowStockBalance(balance: LowStockInput) {
  return (
    Number(balance.available_quantity ?? 0) <=
    Number(balance.minimum_quantity ?? 0)
  );
}
