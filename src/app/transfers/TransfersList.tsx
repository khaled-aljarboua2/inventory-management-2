"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Ban,
  Boxes,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  PackageCheck,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import RealtimeRefresh from "@/components/realtime/RealtimeRefresh";
import TransferBalances from "./TransferBalances";
import TransferModal from "./TransferModal";
import { deleteTransfer } from "./actions";

type Location = {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
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

type TransferCounts = {
  all: number;
  pending: number;
  approved: number;
  preparing: number;
  shipped: number;
  received: number;
  cancelled: number;
};

type Props = {
  initialTransfers: Transfer[];
  initialTotal: number;
  initialCounts: TransferCounts;
  locations: Location[];
  currentLocationId: string | null;
  isGeneralManager: boolean;
};

const ROWS_PER_PAGE = 50;

const statusConfig: Record<
  string,
  { label: string; className: string; icon: LucideIcon }
> = {
  draft: {
    label: "مسودة",
    className: "bg-slate-100 text-slate-600",
    icon: FileText,
  },
  pending: {
    label: "معلقة",
    className: "bg-amber-50 text-amber-700",
    icon: Clock3,
  },
  approved: {
    label: "معتمدة",
    className: "bg-teal-50 text-teal-700",
    icon: CheckCircle2,
  },
  preparing: {
    label: "قيد التجهيز",
    className: "bg-purple-50 text-purple-700",
    icon: PackageCheck,
  },
  shipped: {
    label: "تم الشحن",
    className: "bg-indigo-50 text-indigo-700",
    icon: Truck,
  },
  received: {
    label: "تم الاستلام",
    className: "bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "ملغي",
    className: "bg-red-50 text-red-700",
    icon: Ban,
  },
};

export default function TransfersList({
  initialTransfers,
  initialTotal,
  initialCounts,
  locations,
  currentLocationId,
  isGeneralManager,
}: Props) {
  const [transfers, setTransfers] = useState(initialTransfers);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"transfers" | "balances">("transfers");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    if (
      firstLoad &&
      page === 1 &&
      deferredSearch.trim() === "" &&
      statusFilter === "all"
    ) {
      setFirstLoad(false);
      return;
    }

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
            status: statusFilter,
          });

          const response = await fetch(`/api/transfers/list?${params.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error ?? "تعذر تحميل طلبات النقل.");
          }

          if (!controller.signal.aborted) {
            setTransfers(result.transfers ?? []);
            setTotal(Number(result.total ?? 0));
          }
        } catch (caughtError) {
          if (controller.signal.aborted) return;
          setTransfers([]);
          setTotal(0);
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "تعذر تحميل طلبات النقل."
          );
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      deferredSearch.trim() ? 350 : 0
    );

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredSearch, statusFilter, page, firstLoad]);

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("ar-SA", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Riyadh",
    }).format(new Date(date));
  }

  async function handleDelete(transferId: string) {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف طلب النقل الملغى؟\n\nلا يمكن التراجع عن هذه العملية."
    );

    if (!confirmed) return;

    setDeletingId(transferId);

    try {
      const result = await deleteTransfer(transferId);

      if (!result.success) {
        window.alert(result.error ?? "تعذر حذف طلب النقل.");
        return;
      }

      window.location.reload();
    } catch (caughtError) {
      window.alert(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء الحذف."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * ROWS_PER_PAGE, total);

  return (
    <>
      <RealtimeRefresh table="transfer_requests" />
      <RealtimeRefresh table="transfer_items" channelName="transfers-list-items" />

      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("transfers")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "transfers"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <ArrowLeftRight size={17} />
          طلبات النقل
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("balances")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "balances"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`}
        >
          <Boxes size={17} />
          الأرصدة
        </button>
      </div>

      {activeTab === "balances" ? (
        <TransferBalances />
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 md:grid-cols-3 xl:grid-cols-7">
            <StatusCard
              label="الكل"
              count={initialCounts.all}
              active={statusFilter === "all"}
              onClick={() => {
                setStatusFilter("all");
                setPage(1);
              }}
              icon={<ArrowLeftRight size={21} />}
            />
            <StatusCard
              label="معلقة"
              count={initialCounts.pending}
              active={statusFilter === "pending"}
              onClick={() => {
                setStatusFilter("pending");
                setPage(1);
              }}
              icon={<Clock3 size={21} />}
            />
            <StatusCard
              label="معتمدة"
              count={initialCounts.approved}
              active={statusFilter === "approved"}
              onClick={() => {
                setStatusFilter("approved");
                setPage(1);
              }}
              icon={<CheckCircle2 size={21} />}
            />
            <StatusCard
              label="قيد التجهيز"
              count={initialCounts.preparing}
              active={statusFilter === "preparing"}
              onClick={() => {
                setStatusFilter("preparing");
                setPage(1);
              }}
              icon={<PackageCheck size={21} />}
            />
            <StatusCard
              label="تم الشحن"
              count={initialCounts.shipped}
              active={statusFilter === "shipped"}
              onClick={() => {
                setStatusFilter("shipped");
                setPage(1);
              }}
              icon={<Truck size={21} />}
            />
            <StatusCard
              label="تم الاستلام"
              count={initialCounts.received}
              active={statusFilter === "received"}
              onClick={() => {
                setStatusFilter("received");
                setPage(1);
              }}
              icon={<CheckCircle2 size={21} />}
            />
            <StatusCard
              label="ملغاة"
              count={initialCounts.cancelled}
              active={statusFilter === "cancelled"}
              onClick={() => {
                setStatusFilter("cancelled");
                setPage(1);
              }}
              icon={<Ban size={21} />}
            />
          </div>

          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">سجل طلبات النقل</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {total.toLocaleString("ar-SA")} طلب مطابق
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative sm:w-80">
                  <Search
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="ابحث برقم الطلب أو الموقع..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-10 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-label="مسح البحث"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-600 hover:shadow-lg hover:shadow-teal-100"
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

          {error ? (
            <div className="m-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <div className="relative">
              {loading ? (
                <div className="absolute inset-0 z-10 flex min-h-60 items-center justify-center bg-white/70 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    <Loader2 size={17} className="animate-spin text-teal-600" />
                    جاري تحميل الطلبات...
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-right">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500">الطلب</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500">المصدر</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500">الوجهة</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500">الأصناف</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500">الحالة</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500">التاريخ</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500">الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-20 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                              <ArrowLeftRight size={28} />
                            </div>
                            <p className="font-semibold text-slate-700">لا توجد طلبات نقل</p>
                            <p className="mt-1 text-sm text-slate-400">
                              لم يتم العثور على طلبات مطابقة.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transfers.map((transfer) => {
                        const status = statusConfig[transfer.status] ?? statusConfig.draft;
                        const StatusIcon = status.icon;
                        const isDeleting = deletingId === transfer.id;

                        return (
                          <tr
                            key={transfer.id}
                            className="group transition hover:bg-teal-50/30"
                          >
                            <td className="px-6 py-5">
                              <Link
                                href={`/transfers/${transfer.id}`}
                                className="font-mono text-sm font-bold text-slate-800 transition hover:text-teal-600"
                              >
                                {transfer.request_number}
                              </Link>
                              <p className="mt-1 text-xs text-slate-400">نقل مخزون</p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="font-medium text-slate-800">
                                {transfer.from_location?.name ?? "—"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {transfer.from_location?.code ?? ""}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <p className="font-medium text-slate-800">
                                {transfer.to_location?.name ?? "—"}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {transfer.to_location?.code ?? ""}
                              </p>
                            </td>
                            <td className="px-6 py-5">
                              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                                {transfer.items_count} أصناف
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                              >
                                <StatusIcon size={14} />
                                {status.label}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-500">
                              {formatDate(transfer.request_date)}
                            </td>
                            <td className="px-6 py-5">
                              {transfer.status === "cancelled" ? (
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(transfer.id)}
                                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isDeleting ? (
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                      حذف...
                                    </span>
                                  ) : (
                                    <>
                                      <Trash2 size={14} />
                                      حذف
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {total > 0 ? (
                <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    عرض {pageStart.toLocaleString("ar-SA")}–{pageEnd.toLocaleString("ar-SA")} من{" "}
                    {total.toLocaleString("ar-SA")}
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
              ) : null}
            </div>
          )}
        </section>
      )}

      {modalOpen ? (
        <TransferModal
          locations={locations}
          currentLocationId={currentLocationId}
          isGeneralManager={isGeneralManager}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}

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
        active ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
        </div>
        <div className="text-slate-400">{icon}</div>
      </div>
    </button>
  );
}
