import Image from "next/image";
import { getCurrentPermissions } from "@/lib/permissions";
import SidebarNav from "./SidebarNav";
import LogoutButton from "./LogoutButton";

export default async function Sidebar() {
  const permissions = await getCurrentPermissions();

  return (
    <>
      {/* Mobile Overlay */}
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
          bg-white
          shadow-2xl
          transition-transform duration-300
          peer-checked:translate-x-0

          md:static
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
            border-b border-slate-100
            bg-white
            px-4
            py-5
          "
        >
          <div className="flex justify-center">
            <Image
              src="/warevance-logo.PNG"
              alt="WAREVANCE - Inventory & Branch Management"
              width={500}
              height={160}
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
            border-t border-slate-100
            bg-white
            p-4
          "
        >
          {/* Brand Info */}
          <div
            className="
              mb-3
              rounded-xl
              border border-slate-100
              bg-slate-50
              px-4
              py-3
            "
          >
            <p
              className="
                text-xs
                font-semibold
                text-slate-800
              "
            >
              WAREVANCE
            </p>

            <p
              className="
                mt-1
                text-[11px]
                leading-5
                text-slate-400
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