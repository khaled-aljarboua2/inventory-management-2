"use client";

import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { loginWithUsernameOrEmail } from "./actions";

/* ============================================================
   الصفحة الرئيسية
============================================================ */

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-slate-50"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

/* ============================================================
   محتوى صفحة تسجيل الدخول
============================================================ */

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ==========================================================
     رسالة الخطأ
  ========================================================== */

  const accountError = searchParams.get("error");

  const initialError =
    accountError === "account_disabled"
      ? "حسابك غير نشط، يرجى التواصل مع مسؤول النظام."
      : "";

  const [error, setError] = useState(initialError);

  /* ==========================================================
     تسجيل الدخول
  ========================================================== */

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await loginWithUsernameOrEmail(
          identifier,
          password
        );

      if (!result.success) {
        setError(
          result.error ??
            "تعذر تسجيل الدخول."
        );

        setLoading(false);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع."
      );

      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        bg-slate-50
        px-5
        py-10
      "
    >
      {/* =====================================================
          الخلفية
      ====================================================== */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Glow أخضر مزرق */}
        <div
          className="
            absolute
            -right-32
            -top-32
            h-[420px]
            w-[420px]
            rounded-full
            bg-teal-200/40
            blur-3xl
          "
        />

        {/* Glow ثانوي */}
        <div
          className="
            absolute
            -bottom-40
            -left-32
            h-[420px]
            w-[420px]
            rounded-full
            bg-cyan-200/30
            blur-3xl
          "
        />

        {/* Glow مركزي */}
        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[300px]
            w-[300px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-teal-100/30
            blur-3xl
          "
        />

        {/* Grid خفيف */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* =====================================================
          المحتوى
      ====================================================== */}

      <div className="relative z-10 w-full max-w-md">

        {/* ===================================================
            الشعار - بدون خلفية
        ==================================================== */}

     {/* Logo */}
<div className="mb-8 flex justify-center">
  <img
    src="/warevance-logo.PNG"
    alt="WAREVANCE - Inventory & Branch Management"
    className="
      h-auto
      w-full
      max-w-[390px]
      object-contain
    "
  />
</div>
        {/* ===================================================
            بطاقة تسجيل الدخول
        ==================================================== */}

        <div
          className="
            relative
            overflow-hidden
            rounded-3xl
            border
            border-slate-200/80
            bg-white/95
            p-6
            shadow-xl
            shadow-slate-900/[0.06]
            backdrop-blur-xl
            sm:p-8
          "
        >
          {/* الخط العلوي */}
          <div
            className="
              absolute
              inset-x-0
              top-0
              h-[2px]
              bg-gradient-to-r
              from-teal-500
              via-cyan-500
              to-teal-500
            "
          />

          {/* Glow داخلي */}
          <div
            className="
              pointer-events-none
              absolute
              -left-20
              -top-20
              h-40
              w-40
              rounded-full
              bg-teal-100/40
              blur-3xl
            "
          />

          <div className="relative">

            {/* =================================================
                العنوان
            ================================================== */}

            <div className="mb-7">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck
                  size={18}
                  className="text-teal-600"
                />

                <span className="text-xs font-semibold text-teal-600">
                  دخول آمن
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                تسجيل الدخول
              </h2>

              <p className="mt-1.5 text-sm text-slate-400">
                استخدم اسم المستخدم أو البريد الإلكتروني.
              </p>
            </div>

            {/* =================================================
                النموذج
            ================================================== */}

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* اسم المستخدم / البريد */}

              <div>
                <label
                  htmlFor="identifier"
                  className="
                    mb-2
                    block
                    text-sm
                    font-medium
                    text-slate-700
                  "
                >
                  اسم المستخدم أو البريد الإلكتروني
                </label>

                <div className="group relative">

                  <UserRound
                    size={18}
                    strokeWidth={1.8}
                    className="
                      pointer-events-none
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                      transition-colors
                      group-focus-within:text-teal-600
                    "
                  />

                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) =>
                      setIdentifier(
                        event.target.value
                      )
                    }
                    placeholder="اسم المستخدم أو البريد الإلكتروني"
                    autoComplete="username"
                    required
                    disabled={loading}
                    className="
                      h-12
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50/70
                      pr-11
                      pl-4
                      text-sm
                      text-slate-700
                      outline-none
                      transition-all
                      duration-200
                      placeholder:text-slate-400
                      hover:border-slate-300
                      hover:bg-white
                      focus:border-teal-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-teal-50
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />
                </div>
              </div>

              {/* كلمة المرور */}

              <div>
                <label
                  htmlFor="password"
                  className="
                    mb-2
                    block
                    text-sm
                    font-medium
                    text-slate-700
                  "
                >
                  كلمة المرور
                </label>

                <div className="group relative">

                  <LockKeyhole
                    size={18}
                    strokeWidth={1.8}
                    className="
                      pointer-events-none
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                      transition-colors
                      group-focus-within:text-teal-600
                    "
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="
                      h-12
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-slate-50/70
                      pr-11
                      pl-12
                      text-sm
                      tracking-wider
                      text-slate-700
                      outline-none
                      transition-all
                      duration-200
                      placeholder:text-slate-400
                      hover:border-slate-300
                      hover:bg-white
                      focus:border-teal-400
                      focus:bg-white
                      focus:ring-4
                      focus:ring-teal-50
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    disabled={loading}
                    className="
                      absolute
                      left-3
                      top-1/2
                      flex
                      h-8
                      w-8
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-lg
                      text-slate-400
                      transition
                      hover:bg-slate-100
                      hover:text-slate-700
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                    aria-label={
                      showPassword
                        ? "إخفاء كلمة المرور"
                        : "إظهار كلمة المرور"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* رسالة الخطأ */}

              {error && (
                <div
                  role="alert"
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    text-red-700
                  "
                >
                  <span
                    className="
                      mt-0.5
                      flex
                      h-5
                      w-5
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-red-100
                      text-xs
                      font-bold
                    "
                  >
                    !
                  </span>

                  <span>
                    {error}
                  </span>
                </div>
              )}

              {/* زر الدخول */}

              <button
                type="submit"
                disabled={loading}
                className="
                  group
                  relative
                  flex
                  h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  overflow-hidden
                  rounded-xl
                  bg-gradient-to-r
                  from-teal-600
                  to-cyan-600
                  text-sm
                  font-semibold
                  text-white
                  shadow-lg
                  shadow-teal-200/60
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:from-teal-700
                  hover:to-cyan-700
                  hover:shadow-xl
                  hover:shadow-teal-200/70
                  disabled:cursor-not-allowed
                  disabled:translate-y-0
                  disabled:opacity-60
                "
              >
                <span
                  className="
                    absolute
                    inset-0
                    -translate-x-full
                    bg-white/10
                    transition-transform
                    duration-700
                    group-hover:translate-x-full
                  "
                />

                <span
                  className="
                    relative
                    flex
                    items-center
                    gap-2
                  "
                >
                  {loading ? (
                    <>
                      <span
                        className="
                          h-4
                          w-4
                          animate-spin
                          rounded-full
                          border-2
                          border-white/30
                          border-t-white
                        "
                      />

                      <span>
                        جاري تسجيل الدخول...
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        تسجيل الدخول
                      </span>

                      <ArrowLeft
                        size={17}
                        className="
                          transition-transform
                          duration-300
                          group-hover:-translate-x-1
                        "
                      />
                    </>
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* ===================================================
            Footer
        ==================================================== */}

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">
            WAREVANCE · Inventory & Branch Management
          </p>

          <p className="mt-1 text-[10px] text-slate-300">
            الإصدار 1.0
          </p>
        </div>
      </div>
    </main>
  );
}