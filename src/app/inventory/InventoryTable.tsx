"use client";

import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
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
  unit_name: string;
  barcodes: string[];
  products: {
    id: string;
    name: string;
    sku: string;
  } | null;
  locations: {
    id: string;
    name: string;
    code: string;
  } | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  locations: Location[];
  canViewAllLocations: boolean;
};

const ROWS_PER_PAGE = 50;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number, unitName: string) {
  return `${formatNumber(value)} ${unitName}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "لم يتم الجرد";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeZone: "Asia/Riyadh",
  }).format(new Date(value));
}

export default function InventoryTable({
  locations,
  canViewAllLocations,
}: Props) {
  const [inventory, setInventory] = useState<InventoryBalance[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        setLoading(true);
        setError("");

        try {
          const params = new URLSearchParams({
            page: String(page),
            limit: String(ROWS_PER_PAGE),
            q: deferredSearch.trim(),
            location_id: locationFilter,
            status: statusFilter,
          });

          const response = await fetch(
            `/api/inventory/balances?${params.toString()}`,
            {
              cache: "no-store",
              signal: controller.signal,
            }
          );
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error ?? "تعذر تحميل أرصدة المخزون.");
          }

          if (!controller.signal.aborted) {
            setInventory(result.balances ?? []);
            setTotal(Number(result.total ?? 0));
          }
        } catch (caughtError) {
          if (controller.signal.aborted) return;

          setInventory([]);
          setTotal(0);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "تعذر تحميل أرصدة المخزون."
          );
        } finally {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        }
      },
      deferredSearch.trim() ? 350 : 0
    );

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredSearch, locationFilter, statusFilter, page]);

  function clearFilters() {
    setSearch("");
    setLocationFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  const hasActiveFilters =
    search.trim() !== "" || locationFilter !== "all" || statusFilter !== "all";
  const totalPages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ROWS_PER_PAGE, total);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">أرصدة المنتجات</h2>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              {formatNumber(total)} رصيد — البحث يشمل كامل البيانات بالاسم وSKU وجميع الباركودات.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-80">
              <Search
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="ابحث بالاسم أو SKU أو الباركود..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-10 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="مسح البحث"
                >
                  <X size={15} />
                </button>
              ) : null}
            </div>

            {canViewAllLocations ? (
              <select
                value={locationFilter}
                onChange={(event) => {
                  setLocationFilter(event.target.value);
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              >
                <option value="all">جميع المواقع</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.code})
                  </option>
                ))}
              </select>
            ) : null}

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
            >
              <option value="all">جميع الحالات</option>
              <option value="available">متوفر</option>
              <option value="low">منخفض</option>
              <option value="out">نافد</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
            {formatNumber(total)} رصيد
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
            50 سجل في الصفحة
          </span>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              <X size={13} />
              مسح الفلاتر
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : loading && inventory.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={19} className="animate-spin text-teal-600" />
            جاري تحميل الأرصدة...
          </div>
        </div>
      ) : inventory.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <Package size={38} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">لا توجد نتائج</p>
          <p className="mt-1 text-sm text-slate-400">جرّب تغيير البحث أو الفلاتر.</p>
        </div>
      ) : (
        <div className="relative">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <Loader2 size={17} className="animate-spin text-teal-600" />
                جاري تحميل النتائج...
              </div>
            </div>
          ) : null}

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1320px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <TableHeading>المنتج</TableHeading>
                  <TableHeading>SKU</TableHeading>
                  <TableHeading>الباركود</TableHeading>
                  <TableHeading>الوحدة</TableHeading>
                  <TableHeading>الموقع</TableHeading>
                  <TableHeading>المتاح</TableHeading>
                  <TableHeading>المحجوز</TableHeading>
                  <TableHeading>الحد الأدنى</TableHeading>
                  <TableHeading>الحد الأعلى</TableHeading>
                  <TableHeading>آخر جرد</TableHeading>
                  <TableHeading>الحالة</TableHeading>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => (
                  <InventoryTableRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 lg:hidden">
            {inventory.map((item) => (
              <InventoryMobileCard key={item.id} item={item} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={total}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onPageChange={setPage}
          />
        </div>
      )}
    </section>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span>
        عرض {formatNumber(pageStart)}–{formatNumber(pageEnd)} من {formatNumber(totalItems)}
      </span>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            السابق
          </button>
          <span className="font-mono tabular-nums text-slate-600">
            {formatNumber(currentPage)} / {formatNumber(totalPages)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 transition hover:border-teal-200 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      ) : null}
    </div>
  );
}

function TableHeading({ children }: { children: ReactNode }) {
  return <th className="px-5 py-4 text-xs font-semibold text-slate-500">{children}</th>;
}

function InventoryTableRow({ item }: { item: InventoryBalance }) {
  const available = Number(item.available_quantity ?? 0);
  const reserved = Number(item.reserved_quantity ?? 0);
  const minimum = Number(item.minimum_quantity ?? 0);
  const isOut = available <= 0;
  const isLow = !isOut && minimum > 0 && available <= minimum;

  return (
    <tr className="transition-colors hover:bg-teal-50/30">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Package size={17} />
          </div>
          <p className="max-w-[240px] truncate font-semibold text-slate-800">
            {item.products?.name ?? "—"}
          </p>
        </div>
      </td>
      <td className="px-5 py-4">
        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
          {item.products?.sku ?? "—"}
        </span>
      </td>
      <td className="px-5 py-4">
        <BarcodeValue barcodes={item.barcodes} />
      </td>
      <td className="px-5 py-4">
        <span className="rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">
          {item.unit_name}
        </span>
      </td>
      <td className="px-5 py-4">
        <p className="font-medium text-slate-700">{item.locations?.name ?? "—"}</p>
        <p className="mt-0.5 text-xs text-slate-400">{item.locations?.code ?? ""}</p>
      </td>
      <td className="px-5 py-4">
        <Quantity
          value={available}
          unitName={item.unit_name}
          tone={isOut ? "danger" : isLow ? "warning" : "default"}
        />
      </td>
      <td className="px-5 py-4">
        <Quantity value={reserved} unitName={item.unit_name} />
      </td>
      <td className="px-5 py-4">
        <Quantity value={minimum} unitName={item.unit_name} />
      </td>
      <td className="px-5 py-4">
        {item.maximum_quantity === null ? (
          <span className="text-slate-500">غير محدد</span>
        ) : (
          <Quantity value={Number(item.maximum_quantity)} unitName={item.unit_name} />
        )}
      </td>
      <td className="px-5 py-4 text-sm text-slate-500">
        {formatDate(item.last_count_date)}
      </td>
      <td className="px-5 py-4">
        <StockStatus isOut={isOut} isLow={isLow} />
      </td>
    </tr>
  );
}

function InventoryMobileCard({ item }: { item: InventoryBalance }) {
  const available = Number(item.available_quantity ?? 0);
  const reserved = Number(item.reserved_quantity ?? 0);
  const minimum = Number(item.minimum_quantity ?? 0);
  const isOut = available <= 0;
  const isLow = !isOut && minimum > 0 && available <= minimum;

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <Package size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-800">{item.products?.name ?? "—"}</p>
            <p className="mt-1 font-mono text-xs text-slate-400">
              SKU: {item.products?.sku ?? "—"}
            </p>
            <div className="mt-1">
              <BarcodeValue barcodes={item.barcodes} />
            </div>
          </div>
          <StockStatus isOut={isOut} isLow={isLow} compact />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoBox label="الموقع" value={item.locations?.name ?? "—"} />
          <InfoBox label="الوحدة" value={item.unit_name} accent />
          <InfoBox label="المتاح" value={formatQuantity(available, item.unit_name)} />
          <InfoBox label="المحجوز" value={formatQuantity(reserved, item.unit_name)} />
          <InfoBox label="الحد الأدنى" value={formatQuantity(minimum, item.unit_name)} />
          <InfoBox
            label="الحد الأعلى"
            value={
              item.maximum_quantity === null
                ? "غير محدد"
                : formatQuantity(Number(item.maximum_quantity), item.unit_name)
            }
          />
          <InfoBox label="آخر جرد" value={formatDate(item.last_count_date)} />
        </div>
      </div>
    </div>
  );
}

function BarcodeValue({ barcodes }: { barcodes: string[] }) {
  if (barcodes.length === 0) {
    return <span className="font-mono text-xs text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs text-slate-500">
      <span>{barcodes[0]}</span>
      {barcodes.length > 1 ? (
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-500">
          +{barcodes.length - 1}
        </span>
      ) : null}
    </div>
  );
}

function Quantity({
  value,
  unitName,
  tone = "default",
}: {
  value: number;
  unitName: string;
  tone?: "default" | "danger" | "warning";
}) {
  const textClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
        ? "text-orange-600"
        : "text-slate-900";

  return (
    <span
      dir="ltr"
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-sm font-bold tabular-nums ${textClass}`}
    >
      {formatNumber(value)}
      <span
        dir="rtl"
        className="rounded-md bg-slate-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-600"
      >
        {unitName}
      </span>
    </span>
  );
}

function StockStatus({
  isOut,
  isLow,
  compact = false,
}: {
  isOut: boolean;
  isLow: boolean;
  compact?: boolean;
}) {
  if (isOut) {
    return (
      <StatusBadge
        danger
        icon={compact ? undefined : <AlertTriangle size={13} />}
        text="نافد"
      />
    );
  }

  if (isLow) {
    return (
      <StatusBadge
        warning
        icon={compact ? undefined : <AlertTriangle size={13} />}
        text="منخفض"
      />
    );
  }

  return (
    <StatusBadge
      icon={compact ? undefined : <CheckCircle2 size={13} />}
      text="متوفر"
    />
  );
}

function StatusBadge({
  icon,
  text,
  danger = false,
  warning = false,
}: {
  icon?: ReactNode;
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

function InfoBox({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={accent ? "rounded-xl bg-teal-50 p-3" : "rounded-xl bg-slate-50 p-3"}>
      <p className="text-[11px] text-slate-400">{label}</p>
      <p
        className={
          accent
            ? "mt-1 truncate text-sm font-semibold text-teal-700"
            : "mt-1 truncate text-sm font-semibold text-slate-700"
        }
      >
        {value}
      </p>
    </div>
  );
}
