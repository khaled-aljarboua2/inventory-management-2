"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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
  CheckCheck,
  Loader2,
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

type Notification = {
  id: string;
  user_id: string;
  title: string | null;
  message: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

/* ============================================================
   Supabase Client
   إنشاء Client واحد فقط على مستوى الملف
============================================================ */

const supabase = createClient();

export default function Topbar({
  profile,
}: {
  profile: Profile;
}) {
  const router = useRouter();

  const searchRef =
    useRef<HTMLInputElement>(null);

  const notificationsRef =
    useRef<HTMLDivElement>(null);

  /* ==========================================================
     معرف مستخدم النظام
  ========================================================== */

  const dbUserIdRef =
    useRef<string | null>(null);

  /* ==========================================================
     حالة التهيئة
  ========================================================== */

  const initializedRef =
    useRef(false);

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

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([]);

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false);

  const [
    markingReadId,
    setMarkingReadId,
  ] = useState<string | null>(null);

  const [
    markingAllRead,
    setMarkingAllRead,
  ] = useState(false);

  const { theme, toggleTheme } =
    useTheme();

  const displayName =
    profile?.full_name?.trim() ||
    profile?.username ||
    profile?.email ||
    "مستخدم النظام";

  const roleName =
    profile?.roles?.name ?? "مستخدم";

  /* ==========================================================
     عدد الإشعارات غير المقروءة
  ========================================================== */

  const unreadCount =
    notifications.filter(
      (notification) =>
        notification.is_read !== true
    ).length;

  /* ==========================================================
     تحميل الإشعارات
     
     مهم:
     هذه الدالة تستقبل dbUserId مباشرة.
     لا تستدعي auth.getUser()
     ولا تستعلم من users.
  ========================================================== */

  const loadNotifications =
    useCallback(
      async (dbUserId: string) => {
        setNotificationsLoading(true);

        try {
          const {
            data,
            error,
          } = await supabase
            .from("notifications")
            .select(
              `
                id,
                user_id,
                title,
                message,
                is_read,
                created_at
              `
            )
            .eq(
              "user_id",
              dbUserId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            )
            .limit(10);

          if (error) {
            console.error(
              "Notifications load error:",
              error
            );

            return;
          }

          setNotifications(
            (data ?? []) as Notification[]
          );
        } catch (error) {
          console.error(
            "Notifications error:",
            error
          );
        } finally {
          setNotificationsLoading(false);
        }
      },
      []
    );

  /* ==========================================================
     التهيئة مرة واحدة
     
     هنا فقط:
     
     auth.getUser()
        ↓
     users.id
        ↓
     تحميل notifications
        ↓
     إنشاء Realtime
     
     بعد ذلك لا نعيد auth/users في كل تحديث.
  ========================================================== */

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    let cancelled = false;

    let channel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    let interval:
      | number
      | null = null;

    async function initialize() {
      try {
        /* ======================================================
           المستخدم الحالي
        ====================================================== */

        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (!user || cancelled) {
          setNotifications([]);

          return;
        }

        /* ======================================================
           مستخدم النظام
           
           يتم تنفيذه مرة واحدة فقط.
        ====================================================== */

        const {
          data: dbUser,
          error: userError,
        } = await supabase
          .from("users")
          .select("id")
          .eq(
            "auth_user_id",
            user.id
          )
          .eq(
            "is_active",
            true
          )
          .maybeSingle();

        if (
          userError ||
          !dbUser ||
          cancelled
        ) {
          setNotifications([]);

          return;
        }

        const dbUserId =
          dbUser.id;

        dbUserIdRef.current =
          dbUserId;

        /* ======================================================
           تحميل الإشعارات الأولي
        ====================================================== */

        await loadNotifications(
          dbUserId
        );

        if (cancelled) {
          return;
        }

        /* ======================================================
           التحديث الدوري
           
           لا يوجد auth.getUser()
           ولا users query هنا.
        ====================================================== */

        interval =
          window.setInterval(
            () => {
              if (
                !cancelled &&
                dbUserIdRef.current
              ) {
                void loadNotifications(
                  dbUserIdRef.current
                );
              }
            },
            30000
          );

        /* ======================================================
           Supabase Realtime
        ====================================================== */

        channel =
          supabase
            .channel(
              `notifications-${dbUserId}`
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "notifications",
                filter: `user_id=eq.${dbUserId}`,
              },
              () => {
                if (
                  !cancelled
                ) {
                  void loadNotifications(
                    dbUserId
                  );
                }
              }
            )
            .subscribe();
      } catch (error) {
        console.error(
          "Topbar initialization error:",
          error
        );
      }
    }

    void initialize();

    return () => {
      cancelled = true;

      if (interval !== null) {
        window.clearInterval(
          interval
        );
      }

      if (channel) {
        void supabase.removeChannel(
          channel
        );
      }

      dbUserIdRef.current =
        null;
    };
  }, [
    loadNotifications,
  ]);

  /* ==========================================================
     إغلاق القوائم عند الضغط خارجها
  ========================================================== */

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(
          target
        )
      ) {
        setNotificationsOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* ==========================================================
     Keyboard shortcuts
  ========================================================== */

  useEffect(() => {
    function handleKeyboardShortcut(
      event: KeyboardEvent
    ) {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          "k"
      ) {
        event.preventDefault();

        searchRef.current?.focus();
      }

      if (
        event.key === "Escape"
      ) {
        searchRef.current?.blur();

        setSearchQuery("");

        setProfileOpen(false);

        setNotificationsOpen(
          false
        );
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

  /* ==========================================================
     Search
  ========================================================== */

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
      `/search?q=${encodeURIComponent(
        query
      )}`
    );
  }

  /* ==========================================================
     تعليم إشعار كمقروء
  ========================================================== */

  async function markNotificationAsRead(
    notificationId: string
  ) {
    const notification =
      notifications.find(
        (item) =>
          item.id ===
          notificationId
      );

    if (
      !notification ||
      notification.is_read === true
    ) {
      return;
    }

    setMarkingReadId(
      notificationId
    );

    try {
      const {
        error,
      } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq(
          "id",
          notificationId
        );

      if (error) {
        console.error(
          "Mark notification read error:",
          error
        );

        return;
      }

      setNotifications(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              notificationId
                ? {
                    ...item,
                    is_read: true,
                  }
                : item
          )
      );
    } finally {
      setMarkingReadId(null);
    }
  }

  /* ==========================================================
     تعليم جميع الإشعارات كمقروءة
  ========================================================== */

  async function markAllNotificationsAsRead() {
    if (
      unreadCount === 0 ||
      markingAllRead
    ) {
      return;
    }

    const dbUserId =
      dbUserIdRef.current;

    if (!dbUserId) {
      return;
    }

    setMarkingAllRead(true);

    try {
      const {
        error,
      } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq(
          "user_id",
          dbUserId
        )
        .eq(
          "is_read",
          false
        );

      if (error) {
        console.error(
          "Mark all notifications read error:",
          error
        );

        return;
      }

      setNotifications(
        (current) =>
          current.map(
            (item) => ({
              ...item,
              is_read: true,
            })
          )
      );
    } finally {
      setMarkingAllRead(false);
    }
  }

  /* ==========================================================
     تنسيق وقت الإشعار
  ========================================================== */

  function formatNotificationTime(
    createdAt: string | null
  ) {
    if (!createdAt) {
      return "";
    }

    const date =
      new Date(createdAt);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    const now =
      new Date();

    const difference =
      now.getTime() -
      date.getTime();

    const minutes = Math.floor(
      difference /
        (1000 * 60)
    );

    if (minutes < 1) {
      return "الآن";
    }

    if (minutes < 60) {
      return `منذ ${minutes} دقيقة`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `منذ ${hours} ساعة`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days < 7) {
      return `منذ ${days} يوم`;
    }

    return date.toLocaleDateString(
      "ar-SA",
      {
        day: "numeric",
        month: "short",
      }
    );
  }

  /* ==========================================================
     Logout
  ========================================================== */

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Logout error:",
        error
      );

      setLoggingOut(false);

      return;
    }

    router.replace(
      "/login"
    );

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
        border-b
        border-slate-200/80
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
          Mobile Menu
      ====================================================== */}

      <label
        htmlFor="mobile-sidebar-toggle"
        className="
          flex h-11 w-11
          shrink-0
          cursor-pointer
          items-center
          justify-center
          rounded-xl
          text-slate-600
          transition-all duration-200
          hover:bg-teal-50
          hover:text-teal-700
          md:hidden
          dark:text-slate-300
          dark:hover:bg-teal-950/40
          dark:hover:text-teal-400
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
          Desktop Search
      ====================================================== */}

      <form
        onSubmit={
          handleSearchSubmit
        }
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
            absolute
            right-4 top-1/2
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
            border
            border-slate-200
            bg-slate-50/70
            pr-11 pl-20
            text-sm
            text-slate-700
            outline-none
            transition-all duration-200
            placeholder:text-slate-400
            hover:border-slate-300
            hover:bg-white
            focus:border-teal-400
            focus:bg-white
            focus:ring-4
            focus:ring-teal-50
            dark:border-slate-700
            dark:bg-slate-900
            dark:text-slate-200
            dark:hover:border-slate-600
            dark:focus:border-teal-500
            dark:focus:bg-slate-900
            dark:focus:ring-teal-950/40
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            left-3 top-1/2
            hidden
            -translate-y-1/2
            items-center
            gap-1
            rounded-md
            border
            border-slate-200
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
          Actions
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
        {/* Mobile Search */}

        <button
          type="button"
          onClick={() =>
            searchRef.current?.focus()
          }
          className="
            flex h-11 w-11
            items-center
            justify-center
            rounded-xl
            text-slate-500
            transition-all duration-200
            hover:bg-teal-50
            hover:text-teal-700
            md:hidden
            dark:text-slate-400
            dark:hover:bg-teal-950/40
            dark:hover:text-teal-400
          "
          aria-label="البحث"
        >
          <Search
            size={20}
            strokeWidth={1.9}
          />
        </button>

        {/* Theme */}

        <button
          type="button"
          onClick={toggleTheme}
          className="
            flex h-11 w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            text-slate-500
            transition-all duration-200
            hover:bg-teal-50
            hover:text-teal-700
            dark:text-slate-400
            dark:hover:bg-teal-950/40
            dark:hover:text-teal-400
          "
          aria-label={
            theme === "dark"
              ? "تفعيل الوضع الفاتح"
              : "تفعيل الوضع الليلي"
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
            Notifications
        ==================================================== */}

        <div
          ref={
            notificationsRef
          }
          className="relative"
        >
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                (current) =>
                  !current
              )
            }
            className={`
              relative
              flex h-11 w-11
              items-center
              justify-center
              rounded-xl
              transition-all duration-200
              ${
                notificationsOpen
                  ? `
                    bg-teal-50
                    text-teal-700
                    dark:bg-teal-950/50
                    dark:text-teal-400
                  `
                  : `
                    text-slate-500
                    hover:bg-teal-50
                    hover:text-teal-700
                    dark:text-slate-400
                    dark:hover:bg-teal-950/40
                    dark:hover:text-teal-400
                  `
              }
            `}
            aria-label="الإشعارات"
            aria-expanded={
              notificationsOpen
            }
          >
            <Bell
              size={20}
              strokeWidth={1.9}
            />

            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  -right-0.5
                  -top-0.5
                  flex
                  min-h-5
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-red-600
                  px-1
                  text-[10px]
                  font-bold
                  leading-none
                  text-white
                  ring-2
                  ring-white
                  dark:ring-slate-950
                "
              >
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              className="
                absolute
                left-0 top-14
                z-50
                w-[min(380px,calc(100vw-24px))]
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-xl
                shadow-slate-900/10
                dark:border-slate-700
                dark:bg-slate-900
                dark:shadow-black/30
              "
            >
              {/* Header */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-slate-100
                  px-5
                  py-4
                  dark:border-slate-800
                "
              >
                <div>
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
                    {unreadCount > 0
                      ? `لديك ${unreadCount} إشعار غير مقروء`
                      : "لا توجد إشعارات غير مقروءة"}
                  </p>
                </div>

                {unreadCount >
                  0 && (
                  <button
                    type="button"
                    disabled={
                      markingAllRead
                    }
                    onClick={() =>
                      void markAllNotificationsAsRead()
                    }
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      px-2.5
                      py-2
                      text-xs
                      font-semibold
                      text-teal-700
                      transition
                      hover:bg-teal-50
                      disabled:opacity-50
                      dark:text-teal-400
                      dark:hover:bg-teal-950/40
                    "
                  >
                    {markingAllRead ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCheck
                        size={14}
                      />
                    )}

                    قراءة الكل
                  </button>
                )}
              </div>

              {/* Notifications List */}

              <div
                className="
                  max-h-[420px]
                  overflow-y-auto
                "
              >
                {notificationsLoading &&
                notifications.length ===
                  0 ? (
                  <div
                    className="
                      flex
                      flex-col
                      items-center
                      justify-center
                      px-5
                      py-12
                      text-center
                    "
                  >
                    <Loader2
                      size={28}
                      className="
                        animate-spin
                        text-slate-400
                      "
                    />

                    <p
                      className="
                        mt-3
                        text-sm
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      جاري تحميل الإشعارات...
                    </p>
                  </div>
                ) : notifications.length ===
                  0 ? (
                  <div
                    className="
                      px-5
                      py-12
                      text-center
                    "
                  >
                    <Bell
                      size={30}
                      className="
                        mx-auto
                        mb-3
                        text-slate-300
                        dark:text-slate-600
                      "
                    />

                    <p
                      className="
                        text-sm
                        font-medium
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      لا توجد إشعارات
                    </p>

                    <p
                      className="
                        mt-1
                        text-xs
                        text-slate-400
                      "
                    >
                      ستظهر هنا التنبيهات الجديدة.
                    </p>
                  </div>
                ) : (
                  notifications.map(
                    (
                      notification
                    ) => {
                      const isUnread =
                        notification.is_read !==
                        true;

                      const isMarking =
                        markingReadId ===
                        notification.id;

                      return (
                        <button
                          key={
                            notification.id
                          }
                          type="button"
                          disabled={
                            isMarking
                          }
                          onClick={() =>
                            void markNotificationAsRead(
                              notification.id
                            )
                          }
                          className={`
                            flex
                            w-full
                            gap-3
                            border-b
                            border-slate-100
                            px-5
                            py-4
                            text-right
                            transition
                            dark:border-slate-800
                            ${
                              isUnread
                                ? `
                                  bg-teal-50/60
                                  hover:bg-teal-50
                                  dark:bg-teal-950/20
                                  dark:hover:bg-teal-950/30
                                `
                                : `
                                  bg-white
                                  hover:bg-slate-50
                                  dark:bg-slate-900
                                  dark:hover:bg-slate-800
                                `
                            }
                          `}
                        >
                          {/* Status dot */}

                          <div className="pt-1">
                            <span
                              className={`
                                block
                                h-2.5
                                w-2.5
                                rounded-full
                                ${
                                  isUnread
                                    ? "bg-teal-600"
                                    : "bg-slate-300 dark:bg-slate-600"
                                }
                              `}
                            />
                          </div>

                          {/* Content */}

                          <div className="min-w-0 flex-1">
                            <div
                              className="
                                flex
                                items-start
                                justify-between
                                gap-3
                              "
                            >
                              <p
                                className={`
                                  text-sm
                                  ${
                                    isUnread
                                      ? "font-bold text-slate-900 dark:text-slate-100"
                                      : "font-semibold text-slate-700 dark:text-slate-300"
                                  }
                                `}
                              >
                                {notification.title ||
                                  "إشعار"}
                              </p>

                              {isMarking && (
                                <Loader2
                                  size={
                                    15
                                  }
                                  className="
                                    shrink-0
                                    animate-spin
                                    text-slate-400
                                  "
                                />
                              )}
                            </div>

                            {notification.message && (
                              <p
                                className="
                                  mt-1
                                  line-clamp-2
                                  text-xs
                                  leading-5
                                  text-slate-500
                                  dark:text-slate-400
                                "
                              >
                                {
                                  notification.message
                                }
                              </p>
                            )}

                            <p
                              className="
                                mt-2
                                text-[10px]
                                text-slate-400
                              "
                            >
                              {formatNotificationTime(
                                notification.created_at
                              )}
                            </p>
                          </div>
                        </button>
                      );
                    }
                  )
                )}
              </div>

              {/* Footer */}

              {notifications.length >
                0 && (
                <div
                  className="
                    border-t
                    border-slate-100
                    px-5
                    py-3
                    text-center
                    dark:border-slate-800
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      dbUserIdRef.current &&
                      void loadNotifications(
                        dbUserIdRef.current
                      )
                    }
                    className="
                      text-xs
                      font-medium
                      text-slate-400
                      transition
                      hover:text-teal-700
                      dark:hover:text-teal-400
                    "
                  >
                    تحديث الإشعارات
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}

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

        {/* Profile */}

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
              px-1.5 py-1.5
              transition-all duration-200
              hover:bg-teal-50
              dark:hover:bg-teal-950/40
            "
          >
            <div
              className="
                flex h-10 w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-teal-600
                to-teal-500
                text-white
                shadow-sm
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

          {/* Profile Menu */}

          {profileOpen && (
            <div
              className="
                absolute
                left-0 top-14
                w-[min(224px,calc(100vw-24px))]
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
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
                  border-b
                  border-slate-100
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

              {/* Account Settings */}

              <button
                type="button"
                className="
                  mt-2
                  flex w-full
                  items-center
                  gap-3
                  rounded-xl
                  px-3 py-2.5
                  text-sm
                  text-slate-600
                  transition
                  hover:bg-teal-50
                  hover:text-teal-700
                  dark:text-slate-300
                  dark:hover:bg-teal-950/40
                  dark:hover:text-teal-400
                "
              >
                <Settings
                  size={17}
                />

                <span>
                  إعدادات الحساب
                </span>
              </button>

              {/* Logout */}

              <button
                type="button"
                onClick={
                  handleLogout
                }
                disabled={
                  loggingOut
                }
                className="
                  flex w-full
                  items-center
                  gap-3
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
                <LogOut
                  size={17}
                />

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
