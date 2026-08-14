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
        { error: "معرف الباركود مطلوب." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc(
      "delete_product_barcode",
      {
        p_barcode_id: id,
      }
    );

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
      { error: "حدث خطأ أثناء حذف الباركود." },
      { status: 500 }
    );
  }
}