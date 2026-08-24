import { Package } from "lucide-react";

import { getCurrentPermissions } from "@/lib/permissions";
import SidebarNav from "./SidebarNav";
import LogoutButton from "./LogoutButton";

export default async function Sidebar() {
  const permissions = await getCurrentPermissions();

  return (
    <>
      {/* Overlay - Mobile */}
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

      {/* Sidebar */}
      <aside
        dir="rtl"
        className="
          fixed right-0 top-0 z-50
          flex h-screen
          w-[min(320px,85vw)]
          translate-x-full
          flex-col
          border-l border-teal-800/20
          bg-teal-700
          shadow-2xl
          transition-transform duration-300
          peer-checked:translate-x-0

          md:static
          md:flex
          md:w-64
          md:translate-x-0
          md:shadow-none
        "
      >
        {/* Header */}
        <div
          className="
            border-b
            border-teal-600/30
            px-6 py-6
          "
        >
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-10 w-10
                shrink-0
                items-center justify-center
                rounded-xl
                bg-white
                text-teal-700
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
                  text-white
                "
              >
                إدارة المخزون
              </h2>

              <p
                className="
                  mt-0.5
                  truncate
                  text-xs
                  text-teal-100
                "
              >
                Inventory Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <SidebarNav
          permissions={Array.from(permissions)}
        />

        {/* Bottom */}
        <div
          className="
            mt-auto
            border-t
            border-teal-600/30
            p-4
          "
        >
          <div
            className="
              mb-3
              rounded-xl
              bg-teal-800/30
              px-4 py-3
            "
          >
            <p
              className="
                text-xs
                font-medium
                text-white
              "
            >
              نظام إدارة المخزون
            </p>

            <p
              className="
                mt-1
                text-[11px]
                text-teal-100/70
              "
            >
              الإصدار 1.0
            </p>
          </div>

          <LogoutButton />
        </div>
      </aside>
    </>
  );
}