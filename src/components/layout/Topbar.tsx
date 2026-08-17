"use client";

import { useState } from "react";
import {
  Bell,
  Search,
  UserCircle2,
  ChevronDown,
  Settings,
  LogOut,
} from "lucide-react";

export default function Topbar() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  return (
    <header
      dir="rtl"
      className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-xl"
    >
      {/* البحث */}
      <div className="relative w-full max-w-xl">
        <Search
          size={19}
          strokeWidth={1.8}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="search"
          placeholder="ابحث عن منتج، SKU، باركود أو مستودع..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pr-11 pl-20 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
        />

        <div className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-400 shadow-sm sm:flex">
          <span>Ctrl</span>
          <span>+</span>
          <span>K</span>
        </div>
      </div>

      {/* الجانب الآخر */}
      <div className="mr-6 flex items-center gap-3">

        {/* الإشعارات */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                !notificationsOpen
              )
            }
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
              notificationsOpen
                ? "bg-blue-50 text-blue-600"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
            aria-label="الإشعارات"
          >
            <Bell
              size={20}
              strokeWidth={1.9}
            />

            {/* نقطة الإشعار */}
            <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute left-0 top-14 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-semibold text-slate-900">
                  الإشعارات
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  آخر التنبيهات والتحديثات
                </p>
              </div>

              <div className="px-5 py-8 text-center">
                <Bell
                  size={28}
                  className="mx-auto mb-3 text-slate-300"
                />

                <p className="text-sm text-slate-500">
                  لا توجد إشعارات جديدة
                </p>
              </div>
            </div>
          )}
        </div>

        {/* فاصل */}
        <div className="h-8 w-px bg-slate-200" />

        {/* المستخدم */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setProfileOpen(!profileOpen)
            }
            className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-slate-50"
          >
            {/* الصورة */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-200">
              <UserCircle2
                size={23}
                strokeWidth={1.8}
              />
            </div>

            {/* البيانات */}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                المدير
              </p>

              <p className="text-[11px] text-slate-400">
                Administrator
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`hidden text-slate-400 transition-transform duration-200 sm:block ${
                profileOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {/* قائمة الحساب */}
          {profileOpen && (
            <div className="absolute left-0 top-14 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">

              <div className="border-b border-slate-100 px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  المدير
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Administrator
                </p>
              </div>

              <button
                type="button"
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings size={17} />
                <span>إعدادات الحساب</span>
              </button>

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={17} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
