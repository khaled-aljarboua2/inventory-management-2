"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  FileText,
  PackageCheck,
  Search,
  Truck,
  X,
  Ban,
  Trash2,
} from "lucide-react";

import TransferModal from "./TransferModal";
import { deleteTransfer } from "./actions";

type Location = {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  is_active: boolean;
  product_units: any[];
};

type Transfer = {
  id: string;
  request_number: string;
  from_location_id: string;
  to_location_id: string;
  status: string;
  request_date: string;
  notes: string | null;

  from_location: Location | null;
  to_location: Location | null;

  items_count: number;
};

type Props = {
  transfers: Transfer[];
  locations: Location[];
  products: Product[];

  currentLocationId: string | null;
  isGeneralManager: boolean;
};

const statusConfig: Record<
  string,
  {
    label: string;
    className: string;
    icon: any;
  }
> = {
  draft: {
    label: "مسودة",
    className:
      "bg-slate-100 text-slate-600",
    icon: FileText,
  },

  pending: {
    label: "معلقة",
    className:
      "bg-amber-50 text-amber-700",
    icon: Clock3,
  },

  approved: {
    label: "معتمدة",
    className:
      "bg-blue-50 text-blue-700",
    icon: CheckCircle2,
  },

  preparing: {
    label: "قيد التجهيز",
    className:
      "bg-purple-50 text-purple-700",
    icon: PackageCheck,
  },

  shipped: {
    label: "تم الشحن",
    className:
      "bg-indigo-50 text-indigo-700",
    icon: Truck,
  },

  received: {
    label: "تم الاستلام",
    className:
      "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },

  cancelled: {
    label: "ملغي",
    className:
      "bg-red-50 text-red-700",
    icon: Ban,
  },
};

export default function TransfersList({
  transfers,
  locations,
  products,
  currentLocationId,
  isGeneralManager,
}: Props) {
  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: transfers.length,

      pending: transfers.filter(
        (item) =>
          item.status === "pending"
      ).length,

      approved: transfers.filter(
        (item) =>
          item.status === "approved"
      ).length,

      preparing: transfers.filter(
        (item) =>
          item.status === "preparing"
      ).length,

      shipped: transfers.filter(
        (item) =>
          item.status === "shipped"
      ).length,

      received: transfers.filter(
        (item) =>
          item.status === "received"
      ).length,

      cancelled: transfers.filter(
        (item) =>
          item.status === "cancelled"
      ).length,
    };
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return transfers.filter(
      (transfer) => {
        const matchesSearch =
          !query ||
          transfer.request_number
            .toLowerCase()
            .includes(query) ||
          transfer.from_location?.name
            ?.toLowerCase()
            .includes(query) ||
          transfer.to_location?.name
            ?.toLowerCase()
            .includes(query);

        const matchesStatus =
          statusFilter === "all" ||
          transfer.status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );
  }, [
    transfers,
    search,
    statusFilter,
  ]);

  function formatDate(
    date: string
  ) {
    return new Intl.DateTimeFormat(
      "ar-SA",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(new Date(date));
  }

  async function handleDelete(
    transferId: string
  ) {
    const confirmed =
      window.confirm(
        "هل أنت متأكد من حذف طلب النقل الملغى؟\n\nلا يمكن التراجع عن هذه العملية."
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(transferId);

    try {
      const result =
        await deleteTransfer(
          transferId
        );

      if (!result.success) {
        window.alert(
          result.error ??
            "تعذر حذف طلب النقل."
        );

        return;
      }

      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء الحذف."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* =====================================================
            الحالات
        ====================================================== */}

        <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 md:grid-cols-3 xl:grid-cols-7">
          <StatusCard
            label="الكل"
            count={counts.all}
            active={
              statusFilter === "all"
            }
            onClick={() =>
              setStatusFilter("all")
            }
            icon={
              <ArrowLeftRight
                size={21}
              />
            }
          />

          <StatusCard
            label="معلقة"
            count={counts.pending}
            active={
              statusFilter ===
              "pending"
            }
            onClick={() =>
              setStatusFilter(
                "pending"
              )
            }
            icon={
              <Clock3 size={21} />
            }
          />

          <StatusCard
            label="معتمدة"
            count={counts.approved}
            active={
              statusFilter ===
              "approved"
            }
            onClick={() =>
              setStatusFilter(
                "approved"
              )
            }
            icon={
              <CheckCircle2
                size={21}
              />
            }
          />

          <StatusCard
            label="قيد التجهيز"
            count={counts.preparing}
            active={
              statusFilter ===
              "preparing"
            }
            onClick={() =>
              setStatusFilter(
                "preparing"
              )
            }
            icon={
              <PackageCheck
                size={21}
              />
            }
          />

          <StatusCard
            label="تم الشحن"
            count={counts.shipped}
            active={
              statusFilter ===
              "shipped"
            }
            onClick={() =>
              setStatusFilter(
                "shipped"
              )
            }
            icon={
              <Truck size={21} />
            }
          />

          <StatusCard
            label="تم الاستلام"
            count={counts.received}
            active={
              statusFilter ===
              "received"
            }
            onClick={() =>
              setStatusFilter(
                "received"
              )
            }
            icon={
              <CheckCircle2
                size={21}
              />
            }
          />

          <StatusCard
            label="ملغاة"
            count={counts.cancelled}
            active={
              statusFilter ===
              "cancelled"
            }
            onClick={() =>
              setStatusFilter(
                "cancelled"
              )
            }
            icon={
              <Ban size={21} />
            }
          />
        </div>

        {/* =====================================================
            Toolbar
        ====================================================== */}

        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                سجل طلبات النقل
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredTransfers.length}{" "}
                طلب
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* البحث */}
              <div className="relative sm:w-80">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="ابحث برقم الطلب أو الموقع..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch("")
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* طلب جديد */}
              <button
                type="button"
                onClick={() =>
                  setModalOpen(true)
                }
                className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-100"
              >
                <ArrowLeftRight
                  size={18}
                  className="transition-transform group-hover:-rotate-12"
                />

                طلب نقل جديد
              </button>
            </div>
          </div>
        </div>

        {/* =====================================================
            الجدول
        ====================================================== */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الطلب
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  المصدر
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الوجهة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الأصناف
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الحالة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  التاريخ
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTransfers.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-20 text-center"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <ArrowLeftRight
                          size={28}
                        />
                      </div>

                      <p className="font-semibold text-slate-700">
                        لا توجد طلبات نقل
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        لم يتم العثور على طلبات مطابقة.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(
                  (transfer) => {
                    const status =
                      statusConfig[
                        transfer.status
                      ] ??
                      statusConfig.draft;

                    const StatusIcon =
                      status.icon;

                    const isDeleting =
                      deletingId ===
                      transfer.id;

                    return (
                      <tr
                        key={transfer.id}
                        className="group transition hover:bg-blue-50/30"
                      >
                        <td className="px-6 py-5">
                          <Link
                            href={`/transfers/${transfer.id}`}
                            className="font-mono text-sm font-bold text-slate-800 transition hover:text-blue-600"
                          >
                            {
                              transfer.request_number
                            }
                          </Link>

                          <p className="mt-1 text-xs text-slate-400">
                            نقل مخزون
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-medium text-slate-800">
                            {transfer
                              .from_location
                              ?.name ??
                              "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {
                              transfer
                                .from_location
                                ?.code
                            }
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-medium text-slate-800">
                            {transfer
                              .to_location
                              ?.name ??
                              "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {
                              transfer
                                .to_location
                                ?.code
                            }
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                            {
                              transfer.items_count
                            }{" "}
                            أصناف
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                          >
                            <StatusIcon
                              size={14}
                            />

                            {
                              status.label
                            }
                          </span>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-500">
                          {formatDate(
                            transfer.request_date
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {transfer.status ===
                          "cancelled" ? (
                            <button
                              type="button"
                              disabled={
                                isDeleting
                              }
                              onClick={() =>
                                handleDelete(
                                  transfer.id
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                  حذف...
                                </span>
                              ) : (
                                <>
                                  <Trash2
                                    size={14}
                                  />
                                  حذف
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-300">
                              —
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
      </section>

      {/* =====================================================
          نافذة إنشاء طلب النقل
      ====================================================== */}

      {modalOpen && (
        <TransferModal
          locations={locations}
          products={products}
          currentLocationId={
            currentLocationId
          }
          isGeneralManager={
            isGeneralManager
          }
          onClose={() =>
            setModalOpen(false)
          }
        />
      )}
    </>
  );
}

/* ============================================================
   بطاقة الحالة
============================================================ */

function StatusCard({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-right transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
        active
          ? "border-blue-200 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {count}
          </p>
        </div>

        <div className="text-slate-400">
          {icon}
        </div>
      </div>
    </button>
  );
}