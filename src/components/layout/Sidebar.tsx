import Image from "next/image";
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
          flex h-[100dvh]
          w-[min(320px,85vw)]
          translate-x-full
          flex-col
          overflow-hidden
          border-l border-teal-800/20
          bg-teal-700
          shadow-2xl
          transition-transform duration-300
          peer-checked:translate-x-0

          md:static
          md:flex
          md:h-screen
          md:w-64
          md:translate-x-0
          md:shadow-none
        "
      >
        {/* =====================================================
            Logo
        ====================================================== */}
        <div
          className="
            shrink-0
            border-b
            border-teal-600/30
            px-4
            py-4
          "
        >
          <div className="flex justify-center">
            <Image
              src="/warevance-logo.PNG"
              alt="WAREVANCE - Inventory & Branch Management"
              width={220}
              height={70}
              priority
              className="
                h-auto
                w-[190px]
                object-contain
              "
            />
          </div>
        </div>

        {/* =====================================================
            Navigation
        ====================================================== */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
          "
        >
          <SidebarNav
            permissions={Array.from(permissions)}
          />
        </div>

        {/* =====================================================
            Bottom
        ====================================================== */}
        <div
          className="
            shrink-0
            border-t
            border-teal-600/30
            bg-teal-700
            p-4
          "
        >
          {/* Brand */}
          <div
            className="
              mb-3
              rounded-xl
              bg-teal-800/30
              px-4
              py-3
            "
          >
            <p
              className="
                text-xs
                font-semibold
                text-white
              "
            >
              WAREVANCE
            </p>

            <p
              className="
                mt-1
                text-[11px]
                leading-5
                text-teal-100/70
              "
            >
              Inventory & Branch Management
            </p>
          </div>

          {/* Logout */}
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}