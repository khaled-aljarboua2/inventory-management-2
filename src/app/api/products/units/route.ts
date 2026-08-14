import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = body.productId;
    const unitId = body.unitId;
    const conversionFactor = Number(body.conversionFactor);
    const isBase = Boolean(body.isBase);

    if (!productId || !unitId) {
      return NextResponse.json(
        { error: "المنتج والوحدة مطلوبان." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
      return NextResponse.json(
        { error: "معامل التحويل غير صحيح." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("add_product_unit", {
      p_product_id: productId,
      p_unit_id: unitId,
      p_conversion_factor: conversionFactor,
      p_is_base: isBase,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data,
    });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة الوحدة." },
      { status: 500 }
    );
  }
}
