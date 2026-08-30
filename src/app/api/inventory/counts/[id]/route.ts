import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type CountUser = {
  id: string;
  company_id: string;
  location_id: string | null;
};

type CountItemRow = {
  id: string;
  product_id: string;
  system_quantity: number | string | null;
  counted_quantity: number | string | null;
  difference_quantity: number | string | null;
  notes: string | null;
  products:
    | { id: string; name: string; sku: string }
    | Array<{ id: string; name: string; sku: string }>
    | null;
};

type SaveItem = {
  id: string;
  counted_quantity: number | null;
  notes: string | null;
};

const PAGE_SIZE = 1000;

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function getCurrentUser(
  supabase: SupabaseServerClient
): Promise<CountUser | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, company_id, location_id")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  return error || !data ? null : data;
}

async function hasCountPermission(supabase: SupabaseServerClient) {
  const { data, error } = await supabase.rpc("has_permission", {
    permission_code: "stock.count",
  });
  return { allowed: data === true, error };
}

async function canAccessLocation(
  supabase: SupabaseServerClient,
  user: CountUser,
  locationId: string
) {
  const { data, error } = await supabase.rpc("has_full_location_access");
  return !error && (data === true || user.location_id === locationId);
}

async function loadAllCountItems(
  supabase: SupabaseServerClient,
  countId: string
) {
  const rows: CountItemRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("stock_count_items")
      .select(`
        id,
        product_id,
        system_quantity,
        counted_quantity,
        difference_quantity,
        notes,
        products (id, name, sku)
      `)
      .eq("stock_count_id", countId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return { data: null, error };

    const page = (data ?? []) as CountItemRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

function parseSaveItems(value: unknown): SaveItem[] | null {
  if (!value || typeof value !== "object" || !("items" in value)) return null;

  const rawItems = (value as { items?: unknown }).items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) return null;

  const items: SaveItem[] = [];
  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object") return null;

    const input = rawItem as Record<string, unknown>;
    if (typeof input.id !== "string" || !input.id.trim()) return null;

    let countedQuantity: number | null = null;
    if (
      input.counted_quantity !== null &&
      input.counted_quantity !== undefined &&
      input.counted_quantity !== ""
    ) {
      countedQuantity = Number(input.counted_quantity);
      if (!Number.isFinite(countedQuantity) || countedQuantity < 0) return null;
    }

    items.push({
      id: input.id.trim(),
      counted_quantity: countedQuantity,
      notes: typeof input.notes === "string" ? input.notes.trim() || null : null,
    });
  }

  return items;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { id: countId } = await context.params;
    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
    }

    const permission = await hasCountPermission(supabase);
    if (permission.error) {
      return NextResponse.json(
        { error: "تعذر التحقق من صلاحية المستخدم." },
        { status: 500 }
      );
    }
    if (!permission.allowed) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية إدارة الجرد." },
        { status: 403 }
      );
    }

    const { data: count, error: countError } = await supabase
      .from("stock_counts")
      .select("id, status, location_id, created_by, notes, created_at, completed_at")
      .eq("id", countId)
      .single();

    if (countError || !count) {
      return NextResponse.json(
        { error: countError?.message || "الجرد غير موجود." },
        { status: 404 }
      );
    }

    const { data: location } = await supabase
      .from("locations")
      .select("id, company_id, name, code, is_active")
      .eq("id", count.location_id)
      .eq("company_id", user.company_id)
      .eq("is_active", true)
      .single();

    if (!location) {
      return NextResponse.json(
        { error: "الجرد غير تابع للشركة الحالية." },
        { status: 403 }
      );
    }

    if (!(await canAccessLocation(supabase, user, count.location_id))) {
      return NextResponse.json(
        { error: "لا يمكنك الوصول إلى جرد هذا الموقع." },
        { status: 403 }
      );
    }

    const itemsResult = await loadAllCountItems(supabase, countId);
    if (itemsResult.error || !itemsResult.data) {
      return NextResponse.json(
        { error: itemsResult.error?.message || "تعذر تحميل أصناف الجرد." },
        { status: 500 }
      );
    }

    const items = itemsResult.data.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      system_quantity: Number(item.system_quantity ?? 0),
      counted_quantity:
        item.counted_quantity === null ? null : Number(item.counted_quantity),
      difference_quantity:
        item.difference_quantity === null ? null : Number(item.difference_quantity),
      notes: item.notes,
      products: firstRelation(item.products),
    }));

    return NextResponse.json({
      success: true,
      count: {
        ...count,
        locations: { id: location.id, name: location.name, code: location.code },
        items,
      },
    });
  } catch (error) {
    console.error("GET /api/inventory/counts/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تحميل الجرد." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { id: countId } = await context.params;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول أولًا." }, { status: 401 });
    }

    const items = parseSaveItems(await request.json());
    if (!items) {
      return NextResponse.json(
        { error: "بيانات أصناف الجرد غير صالحة أو تحتوي كمية سالبة." },
        { status: 400 }
      );
    }

    const { error } = await supabase.rpc("save_stock_count_items", {
      target_stock_count_id: countId,
      target_items: items,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes("كثيرة جدًا") ? 429 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ كميات الجرد بنجاح.",
    });
  } catch (error) {
    console.error("PATCH /api/inventory/counts/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حفظ الكميات." },
      { status: 500 }
    );
  }
}
