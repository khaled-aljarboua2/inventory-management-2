import {
  LayoutDashboard,
  Package,
  Warehouse,
  Building2,
  ArrowRightLeft,
  ClipboardList,
  ClipboardCheck,
  ShoppingCart,
  Truck,
  Users,
  Settings,
  Ruler,
  Boxes,
} from "lucide-react";

import { getCurrentPermissions } from "@/lib/permissions";
import SidebarNav from "./SidebarNav";
import LogoutButton from "./LogoutButton";

export default async function Sidebar() {
  const permissions =
    await getCurrentPermissions();

  return (
    <aside
      dir="rtl"
      className="
        hidden
        h-screen
        w-64
        shrink-0
        flex-col
        border-l
        border-slate-200
        bg-white
        md:flex
        dark:border-slate-800
        dark:bg-slate-950
      "
    >
      <div
        className="
          border-b
          border-slate-100
          px-6
          py-6
          dark:border-slate-800
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-blue-600
              text-white
              shadow-sm
            "
          >
            <Package
              size={21}
              strokeWidth={2.2}
            />
          </div>

          <div className="min-w-0">
            <h2
              className="
                truncate
                text-lg
                font-bold
                tracking-tight
                text-slate-900
                dark:text-slate-100
              "
            >
              إدارة المخزون
            </h2>

            <p
              className="
                mt-0.5
                truncate
                text-xs
                text-slate-400
              "
            >
              Inventory Management
            </p>
          </div>
        </div>
      </div>

      <SidebarNav
        permissions={Array.from(
          permissions
        )}
      />

      <div
        className="
          mt-auto
          border-t
          border-slate-100
          p-4
          dark:border-slate-800
        "
      >
        <div
          className="
            mb-3
            rounded-xl
            bg-slate-50
            px-4
            py-3
            dark:bg-slate-900
          "
        >
          <p
            className="
              text-xs
              font-medium
              text-slate-500
              dark:text-slate-400
            "
          >
            نظام إدارة المخزون
          </p>

          <p
            className="
              mt-1
              text-[11px]
              text-slate-400
            "
          >
            الإصدار 1.0
          </p>
        </div>

        <LogoutButton />
      </div>
    </aside>
  );
}