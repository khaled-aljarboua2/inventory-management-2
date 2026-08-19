"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  UserCircle2,
  ChevronDown,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
} from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string;
  username: string | null;
  email: string;
  roles: {
    name: string;
  } | null;
} | null;

export default function Topbar({
  profile,
}: {
  profile: Profile;
}) {
  const router = useRouter();
  const supabase = createClient();

  const searchRef =
    useRef<HTMLInputElement>(null);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [searchQuery, setSearchQuery] =
    useState("");

  const { theme, toggleTheme } =
    useTheme();

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username ||
    profile?.email ||
    "مستخدم النظام";

  const roleName =
    profile?.roles?.name ?? "مستخدم";

  // ==========================================================
  // البحث باستخدام Ctrl + K
  // ==========================================================

  useEffect(() => {
    function handleKeyboardShortcut(
      event: KeyboardEvent
    ) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === "Escape") {
        searchRef.current?.blur();
        setSearchQuery("");
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyboardShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut
      );
    };
  }, []);

  // ==========================================================
  // البحث
  // ==========================================================

  function handleSearchSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const query =
      searchQuery.trim();

    if (!query) {
      return;
    }

    router.push(
      `/search?q=${encodeURIComponent(query)}`
    );
  }

  // ==========================================================
  // تسجيل الخروج
  // ==========================================================

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Logout error:",
        error
      );

      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      dir="rtl"
      className="
        sticky top-0 z-40
        flex h-[72px]
        items-center
        justify-between
        gap-2
        border-b border-slate-200/80
        bg-white/95
        px-3
        backdrop-blur-xl
        transition-colors duration-200

        sm:px-6

        dark:border-slate-700/60
        dark:bg-slate-950/90
      "
    >
      {/* =====================================================
          زر القائمة - الجوال
      ====================================================== */}

      <label
        htmlFor="mobile-sidebar-toggle"
        className="
          flex h-11 w-11
          shrink-0
          cursor-pointer
          items-center justify-center
          rounded-xl
          text-slate-600
          transition-all duration-200

          hover:bg-slate-50
          hover:text-slate-900

          md:hidden

          dark:text-slate-300
          dark:hover:bg-slate-800
          dark:hover:text-white
        "
        aria-label="فتح القائمة"
        title="القائمة"
      >
        <Menu
          size={22}
          strokeWidth={1.9}
        />
      </label>

      {/* =====================================================
          البحث - الكمبيوتر
      ====================================================== */}

      <form
        onSubmit={handleSearchSubmit}
        className="
          relative
          hidden
          w-full
          max-w-xl
          md:block
        "
      >
        <Search
          size={20}
          strokeWidth={1.8}
          className="
            pointer-events-none
            absolute right-4 top-1/2
            -translate-y-1/2
            text-slate-400
            dark:text-slate-500
          "
        />

        <input
          ref={searchRef}
          type="search"
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(
              event.target.value
            )
          }
          placeholder="ابحث عن منتج، SKU، باركود أو مستودع..."
          aria-label="البحث في النظام"
          className="
            h-11 w-full
            rounded-xl
            border border-slate-200
            bg-slate-50/70
            pr-11 pl-20
            text-sm text-slate-700
            outline-none
            transition-all duration-200

            placeholder:text-slate-400

            hover:border-slate-300
            hover:bg-white

            focus:border-blue-400
            focus:bg-white
            focus:ring-4
            focus:ring-blue-50

            dark:border-slate-700
            dark:bg-slate-900
            dark:text-slate-200

            dark:hover:border-slate-600
            dark:hover:bg-slate-900

            dark:focus:border-blue-500
            dark:focus:bg-slate-900
            dark:focus:ring-blue-950/40
          "
        />

        <div
          className="
            pointer-events-none
            absolute left-3 top-1/2
            hidden
            -translate-y-1/2
            items-center gap-1
            rounded-md
            border border-slate-200
            bg-white
            px-2 py-1
            text-[10px]
            text-slate-400
            shadow-sm
            sm:flex

            dark:border-slate-700
            dark:bg-slate-800
            dark:text-slate-500
          "
        >
          <span>Ctrl</span>
          <span>+</span>
          <span>K</span>
        </div>
      </form>

      {/* =====================================================
          الجانب الآخر
      ====================================================== */}

      <div
        className="
          mr-0
          flex
          items-center
          gap-1

          sm:mr-6
          sm:gap-2
        "
      >
        {/* ===================================================
            البحث - الجوال
        ==================================================== */}

        <button
          type="button"
          onClick={() => {
            const query =
              searchQuery.trim();

            if (query) {
              router.push(
                `/search?q=${encodeURIComponent(
                  query
                )}`
              );
            } else {
              searchRef.current?.focus();
            }
          }}
          className="
            flex h-11 w-11
            items-center justify-center
            rounded-xl
            text-slate-500
            transition-all duration-200

            hover:bg-slate-50
            hover:text-slate-900

            md:hidden

            dark:text-slate-400
            dark:hover:bg-slate-800
            dark:hover:text-white
          "
          aria-label="البحث"
          title="البحث"
        >
          <Search
            size={20}
            strokeWidth={1.9}
          />
        </button>

        {/* ===================================================
            الوضع الليلي
        ==================================================== */}

        <button
          type="button"
          onClick={toggleTheme}
          className="
            flex h-11 w-11
            shrink-0
            items-center justify-center
            rounded-xl
            text-slate-500
            transition-all duration-200

            hover:bg-slate-50
            hover:text-slate-900

            dark:text-slate-400
            dark:hover:bg-slate-800
            dark:hover:text-white
          "
          aria-label={
            theme === "dark"
              ? "تفعيل الوضع الفاتح"
              : "تفعيل الوضع الليلي"
          }
          title={
            theme === "dark"
              ? "الوضع الفاتح"
              : "الوضع الليلي"
          }
        >
          {theme === "dark" ? (
            <Sun
              size={20}
              strokeWidth={1.9}
            />
          ) : (
            <Moon
              size={20}
              strokeWidth={1.9}
            />
          )}
        </button>

        {/* ===================================================
            الإشعارات
        ==================================================== */}

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                !notificationsOpen
              )
            }
            className={`
              relative
              flex h-11 w-11
              items-center justify-center
              rounded-xl
              transition-all duration-200

              ${
                notificationsOpen
                  ? `
                    bg-blue-50
                    text-blue-600
                    dark:bg-blue-950/50
                    dark:text-blue-400
                  `
                  : `
                    text-slate-500
                    hover:bg-slate-50
                    hover:text-slate-900
                    dark:text-slate-400
                    dark:hover:bg-slate-800
                    dark:hover:text-white
                  `
              }
            `}
            aria-label="الإشعارات"
          >
            <Bell
              size={20}
              strokeWidth={1.9}
            />

            <span
              className="
                absolute right-2.5 top-2
                h-2 w-2
                rounded-full
                bg-blue-600
                ring-2 ring-white

                dark:ring-slate-950
              "
            />
          </button>

          {notificationsOpen && (
            <div
              className="
                absolute left-0 top-14
                w-[min(320px,calc(100vw-24px))]
                overflow-hidden
                rounded-2xl
                border border-slate-200
                bg-white
                shadow-xl
                shadow-slate-900/10

                dark:border-slate-700
                dark:bg-slate-900
                dark:shadow-black/30
              "
            >
              <div
                className="
                  border-b border-slate-100
                  px-5 py-4
                  dark:border-slate-800
                "
              >
                <h3
                  className="
                    font-semibold
                    text-slate-900
                    dark:text-slate-100
                  "
                >
                  الإشعارات
                </h3>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  آخر التنبيهات والتحديثات
                </p>
              </div>

              <div className="px-5 py-8 text-center">
                <Bell
                  size={28}
                  className="
                    mx-auto mb-3
                    text-slate-300
                    dark:text-slate-600
                  "
                />

                <p
                  className="
                    text-sm
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  لا توجد إشعارات جديدة
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            فاصل
        ==================================================== */}

        <div
          className="
            mx-1
            hidden
            h-8 w-px
            bg-slate-200
            sm:block

            dark:bg-slate-700
          "
        />

        {/* ===================================================
            المستخدم
        ==================================================== */}

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setProfileOpen(
                !profileOpen
              )
            }
            className="
              flex
              items-center
              gap-2
              rounded-xl
              px-1.5
              py-1.5
              transition-all duration-200

              hover:bg-slate-50

              dark:hover:bg-slate-800
            "
          >
            <div
              className="
                flex h-10 w-10
                shrink-0
                items-center justify-center
                rounded-xl
                bg-gradient-to-br
                from-blue-600
                to-indigo-600
                text-white
                shadow-sm
                shadow-blue-200
              "
            >
              <UserCircle2
                size={23}
                strokeWidth={1.8}
              />
            </div>

            <div className="hidden text-right sm:block">
              <p
                className="
                  max-w-32
                  truncate
                  text-sm
                  font-semibold
                  text-slate-800
                  dark:text-slate-100
                "
              >
                {displayName}
              </p>

              <p
                className="
                  text-[11px]
                  text-slate-400
                "
              >
                {roleName}
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`
                hidden
                text-slate-400
                transition-transform
                duration-200
                sm:block

                ${
                  profileOpen
                    ? "rotate-180"
                    : ""
                }
              `}
            />
          </button>

          {/* =================================================
              قائمة الحساب
          ================================================== */}

          {profileOpen && (
            <div
              className="
                absolute left-0 top-14
                w-[min(224px,calc(100vw-24px))]
                overflow-hidden
                rounded-2xl
                border border-slate-200
                bg-white
                p-2
                shadow-xl
                shadow-slate-900/10

                dark:border-slate-700
                dark:bg-slate-900
                dark:shadow-black/30
              "
            >
              <div
                className="
                  border-b border-slate-100
                  px-3 py-3
                  dark:border-slate-800
                "
              >
                <p
                  className="
                    truncate
                    text-sm
                    font-semibold
                    text-slate-900
                    dark:text-slate-100
                  "
                >
                  {displayName}
                </p>

                <p
                  className="
                    mt-1
                    truncate
                    text-xs
                    text-slate-400
                  "
                >
                  {roleName}
                </p>
              </div>

              {/* إعدادات الحساب */}

              <button
                type="button"
                className="
                  mt-2
                  flex w-full
                  items-center gap-3
                  rounded-xl
                  px-3 py-2.5
                  text-sm
                  text-slate-600
                  transition

                  hover:bg-slate-50
                  hover:text-slate-900

                  dark:text-slate-300
                  dark:hover:bg-slate-800
                  dark:hover:text-white
                "
              >
                <Settings size={17} />

                <span>
                  إعدادات الحساب
                </span>
              </button>

              {/* تسجيل الخروج */}

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="
                  flex w-full
                  items-center gap-3
                  rounded-xl
                  px-3 py-2.5
                  text-sm
                  text-red-600
                  transition

                  hover:bg-red-50

                  disabled:cursor-not-allowed
                  disabled:opacity-60

                  dark:text-red-400
                  dark:hover:bg-red-950/40
                "
              >
                <LogOut size={17} />

                <span>
                  {loggingOut
                    ? "جاري تسجيل الخروج..."
                    : "تسجيل الخروج"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}