"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Loader2,
  RotateCcw,
  Search,
  Warehouse,
  X,
} from "lucide-react";

type Transaction = {
  id: string;
  company_id: string;
  product_id: string;
  location_id: string;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  products: { id: string; name: string; sku: string } | null;
  locations: { id: string; name: string; code: string } | null;
  users: { id: string; full_name: string } | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  initialTransactions?: Transaction[];
  initialTotal?: number;
  locations?: Location[];
};

const ROWS_PER_PAGE = 50;

export default function TransactionsTable({
  initialTransactions = [],
  initialTotal = 0,
  locations = [],
}: Props) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [locationFilter, setLocationFilter] = useState("all");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstLoad, setFirstLoad] = useState(true);

  const hasFilters =
    search.trim() !== "" ||
    locationFilter !== "all" ||
    transactionFilter !== "all" ||
    directionFilter !== "all";

  useEffect(() => {
    if (
      firstLoad &&
      page === 1 &&
      deferredSearch.trim() === "" &&
      locationFilter === "all" &&
      transactionFilter === "all" &&
      directionFilter === "all"
    ) {
      setFirstLoad(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ROWS_PER_PAGE),
          q: deferredSearch.trim(),
          location_id: locationFilter,
          type: transactionFilter,
          direction: directionFilter,
        });

        const response = await fetch(`/api/inventory/transactions?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "تعذر تحميل حركة المخزون.");
        }

        setTransactions(result.transactions ?? []);
        setTotal(Number(result.total ?? 0));
      } catch (caughtError) {
        if (controller.signal.aborted) return;
        setTransactions([]);
        setTotal(0);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "تعذر تحميل حركة المخزون."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, deferredSearch.trim() ? 350 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    deferredSearch,
    page,
    locationFilter,
    transactionFilter,
    directionFilter,
    firstLoad,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ROWS_PER_PAGE, total);

  const pageIncoming = useMemo(
    () => transactions.filter((item) => Number(item.quantity) > 0).length,
    [transactions]
  );
  const pageOutgoing = useMemo(
    () => transactions.filter((item) => Number(item.quantity) < 0).length,
    [transactions]
  );

  const selectedLocation =
    locationFilter === "all"
      ? null
      : locations.find((location) => location.id === locationFilter) ?? null;

  function resetFilters() {
    setSearch("");
    setLocationFilter("all");
    setTransactionFilter("all");
    setDirectionFilter("all");
    setPage(1);
  }

  function formatNumber(value: number) {
    return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(value);
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    }).format(new Date(value));
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <ClipboardList size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">سجل الحركات</h2>
                <p className="mt-0.5 text-sm text-slate-400">
                  {total.toLocaleString("ar-SA")} حركة مطابقة من كامل السجل
                </p>
              </div>
            </div>

            {selectedLocation && (
              <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3.5 py-2.5 text-sm font-semibold text-teal-700">
                <Warehouse size={16} />
                <span>{selectedLocation.name}</span>
                <span className="font-mono text-xs text-teal-500">{selectedLocation.code}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Warehouse size={16} className="text-teal-500" />
              <label className="text-xs font-semibold text-slate-600">الموقع / الفرع</label>
            </div>
            <select
              value={locationFilter}
              onChange={(event) => {
                setLocationFilter(event.target.value);
                setPage(1);
              }}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
            >
              <option value="all">جميع المواقع</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="ابحث بالمنتج أو SKU أو الباركود..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-10 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="مسح البحث"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <select
              value={transactionFilter}
              onChange={(event) => {
                setTransactionFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
            >
              <option value="all">جميع أنواع الحركات</option>
              <option value="opening_balance">رصيد افتتاحي</option>
              <option value="purchase">شراء</option>
              <option value="transfer_in">نقل وارد</option>
              <option value="transfer_out">نقل صادر</option>
              <option value="adjustment">تسوية</option>
              <option value="stock_count">جرد</option>
            </select>

            <select
              value={directionFilter}
              onChange={(event) => {
                setDirectionFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
            >
              <option value="all">كل الاتجاهات</option>
              <option value="in">إضافة</option>
              <option value="out">خصم</option>
            </select>

            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
              >
                <RotateCcw size={16} />
                إعادة ضبط
              </button>
            ) : (
              <div className="hidden lg:block" />
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span>
                النتائج: <strong className="mr-1 text-slate-800">{total.toLocaleString("ar-SA")}</strong>
              </span>
              <span>
                إضافة في الصفحة: <strong className="mr-1 text-emerald-600">{pageIncoming.toLocaleString("ar-SA")}</strong>
              </span>
              <span>
                خصم في الصفحة: <strong className="mr-1 text-red-600">{pageOutgoing.toLocaleString("ar-SA")}</strong>
              </span>
            </div>
            <span className="text-xs font-medium text-teal-600">
              البحث يتم في كامل سجل الحركات
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="relative overflow-x-auto">
          {loading && (
            <div className="absolute inset-0 z-10 flex min-h-60 items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <Loader2 size={17} className="animate-spin text-teal-600" />
                جاري تحميل النتائج...
              </div>
            </div>
          )}

          <table className="w-full min-w-[1400px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {[
                  "التاريخ",
                  "المنتج",
                  "الموقع",
                  "نوع الحركة",
                  "الكمية",
                  "قبل",
                  "بعد",
                  "المرجع",
                  "المستخدم",
                  "ملاحظات",
                ].map((heading) => (
                  <th key={heading} className="px-5 py-4 text-xs font-semibold text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <ClipboardList size={29} className="mx-auto text-slate-300" />
                    <p className="mt-4 font-semibold text-slate-700">لا توجد حركات مطابقة</p>
                    <p className="mt-1 text-sm text-slate-400">جرّب تغيير البحث أو الفلاتر.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => {
                  const quantity = Number(transaction.quantity ?? 0);
                  const isIncoming = quantity > 0;

                  return (
                    <tr key={transaction.id} className="group transition hover:bg-teal-50/30">
                      <td className="px-5 py-5 text-sm text-slate-500">{formatDate(transaction.created_at)}</td>
                      <td className="px-5 py-5">
                        <p className="font-semibold text-slate-800 group-hover:text-teal-600">{transaction.products?.name ?? "منتج غير معروف"}</p>
                        <p className="mt-1 font-mono text-xs text-slate-400">SKU: {transaction.products?.sku ?? "—"}</p>
                      </td>
                      <td className="px-5 py-5">
                        <p className="font-medium text-slate-700">{transaction.locations?.name ?? "موقع غير معروف"}</p>
                        <p className="mt-1 text-xs text-slate-400">{transaction.locations?.code ?? "—"}</p>
                      </td>
                      <td className="px-5 py-5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${transactionTypeClass(transaction.transaction_type)}`}>
                          {isIncoming ? <ArrowDownToLine size={13} /> : <ArrowUpFromLine size={13} />}
                          {transactionTypeLabel(transaction.transaction_type)}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <span className={`text-base font-bold ${isIncoming ? "text-emerald-600" : "text-red-600"}`}>
                          {isIncoming ? "+" : ""}{formatNumber(quantity)}
                        </span>
                      </td>
                      <td className="px-5 py-5 font-medium text-slate-600">{formatNumber(Number(transaction.quantity_before ?? 0))}</td>
                      <td className="px-5 py-5 font-bold text-slate-800">{formatNumber(Number(transaction.quantity_after ?? 0))}</td>
                      <td className="px-5 py-5">
                        <p className="text-sm font-medium text-slate-700">{referenceLabel(transaction.reference_type)}</p>
                        {transaction.reference_id && <p className="mt-1 max-w-32 truncate font-mono text-[10px] text-slate-400">{transaction.reference_id}</p>}
                      </td>
                      <td className="px-5 py-5 text-sm text-slate-600">{transaction.users?.full_name ?? "—"}</td>
                      <td className="max-w-56 px-5 py-5 text-sm text-slate-500"><span className="line-clamp-2" title={transaction.notes ?? ""}>{transaction.notes ?? "—"}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            عرض {pageStart}–{pageEnd} من <strong className="text-slate-600">{total.toLocaleString("ar-SA")}</strong>
          </span>
          {totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                السابق
              </button>
              <span className="font-mono tabular-nums text-slate-600">{currentPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || loading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function transactionTypeLabel(type: string) {
  switch (String(type).toLowerCase()) {
    case "opening_balance": return "رصيد افتتاحي";
    case "purchase": return "شراء";
    case "transfer_in": return "نقل وارد";
    case "transfer_out": return "نقل صادر";
    case "adjustment": return "تسوية";
    case "stock_count": return "جرد";
    case "return": return "مرتجع";
    default: return type || "حركة";
  }
}

function transactionTypeClass(type: string) {
  switch (String(type).toLowerCase()) {
    case "purchase": return "bg-teal-50 text-teal-700";
    case "transfer_in": return "bg-emerald-50 text-emerald-700";
    case "transfer_out": return "bg-orange-50 text-orange-700";
    case "adjustment": return "bg-violet-50 text-violet-700";
    case "stock_count": return "bg-sky-50 text-sky-700";
    default: return "bg-slate-100 text-slate-600";
  }
}

function referenceLabel(referenceType: string | null) {
  switch (String(referenceType ?? "").toLowerCase()) {
    case "goods_receipt": return "سند استلام";
    case "transfer_request": return "طلب نقل";
    case "stock_adjustment": return "تسوية مخزون";
    case "stock_count": return "جرد";
    default: return referenceType || "—";
  }
}
