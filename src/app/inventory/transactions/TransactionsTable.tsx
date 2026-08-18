"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
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

  products:
    | {
        id: string;
        name: string;
        sku: string;
      }
    | null;

  locations:
    | {
        id: string;
        name: string;
        code: string;
      }
    | null;

  users:
    | {
        id: string;
        full_name: string;
      }
    | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  transactions?: Transaction[];
  locations?: Location[];
};

export default function TransactionsTable({
  transactions = [],
  locations = [],
}: Props) {
  const [search, setSearch] =
    useState("");

  const [
    locationFilter,
    setLocationFilter,
  ] = useState("all");

  const [
    transactionFilter,
    setTransactionFilter,
  ] = useState("all");

  const [
    directionFilter,
    setDirectionFilter,
  ] = useState("all");

  // ============================================================
  // الفلاتر
  // ============================================================

  const filteredTransactions =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return transactions.filter(
        (transaction) => {
          const productName =
            transaction.products?.name
              ?.toLowerCase() ?? "";

          const sku =
            transaction.products?.sku
              ?.toLowerCase() ?? "";

          const locationName =
            transaction.locations?.name
              ?.toLowerCase() ?? "";

          const locationCode =
            transaction.locations?.code
              ?.toLowerCase() ?? "";

          const userName =
            transaction.users?.full_name
              ?.toLowerCase() ?? "";

          const type =
            transactionTypeLabel(
              transaction.transaction_type
            ).toLowerCase();

          const reference =
            transaction.reference_type
              ?.toLowerCase() ?? "";

          const matchesSearch =
            !query ||
            productName.includes(query) ||
            sku.includes(query) ||
            locationName.includes(
              query
            ) ||
            locationCode.includes(
              query
            ) ||
            userName.includes(query) ||
            type.includes(query) ||
            reference.includes(query);

          const matchesLocation =
            locationFilter === "all" ||
            transaction.location_id ===
              locationFilter;

          const matchesType =
            transactionFilter === "all" ||
            String(
              transaction.transaction_type
            ).toLowerCase() ===
              transactionFilter;

          const quantity = Number(
            transaction.quantity ?? 0
          );

          const matchesDirection =
            directionFilter === "all" ||
            (directionFilter === "in" &&
              quantity > 0) ||
            (directionFilter === "out" &&
              quantity < 0);

          return (
            matchesSearch &&
            matchesLocation &&
            matchesType &&
            matchesDirection
          );
        }
      );
    }, [
      transactions,
      search,
      locationFilter,
      transactionFilter,
      directionFilter,
    ]);

  // ============================================================
  // الإحصائيات الخاصة بالنتائج الحالية
  // ============================================================

  const totalIncoming =
    filteredTransactions.filter(
      (transaction) =>
        Number(transaction.quantity) > 0
    ).length;

  const totalOutgoing =
    filteredTransactions.filter(
      (transaction) =>
        Number(transaction.quantity) < 0
    ).length;

  const hasFilters =
    search.trim() !== "" ||
    locationFilter !== "all" ||
    transactionFilter !== "all" ||
    directionFilter !== "all";

  // ============================================================
  // الأدوات
  // ============================================================

  function resetFilters() {
    setSearch("");
    setLocationFilter("all");
    setTransactionFilter("all");
    setDirectionFilter("all");
  }

  function formatNumber(
    value: number
  ) {
    return new Intl.NumberFormat(
      "ar-SA",
      {
        maximumFractionDigits: 2,
      }
    ).format(value);
  }

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      "ar-SA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(value));
  }

  const selectedLocation =
    locationFilter === "all"
      ? null
      : locations.find(
          (location) =>
            location.id ===
            locationFilter
        );

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* ======================================================
          رأس القسم
      ======================================================= */}

      <div className="border-b border-slate-100 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          {/* العنوان */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ClipboardList
                    size={19}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    سجل الحركات
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-400">
                    {filteredTransactions.length.toLocaleString(
                      "ar-SA"
                    )}{" "}
                    حركة مطابقة للفلاتر الحالية
                  </p>
                </div>
              </div>
            </div>

            {/* الموقع المحدد */}
            {selectedLocation && (
              <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-sm font-medium text-blue-700">
                <Warehouse size={16} />

                <span>
                  {selectedLocation.name}
                </span>

                <span className="font-mono text-xs text-blue-500">
                  {selectedLocation.code}
                </span>
              </div>
            )}
          </div>

          {/* ==================================================
              اختيار الموقع
          =================================================== */}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Warehouse
                size={16}
                className="text-slate-500"
              />

              <label className="text-xs font-semibold text-slate-600">
                الموقع / الفرع
              </label>
            </div>

            <select
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(
                  event.target.value
                )
              }
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="all">
                جميع المواقع
              </option>

              {locations.map(
                (location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {location.name} (
                    {location.code})
                  </option>
                )
              )}
            </select>
          </div>

          {/* ==================================================
              البحث والفلاتر
          =================================================== */}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
            {/* البحث */}
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="ابحث عن منتج أو SKU أو مستخدم..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-10 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="مسح البحث"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* نوع الحركة */}
            <select
              value={transactionFilter}
              onChange={(event) =>
                setTransactionFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="all">
                جميع أنواع الحركات
              </option>

              <option value="purchase">
                شراء
              </option>

              <option value="transfer_in">
                نقل وارد
              </option>

              <option value="transfer_out">
                نقل صادر
              </option>

              <option value="adjustment">
                تسوية
              </option>
            </select>

            {/* الاتجاه */}
            <select
              value={directionFilter}
              onChange={(event) =>
                setDirectionFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="all">
                كل الاتجاهات
              </option>

              <option value="in">
                إضافة
              </option>

              <option value="out">
                خصم
              </option>
            </select>

            {/* إعادة الضبط */}
            {hasFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <RotateCcw
                  size={16}
                />

                إعادة ضبط
              </button>
            ) : (
              <div className="hidden lg:block" />
            )}
          </div>

          {/* ==================================================
              ملخص النتائج
          =================================================== */}

          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span>
                النتائج:
                <strong className="mr-1 text-slate-800">
                  {filteredTransactions.length.toLocaleString(
                    "ar-SA"
                  )}
                </strong>
              </span>

              <span>
                إضافة:
                <strong className="mr-1 text-emerald-600">
                  {totalIncoming.toLocaleString(
                    "ar-SA"
                  )}
                </strong>
              </span>

              <span>
                خصم:
                <strong className="mr-1 text-red-600">
                  {totalOutgoing.toLocaleString(
                    "ar-SA"
                  )}
                </strong>
              </span>
            </div>

            {hasFilters && (
              <span className="text-xs text-blue-600">
                يتم عرض النتائج حسب الفلاتر
                المحددة
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================
          الجدول
      ======================================================= */}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1400px] text-right">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                التاريخ
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                المنتج
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                الموقع
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                نوع الحركة
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                الكمية
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                قبل
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                بعد
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                المرجع
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                المستخدم
              </th>

              <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                ملاحظات
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length ===
            0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-20 text-center"
                >
                  <ClipboardList
                    size={34}
                    className="mx-auto mb-3 text-slate-300"
                  />

                  <p className="font-semibold text-slate-700">
                    لا توجد حركات
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    جرّب تغيير البحث أو الفلاتر
                    المحددة.
                  </p>

                  {hasFilters && (
                    <button
                      type="button"
                      onClick={
                        resetFilters
                      }
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <RotateCcw
                        size={15}
                      />

                      إعادة ضبط الفلاتر
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredTransactions.map(
                (transaction) => {
                  const quantity =
                    Number(
                      transaction.quantity ??
                        0
                    );

                  const isIncoming =
                    quantity > 0;

                  return (
                    <tr
                      key={transaction.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      {/* التاريخ */}
                      <td className="px-5 py-5 text-sm text-slate-500">
                        {formatDate(
                          transaction.created_at
                        )}
                      </td>

                      {/* المنتج */}
                      <td className="px-5 py-5">
                        <p className="font-semibold text-slate-800">
                          {
                            transaction
                              .products?.name
                          }
                        </p>

                        <p className="mt-1 font-mono text-xs text-slate-400">
                          SKU:{" "}
                          {
                            transaction
                              .products?.sku
                          }
                        </p>
                      </td>

                      {/* الموقع */}
                      <td className="px-5 py-5">
                        <p className="font-medium text-slate-700">
                          {
                            transaction
                              .locations?.name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            transaction
                              .locations?.code
                          }
                        </p>
                      </td>

                      {/* نوع الحركة */}
                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${transactionTypeClass(
                            transaction.transaction_type
                          )}`}
                        >
                          {isIncoming ? (
                            <ArrowDownToLine
                              size={13}
                            />
                          ) : (
                            <ArrowUpFromLine
                              size={13}
                            />
                          )}

                          {transactionTypeLabel(
                            transaction.transaction_type
                          )}
                        </span>
                      </td>

                      {/* الكمية */}
                      <td className="px-5 py-5">
                        <span
                          className={`text-base font-bold ${
                            isIncoming
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {isIncoming
                            ? "+"
                            : ""}
                          {formatNumber(
                            quantity
                          )}
                        </span>
                      </td>

                      {/* قبل */}
                      <td className="px-5 py-5 font-medium text-slate-600">
                        {formatNumber(
                          Number(
                            transaction.quantity_before ??
                              0
                          )
                        )}
                      </td>

                      {/* بعد */}
                      <td className="px-5 py-5 font-bold text-slate-800">
                        {formatNumber(
                          Number(
                            transaction.quantity_after ??
                              0
                          )
                        )}
                      </td>

                      {/* المرجع */}
                      <td className="px-5 py-5">
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {referenceLabel(
                              transaction.reference_type
                            )}
                          </p>

                          {transaction.reference_id && (
                            <p className="mt-1 max-w-32 truncate font-mono text-[10px] text-slate-400">
                              {
                                transaction.reference_id
                              }
                            </p>
                          )}
                        </div>
                      </td>

                      {/* المستخدم */}
                      <td className="px-5 py-5 text-sm text-slate-600">
                        {
                          transaction.users
                            ?.full_name ?? "—"
                        }
                      </td>

                      {/* الملاحظات */}
                      <td className="max-w-56 px-5 py-5 text-sm text-slate-500">
                        <span
                          title={
                            transaction.notes ??
                            ""
                          }
                          className="line-clamp-2"
                        >
                          {transaction.notes ??
                            "—"}
                        </span>
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================
// أسماء أنواع الحركات
// ============================================================

function transactionTypeLabel(
  type: string
) {
  switch (
    String(type).toLowerCase()
  ) {
    case "purchase":
      return "شراء";

    case "transfer_in":
      return "نقل وارد";

    case "transfer_out":
      return "نقل صادر";

    case "adjustment":
      return "تسوية";

    default:
      return type || "حركة";
  }
}

// ============================================================
// ألوان أنواع الحركات
// ============================================================

function transactionTypeClass(
  type: string
) {
  switch (
    String(type).toLowerCase()
  ) {
    case "purchase":
      return "bg-blue-50 text-blue-700";

    case "transfer_in":
      return "bg-emerald-50 text-emerald-700";

    case "transfer_out":
      return "bg-orange-50 text-orange-700";

    case "adjustment":
      return "bg-violet-50 text-violet-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

// ============================================================
// أسماء المراجع
// ============================================================

function referenceLabel(
  referenceType:
    | string
    | null
) {
  switch (
    String(
      referenceType ?? ""
    ).toLowerCase()
  ) {
    case "goods_receipt":
      return "سند استلام";

    case "transfer_request":
      return "طلب نقل";

    case "stock_adjustment":
      return "تسوية مخزون";

    default:
      return referenceType || "—";
  }
}