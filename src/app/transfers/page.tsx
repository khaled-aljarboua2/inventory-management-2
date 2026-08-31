import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import TransfersList from "./TransfersList";

type Location = {
  id: string;
  company_id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
};

const INITIAL_LIMIT = 50;

export default async function TransfersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ErrorBox message="يجب تسجيل الدخول أولًا." />;
  }

  const { data: dbUser, error: userError } = await supabase
    .from("users")
    .select("id, company_id, location_id, role_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser?.company_id) {
    return <ErrorBox message="لم يتم العثور على المستخدم في النظام." />;
  }

  const companyId = dbUser.company_id;
  const currentLocationId = dbUser.location_id ?? null;

  const [{ data: hasFullAccess }, { data: locations, error: locationsError }] =
    await Promise.all([
      supabase.rpc("has_full_location_access"),
      supabase
        .from("locations")
        .select("id, company_id, name, code, type, is_active")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name"),
    ]);

  if (locationsError) {
    return <ErrorBox message={locationsError.message} />;
  }

  const activeLocations = (locations ?? []) as Location[];
  const locationIds = activeLocations.map((location) => location.id);
  const isGeneralManager = hasFullAccess === true;

  let transfers: Array<{
    id: string;
    request_number: string;
    from_location_id: string;
    to_location_id: string;
    status: string;
    request_date: string;
    notes: string | null;
    transfer_items: Array<{ id: string }>;
  }> = [];
  let totalTransfers = 0;
  const statusCounts = {
    pending: 0,
    approved: 0,
    preparing: 0,
    shipped: 0,
    received: 0,
    cancelled: 0,
  };

  if (locationIds.length > 0) {
    const baseCountQuery = (status: string) =>
      supabase
        .from("transfer_requests")
        .select("id", { count: "exact", head: true })
        .in("from_location_id", locationIds)
        .in("to_location_id", locationIds)
        .eq("status", status);

    const [
      initialTransfers,
      pending,
      approved,
      preparing,
      shipped,
      received,
      cancelled,
    ] = await Promise.all([
      supabase
        .from("transfer_requests")
        .select(
          `
            id,
            request_number,
            from_location_id,
            to_location_id,
            status,
            request_date,
            notes,
            transfer_items (id)
          `,
          { count: "exact" }
        )
        .in("from_location_id", locationIds)
        .in("to_location_id", locationIds)
        .order("created_at", { ascending: false })
        .range(0, INITIAL_LIMIT - 1),
      baseCountQuery("pending"),
      baseCountQuery("approved"),
      baseCountQuery("preparing"),
      baseCountQuery("shipped"),
      baseCountQuery("received"),
      baseCountQuery("cancelled"),
    ]);

    if (initialTransfers.error) {
      return <ErrorBox message={initialTransfers.error.message} />;
    }

    transfers = (initialTransfers.data ?? []) as typeof transfers;
    totalTransfers = initialTransfers.count ?? 0;
    statusCounts.pending = pending.count ?? 0;
    statusCounts.approved = approved.count ?? 0;
    statusCounts.preparing = preparing.count ?? 0;
    statusCounts.shipped = shipped.count ?? 0;
    statusCounts.received = received.count ?? 0;
    statusCounts.cancelled = cancelled.count ?? 0;
  }

  const locationMap = new Map(activeLocations.map((location) => [location.id, location]));

  const formattedTransfers = transfers.map((transfer) => ({
    id: transfer.id,
    request_number: transfer.request_number,
    from_location_id: transfer.from_location_id,
    to_location_id: transfer.to_location_id,
    status: transfer.status,
    request_date: transfer.request_date,
    notes: transfer.notes,
    from_location: locationMap.get(transfer.from_location_id) ?? null,
    to_location: locationMap.get(transfer.to_location_id) ?? null,
    items_count: transfer.transfer_items?.length ?? 0,
  }));

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto w-full max-w-[1600px] space-y-7">
        <div>
          <div className="mb-2 text-sm text-slate-400">إدارة المخزون / طلبات النقل</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">طلبات النقل</h1>
          <p className="mt-2 text-sm text-slate-500">
            إدارة عمليات نقل المخزون بين الفروع والمستودعات.
          </p>
        </div>

        <TransfersList
          initialTransfers={formattedTransfers}
          initialTotal={totalTransfers}
          initialCounts={{ all: totalTransfers, ...statusCounts }}
          locations={activeLocations}
          currentLocationId={currentLocationId}
          isGeneralManager={isGeneralManager}
        />
      </div>
    </DashboardLayout>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <DashboardLayout>
      <div
        dir="rtl"
        className="mx-auto w-full max-w-[1600px] rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        {message}
      </div>
    </DashboardLayout>
  );
}
