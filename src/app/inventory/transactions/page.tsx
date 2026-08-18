import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
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

  // ============================================================
  // المستخدم الحالي
  // ============================================================

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

  // ============================================================
  // مستخدم النظام
  // ============================================================

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

  // ============================================================
  // الحركات
  // ============================================================

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
          className="rounded-2xl border border-red-200 bg-red-50 p-6"
        >
          <p className="font-semibold text-red-700">
            تعذر تحميل حركة المخزون
          </p>

          <p className="mt-2 text-sm text-red-600">
            {transactionsError.message}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ============================================================
  // تجهيز الحركات
  // ============================================================

  const transactions: Transaction[] =
    (rawTransactions ?? []).map(
      (item: any) => ({
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
          item.products ?? null,

        locations:
          item.locations ?? null,

        users:
          item.users ?? null,
      })
    );

  // ============================================================
  // المواقع الموجودة في الحركات
  // ============================================================

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

  // ============================================================
  // الإحصائيات
  // ============================================================

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
        {/* ======================================================
            رأس الصفحة
        ======================================================= */}

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
              <Activity size={16} />

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

            <p className="mt-2 text-sm text-slate-500">
              سجل مركزي لجميع الحركات التي أثرت
              على أرصدة المخزون.
            </p>
          </div>

          {/* عدد المواقع */}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500 shadow-sm sm:flex">
            <Warehouse
              size={17}
              className="text-blue-500"
            />

            <span>
              {locations.length} موقع
            </span>
          </div>
        </div>

        {/* ======================================================
            الإحصائيات
        ======================================================= */}

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
          />
        </div>

        {/* ======================================================
            جدول الحركات
        ======================================================= */}

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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
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

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}