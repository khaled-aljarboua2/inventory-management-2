import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";
import TransferActions from "./TransferActions";
import RealtimeRefresh from "@/components/realtime/RealtimeRefresh";
import {
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  Clock3,
  Package,
  PackageCheck,
  Truck,
  Ban,
} from "lucide-react";

type ProductUnit = {
  id: string;
  unit_id: string;
  conversion_factor: number;
  is_base: boolean;

  units:
    | {
        id: string;
        name: string;
        symbol: string | null;
      }
    | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  is_active: boolean;
  product_units: ProductUnit[];
  barcodes: string[];
};

type RawProduct = Omit<Product, "product_units" | "barcodes"> & {
  product_units?: Array<
    Omit<ProductUnit, "units"> & {
      units: ProductUnit["units"] | ProductUnit["units"][];
    }
  >;
  product_barcodes?: Array<{
    barcode: string | null;
  }>;
};

type TransferItem = {
  id: string;
  product_id: string;
  unit_id: string;
  requested_quantity: number;
  approved_quantity: number | null;
  shipped_quantity: number | null;
  received_quantity: number | null;
  notes: string | null;

  products: Product | null;

  units:
    | {
        id: string;
        name: string;
        symbol: string | null;
      }
    | null;
};

type Transfer = {
  id: string;
  request_number: string;
  from_location_id: string;
  to_location_id: string;
  status: string;
  request_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;

  from_location:
    | {
        id: string;
        name: string;
        code: string;
        type: string;
        company_id: string;
      }
    | null;

  to_location:
    | {
        id: string;
        name: string;
        code: string;
        type: string;
        company_id: string;
      }
    | null;

  transfer_items: TransferItem[];
};

function normalizeProduct(product: RawProduct | null): Product | null {
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    is_active: product.is_active !== false,
    product_units: (product.product_units ?? []).map((unit) => ({
      ...unit,
      units: firstRelation(unit.units) as ProductUnit["units"],
    })),
    barcodes: (product.product_barcodes ?? [])
      .map((barcode) => barcode.barcode?.trim())
      .filter((barcode: string | undefined): barcode is string => Boolean(barcode)),
  };
}

const statusConfig: Record<
  string,
  {
    label: string;
    className: string;
    icon: React.ElementType;
  }
> = {
  pending: {
    label: "معلقة",
    className:
      "bg-amber-50 text-amber-700",
    icon: Clock3,
  },

  approved: {
    label: "معتمدة",
    className:
      "bg-teal-50 text-teal-700",
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

  draft: {
    label: "مسودة",
    className:
      "bg-slate-100 text-slate-600",
    icon: Package,
  },
};

export default async function TransferDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          يجب تسجيل الدخول أولًا.
        </div>
      </DashboardLayout>
    );
  }

  const {
    data: dbUser,
    error: userError,
  } = await supabase
    .from("users")
    .select(
      "id, company_id, is_active"
    )
    .eq(
      "auth_user_id",
      user.id
    )
    .eq(
      "is_active",
      true
    )
    .single();

  if (userError || !dbUser) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          لم يتم العثور على المستخدم في النظام.
        </div>
      </DashboardLayout>
    );
  }

  const {
    data: transfer,
    error: transferError,
  } = await supabase
    .from("transfer_requests")
    .select(`
        id,
        request_number,
        from_location_id,
        to_location_id,
        status,
        request_date,
        notes,
        created_at,
        updated_at,

        from_location:locations!transfer_requests_from_location_id_fkey (
          id,
          name,
          code,
          type,
          company_id
        ),

        to_location:locations!transfer_requests_to_location_id_fkey (
          id,
          name,
          code,
          type,
          company_id
        ),

        transfer_items (
          id,
          product_id,
          unit_id,
          requested_quantity,
          approved_quantity,
          shipped_quantity,
          received_quantity,
          notes,

          products (
            id,
            name,
            sku,
            is_active,

            product_units (
              id,
              unit_id,
              conversion_factor,
              is_base,

              units (
                id,
                name,
                symbol
              )
            ),

            product_barcodes (
              barcode
            )
          ),

          units (
            id,
            name,
            symbol
          )
        )
      `)
    .eq(
      "id",
      id
    )
    .single();

  if (
    transferError ||
    !transfer
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="space-y-5"
        >
          <Link
            href="/transfers"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-600"
          >
            <ArrowRight size={16} />
            العودة إلى طلبات النقل
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            طلب النقل غير موجود أو تعذر تحميله.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const normalizedTransfer: Transfer = {
    ...transfer,
    from_location: firstRelation(
      transfer.from_location
    ),
    to_location: firstRelation(
      transfer.to_location
    ),
    transfer_items: (
      transfer.transfer_items ?? []
    ).map((item) => ({
      ...item,
      products: normalizeProduct(firstRelation(item.products)),
      units: firstRelation(
        item.units
      ),
    })),
  };

  const initialProducts = Array.from(
    new Map(
      normalizedTransfer.transfer_items
        .map((item) => item.products)
        .filter((product): product is Product => Boolean(product))
        .map((product) => [product.id, product])
    ).values()
  );

  const fromCompanyId =
    normalizedTransfer
      .from_location
      ?.company_id;

  const toCompanyId =
    normalizedTransfer
      .to_location
      ?.company_id;

  if (
    fromCompanyId !==
      dbUser.company_id ||
    toCompanyId !==
      dbUser.company_id
  ) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="space-y-5"
        >
          <Link
            href="/transfers"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-600"
          >
            <ArrowRight size={16} />
            العودة إلى طلبات النقل
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            ليس لديك صلاحية الوصول إلى طلب النقل هذا.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentStatus =
    String(
      normalizedTransfer.status
    ).toLowerCase();

  const status =
    statusConfig[
      currentStatus
    ] ??
    statusConfig.pending;

  const StatusIcon =
    status.icon;

  function formatDate(
    date: string
  ) {
    return new Intl.DateTimeFormat(
      "ar-SA",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(
      new Date(date)
    );
  }

  return (
    <DashboardLayout>
      {/* ============================================================
          REALTIME
          تحديث صفحة الطلب عند تغير الطلب أو الأصناف
      ============================================================ */}

      <RealtimeRefresh
        table="transfer_requests"
        channelName={`transfer-detail-request-${normalizedTransfer.id}`}
      />

      <RealtimeRefresh
        table="transfer_items"
        channelName={`transfer-detail-items-${normalizedTransfer.id}`}
      />

      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        {/* العودة */}

        <Link
          href="/transfers"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-teal-600"
        >
          <ArrowRight size={16} />
          العودة إلى طلبات النقل
        </Link>

        {/* رأس الطلب */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <ArrowLeftRight
                    size={23}
                  />
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    طلب نقل
                  </p>

                  <h1 className="mt-1 font-mono text-2xl font-bold text-slate-900">
                    {
                      normalizedTransfer.request_number
                    }
                  </h1>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                >
                  <StatusIcon
                    size={14}
                  />

                  {status.label}
                </span>

                <span className="text-sm text-slate-400">
                  {formatDate(
                    normalizedTransfer.request_date
                  )}
                </span>
              </div>
            </div>

            <TransferActions
              transferId={
                normalizedTransfer.id
              }
              status={
                currentStatus
              }
              items={
                normalizedTransfer.transfer_items
              }
              products={initialProducts}
              notes={
                normalizedTransfer.notes
              }
            />
          </div>
        </section>

        {/* مسار النقل */}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              مسار الطلب
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              الحالة الحالية ومسار تنفيذ عملية النقل.
            </p>
          </div>

          <TransferTimeline
            status={
              currentStatus
            }
          />
        </section>

        {/* المصدر والوجهة */}

        <div className="grid gap-5 md:grid-cols-2">
          <LocationCard
            title="الموقع المصدر"
            location={
              normalizedTransfer.from_location
            }
          />

          <LocationCard
            title="الموقع الوجهة"
            location={
              normalizedTransfer.to_location
            }
          />
        </div>

        {/* الأصناف */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-900">
              أصناف الطلب
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              تفاصيل الكميات المطلوبة والمراحل المنفذة.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-right">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    المنتج
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    الوحدة
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    المطلوب
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    المعتمد
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    المشحون
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                    المستلم
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {normalizedTransfer.transfer_items
                  ?.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm text-slate-400"
                    >
                      لا توجد أصناف في هذا الطلب.
                    </td>
                  </tr>
                ) : (
                  normalizedTransfer.transfer_items.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                              <Package
                                size={18}
                              />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-800">
                                {
                                  item
                                    .products
                                    ?.name
                                }
                              </p>

                              <p className="mt-1 font-mono text-xs text-slate-400">
                                SKU:{" "}
                                {
                                  item
                                    .products
                                    ?.sku
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600">
                          {item.units
                            ?.name ??
                            "—"}

                          {item.units
                            ?.symbol && (
                            <span className="mr-1 text-xs text-slate-400">
                              (
                              {
                                item
                                  .units
                                  .symbol
                              }
                              )
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5 font-bold text-slate-800">
                          {
                            item.requested_quantity
                          }
                        </td>

                        <td className="px-6 py-5 font-semibold text-teal-600">
                          {item
                            .approved_quantity ??
                            "—"}
                        </td>

                        <td className="px-6 py-5 font-semibold text-indigo-600">
                          {item
                            .shipped_quantity ??
                            "—"}
                        </td>

                        <td className="px-6 py-5 font-semibold text-emerald-600">
                          {item
                            .received_quantity ??
                            "—"}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* الملاحظات */}

        {normalizedTransfer.notes && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              ملاحظات الطلب
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {normalizedTransfer.notes}
            </p>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

/* بطاقة الموقع */

function LocationCard({
  title,
  location,
}: {
  title: string;
  location:
    | {
        id: string;
        name: string;
        code: string;
        type: string;
      }
    | null;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold text-slate-400">
        {title}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
          <PackageCheck
            size={22}
          />
        </div>

        <div>
          <p className="font-bold text-slate-900">
            {location?.name ??
              "—"}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {location?.code ??
              "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

/* Timeline */

function TransferTimeline({
  status,
}: {
  status: string;
}) {
  const steps = [
    {
      key: "pending",
      label: "إنشاء الطلب",
      description:
        "تم إنشاء طلب النقل",
    },
    {
      key: "approved",
      label: "الاعتماد",
      description:
        "تم اعتماد الطلب",
    },
    {
      key: "preparing",
      label: "التجهيز",
      description:
        "جاري تجهيز الأصناف",
    },
    {
      key: "shipped",
      label: "الشحن",
      description:
        "تم شحن الأصناف",
    },
    {
      key: "received",
      label: "الاستلام",
      description:
        "تم استلام الأصناف",
    },
  ];

  const statusOrder = [
    "pending",
    "approved",
    "preparing",
    "shipped",
    "received",
  ];

  const currentIndex =
    statusOrder.indexOf(
      status
    );

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <Ban size={20} />
        </div>

        <div>
          <p className="font-bold text-red-800">
            تم إلغاء طلب النقل
          </p>

          <p className="mt-1 text-sm text-red-600">
            لا يمكن تنفيذ مراحل إضافية على هذا الطلب.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {steps.map(
        (step, index) => {
          const completed =
            currentIndex >=
            index;

          const active =
            currentIndex ===
            index;

          return (
            <div
              key={step.key}
              className="relative"
            >
              <div
                className={`rounded-2xl border p-4 ${
                  active
                    ? "border-teal-200 bg-teal-50"
                    : completed
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      active
                        ? "bg-teal-600 text-white"
                        : completed
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <CheckCircle2
                      size={17}
                    />
                  </div>

                  <div>
                    <p
                      className={`text-sm font-bold ${
                        active
                          ? "text-teal-800"
                          : completed
                          ? "text-emerald-800"
                          : "text-slate-600"
                      }`}
                    >
                      {step.label}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      {
                        step.description
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
