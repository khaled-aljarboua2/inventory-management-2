import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: Request,
  { params }: Props
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "معرف الوحدة مطلوب." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc("delete_product_unit", {
      p_product_unit_id: id,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الوحدة." },
      { status: 500 }
    );
  }
}
