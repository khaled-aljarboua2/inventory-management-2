"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Search,
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

type Props = {
  transactions?: Transaction[];
};

export default function TransactionsTable({
  transactions = [],
}: Props) {
  const [search, setSearch] =
    useState("");

  const [
    transactionFilter,
    setTransactionFilter,
  ] = useState("all");

  const [
    directionFilter,
    setDirectionFilter,
  ] = useState("all");

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
            productName.includes(
              query
            ) ||
            sku.includes(query) ||
            locationName.includes(
              query
            ) ||
            locationCode.includes(
              query
            ) ||
            userName.includes(
              query
            ) ||
            type.includes(query) ||
            reference.includes(query);

          const matchesType =
            transactionFilter ===
              "all" ||
            transactionFilter ===
              String(
                transaction.transaction_type
              ).toLowerCase();

          const quantity =
            Number(
              transaction.quantity ?? 0
            );

          const matchesDirection =
            directionFilter ===
              "all" ||
            (directionFilter ===
              "in" &&
              quantity > 0) ||
            (directionFilter ===
              "out" &&
              quantity < 0);

          return (
            matchesSearch &&
            matchesType &&
            matchesDirection
          );
        }
      );
    }, [
      transactions,
      search,
      transactionFilter,
      directionFilter,
    ]);

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

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* ======================================================
          رأس الجدول
      ======================================================= */}

      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              سجل الحركات
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {filteredTransactions.length} حركة
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* البحث */}
            <div className="relative sm:w-80">
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
                placeholder="منتج، SKU، موقع، مستخدم..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            {/* نوع الحركة */}
            <select
              value={transactionFilter}
              onChange={(event) =>
                setTransactionFilter(
                  event.target.value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              <option value="all">
                جميع الحركات
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
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
                    جرّب تغيير البحث أو الفلاتر.
                  </p>
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
                            ?.full_name ??
                          "—"
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
      return referenceType ||
        "—";
  }
}