import Link from "next/link";
import { ArrowLeft, Boxes, Building2, Package, Search } from "lucide-react";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { getCurrentUserContext } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

type ProductResult = {
  id: string;
  name: string;
  sku: string;
};

type BarcodeResult = {
  barcode: string;
  products:
    | {
        id: string;
        name: string;
        sku: string;
        company_id: string;
      }
    | Array<{
        id: string;
        name: string;
        sku: string;
        company_id: string;
      }>
    | null;
};

type LocationResult = {
  id: string;
  name: string;
  code: string;
  type: string;
};

type PageIndexItem = {
  title: string;
  href: string;
  keywords: string;
  permissions: string[];
};

const PAGE_INDEX: PageIndexItem[] = [
  { title: "الرئيسية", href: "/dashboard", keywords: "لوحة التحكم داشبورد dashboard", permissions: ["dashboard.view"] },
  { title: "المنتجات", href: "/products", keywords: "منتج منتجات sku باركود", permissions: ["products.view"] },
  { title: "أرصدة المخزون", href: "/inventory", keywords: "مخزون رصيد أرصدة كمية", permissions: ["stock.view"] },
  { title: "حركات المخزون", href: "/inventory/transactions", keywords: "حركة حركات مخزون معاملات", permissions: ["stock.view"] },
  { title: "الجرد", href: "/inventory/counts", keywords: "جرد عد مخزون", permissions: ["stock.count"] },
  { title: "الوحدات", href: "/units", keywords: "وحدة وحدات قياس", permissions: ["products.view"] },
  { title: "طلبات النقل", href: "/transfers", keywords: "نقل تحويل طلبات الفروع مستودع", permissions: ["transfers.view", "transfers.create", "transfers.receive", "transfers.update"] },
  { title: "المشتريات", href: "/purchases", keywords: "شراء مشتريات طلب شراء", permissions: ["purchases.view"] },
  { title: "الموردون", href: "/suppliers", keywords: "مورد موردين الموردون", permissions: ["suppliers.view"] },
  { title: "التقارير", href: "/reports", keywords: "تقرير تقارير احصائيات", permissions: ["stock.view"] },
  { title: "الفروع", href: "/branches", keywords: "فرع فروع مواقع", permissions: ["locations.view"] },
  { title: "المستودعات", href: "/warehouses", keywords: "مستودع مستودعات مخزن", permissions: ["locations.view"] },
  { title: "المستخدمون", href: "/users", keywords: "مستخدم مستخدمون حساب حسابات", permissions: ["users.view"] },
  { title: "الأدوار والصلاحيات", href: "/roles", keywords: "دور ادوار صلاحية صلاحيات", permissions: ["users.manage_access"] },
  { title: "الإعدادات", href: "/settings", keywords: "اعدادات إعدادات نظام", permissions: ["settings.view"] },
];

function firstProductRelation(value: BarcodeResult["products"]) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ar");
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
  const supabase = await createClient();

  const pageResults = query
    ? PAGE_INDEX.filter((item) => {
        const canOpen = item.permissions.some((permission) => permissions.has(permission));
        if (!canOpen) return false;
        return normalize(`${item.title} ${item.keywords}`).includes(normalizedQuery);
      })
    : [];

  let products: ProductResult[] = [];
  let barcodeProducts: Array<ProductResult & { barcode: string }> = [];
  let locations: LocationResult[] = [];

  if (query) {
    const canSearchProducts = permissions.has("products.view") || permissions.has("stock.view");
    const canSearchLocations = permissions.has("locations.view") || permissions.has("stock.view");

    const [productsByName, productsBySku, barcodes, locationsByName, locationsByCode] = await Promise.all([
      canSearchProducts
        ? supabase
            .from("products")
            .select("id, name, sku")
            .eq("company_id", profile.company_id)
            .ilike("name", `%${query}%`)
            .limit(12)
        : Promise.resolve({ data: [] as ProductResult[], error: null }),
      canSearchProducts
        ? supabase
            .from("products")
            .select("id, name, sku")
            .eq("company_id", profile.company_id)
            .ilike("sku", `%${query}%`)
            .limit(12)
        : Promise.resolve({ data: [] as ProductResult[], error: null }),
      canSearchProducts
        ? supabase
            .from("product_barcodes")
            .select("barcode, products!inner(id, name, sku, company_id)")
            .eq("products.company_id", profile.company_id)
            .ilike("barcode", `%${query}%`)
            .limit(12)
        : Promise.resolve({ data: [] as BarcodeResult[], error: null }),
      canSearchLocations
        ? supabase
            .from("locations")
            .select("id, name, code, type")
            .eq("company_id", profile.company_id)
            .ilike("name", `%${query}%`)
            .limit(10)
        : Promise.resolve({ data: [] as LocationResult[], error: null }),
      canSearchLocations
        ? supabase
            .from("locations")
            .select("id, name, code, type")
            .eq("company_id", profile.company_id)
            .ilike("code", `%${query}%`)
            .limit(10)
        : Promise.resolve({ data: [] as LocationResult[], error: null }),
    ]);

    const productMap = new Map<string, ProductResult>();
    for (const item of [...(productsByName.data ?? []), ...(productsBySku.data ?? [])] as ProductResult[]) {
      productMap.set(item.id, item);
    }
    products = Array.from(productMap.values()).slice(0, 16);

    barcodeProducts = ((barcodes.data ?? []) as unknown as BarcodeResult[])
      .map((row) => {
        const product = firstProductRelation(row.products);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: row.barcode,
        };
      })
      .filter((row): row is ProductResult & { barcode: string } => Boolean(row))
      .slice(0, 12);

    const locationMap = new Map<string, LocationResult>();
    for (const item of [...(locationsByName.data ?? []), ...(locationsByCode.data ?? [])] as LocationResult[]) {
      locationMap.set(item.id, item);
    }
    locations = Array.from(locationMap.values()).slice(0, 12);
  }

  const totalResults = pageResults.length + products.length + barcodeProducts.length + locations.length;

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto w-full max-w-[1600px] space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Search size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">البحث في النظام</h1>
              <p className="mt-1 text-sm text-slate-500">
                {query ? `نتائج البحث عن: ${query}` : "استخدم خانة البحث أعلى الصفحة للبحث في النظام."}
              </p>
            </div>
          </div>
        </section>

        {!query ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
            <Search size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">اكتب اسم منتج، SKU، باركود، فرع أو مستودع.</p>
          </section>
        ) : totalResults === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
            <Search size={30} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">لا توجد نتائج مطابقة.</p>
            <p className="mt-1 text-xs text-slate-400">جرّب جزءًا من الاسم أو رقم SKU أو الباركود.</p>
          </section>
        ) : (
          <>
            {pageResults.length > 0 && (
              <ResultSection title="صفحات النظام" icon={<Search size={18} />}>
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
              </ResultSection>
            )}

            {(products.length > 0 || barcodeProducts.length > 0) && (
              <ResultSection title="المنتجات" icon={<Package size={18} />}>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {products.map((product) => (
                    <Link
                      key={`product-${product.id}`}
                      href="/products"
                      className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                        <p dir="ltr" className="mt-1 text-xs text-slate-400">SKU: {product.sku}</p>
                      </div>
                      <ArrowLeft size={16} className="shrink-0 text-slate-400" />
                    </Link>
                  ))}
                  {barcodeProducts.map((product) => (
                    <Link
                      key={`barcode-${product.id}-${product.barcode}`}
                      href="/products"
                      className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                        <p dir="ltr" className="mt-1 text-xs text-slate-400">{product.sku} · Barcode: {product.barcode}</p>
                      </div>
                      <ArrowLeft size={16} className="shrink-0 text-slate-400" />
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {locations.length > 0 && (
              <ResultSection title="الفروع والمستودعات" icon={<Building2 size={18} />}>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {locations.map((location) => (
                    <Link
                      key={location.id}
                      href="/inventory"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        {location.type === "warehouse" ? <Boxes size={17} /> : <Building2 size={17} />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{location.name}</p>
                        <p dir="ltr" className="mt-0.5 text-xs text-slate-400">{location.code}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ResultSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-800">
        <span className="text-teal-700">{icon}</span>
        <h2 className="font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
