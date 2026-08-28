"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, MapPin, Package, Search, X } from "lucide-react";

type Location = {
  id: string;
  name: string;
  code: string | null;
};

type Balance = {
  id: string;
  product_id: string;
  location_id: string;
  available_quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
  } | null;
  location: Location | null;
  barcodes: string[];
};

const ROWS_PER_PAGE = 50;

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function TransferBalances() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let cancelled = false;

    async function loadBalances() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/transfers/balances", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ?? "تعذر تحميل أرصدة المنتجات."
          );
        }

        if (!cancelled) {
          setBalances(result.balances ?? []);
          setLocations(result.locations ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "تعذر تحميل أرصدة المنتجات."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadBalances();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBalances = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return balances.filter((balance) => {
      const matchesLocation =
        locationId === "all" || balance.location_id === locationId;

      if (!matchesLocation) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        balance.product?.name.toLowerCase().includes(query) ||
        balance.product?.sku.toLowerCase().includes(query) ||
        balance.barcodes.some((barcode) =>
          barcode.toLowerCase().includes(query)
        )
      );
    });
  }, [balances, deferredSearch, locationId]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBalances.length / ROWS_PER_PAGE)
  );
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ROWS_PER_PAGE;
  const visibleBalances = filteredBalances.slice(
    pageStart,
    pageStart + ROWS_PER_PAGE
  );

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateLocation(value: string) {
    setLocationId(value);
    setPage(1);
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-l from-teal-50/70 via-white to-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-sm shadow-teal-200">
              <Boxes size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                أرصدة المنتجات
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                الرصيد الحالي حسب المنتج والموقع.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-80">
              <Search
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                placeholder="ابحث بالمنتج أو SKU أو الباركود..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-10 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              />

              {search ? (
                <button
                  type="button"
                  onClick={() => updateSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="مسح البحث"
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>

            <div className="relative sm:w-56">
              <MapPin
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <select
                value={locationId}
                onChange={(event) => updateLocation(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              >
                <option value="all">كل المواقع</option>

                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                    {location.code ? ` — ${location.code}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={19} className="animate-spin text-teal-600" />
            جاري تحميل الأرصدة...
          </div>
        </div>
      ) : error ? (
        <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : visibleBalances.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <Package size={32} className="mx-auto text-slate-300" />
          <p className="mt-4 font-semibold text-slate-700">
            لا توجد أرصدة مطابقة
          </p>
          <p className="mt-1 text-sm text-slate-400">
            جرّب تغيير البحث أو فلتر الموقع.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    المنتج
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    SKU / رقم المنتج
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    الباركود
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    الموقع / الفرع
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    الرصيد الحالي
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleBalances.map((balance) => (
                  <tr
                    key={balance.id}
                    className="transition-colors hover:bg-teal-50/40"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {balance.product?.name ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {balance.product?.sku ?? "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {balance.barcodes.length > 0
                        ? balance.barcodes.join(" · ")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">
                        {balance.location?.name ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {balance.location?.code ?? ""}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        dir="ltr"
                        className="font-mono text-sm font-bold tabular-nums text-slate-900"
                      >
                        {formatQuantity(balance.available_quantity)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              عرض {pageStart + 1}–
              {Math.min(pageStart + ROWS_PER_PAGE, filteredBalances.length)} من {filteredBalances.length}
            </span>

            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  السابق
                </button>
                <span className="font-mono tabular-nums text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  التالي
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
