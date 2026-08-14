import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = body.productId;
    const barcode = String(body.barcode ?? "").trim();
    const unitId = body.unitId || null;
    const isDefault = Boolean(body.isDefault);

    if (!productId || !barcode) {
      return NextResponse.json(
        { error: "المنتج والباركود مطلوبان." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("add_product_barcode", {
      p_product_id: productId,
      p_barcode: barcode,
      p_unit_id: unitId,
      p_is_default: isDefault,
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
      { error: "حدث خطأ أثناء إضافة الباركود." },
      { status: 500 }
    );
  }
}
