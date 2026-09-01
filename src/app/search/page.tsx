import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { getCurrentUserContext } from "@/lib/permissions";

type PageIndexItem = {
  title: string;
  href: string;
  keywords: string;
  permissions: string[];
};

const PAGE_INDEX: PageIndexItem[] = [
  {
    title: "الرئيسية",
    href: "/dashboard",
    keywords: "لوحة التحكم داشبورد dashboard الرئيسية",
    permissions: ["dashboard.view"],
  },
  {
    title: "المنتجات",
    href: "/products",
    keywords: "المنتجات منتج",
    permissions: ["products.view"],
  },
  {
    title: "أرصدة المخزون",
    href: "/inventory",
    keywords: "المخزون أرصدة رصيد الكميات",
    permissions: ["stock.view"],
  },
  {
    title: "حركات المخزون",
    href: "/inventory/transactions",
    keywords: "حركات المخزون حركة المعاملات",
    permissions: ["stock.view"],
  },
  {
    title: "الجرد",
    href: "/inventory/counts",
    keywords: "الجرد عد المخزون",
    permissions: ["stock.count"],
  },
  {
    title: "الوحدات",
    href: "/units",
    keywords: "الوحدات وحدة القياس",
    permissions: ["products.view"],
  },
  {
    title: "طلبات النقل",
    href: "/transfers",
    keywords: "طلبات النقل نقل تحويل",
    permissions: [
      "transfers.view",
      "transfers.create",
      "transfers.receive",
      "transfers.update",
    ],
  },
  {
    title: "المشتريات",
    href: "/purchases",
    keywords: "المشتريات شراء طلبات الشراء",
    permissions: ["purchases.view"],
  },
  {
    title: "الموردون",
    href: "/suppliers",
    keywords: "الموردون مورد موردين",
    permissions: ["suppliers.view"],
  },
  {
    title: "التقارير",
    href: "/reports",
    keywords: "التقارير تقرير إحصائيات احصائيات",
    permissions: ["stock.view"],
  },
  {
    title: "الفروع",
    href: "/branches",
    keywords: "الفروع فرع المواقع",
    permissions: ["locations.view"],
  },
  {
    title: "المستودعات",
    href: "/warehouses",
    keywords: "المستودعات مستودع مخزن",
    permissions: ["locations.view"],
  },
  {
    title: "المستخدمون",
    href: "/users",
    keywords: "المستخدمون مستخدم حسابات",
    permissions: ["users.view"],
  },
  {
    title: "الأدوار والصلاحيات",
    href: "/roles",
    keywords: "الأدوار الصلاحيات دور صلاحية",
    permissions: ["users.manage_access"],
  },
  {
    title: "الإعدادات",
    href: "/settings",
    keywords: "الإعدادات اعدادات إعداد النظام",
    permissions: ["settings.view"],
  },
];

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه");
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { profile, permissions } = await getCurrentUserContext();

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          يجب تسجيل الدخول أولًا.
        </div>
      </DashboardLayout>
    );
  }

  const query = (await searchParams).q?.trim() ?? "";
  const normalizedQuery = normalize(query);

  const pageResults = query
    ? PAGE_INDEX.filter((item) => {
        const canOpen = item.permissions.some((permission) =>
          permissions.has(permission)
        );

        if (!canOpen) {
          return false;
        }

        return normalize(`${item.title} ${item.keywords}`).includes(
          normalizedQuery
        );
      })
    : [];

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto w-full max-w-[1600px] space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Search size={20} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                البحث في صفحات النظام
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {query
                  ? `نتائج البحث عن: ${query}`
                  : "استخدم خانة البحث أعلى الصفحة للوصول السريع إلى صفحات النظام."}
              </p>
            </div>
          </div>
        </section>

        {!query ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
            <Search size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              اكتب اسم الصفحة التي تريد الوصول إليها.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              مثل: المنتجات، المخزون، الجرد، طلبات النقل أو التقارير.
            </p>
          </section>
        ) : pageResults.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
            <Search size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              لا توجد صفحة مطابقة متاحة لحسابك.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              جرّب اسم الصفحة أو جزءًا منه.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <Search size={18} className="text-teal-700" />
              <h2 className="font-bold">صفحات النظام</h2>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {pageResults.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                >
                  <span>{item.title}</span>
                  <ArrowLeft size={16} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
