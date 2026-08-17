import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

// ========================================
// تعديل الباركود
// ========================================

export async function PATCH(
  request: Request,
  { params }: Props
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const barcode = String(body.barcode ?? "").trim();
    const unitId = body.unitId || null;
    const isDefault = Boolean(body.isDefault);

    if (!id || !barcode) {
      return NextResponse.json(
        {
          error: "معرف الباركود والباركود مطلوبان.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "update_product_barcode",
      {
        p_barcode_id: id,
        p_barcode: barcode,
        p_unit_id: unitId,
        p_is_default: isDefault,
      }
    );

    if (error) {
      console.error(
        "update_product_barcode:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      data,
    });
  } catch (error) {
    console.error(
      "PATCH /api/products/barcodes/[id]:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تعديل الباركود.",
      },
      { status: 500 }
    );
  }
}

// ========================================
// حذف الباركود
// ========================================

export async function DELETE(
  _request: Request,
  { params }: Props
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "معرف الباركود مطلوب.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "delete_product_barcode",
      {
        p_barcode_id: id,
      }
    );

    if (error) {
      console.error(
        "delete_product_barcode:",
        error
      );

      return NextResponse.json(
        {
          error: error.message,
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
      data,
    });
  } catch (error) {
    console.error(
      "DELETE /api/products/barcodes/[id]:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء حذف الباركود.",
      },
      { status: 500 }
    );
  }
}
