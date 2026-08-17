import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const { id } = await params;

    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "يجب تسجيل الدخول أولًا.",
        },
        { status: 401 }
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "complete_stock_count",
      {
        target_stock_count_id:
          id,
      }
    );

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر إكمال الجرد.",
      },
      { status: 500 }
    );
  }
}
