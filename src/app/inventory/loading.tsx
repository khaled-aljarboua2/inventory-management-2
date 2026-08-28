function Placeholder({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />;
}

export default function InventoryLoading() {
  return (
    <div dir="rtl" className="mx-auto w-full max-w-[1600px] space-y-6" aria-busy="true" aria-label="جاري تحميل أرصدة المخزون">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Placeholder className="h-4 w-36" />
        <Placeholder className="mt-4 h-9 w-52" />
        <Placeholder className="mt-3 h-4 w-72" />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <section key={index} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <Placeholder className="h-4 w-24" />
            <Placeholder className="mt-4 h-9 w-32" />
            <Placeholder className="mt-4 h-3 w-40" />
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <Placeholder className="h-6 w-36" />
          <Placeholder className="h-11 w-72" />
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 8 }, (_, index) => <Placeholder key={index} className="h-12 w-full" />)}
        </div>
      </section>
    </div>
  );
}
