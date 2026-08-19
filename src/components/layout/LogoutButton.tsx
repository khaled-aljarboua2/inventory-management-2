"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="
        flex w-full items-center gap-3
        rounded-xl
        px-3.5 py-3
        text-[15px]
        font-medium
        text-slate-500
        transition-all duration-200

        hover:bg-red-50
        hover:text-red-600

        disabled:cursor-not-allowed
        disabled:opacity-60

        dark:text-slate-400
        dark:hover:bg-red-950/30
        dark:hover:text-red-400
      "
    >
      <LogOut
        size={19}
        strokeWidth={1.9}
      />

      <span>
        {loggingOut
          ? "جاري تسجيل الخروج..."
          : "تسجيل الخروج"}
      </span>
    </button>
  );
}