import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">لوحة التحكم</h1>
          <p className="mt-2 text-gray-600">
            مرحبًا بك في نظام إدارة المخزون
          </p>
        </div>

        <StatsGrid />
      </div>
    </DashboardLayout>
  );
}