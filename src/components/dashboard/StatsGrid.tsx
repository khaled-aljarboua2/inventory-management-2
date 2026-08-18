import {
  Boxes,
  Warehouse,
  Building2,
  PackageCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/supabase/relations";
import StatCard from "./StatCard";

export default async function StatsGrid() {
  const supabase = await createClient();

  // ============================================================
  // المستخدم الحالي
  // ============================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        يجب تسجيل الدخول أولًا.
      </div>
    );
  }

  // ============================================================
  // بيانات المستخدم
  // ============================================================

  const {
    data: currentUser,
    error: currentUserError,
  } = await supabase
    .from("users")
    .select(`
      id,
      company_id,
      location_id,
      is_active,
      roles (
        id,
        name
      )
    `)
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (currentUserError || !currentUser) {
    return (
      <div
        dir="rtl"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        تعذر تحميل بيانات المستخدم.
      </div>
    );
  }

  // ============================================================
  // نوع المستخدم
  // ============================================================

  const roleName =
    firstRelation(currentUser.roles)?.name ?? "";

  const isBranchUser =
    roleName.toLowerCase() === "branch";

  // ============================================================
  // المنتجات
  // ============================================================

  const productsPromise = supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "company_id",
      currentUser.company_id
    )
    .eq("is_active", true);

  // ============================================================
  // الفروع
  // ============================================================

  const branchesPromise = supabase
    .from("locations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "company_id",
      currentUser.company_id
    )
    .eq("type", "branch")
    .eq("is_active", true);

  // ============================================================
  // المستودعات
  // ============================================================

  const warehousesPromise = supabase
    .from("locations")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(
      "company_id",
      currentUser.company_id
    )
    .eq("type", "warehouse")
    .eq("is_active", true);

  // ============================================================
  // تنفيذ الاستعلامات
  // ============================================================

  const [
    productsResult,
    branchesResult,
    warehousesResult,
  ] = await Promise.all([
    productsPromise,
    branchesPromise,
    warehousesPromise,
  ]);

  // ============================================================
  // النتائج
  // ============================================================

  const totalProducts =
    productsResult.count ?? 0;

  let totalBranches =
    branchesResult.count ?? 0;

  let totalWarehouses =
    warehousesResult.count ?? 0;

  // ============================================================
  // مستخدم الفرع
  // ============================================================

  if (isBranchUser) {
    totalBranches =
      currentUser.location_id ? 1 : 0;

    totalWarehouses = 0;
  }

  // ============================================================
  // قيمة المخزون
  // ============================================================

  // لم نحدد حتى الآن مصدرًا مؤكدًا
  // لسعر/تكلفة المنتجات في قاعدة البيانات.
  //
  // لذلك لا نعرض رقمًا وهميًا.

  const inventoryValue = "—";

  return (
    <div
      dir="rtl"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
    >
      {/* ======================================================
          المنتجات
      ======================================================= */}

      <StatCard
        title="إجمالي المنتجات"
        value={totalProducts.toLocaleString("ar-SA")}
        description="المنتجات النشطة"
        icon={
          <Boxes
            size={24}
            strokeWidth={1.8}
          />
        }
        color="blue"
      />

      {/* ======================================================
          المستودعات
      ======================================================= */}

      <StatCard
        title="المستودعات"
        value={totalWarehouses.toLocaleString(
          "ar-SA"
        )}
        description="المستودعات النشطة"
        icon={
          <Warehouse
            size={24}
            strokeWidth={1.8}
          />
        }
        color="green"
      />

      {/* ======================================================
          الفروع
      ======================================================= */}

      <StatCard
        title="الفروع"
        value={totalBranches.toLocaleString(
          "ar-SA"
        )}
        description="الفروع النشطة"
        icon={
          <Building2
            size={24}
            strokeWidth={1.8}
          />
        }
        color="orange"
      />

      {/* ======================================================
          قيمة المخزون
      ======================================================= */}

      <StatCard
        title="قيمة المخزون"
        value={inventoryValue}
        description="بانتظار ربط تكلفة المخزون"
        icon={
          <PackageCheck
            size={24}
            strokeWidth={1.8}
          />
        }
        color="purple"
      />
    </div>
  );
}
