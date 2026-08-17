import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

// ========================================
// تعديل وحدة المنتج
// ========================================

export async function PATCH(
  request: Request,
  { params }: Props
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const unitId = body.unitId;
    const conversionFactor = Number(
      body.conversionFactor
    );
    const isBase = Boolean(body.isBase);

    if (!id || !unitId) {
      return NextResponse.json(
        {
          error: "بيانات الوحدة غير مكتملة.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(conversionFactor) ||
      conversionFactor <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "معامل التحويل يجب أن يكون أكبر من صفر.",
        },
        { status: 400 }
      );
    }

    if (isBase && conversionFactor !== 1) {
      return NextResponse.json(
        {
          error:
            "الوحدة الأساسية يجب أن يكون معاملها 1.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "update_product_unit",
      {
        p_product_unit_id: id,
        p_unit_id: unitId,
        p_conversion_factor: conversionFactor,
        p_is_base: isBase,
      }
    );

    if (error) {
      console.error("update_product_unit:", error);

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
      "PATCH /api/products/units/[id]:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء تعديل الوحدة.",
      },
      { status: 500 }
    );
  }
}

// ========================================
// حذف وحدة المنتج
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
          error: "معرف الوحدة مطلوب.",
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "delete_product_unit",
      {
        p_product_unit_id: id,
      }
    );

    if (error) {
      console.error("delete_product_unit:", error);

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
      "DELETE /api/products/units/[id]:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ أثناء حذف الوحدة.",
      },
      { status: 500 }
    );
  }
}