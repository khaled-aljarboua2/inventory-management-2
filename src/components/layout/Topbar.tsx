"use client";

import { Bell, Search, UserCircle2 } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">

      <div className="flex items-center gap-3 w-96">
        <Search className="text-gray-500" size={20} />

        <input
          type="text"
          placeholder="ابحث عن منتج أو مستودع..."
          className="w-full outline-none border rounded-lg px-4 py-2"
        />
      </div>

      <div className="flex items-center gap-5">
        <Bell className="cursor-pointer" />

        <div className="flex items-center gap-2">
          <UserCircle2 size={34} />
          <div>
            <p className="font-semibold">المدير</p>
            <p className="text-xs text-gray-500">
              Administrator
            </p>
          </div>
        </div>
      </div>

    </header>
  );
}