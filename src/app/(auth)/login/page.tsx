"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  ShieldCheck,
  ArrowLeft,
  PackageCheck,
  ArrowRightLeft,
  Building2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { loginWithUsernameOrEmail } from "./actions";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      if (
        new URLSearchParams(window.location.search).get("error") ===
        "account_disabled"
      ) {
        setError("حسابك غير نشط، يرجى التواصل مع مسؤول النظام.");
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await loginWithUsernameOrEmail(identifier, password);

      if (!result.success) {
        setError(result.error ?? "تعذر تسجيل الدخول.");
        setLoading(false);
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "حدث خطأ غير متوقع."
      );
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f7f6] px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-teal-200/25 blur-3xl" />
        <div className="absolute -bottom-48 -left-40 h-[460px] w-[460px] rounded-full bg-teal-100/35 blur-3xl" />
      </div>

      <section className="relative z-10 grid w-full max-w-[1120px] overflow-hidden rounded-[28px] border border-[#dbe6e3] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.09)] lg:min-h-[660px] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden overflow-hidden bg-[#0b5550] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-300/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.045]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="relative">
            <div className="inline-flex rounded-2xl bg-white px-5 py-3 shadow-sm">
              <Image
                src="/warevance-logo-transparent.png"
                alt="WAREVANCE - Inventory & Branch Management"
                width={2172}
                height={724}
                priority
                className="h-auto w-[230px] object-contain"
              />
            </div>

            <div className="mt-12 max-w-sm">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-50">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                نظام إدارة المخزون والفروع
              </div>

              <h1 className="text-3xl font-bold leading-[1.55] tracking-tight text-white">
                إدارة أوضح للمخزون،
                <br />
                من موقع واحد.
              </h1>

              <p className="mt-4 max-w-xs text-sm leading-7 text-teal-50/75">
                متابعة المنتجات والأرصدة وطلبات النقل والفروع ضمن واجهة تشغيلية موحدة.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              <Feature icon={<PackageCheck size={18} />} label="إدارة المنتجات والأرصدة" />
              <Feature icon={<ArrowRightLeft size={18} />} label="متابعة طلبات النقل" />
              <Feature icon={<Building2 size={18} />} label="إدارة الفروع والمستودعات" />
            </div>
          </div>

          <div className="relative flex items-center gap-2 border-t border-white/10 pt-6 text-xs text-teal-50/55">
            <ShieldCheck size={15} />
            <span>WAREVANCE · Inventory & Branch Management</span>
          </div>
        </aside>

        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <Image
                src="/warevance-logo-transparent.png"
                alt="WAREVANCE - Inventory & Branch Management"
                width={2172}
                height={724}
                priority
                sizes="(max-width: 640px) 260px, 300px"
                className="h-auto w-full max-w-[280px] object-contain"
              />
            </div>

            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
                <ShieldCheck size={15} />
                دخول آمن
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                تسجيل الدخول
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                أدخل بيانات حسابك للوصول إلى لوحة إدارة WAREVANCE.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  اسم المستخدم أو البريد الإلكتروني
                </label>

                <div className="group relative">
                  <UserRound
                    size={18}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-600"
                  />

                  <input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="اسم المستخدم أو البريد الإلكتروني"
                    autoComplete="username"
                    required
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-[#dbe5e3] bg-[#f8fbfa] pr-11 pl-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-[#c6d6d2] hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  كلمة المرور
                </label>

                <div className="group relative">
                  <LockKeyhole
                    size={18}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-teal-600"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    className="h-12 w-full rounded-xl border border-[#dbe5e3] bg-[#f8fbfa] pr-11 pl-12 text-sm tracking-wider text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-[#c6d6d2] hover:bg-white focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={
                      showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold">
                    !
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,118,110,0.16)] transition-all hover:bg-[#115e59] hover:shadow-[0_10px_24px_rgba(15,118,110,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>جاري تسجيل الدخول...</span>
                  </>
                ) : (
                  <>
                    <span>تسجيل الدخول</span>
                    <ArrowLeft
                      size={17}
                      className="transition-transform duration-200 group-hover:-translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-5 text-center">
              <p className="text-[11px] text-slate-400">
                الوصول مخصص للمستخدمين المصرح لهم فقط · الإصدار 1.0
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-teal-50/90 backdrop-blur-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-teal-100">
        {icon}
      </span>
      <span>{label}</span>
    </div>
  );
}
