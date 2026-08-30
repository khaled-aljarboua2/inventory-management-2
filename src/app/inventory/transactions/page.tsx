import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";
import TransactionsTable from "./TransactionsTable";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Warehouse,
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

export default async function TransactionsPage() {
  const supabase = await createClient();

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
    .select("id, company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
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
    data: rawTransactions,
    error: transactionsError,
  } = await supabase
    .from("stock_transactions")
    .select(
      `
        id,
        company_id,
        product_id,
        location_id,
        transaction_type,
        reference_type,
        reference_id,
        quantity,
        quantity_before,
        quantity_after,
        notes,
        user_id,
        created_at,

        products (
          id,
          name,
          sku
        ),

        locations (
          id,
          name,
          code
        ),

        users (
          id,
          full_name
        )
      `
    )
    .eq("company_id", dbUser.company_id)
    .order("created_at", {
      ascending: false,
    });

  if (transactionsError) {
    return (
      <DashboardLayout>
        <div
          dir="rtl"
          className="mx-auto w-full max-w-[1600px]"
        >
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                !
              </div>

              <div>
                <p className="font-semibold text-red-700">
                  تعذر تحميل حركة المخزون
                </p>

                <p className="mt-2 text-sm leading-6 text-red-600">
                  {transactionsError.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const transactions: Transaction[] =
    (rawTransactions ?? []).map(
      (item) => ({
        id: item.id,
        company_id: item.company_id,
        product_id: item.product_id,
        location_id: item.location_id,

        transaction_type: String(
          item.transaction_type ?? ""
        ),

        reference_type:
          item.reference_type ?? null,

        reference_id:
          item.reference_id ?? null,

        quantity: Number(
          item.quantity ?? 0
        ),

        quantity_before: Number(
          item.quantity_before ?? 0
        ),

        quantity_after: Number(
          item.quantity_after ?? 0
        ),

        notes: item.notes ?? null,

        user_id: item.user_id ?? null,

        created_at: item.created_at,

        products:
          firstRelation(item.products),

        locations:
          firstRelation(item.locations),

        users:
          firstRelation(item.users),
      })
    );

  const locationMap = new Map<
    string,
    Location
  >();

  transactions.forEach(
    (transaction) => {
      if (
        transaction.locations &&
        !locationMap.has(
          transaction.locations.id
        )
      ) {
        locationMap.set(
          transaction.locations.id,
          transaction.locations
        );
      }
    }
  );

  const locations =
    Array.from(
      locationMap.values()
    ).sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "ar"
      )
    );

  const totalTransactions =
    transactions.length;

  const inboundCount =
    transactions.filter(
      (item) =>
        Number(item.quantity) > 0
    ).length;

  const outboundCount =
    transactions.filter(
      (item) =>
        Number(item.quantity) < 0
    ).length;

  const adjustmentCount =
    transactions.filter(
      (item) =>
        String(
          item.transaction_type
        ).toLowerCase() ===
        "adjustment"
    ).length;

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute -left-12 -top-12 h-32 w-32 rounded-full bg-teal-100/40 blur-3xl" />

          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                <Activity
                  size={16}
                  className="text-teal-500"
                />

                <span>
                  إدارة المخزون
                </span>

                <span>/</span>

                <span className="text-slate-500">
                  حركة المخزون
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                حركة المخزون
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                سجل مركزي لجميع الحركات التي أثرت
                على أرصدة المخزون.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700">
              <Warehouse size={17} />

              <span>
                {locations.length} موقع
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={
              <Activity size={20} />
            }
            label="إجمالي الحركات"
            value={totalTransactions.toLocaleString(
              "ar-SA"
            )}
            description="جميع حركات المخزون"
          />

          <StatCard
            icon={
              <ArrowDownToLine
                size={20}
              />
            }
            label="حركات الإضافة"
            value={inboundCount.toLocaleString(
              "ar-SA"
            )}
            description="حركات رفعت الرصيد"
            variant="success"
          />

          <StatCard
            icon={
              <ArrowUpFromLine
                size={20}
              />
            }
            label="حركات الخصم"
            value={outboundCount.toLocaleString(
              "ar-SA"
            )}
            description="حركات خفضت الرصيد"
            variant="teal"
          />

          <StatCard
            icon={
              <ClipboardList
                size={20}
              />
            }
            label="التسويات"
            value={adjustmentCount.toLocaleString(
              "ar-SA"
            )}
            description="حركات ناتجة عن التسويات"
            variant="slate"
          />
        </div>

        <TransactionsTable
          transactions={transactions}
          locations={locations}
        />
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
  variant = "teal",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  variant?:
    | "teal"
    | "success"
    | "slate";
}) {
  const iconStyles = {
    teal: {
      box: "bg-teal-50 text-teal-600",
    },
    success: {
      box: "bg-emerald-50 text-emerald-600",
    },
    slate: {
      box: "bg-slate-100 text-slate-600",
    },
  };

  const styles = iconStyles[variant];

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${styles.box}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
