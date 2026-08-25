"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  ClipboardList,
  ShoppingCart,
  Truck,
  Users,
  Settings,
  ClipboardCheck,
  ChevronDown,
  Boxes,
  Ruler,
  Building2,
  Warehouse,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

type Props = {
  permissions: Set<string>;
};

export default function SidebarNav({
  permissions,
}: Props) {
  const allowed = (permission: string) =>
    permissions.has(permission);

  const [inventoryOpen, setInventoryOpen] =
    useState(true);

  const [purchasesOpen, setPurchasesOpen] =
    useState(true);

  const [masterOpen, setMasterOpen] =
    useState(true);

  // ============================================================
  // الأقسام
  // ============================================================

  const hasInventory =
    allowed("stock.view") ||
    allowed("stock.count") ||
    allowed("stock.adjust") ||
    allowed("stock.receive") ||
    allowed("transfers.view") ||
    allowed("transfers.create") ||
    allowed("transfers.receive") ||
    allowed("transfers.update");

  const hasPurchases =
    allowed("purchases.view") ||
    allowed("suppliers.view");

  const hasMaster =
    allowed("products.view") ||
    allowed("locations.view");

  const hasManagement =
    allowed("users.view") ||
    allowed("users.manage_access") ||
    allowed("settings.view");

  return (
    <nav className="px-3 py-5">
      {/* ========================================================
          الرئيسية
      ========================================================= */}

      {allowed("dashboard.view") && (
        <>
          <SectionTitle>
            الرئيسية
          </SectionTitle>

          <NavLink
            href="/dashboard"
            icon={
              <LayoutDashboard size={19} />
            }
            label="لوحة التحكم"
          />
        </>
      )}

      {/* ========================================================
          إدارة المخزون
      ========================================================= */}

      {hasInventory && (
        <>
          <SectionTitle className="mt-7">
            إدارة المخزون
          </SectionTitle>

          <MenuButton
            open={inventoryOpen}
            onClick={() =>
              setInventoryOpen(!inventoryOpen)
            }
            icon={
              <Boxes size={19} />
            }
            label="المخزون"
          />

          <SubMenu open={inventoryOpen}>
            {allowed("stock.view") && (
              <NavLink
                href="/inventory"
                icon={
                  <Package size={17} />
                }
                label="أرصدة المخزون"
                sub
              />
            )}

            {allowed("stock.count") && (
              <NavLink
                href="/inventory/counts"
                icon={
                  <ClipboardCheck size={17} />
                }
                label="الجرد"
                sub
              />
            )}

            {allowed("stock.view") && (
              <NavLink
                href="/inventory/transactions"
                icon={
                  <ClipboardList size={17} />
                }
                label="حركة المخزون"
                sub
              />
            )}

            {(
              allowed("transfers.view") ||
              allowed("transfers.create") ||
              allowed("transfers.receive") ||
              allowed("transfers.update")
            ) && (
              <NavLink
                href="/transfers"
                icon={
                  <ArrowRightLeft size={17} />
                }
                label="طلبات النقل"
                sub
              />
            )}
          </SubMenu>
        </>
      )}

      {/* ========================================================
          المشتريات
      ========================================================= */}

      {hasPurchases && (
        <>
          <SectionTitle className="mt-7">
            المشتريات
          </SectionTitle>

          <MenuButton
            open={purchasesOpen}
            onClick={() =>
              setPurchasesOpen(!purchasesOpen)
            }
            icon={
              <ShoppingCart size={19} />
            }
            label="المشتريات"
          />

          <SubMenu open={purchasesOpen}>
            {allowed("purchases.view") && (
              <NavLink
                href="/purchases"
                icon={
                  <ShoppingCart size={17} />
                }
                label="أوامر الشراء"
                sub
              />
            )}

            {allowed("suppliers.view") && (
              <NavLink
                href="/suppliers"
                icon={
                  <Truck size={17} />
                }
                label="الموردون"
                sub
              />
            )}
          </SubMenu>
        </>
      )}

      {/* ========================================================
          البيانات الأساسية
      ========================================================= */}

      {hasMaster && (
        <>
          <SectionTitle className="mt-7">
            البيانات الأساسية
          </SectionTitle>

          <MenuButton
            open={masterOpen}
            onClick={() =>
              setMasterOpen(!masterOpen)
            }
            icon={
              <Package size={19} />
            }
            label="البيانات الأساسية"
          />

          <SubMenu open={masterOpen}>
            {allowed("products.view") && (
              <NavLink
                href="/products"
                icon={
                  <Package size={17} />
                }
                label="المنتجات"
                sub
              />
            )}

            {allowed("products.view") && (
              <NavLink
                href="/units"
                icon={
                  <Ruler size={17} />
                }
                label="الوحدات"
                sub
              />
            )}

            {allowed("locations.view") && (
              <NavLink
                href="/branches"
                icon={
                  <Building2 size={17} />
                }
                label="الفروع"
                sub
              />
            )}

            {allowed("locations.view") && (
              <NavLink
                href="/warehouses"
                icon={
                  <Warehouse size={17} />
                }
                label="المستودعات"
                sub
              />
            )}
          </SubMenu>
        </>
      )}

      {/* ========================================================
          الإدارة
      ========================================================= */}

      {hasManagement && (
        <>
          <SectionTitle className="mt-7">
            الإدارة
          </SectionTitle>

          {allowed("users.view") && (
            <NavLink
              href="/users"
              icon={
                <Users size={19} />
              }
              label="المستخدمون"
            />
          )}

          {allowed("users.manage_access") && (
            <NavLink
              href="/roles"
              icon={
                <ShieldCheck size={19} />
              }
              label="الأدوار والصلاحيات"
            />
          )}

          {allowed("settings.view") && (
            <NavLink
              href="/settings"
              icon={
                <Settings size={19} />
              }
              label="الإعدادات العامة"
            />
          )}
        </>
      )}
    </nav>
  );
}

/* ==============================================================
   عنوان القسم
================================================================ */

function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-3 px-3 text-xs font-semibold tracking-wider text-teal-100/70 ${className}`}
    >
      {children}
    </p>
  );
}

/* ==============================================================
   زر القائمة
================================================================ */

function MenuButton({
  open,
  onClick,
  icon,
  label,
}: {
  open: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group mb-1 flex w-full
        items-center justify-between
        rounded-xl
        px-3.5 py-3
        text-[15px]
        font-medium
        text-white
        transition
        hover:bg-teal-800/50
      "
    >
      <div className="flex items-center gap-3">
        <span className="text-teal-100 transition-colors group-hover:text-white">
          {icon}
        </span>

        <span>{label}</span>
      </div>

      <ChevronDown
        size={17}
        className={`text-teal-100 transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}

/* ==============================================================
   القائمة الفرعية
================================================================ */

function SubMenu({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`overflow-hidden transition-all duration-200 ${
        open
          ? "max-h-96 opacity-100"
          : "max-h-0 opacity-0"
      }`}
    >
      <div className="mr-5 mt-1 space-y-1 border-r border-white/20 pr-3">
        {children}
      </div>
    </div>
  );
}

/* ==============================================================
   الرابط
================================================================ */

function NavLink({
  href,
  icon,
  label,
  sub = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        sub
          ? `
            group flex items-center gap-3
            rounded-lg
            px-3 py-2.5
            text-[14px]
            text-teal-50
            transition
            hover:bg-teal-800/50
            hover:text-white
          `
          : `
            group mb-1 flex items-center gap-3
            rounded-xl
            px-3.5 py-3
            text-[15px]
            font-medium
            text-white
            transition
            hover:bg-teal-800/50
          `
      }
    >
      <span className="text-teal-100 transition-colors group-hover:text-white">
        {icon}
      </span>

      <span>{label}</span>
    </Link>
  );
}