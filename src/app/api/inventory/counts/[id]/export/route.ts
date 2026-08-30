import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { firstRelation } from "@/lib/supabase/relations";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CountItem = {
  product_id: string;
  system_quantity: number | null;
  counted_quantity: number | null;
  difference_quantity: number | null;
  products: {
    name: string;
    sku: string;
  } | {
    name: string;
    sku: string;
  }[] | null;
};

function formatCountDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function styleWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1,
      rightToLeft: true,
    },
  ];

  const header = worksheet.getRow(1);
  header.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F766E" },
  };
  header.alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  header.height = 24;
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const { id: countId } = await params;

  if (!countId) {
    return NextResponse.json(
      { error: "معرّف الجرد مطلوب." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولًا." },
        { status: 401 }
      );
    }

    const [profileResult, permissionResult, fullAccessResult] = await Promise.all([
      supabase
        .from("users")
        .select("company_id, location_id, is_active, roles(name)")
        .eq("auth_user_id", user.id)
        .eq("is_active", true)
        .single(),
      supabase.rpc("has_permission", {
        permission_code: "stock.count",
      }),
      supabase.rpc("has_full_location_access"),
    ]);

    const profile = profileResult.data;

    if (profileResult.error || !profile?.company_id) {
      return NextResponse.json(
        { error: "تعذر التحقق من بيانات المستخدم." },
        { status: 403 }
      );
    }

    if (permissionResult.error || permissionResult.data !== true) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية تصدير تقرير الجرد." },
        { status: 403 }
      );
    }

    const { data: stockCount, error: countError } = await supabase
      .from("stock_counts")
      .select(`
        id,
        status,
        location_id,
        created_at,
        completed_at,
        locations!inner (
          id,
          name,
          code,
          company_id,
          is_active
        ),
        stock_count_items (
          product_id,
          system_quantity,
          counted_quantity,
          difference_quantity,
          products (
            name,
            sku
          )
        )
      `)
      .eq("id", countId)
      .single();

    if (countError || !stockCount) {
      return NextResponse.json(
        { error: "الجرد غير موجود." },
        { status: 404 }
      );
    }

    const location = firstRelation(stockCount.locations);
    const canAccessAllLocations = fullAccessResult.data === true;

    if (
      !location ||
      location.company_id !== profile.company_id ||
      !location.is_active ||
      (!canAccessAllLocations && profile.location_id !== stockCount.location_id)
    ) {
      return NextResponse.json(
        { error: "لا يمكنك الوصول إلى تقرير هذا الجرد." },
        { status: 403 }
      );
    }

    if (stockCount.status !== "completed") {
      return NextResponse.json(
        { error: "يتوفر تقرير Excel بعد إكمال الجرد فقط." },
        { status: 409 }
      );
    }

    const items = (stockCount.stock_count_items ?? []) as CountItem[];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "WAREVANCE";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("تقرير الجرد");
    worksheet.columns = [
      { header: "تاريخ الجرد", key: "date", width: 24 },
      { header: "المنتج", key: "product", width: 34 },
      { header: "SKU / رقم المنتج", key: "sku", width: 22 },
      { header: "الكمية قبل الجرد", key: "before", width: 20 },
      { header: "الكمية الفعلية", key: "counted", width: 18 },
      { header: "الفرق", key: "difference", width: 16 },
      { header: "الكمية بعد الجرد", key: "after", width: 20 },
    ];

    const countDate = stockCount.completed_at ?? stockCount.created_at;

    for (const item of items) {
      const product = Array.isArray(item.products)
        ? item.products[0] ?? null
        : item.products;

      worksheet.addRow({
        date: formatCountDate(countDate),
        product: product?.name ?? "—",
        sku: product?.sku ?? "—",
        before: Number(item.system_quantity ?? 0),
        counted:
          item.counted_quantity === null
            ? "—"
            : Number(item.counted_quantity),
        difference:
          item.difference_quantity === null
            ? "—"
            : Number(item.difference_quantity),
        // This is the reconciled quantity recorded by the completed count.
        // It intentionally does not query today's balance, which could have
        // changed later through sales, purchases, or transfers.
        after:
          item.counted_quantity === null
            ? "—"
            : Number(item.counted_quantity),
      });
    }

    worksheet.getColumn("sku").numFmt = "@";
    ["before", "counted", "difference", "after"].forEach((key) => {
      worksheet.getColumn(key).numFmt = "#,##0.##";
    });
    styleWorksheet(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const dateSuffix = new Date(countDate ?? Date.now())
      .toISOString()
      .slice(0, 10);

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`stock-count-report-${dateSuffix}.xlsx`)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/inventory/counts/[id]/export:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر إنشاء تقرير الجرد.",
      },
      { status: 500 }
    );
  }
}
