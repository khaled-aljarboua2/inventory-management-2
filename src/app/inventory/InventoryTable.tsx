"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Search,
  X,
} from "lucide-react";

type InventoryBalance = {
  id: string;
  product_id: string;
  location_id: string;
  available_quantity: number;
  reserved_quantity: number;
  minimum_quantity: number;
  maximum_quantity: number | null;
  last_count_date: string | null;
  updated_at: string;

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
};

type Location = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  inventory: InventoryBalance[];
  locations: Location[];
  canViewAllLocations: boolean;
};

export default function InventoryTable({
  inventory,
  locations,
  canViewAllLocations,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [locationFilter, setLocationFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  // ============================================================
  // الفلترة
  // ============================================================

  const filteredInventory = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return inventory.filter(
      (item) => {
        const productName =
          item.products?.name
            ?.toLowerCase() ?? "";

        const sku =
          item.products?.sku
            ?.toLowerCase() ?? "";

        const locationName =
          item.locations?.name
            ?.toLowerCase() ?? "";

        const locationCode =
          item.locations?.code
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
          );

        const matchesLocation =
          !canViewAllLocations ||
          locationFilter ===
            "all" ||
          item.locations?.id ===
            locationFilter;

        const available =
          Number(
            item.available_quantity ?? 0
          );

        const minimum =
          Number(
            item.minimum_quantity ?? 0
          );

        const isOut =
          available <= 0;

        const isLow =
          !isOut &&
          minimum > 0 &&
          available <= minimum;

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter ===
            "available" &&
            !isOut &&
            !isLow) ||
          (statusFilter === "low" &&
            isLow) ||
          (statusFilter === "out" &&
            isOut);

        return (
          matchesSearch &&
          matchesLocation &&
          matchesStatus
        );
      }
    );
  }, [
    inventory,
    search,
    locationFilter,
    statusFilter,
    canViewAllLocations,
  ]);

  // ============================================================
  // أرقام الجدول
  // ============================================================

  const totalAvailable =
    filteredInventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.available_quantity ?? 0
        ),
      0
    );

  const totalReserved =
    filteredInventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.reserved_quantity ?? 0
        ),
      0
    );

  // ============================================================
  // تنسيق الأرقام
  // ============================================================

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

  // ============================================================
  // تنسيق التاريخ
  // ============================================================

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "لم يتم الجرد";
    }

    return new Intl.DateTimeFormat(
      "ar-SA",
      {
        dateStyle: "medium",
      }
    ).format(new Date(value));
  }

  // ============================================================
  // الصفحة
  // ============================================================

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* ======================================================
          رأس الجدول
      ======================================================= */}

      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              أرصدة المنتجات
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {formatNumber(
                filteredInventory.length
              )}{" "}
              رصيد
              {" · "}
              {formatNumber(
                totalAvailable
              )}{" "}
              متاح
              {" · "}
              {formatNumber(
                totalReserved
              )}{" "}
              محجوز
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {/* ==================================================
                البحث
            =================================================== */}

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
                placeholder="ابحث عن منتج أو SKU أو موقع..."
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  pr-10
                  pl-10
                  text-sm
                  text-slate-700
                  outline-none
                  transition
                  hover:border-slate-300
                  hover:bg-white
                  focus:border-teal-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-teal-50
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="
                    absolute
                    left-3
                    top-1/2
                    flex
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-md
                    p-1
                    text-slate-400
                    hover:bg-slate-100
                    hover:text-slate-700
                  "
                  aria-label="مسح البحث"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* ==================================================
                المواقع
            =================================================== */}

            {canViewAllLocations && (
              <select
                value={locationFilter}
                onChange={(event) =>
                  setLocationFilter(
                    event.target.value
                  )
                }
                className="
                  h-11
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  text-sm
                  text-slate-600
                  outline-none
                  transition
                  hover:border-slate-300
                  focus:border-teal-400
                  focus:ring-4
                  focus:ring-teal-50
                "
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
            )}

            {/* ==================================================
                الحالة
            =================================================== */}

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="
                h-11
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                text-sm
                text-slate-600
                outline-none
                transition
                hover:border-slate-300
                focus:border-teal-400
                focus:ring-4
                focus:ring-teal-50
              "
            >
              <option value="all">
                جميع الحالات
              </option>

              <option value="available">
                متوفر
              </option>

              <option value="low">
                منخفض
              </option>

              <option value="out">
                نافد
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================
          الجدول
      ======================================================= */}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-right">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                المنتج
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                SKU
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                الموقع
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                المتاح
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                المحجوز
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                الحد الأدنى
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                الحد الأعلى
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                آخر جرد
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                الحالة
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredInventory.length ===
            0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-6 py-20 text-center"
                >
                  <Package
                    size={34}
                    className="mx-auto mb-3 text-slate-300"
                  />

                  <p className="font-semibold text-slate-700">
                    لا توجد نتائج
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    جرّب تغيير البحث أو الفلاتر.
                  </p>
                </td>
              </tr>
            ) : (
              filteredInventory.map(
                (item) => {
                  const available =
                    Number(
                      item.available_quantity ??
                        0
                    );

                  const reserved =
                    Number(
                      item.reserved_quantity ??
                        0
                    );

                  const minimum =
                    Number(
                      item.minimum_quantity ??
                        0
                    );

                  const isOut =
                    available <= 0;

                  const isLow =
                    !isOut &&
                    minimum > 0 &&
                    available <= minimum;

                  return (
                    <tr
                      key={item.id}
                      className="
                        transition-colors
                        hover:bg-teal-50/30
                      "
                    >
                      {/* المنتج */}

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="
                              flex
                              h-10
                              w-10
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              bg-teal-50
                              text-teal-600
                            "
                          >
                            <Package
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">
                              {
                                item
                                  .products
                                  ?.name
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}

                      <td className="px-6 py-5">
                        <span
                          className="
                            rounded-md
                            bg-slate-100
                            px-2
                            py-1
                            font-mono
                            text-xs
                            font-semibold
                            text-slate-600
                          "
                        >
                          {
                            item.products
                              ?.sku
                          }
                        </span>
                      </td>

                      {/* الموقع */}

                      <td className="px-6 py-5">
                        <p className="font-medium text-slate-700">
                          {
                            item.locations
                              ?.name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            item.locations
                              ?.code
                          }
                        </p>
                      </td>

                      {/* المتاح */}

                      <td className="px-6 py-5">
                        <span
                          className={`text-lg font-bold ${
                            isOut
                              ? "text-red-600"
                              : isLow
                              ? "text-orange-600"
                              : "text-slate-900"
                          }`}
                        >
                          {formatNumber(
                            available
                          )}
                        </span>
                      </td>

                      {/* المحجوز */}

                      <td className="px-6 py-5 font-medium text-slate-600">
                        {formatNumber(
                          reserved
                        )}
                      </td>

                      {/* الحد الأدنى */}

                      <td className="px-6 py-5 text-slate-600">
                        {formatNumber(
                          minimum
                        )}
                      </td>

                      {/* الحد الأعلى */}

                      <td className="px-6 py-5 text-slate-600">
                        {item.maximum_quantity ===
                        null
                          ? "غير محدد"
                          : formatNumber(
                              Number(
                                item.maximum_quantity
                              )
                            )}
                      </td>

                      {/* آخر جرد */}

                      <td className="px-6 py-5 text-sm text-slate-500">
                        {formatDate(
                          item.last_count_date
                        )}
                      </td>

                      {/* الحالة */}

                      <td className="px-6 py-5">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                            <AlertTriangle
                              size={13}
                            />
                            نافد
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                            <AlertTriangle
                              size={13}
                            />
                            منخفض
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            <CheckCircle2
                              size={13}
                            />
                            متوفر
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                }
              )
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================
          نهاية الجدول
      ======================================================= */}

      {filteredInventory.length >
        0 && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-4 text-xs text-slate-400">
          عرض جميع الأرصدة المطابقة للفلاتر والبحث —{" "}
          <strong className="text-slate-600">
            {formatNumber(
              filteredInventory.length
            )}
          </strong>{" "}
          رصيد
        </div>
      )}
    </section>
  );
}