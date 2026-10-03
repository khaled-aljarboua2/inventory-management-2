import { LoaderCircle } from "lucide-react";

export default function DashboardLoading() {
  return (
    <main dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-6">
      <div role="status" className="text-center">
        <LoaderCircle aria-hidden="true" className="mx-auto mb-4 h-8 w-8 animate-spin text-teal-600 motion-reduce:animate-none" />
        <h1 className="text-lg font-semibold text-foreground">جارٍ تحميل لوحة التحكم</h1>
        <p className="mt-2 text-sm text-muted-foreground">نجهّز بيانات حسابك…</p>
      </div>
    </main>
  );
}
