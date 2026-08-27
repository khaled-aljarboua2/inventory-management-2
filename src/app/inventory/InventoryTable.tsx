"use client";

import {
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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

  barcodeMap: Map<
    string,
    string
  >;

  currentPage: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;

  search: string;
  locationFilter: string;
  statusFilter: string;

  canViewAllLocations: boolean;
  currentLocationId: string | null;
};

export default function InventoryTable({
  inventory,
  locations,
  barcodeMap,
  currentPage,
  totalPages,
  totalResults,
  pageSize,
  search: initialSearch,
  locationFilter:
    initialLocationFilter,
  statusFilter:
    initialStatusFilter,
  canViewAllLocations,
  currentLocationId,
}: Props) {
  const router = useRouter();

  const [search, setSearch] =
    useState(initialSearch);

  const [locationFilter, setLocationFilter] =
    useState(
      initialLocationFilter
    );

  const [statusFilter, setStatusFilter] =
    useState(
      initialStatusFilter
    );

  // ============================================================
  // Status filter
  //
  // يتم تطبيقه على الصفحة الحالية.
  // ============================================================

  const filteredInventory =
    useMemo(() => {
      return inventory.filter(
        (item) => {
          const available =
            Number(
              item.available_quantity ??
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

          if (
            statusFilter ===
            "available"
          ) {
            return (
              !isOut &&
              !isLow
            );
          }

          if (
            statusFilter ===
            "low"
          ) {
            return isLow;
          }

          if (
            statusFilter ===
            "out"
          ) {
            return isOut;
          }

          return true;
        }
      );
    }, [
      inventory,
      statusFilter,
    ]);

  // ============================================================
  // الأرقام
  // ============================================================

  const firstResult =
    totalResults === 0
      ? 0
      : (currentPage - 1) *
          pageSize +
        1;

  const lastResult =
    Math.min(
      currentPage *
        pageSize,
      totalResults
    );

  const totalAvailable =
    filteredInventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.available_quantity ??
            0
        ),
      0
    );

  const totalReserved =
    filteredInventory.reduce(
      (sum, item) =>
        sum +
        Number(
          item.reserved_quantity ??
            0
        ),
      0
    );

  // ============================================================
  // تغيير الصفحة
  // ============================================================

  function goToPage(
    page: number
  ) {
    const safePage =
      Math.max(
        1,
        Math.min(
          page,
          totalPages
        )
      );

    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    if (
      locationFilter &&
      locationFilter !==
        "all"
    ) {
      params.set(
        "location",
        locationFilter
      );
    }

    if (
      statusFilter &&
      statusFilter !==
        "all"
    ) {
      params.set(
        "status",
        statusFilter
      );
    }

    params.set(
      "page",
      String(safePage)
    );

    router.push(
      `/inventory?${params.toString()}`
    );
  }

  // ============================================================
  // البحث
  // ============================================================

  function submitSearch() {
    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    if (
      locationFilter &&
      locationFilter !==
        "all"
    ) {
      params.set(
        "location",
        locationFilter
      );
    }

    if (
      statusFilter &&
      statusFilter !==
        "all"
    ) {
      params.set(
        "status",
        statusFilter
      );
    }

    params.set(
      "page",
      "1"
    );

    router.push(
      `/inventory?${params.toString()}`
    );
  }

  // ============================================================
  // تغيير الموقع
  // ============================================================

  function changeLocation(
    value: string
  ) {
    setLocationFilter(value);

    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    if (
      value &&
      value !== "all"
    ) {
      params.set(
        "location",
        value
      );
    }

    if (
      statusFilter &&
      statusFilter !==
        "all"
    ) {
      params.set(
        "status",
        statusFilter
      );
    }

    params.set(
      "page",
      "1"
    );

    router.push(
      `/inventory?${params.toString()}`
    );
  }

  // ============================================================
  // تغيير الحالة
  // ============================================================

  function changeStatus(
    value: string
  ) {
    setStatusFilter(value);

    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    if (
      locationFilter &&
      locationFilter !==
        "all"
    ) {
      params.set(
        "location",
        locationFilter
      );
    }

    if (
      value &&
      value !== "all"
    ) {
      params.set(
        "status",
        value
      );
    }

    params.set(
      "page",
      "1"
    );

    router.push(
      `/inventory?${params.toString()}`
    );
  }

  function clearSearch() {
    setSearch("");

    const params =
      new URLSearchParams();

    if (
      locationFilter &&
      locationFilter !==
        "all"
    ) {
      params.set(
        "location",
        locationFilter
      );
    }

    if (
      statusFilter &&
      statusFilter !==
        "all"
    ) {
      params.set(
        "status",
        statusFilter
      );
    }

    params.set(
      "page",
      "1"
    );

    router.push(
      `/inventory?${params.toString()}`
    );
  }

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
    ).format(
      new Date(value)
    );
  }

  // ============================================================
  // Pagination
  // ============================================================

  function Pagination() {
    if (totalResults <= 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-400">
          عرض{" "}
          <strong className="text-slate-600">
            {firstResult.toLocaleString(
              "ar-SA"
            )}
          </strong>
          {" إلى "}
          <strong className="text-slate-600">
            {lastResult.toLocaleString(
              "ar-SA"
            )}
          </strong>
          {" من أصل "}
          <strong className="text-slate-600">
            {totalResults.toLocaleString(
              "ar-SA"
            )}
          </strong>
          {" رصيد"}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              goToPage(
                currentPage - 1
              )
            }
            disabled={
              currentPage <= 1
            }
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              py-2
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:border-teal-200
              hover:bg-teal-50
              hover:text-teal-700
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <ChevronRight
              size={15}
            />

            السابق
          </button>

          <span className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700">
            صفحة{" "}
            {currentPage.toLocaleString(
              "ar-SA"
            )}
            {" من "}
            {totalPages.toLocaleString(
              "ar-SA"
            )}
          </span>

          <button
            type="button"
            onClick={() =>
              goToPage(
                currentPage + 1
              )
            }
            disabled={
              currentPage >=
              totalPages
            }
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              py-2
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:border-teal-200
              hover:bg-teal-50
              hover:text-teal-700
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            التالي

            <ChevronLeft
              size={15}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* ======================================================
          Toolbar
      ======================================================= */}

      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              أرصدة المنتجات
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {filteredInventory.length.toLocaleString(
                "ar-SA"
              )}{" "}
              في الصفحة
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

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* ==================================================
                البحث
            =================================================== */}

            <div className="relative sm:w-80">
              <Search
                size={18}
                className="
                  pointer-events-none
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    submitSearch();
                  }
                }}
                placeholder="ابحث باسم المنتج أو SKU أو الباركود..."
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
                  focus:border-teal-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-teal-50
                "
              />

              {search && (
                <button
                  type="button"
                  onClick={
                    clearSearch
                  }
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
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

            <select
              value={
                locationFilter
              }
              onChange={(event) =>
                changeLocation(
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
                focus:border-teal-400
                focus:ring-4
                focus:ring-teal-50
              "
            >
              {canViewAllLocations ? (
                <>
                  <option value="all">
                    جميع المواقع
                  </option>

                  {currentLocationId && (
                    <option value={currentLocationId}>
                      موقعي
                    </option>
                  )}

                  <option value="other">
                    الفروع الأخرى
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {location.name} (
                        {
                          location.code
                        }
                        )
                      </option>
                    )
                  )}
                </>
              ) : (
                <>
                  {locations
                    .filter(
                      (location) =>
                        location.id ===
                        currentLocationId
                    )
                    .map(
                      (location) => (
                        <option
                          key={
                            location.id
                          }
                          value={
                            location.id
                          }
                        >
                          {location.name} (
                          {
                            location.code
                          }
                          )
                        </option>
                      )
                    )}
                </>
              )}
            </select>

            {/* ==================================================
                الحالة
            =================================================== */}

            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                changeStatus(
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

        {/* ======================================================
            Pagination فوق الجدول
        ======================================================= */}

        <Pagination />
      </div>

      {/* ======================================================
          الجدول
      ======================================================= */}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1250px] text-right">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                المنتج
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                SKU
              </th>

              <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                الباركود
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
                  colSpan={10}
                  className="px-6 py-20 text-center"
                >
                  <Package
                    size={36}
                    className="mx-auto mb-3 text-slate-300"
                  />

                  <p className="font-semibold text-slate-700">
                    لا توجد نتائج
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    جرّب تغيير البحث أو الفلاتر.
                  </p>

                  {search && (
                    <button
                      type="button"
                      onClick={
                        clearSearch
                      }
                      className="
                        mt-4
                        rounded-lg
                        bg-teal-600
                        px-4
                        py-2
                        text-xs
                        font-semibold
                        text-white
                        transition
                        hover:bg-teal-700
                      "
                    >
                      مسح البحث
                    </button>
                  )}
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

                  const barcode =
                    barcodeMap.get(
                      item.product_id
                    );

                  return (
                    <tr
                      key={
                        item.id
                      }
                      className="
                        transition
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
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
                          {
                            item
                              .products
                              ?.sku
                          }
                        </span>
                      </td>

                      {/* الباركود */}

                      <td className="px-6 py-5">
                        {barcode ? (
                          <span className="rounded-md bg-teal-50 px-2 py-1 font-mono text-xs font-semibold text-teal-700">
                            {
                              barcode
                            }
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            لا يوجد
                          </span>
                        )}
                      </td>

                      {/* الموقع */}

                      <td className="px-6 py-5">
                        <p className="font-medium text-slate-700">
                          {
                            item
                              .locations
                              ?.name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            item
                              .locations
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
          Pagination تحت الجدول
      ======================================================= */}

      <Pagination />
    </section>
  );
}