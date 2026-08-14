"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Building2,
  ArrowRightLeft,
  ClipboardList,
  Users,
  Settings,
} from "lucide-react";

const items = [
  { title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
  { title: "المنتجات", href: "/products", icon: Package },
  { title: "المستودعات", href: "/warehouses", icon: Warehouse },
  { title: "الفروع", href: "/branches", icon: Building2 },
  { title: "طلبات النقل", href: "/transfers", icon: ArrowRightLeft },
  { title: "حركة المخزون", href: "/inventory", icon: ClipboardList },
  { title: "المستخدمون", href: "/users", icon: Users },
  { title: "الإعدادات", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-72 border-l bg-white h-screen p-5">
      <h2 className="text-2xl font-bold mb-8">
        إدارة المخزون
      </h2>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-slate-100 transition"
            >
              <Icon size={20} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}