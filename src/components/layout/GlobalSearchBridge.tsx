"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GlobalSearchBridge() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const button = document.querySelector<HTMLButtonElement>(
      'header button[aria-label="البحث"]'
    );

    if (!button) return;

    function openSearch() {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }

    button.addEventListener("click", openSearch);

    return () => {
      button.removeEventListener("click", openSearch);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/35 px-4 pt-24 backdrop-blur-sm md:hidden"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          setOpen(false);
        }
      }}
    >
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="البحث في النظام"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">البحث في النظام</p>
            <p className="mt-0.5 text-xs text-slate-400">منتج، SKU، باركود، فرع أو مستودع</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="إغلاق البحث"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="relative">
            <Search
              size={19}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="اكتب كلمة البحث..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-teal-500 dark:focus:ring-teal-950/40"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search size={17} />
            بحث
          </button>
        </form>
      </div>
    </div>
  );
}
