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
        {/* Logo */}
        <div
          className="
            border-b
            border-teal-600/30
            px-4 py-5
          "
        >
          <div
            className="
              overflow-hidden
              rounded-xl
              bg-white
              shadow-sm
            "
          >
            <Image
              src="/warevance-logo.png"
              alt="WAREVANCE - Inventory & Branch Management"
              width={500}
              height={160}
              priority
              className="
                h-auto
                w-full
                object-contain
              "
            />
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
              WAREVANCE
            </p>

            <p
              className="
                mt-1
                text-[11px]
                text-teal-100/70
              "
            >
              Inventory & Branch Management
            </p>
          </div>

          <LogoutButton />
        </div>
      </aside>
    </>
  );
}