import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "معرف أمر الشراء غير موجود." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // التحقق من المستخدم
    const {
      data: {
        user,
      },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول." },
        { status: 401 }
      );
    }

    // جلب أمر الشراء للتأكد من وجوده
    const { data: purchaseOrder, error: orderError } =
      await supabase
        .from("purchase_orders")
        .select("id")
        .eq("id", id)
        .single();

    if (orderError || !purchaseOrder) {
      return NextResponse.json(
        { error: "أمر الشراء غير موجود." },
        { status: 404 }
      );
    }

    // جلب أصناف أمر الشراء
    const { data: orderItems, error: itemsError } =
      await supabase
        .from("purchase_order_items")
        .select("id, product_id, quantity")
        .eq("purchase_order_id", id);

    if (itemsError) {
      console.error(
        "receipt-status purchase_order_items:",
        itemsError
      );

      return NextResponse.json(
        { error: "تعذر جلب أصناف أمر الشراء." },
        { status: 500 }
      );
    }

    // لا توجد أصناف
    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({
        received: {},
      });
    }

    // جلب سندات الاستلام المرتبطة بأمر الشراء
    const { data: receipts, error: receiptsError } =
      await supabase
        .from("goods_receipts")
        .select("id")
        .eq("purchase_order_id", id);

    if (receiptsError) {
      console.error(
        "receipt-status goods_receipts:",
        receiptsError
      );

      return NextResponse.json(
        { error: "تعذر جلب سندات الاستلام." },
        { status: 500 }
      );
    }

    const receiptIds = (receipts ?? []).map(
      (receipt) => receipt.id
    );

    const received: Record<string, number> = {};

    // تهيئة جميع الأصناف بصفر
    for (const item of orderItems) {
      received[item.id] = 0;
    }

    if (receiptIds.length > 0) {
      /*
       * goods_receipt_items في قاعدة بياناتك الحالية
       * لا تحتوي purchase_order_item_id.
       *
       * لذلك نستخدم product_id لمطابقة الاستلام
       * مع صنف أمر الشراء.
       */
      const { data: receiptItems, error: receiptItemsError } =
        await supabase
          .from("goods_receipt_items")
          .select(
            "goods_receipt_id, product_id, quantity"
          )
          .in("goods_receipt_id", receiptIds);

      if (receiptItemsError) {
        console.error(
          "receipt-status goods_receipt_items:",
          receiptItemsError
        );

        return NextResponse.json(
          { error: "تعذر جلب تفاصيل الاستلام." },
          { status: 500 }
        );
      }

      for (const receiptItem of receiptItems ?? []) {
        const matchingOrderItem =
          orderItems.find(
            (item) =>
              item.product_id ===
              receiptItem.product_id
          );

        if (!matchingOrderItem) {
          continue;
        }

        received[matchingOrderItem.id] =
          (received[matchingOrderItem.id] ?? 0) +
          Number(receiptItem.quantity ?? 0);
      }
    }

    return NextResponse.json({
      received,
    });
  } catch (error) {
    console.error(
      "GET /api/purchases/[id]/receipt-status:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع.",
      },
      { status: 500 }
    );
  }
}