import DashboardLayout from "@/components/layout/DashboardLayout";
import CountDetail from "./CountDetail";

export default async function StockCountDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] space-y-7"
      >
        <CountDetail countId={id} />
      </div>
    </DashboardLayout>
  );
}