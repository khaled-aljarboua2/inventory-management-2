"use client";

import {
  useMemo,
  useState,
} from "react";

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
  barcodeMap: Record<
    string,
    string
  >;
  canViewAllLocations: boolean;
};

export default function InventoryTable({
  inventory,
  locations,
  barcodeMap,
  canViewAllLocations,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [
    locationFilter,
    setLocationFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  /* ============================================================
     البحث والفلاتر
     
     لا توجد Pagination هنا.
     البحث يعمل على كامل inventory المرسل من السيرفر.
  ============================================================ */

  const filteredInventory =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase();

      return inventory.filter(
        (item) => {
          const name =
            item.products?.name?.toLocaleLowerCase() ??
            "";

          const sku =
            item.products?.sku?.toLocaleLowerCase() ??
            "";

          const barcode =
            barcodeMap[
              item.product_id
            ]?.toLocaleLowerCase() ??
            "";

          const locationName =
            item.locations?.name?.toLocaleLowerCase() ??
            "";

          const locationCode =
            item.locations?.code?.toLocaleLowerCase() ??
            "";

          const matchesSearch =
            !query ||
            name.includes(query) ||
            sku.includes(query) ||
            barcode.includes(query) ||
            locationName.includes(query) ||
            locationCode.includes(query);

          const matchesLocation =
            !canViewAllLocations ||
            locationFilter ===
              "all" ||
            item.location_id ===
              locationFilter;

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

          const matchesStatus =
            statusFilter ===
              "all" ||
            (
              statusFilter ===
                "available" &&
              !isOut &&
              !isLow
            ) ||
            (
              statusFilter ===
                "low" &&
              isLow
            ) ||
            (
              statusFilter ===
                "out" &&
              isOut
            );

          return (
            matchesSearch &&
            matchesLocation &&
            matchesStatus
          );
        }
      );
    }, [
      inventory,
      barcodeMap,
      search,
      locationFilter,
      statusFilter,
      canViewAllLocations,
    ]);

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

  function clearFilters() {
    setSearch("");
    setLocationFilter(
      "all"
    );
    setStatusFilter("all");
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ========================================================
          رأس الجدول
      ========================================================= */}

      <div className="border-b border-slate-100 p-4 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              أرصدة المنتجات
            </h2>

            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              {formatNumber(
                filteredInventory.length
              )}{" "}
              رصيد — البحث يشمل جميع المنتجات المحملة.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {/* البحث */}

            <div className="relative sm:w-80">
              <Search
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="ابحث بالمنتج أو SKU أو الباركود..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-10 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="مسح البحث"
                >
                  <X
                    size={15}
                  />
                </button>
              )}
            </div>

            {/* المواقع — للأدمن فقط */}

            {canViewAllLocations && (
              <select
                value={
                  locationFilter
                }
                onChange={(
                  event
                ) =>
                  setLocationFilter(
                    event.target
                      .value
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              >
                <option value="all">
                  جميع المواقع
                </option>

                {locations.map(
                  (
                    location
                  ) => (
                    <option
                      key={
                        location.id
                      }
                      value={
                        location.id
                      }
                    >
                      {
                        location.name
                      }{" "}
                      (
                      {
                        location.code
                      }
                      )
                    </option>
                  )
                )}
              </select>
            )}

            {/* الحالة */}

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target
                    .value
                )
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
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

        {/* الإحصائيات */}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
            {formatNumber(
              filteredInventory.length
            )}{" "}
            رصيد
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {formatNumber(
              totalAvailable
            )}{" "}
            متاح
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {formatNumber(
              totalReserved
            )}{" "}
            محجوز
          </span>

          {(search ||
            locationFilter !==
              "all" ||
            statusFilter !==
              "all") && (
            <button
              type="button"
              onClick={
                clearFilters
              }
              className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              <X size={13} />
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* ========================================================
          لا توجد نتائج
      ========================================================= */}

      {filteredInventory.length ===
      0 ? (
        <div className="px-6 py-20 text-center">
          <Package
            size={38}
            className="mx-auto mb-3 text-slate-300"
          />

          <p className="font-semibold text-slate-700">
            لا توجد نتائج
          </p>

          <p className="mt-1 text-sm text-slate-400">
            جرّب تغيير البحث أو الفلاتر.
          </p>
        </div>
      ) : (
        <>
          {/* ======================================================
              جدول الكمبيوتر
          ======================================================= */}

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1200px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    المنتج
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    SKU
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    الباركود
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    الموقع
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    المتاح
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    المحجوز
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    الحد الأدنى
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    الحد الأعلى
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    آخر جرد
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold text-slate-500">
                    الحالة
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map(
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
                      available <=
                      0;

                    const isLow =
                      !isOut &&
                      minimum > 0 &&
                      available <=
                        minimum;

                    const barcode =
                      barcodeMap[
                        item.product_id
                      ] ?? null;

                    return (
                      <tr
                        key={
                          item.id
                        }
                        className="transition-colors hover:bg-teal-50/30"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                              <Package
                                size={
                                  17
                                }
                              />
                            </div>

                            <p className="max-w-[260px] truncate font-semibold text-slate-800">
                              {item
                                .products
                                ?.name ??
                                "—"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
                            {item
                              .products
                              ?.sku ??
                              "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-500">
                          {barcode ??
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-700">
                            {item
                              .locations
                              ?.name ??
                              "—"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">
                            {item
                              .locations
                              ?.code ??
                              ""}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`text-base font-bold ${
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

                        <td className="px-5 py-4 font-medium text-slate-600">
                          {formatNumber(
                            reserved
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatNumber(
                            minimum
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {item.maximum_quantity ===
                          null
                            ? "غير محدد"
                            : formatNumber(
                                Number(
                                  item.maximum_quantity
                                )
                              )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            item.last_count_date
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {isOut ? (
                            <StatusBadge
                              danger
                              icon={
                                <AlertTriangle
                                  size={
                                    13
                                  }
                                />
                              }
                              text="نافد"
                            />
                          ) : isLow ? (
                            <StatusBadge
                              warning
                              icon={
                                <AlertTriangle
                                  size={
                                    13
                                  }
                                />
                              }
                              text="منخفض"
                            />
                          ) : (
                            <StatusBadge
                              icon={
                                <CheckCircle2
                                  size={
                                    13
                                  }
                                />
                              }
                              text="متوفر"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {/* ======================================================
              كروت الجوال
              
              نفس filteredInventory بالكامل.
              لا يوجد Pagination.
          ======================================================= */}

          <div className="divide-y divide-slate-100 lg:hidden">
            {filteredInventory.map(
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
                  available <=
                  0;

                const isLow =
                  !isOut &&
                  minimum > 0 &&
                  available <=
                    minimum;

                const barcode =
                  barcodeMap[
                    item.product_id
                  ] ?? null;

                return (
                  <div
                    key={
                      item.id
                    }
                    className="p-4"
                  >
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                          <Package
                            size={
                              20
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-slate-800">
                            {item
                              .products
                              ?.name ??
                              "—"}
                          </p>

                          <p className="mt-1 font-mono text-xs text-slate-400">
                            SKU:{" "}
                            {item
                              .products
                              ?.sku ??
                              "—"}
                          </p>

                          {barcode && (
                            <p className="mt-1 font-mono text-xs text-slate-400">
                              باركود:{" "}
                              {
                                barcode
                              }
                            </p>
                          )}
                        </div>

                        {isOut ? (
                          <StatusBadge
                            danger
                            text="نافد"
                          />
                        ) : isLow ? (
                          <StatusBadge
                            warning
                            text="منخفض"
                          />
                        ) : (
                          <StatusBadge
                            text="متوفر"
                          />
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <InfoBox
                          label="الموقع"
                          value={
                            item
                              .locations
                              ?.name ??
                            "—"
                          }
                        />

                        <InfoBox
                          label="المتاح"
                          value={formatNumber(
                            available
                          )}
                        />

                        <InfoBox
                          label="المحجوز"
                          value={formatNumber(
                            reserved
                          )}
                        />

                        <InfoBox
                          label="الحد الأدنى"
                          value={formatNumber(
                            minimum
                          )}
                        />

                        <InfoBox
                          label="الحد الأعلى"
                          value={
                            item.maximum_quantity ===
                            null
                              ? "غير محدد"
                              : formatNumber(
                                  Number(
                                    item.maximum_quantity
                                  )
                                )
                          }
                        />

                        <InfoBox
                          label="آخر جرد"
                          value={formatDate(
                            item.last_count_date
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* ==============================================================
   Status Badge
================================================================ */

function StatusBadge({
  icon,
  text,
  danger = false,
  warning = false,
}: {
  icon?: React.ReactNode;
  text: string;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
        danger
          ? "bg-red-50 text-red-700"
          : warning
            ? "bg-orange-50 text-orange-700"
            : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {icon}
      {text}
    </span>
  );
}

/* ==============================================================
   Mobile Info
================================================================ */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}