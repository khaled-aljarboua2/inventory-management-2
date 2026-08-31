import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function cleanSearch(value: string) {
  return value.replace(/[%,()]/g, " ").trim();
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
  }

  const { data: dbUser, error: userError } = await supabase
    .from("users")
    .select("company_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (userError || !dbUser?.company_id) {
    return NextResponse.json(
      { error: "تعذر التحقق من بيانات المستخدم." },
      { status: 403 }
    );
  }

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(params.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );
  const search = cleanSearch(params.get("q") ?? "");
  const status = params.get("status")?.trim().toLowerCase() ?? "all";

  try {
    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("id, name, code")
      .eq("company_id", dbUser.company_id)
      .eq("is_active", true);

    if (locationsError) throw locationsError;

    const companyLocations = locations ?? [];
    const companyLocationIds = companyLocations.map((location) => location.id);

    if (companyLocationIds.length === 0) {
      return NextResponse.json({
        transfers: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      });
    }

    let matchingLocationIds: string[] = [];

    if (search) {
      const lowered = search.toLocaleLowerCase();
      matchingLocationIds = companyLocations
        .filter(
          (location) =>
            location.name.toLocaleLowerCase().includes(lowered) ||
            location.code.toLocaleLowerCase().includes(lowered)
        )
        .map((location) => location.id);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
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
          created_at,
          updated_at,
          transfer_items (id)
        `,
        { count: "exact" }
      )
      .in("from_location_id", companyLocationIds)
      .in("to_location_id", companyLocationIds)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      const requestNumberFilter = `request_number.ilike.%${search}%`;
      const locationFilters = matchingLocationIds.length
        ? `,from_location_id.in.(${matchingLocationIds.join(",")}),to_location_id.in.(${matchingLocationIds.join(",")})`
        : "";

      query = query.or(`${requestNumberFilter}${locationFilters}`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const locationMap = new Map(
      companyLocations.map((location) => [location.id, location])
    );

    const transfers = (data ?? []).map((transfer) => ({
      id: transfer.id,
      request_number: transfer.request_number,
      from_location_id: transfer.from_location_id,
      to_location_id: transfer.to_location_id,
      status: transfer.status,
      request_date: transfer.request_date,
      notes: transfer.notes ?? null,
      from_location: locationMap.get(transfer.from_location_id) ?? null,
      to_location: locationMap.get(transfer.to_location_id) ?? null,
      items_count: transfer.transfer_items?.length ?? 0,
    }));

    const total = count ?? 0;

    return NextResponse.json({
      transfers,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("GET /api/transfers/list:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "تعذر تحميل طلبات النقل.",
      },
      { status: 500 }
    );
  }
}
