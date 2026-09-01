"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  ClipboardCheck,
  Ruler,
  ArrowRightLeft,
  ShoppingCart,
  Truck,
  Building2,
  Warehouse,
  Users,
  ShieldCheck,
  BarChart3,
  Settings,
} from "lucide-react";

type Props = {
  permissions: Set<string>;
};

export default function SidebarNav({
  permissions,
}: Props) {
  const allowed = (permission: string) =>
    permissions.has(permission);

  const canViewTransfers =
    allowed("transfers.view") ||
    allowed("transfers.create") ||
    allowed("transfers.receive") ||
    allowed("transfers.update");

  const hasInventorySection =
    allowed("products.view") ||
    allowed("stock.view") ||
    allowed("stock.count");

  const hasOperationsSection =
    canViewTransfers ||
    allowed("purchases.view") ||
    allowed("suppliers.view");

  const hasManagementSection =
    allowed("locations.view") ||
    allowed("users.view") ||
    allowed("users.manage_access") ||
    allowed("stock.view") ||
    allowed("settings.view");

  return (
    <nav className="px-3 py-4">
      {allowed("dashboard.view") && (
        <NavLink
          href="/dashboard"
          icon={<LayoutDashboard size={19} />}
          label="الرئيسية"
          prominent
        />
      )}

      {hasInventorySection && (
        <>
          <SectionTitle>المخزون</SectionTitle>

          {allowed("products.view") && (
            <NavLink
              href="/products"
              icon={<Package size={18} />}
              label="المنتجات"
            />
          )}

          {allowed("stock.view") && (
            <NavLink
              href="/inventory"
              icon={<Boxes size={18} />}
              label="أرصدة المخزون"
              exact
            />
          )}

          {allowed("stock.view") && (
            <NavLink
              href="/inventory/transactions"
              icon={<ClipboardList size={18} />}
              label="حركات المخزون"
            />
          )}

          {allowed("stock.count") && (
            <NavLink
              href="/inventory/counts"
              icon={<ClipboardCheck size={18} />}
              label="الجرد"
            />
          )}

          {allowed("products.view") && (
            <NavLink
              href="/units"
              icon={<Ruler size={18} />}
              label="الوحدات"
            />
          )}
        </>
      )}

      {hasOperationsSection && (
        <>
          <SectionTitle>العمليات</SectionTitle>

          {canViewTransfers && (
            <NavLink
              href="/transfers"
              icon={<ArrowRightLeft size={18} />}
              label="طلبات النقل"
            />
          )}

          {allowed("purchases.view") && (
            <NavLink
              href="/purchases"
              icon={<ShoppingCart size={18} />}
              label="المشتريات"
            />
          )}

          {allowed("suppliers.view") && (
            <NavLink
              href="/suppliers"
              icon={<Truck size={18} />}
              label="الموردون"
            />
          )}
        </>
      )}

      {hasManagementSection && (
        <>
          <SectionTitle>الإدارة</SectionTitle>

          {allowed("locations.view") && (
            <NavLink
              href="/branches"
              icon={<Building2 size={18} />}
              label="الفروع"
            />
          )}

          {allowed("locations.view") && (
            <NavLink
              href="/warehouses"
              icon={<Warehouse size={18} />}
              label="المستودعات"
            />
          )}

          {allowed("users.view") && (
            <NavLink
              href="/users"
              icon={<Users size={18} />}
              label="المستخدمون"
            />
          )}

          {allowed("users.manage_access") && (
            <NavLink
              href="/roles"
              icon={<ShieldCheck size={18} />}
              label="الأدوار والصلاحيات"
            />
          )}

          {allowed("stock.view") && (
            <NavLink
              href="/reports"
              icon={<BarChart3 size={18} />}
              label="التقارير"
            />
          )}

          {allowed("settings.view") && (
            <NavLink
              href="/settings"
              icon={<Settings size={18} />}
              label="الإعدادات"
            />
          )}
        </>
      )}
    </nav>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 mt-5 flex items-center gap-3 px-3">
      <span className="whitespace-nowrap text-[12px] font-medium text-teal-100/65">
        {children}
      </span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  exact = false,
  prominent = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  prominent?: boolean;
}) {
  const pathname = usePathname();

  const active = exact
    ? pathname === href
    : pathname === href ||
      pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={`
        group mb-1 flex w-full items-center gap-3
        rounded-xl px-3.5
        ${prominent ? "py-3" : "py-2.5"}
        text-[14px] font-medium
        transition-all duration-150
        ${
          active
            ? "bg-teal-500/85 text-white shadow-sm ring-1 ring-white/10"
            : "text-teal-50 hover:bg-white/10 hover:text-white"
        }
      `}
    >
      <span
        className={`
          shrink-0 transition-colors
          ${
            active
              ? "text-white"
              : "text-teal-100/85 group-hover:text-white"
          }
        `}
      >
        {icon}
      </span>

      <span className="min-w-0 truncate">
        {label}
      </span>
    </Link>
  );
}
