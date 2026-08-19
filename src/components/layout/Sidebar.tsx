import { Package } from "lucide-react";

import { getCurrentPermissions } from "@/lib/permissions";
import SidebarNav from "./SidebarNav";
import LogoutButton from "./LogoutButton";

export default async function Sidebar() {
  const permissions =
    await getCurrentPermissions();

  return (
    <>
      {/* خلفية الجوال */}

      <label
        htmlFor="mobile-sidebar-toggle"
        className="
          fixed inset-0 z-40
          hidden
          bg-slate-950/40
          backdrop-blur-[2px]
          peer-checked:block
          md:hidden
        "
        aria-label="إغلاق القائمة"
      />

      {/* السايدبار */}

      <aside
        dir="rtl"
        className="
          fixed right-0 top-0 z-50
          flex h-screen
          w-[min(320px,85vw)]
          translate-x-full
          flex-col
          border-l border-slate-200
          bg-white
          shadow-2xl
          transition-transform duration-300
          peer-checked:translate-x-0

          md:static
          md:z-auto
          md:flex
          md:w-64
          md:translate-x-0
          md:shadow-none

          dark:border-slate-800
          dark:bg-slate-950
        "
      >
        {/* الرأس */}

        <div className="border-b border-slate-100 px-6 py-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Package
                size={21}
                strokeWidth={2.2}
              />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                إدارة المخزون
              </h2>

              <p className="mt-0.5 truncate text-xs text-slate-400">
                Inventory Management
              </p>
            </div>
          </div>
        </div>

        {/* القائمة */}

        <SidebarNav
          permissions={Array.from(permissions)}
        />

        {/* الأسفل */}

        <div className="mt-auto border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="mb-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              نظام إدارة المخزون
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              الإصدار 1.0
            </p>
          </div>

          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
