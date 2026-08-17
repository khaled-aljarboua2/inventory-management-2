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
} from "lucide-react";
import { useState } from "react";

type Props = {
  permissions: string[];
};

export default function SidebarNav({
  permissions,
}: Props) {
  const allowed = (permission: string) =>
    permissions.includes(permission);

  const [inventoryOpen, setInventoryOpen] =
    useState(true);

  const [purchasesOpen, setPurchasesOpen] =
    useState(true);

  const [masterOpen, setMasterOpen] =
    useState(true);

  // ============================================================
  // الأقسام تظهر فقط إذا كان لدى المستخدم صلاحية فعلية
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
    allowed("settings.view");

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-5">
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
              <LayoutDashboard
                size={19}
              />
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
              setInventoryOpen(
                !inventoryOpen
              )
            }
            icon={
              <Boxes size={19} />
            }
            label="المخزون"
          />

          <SubMenu
            open={inventoryOpen}
          >
            {/* أرصدة المخزون */}
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

            {/* الجرد */}
            {allowed("stock.count") && (
              <NavLink
                href="/inventory/counts"
                icon={
                  <ClipboardCheck
                    size={17}
                  />
                }
                label="الجرد"
                sub
              />
            )}

            {/* حركة المخزون */}
            {allowed("stock.view") && (
              <NavLink
                href="/inventory/transactions"
                icon={
                  <ClipboardList
                    size={17}
                  />
                }
                label="حركة المخزون"
                sub
              />
            )}

            {/* طلبات النقل */}
            {(
              allowed("transfers.view") ||
              allowed("transfers.create") ||
              allowed("transfers.receive") ||
              allowed("transfers.update")
            ) && (
              <NavLink
                href="/transfers"
                icon={
                  <ArrowRightLeft
                    size={17}
                  />
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
              setPurchasesOpen(
                !purchasesOpen
              )
            }
            icon={
              <ShoppingCart
                size={19}
              />
            }
            label="المشتريات"
          />

          <SubMenu
            open={purchasesOpen}
          >
            {allowed(
              "purchases.view"
            ) && (
              <NavLink
                href="/purchases"
                icon={
                  <ShoppingCart
                    size={17}
                  />
                }
                label="أوامر الشراء"
                sub
              />
            )}

            {allowed(
              "suppliers.view"
            ) && (
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
              setMasterOpen(
                !masterOpen
              )
            }
            icon={
              <Package size={19} />
            }
            label="البيانات الأساسية"
          />

          <SubMenu
            open={masterOpen}
          >
            {/* المنتجات */}
            {allowed(
              "products.view"
            ) && (
              <NavLink
                href="/products"
                icon={
                  <Package size={17} />
                }
                label="المنتجات"
                sub
              />
            )}

            {/* المواقع */}
            {allowed(
              "locations.view"
            ) && (
              <NavLink
                href="/warehouses"
                icon={
                  <Package size={17} />
                }
                label="المواقع"
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

          {allowed(
            "settings.view"
          ) && (
            <NavLink
              href="/settings"
              icon={
                <Settings size={19} />
              }
              label="الإعدادات"
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
      className={`mb-3 px-3 text-[11px] font-semibold tracking-wider text-slate-400 ${className}`}
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
      className="group mb-1 flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-400 transition-colors group-hover:text-blue-600">
          {icon}
        </span>

        <span>{label}</span>
      </div>

      <ChevronDown
        size={17}
        className={`text-slate-400 transition-transform ${
          open
            ? "rotate-180"
            : ""
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
      <div className="mr-5 mt-1 space-y-1 border-r border-slate-200 pr-3">
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
          ? "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
          : "group mb-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      }
    >
      <span className="text-slate-400 transition-colors group-hover:text-blue-600">
        {icon}
      </span>

      <span>{label}</span>
    </Link>
  );
}
