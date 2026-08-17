import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

    const { data: items, error } =
      await supabase
        .from("purchase_order_items")
        .select(
          "id, product_id, quantity"
        )
        .eq(
          "purchase_order_id",
          id
        );

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    const { data: receipts, error: receiptError } =
      await supabase
        .from("goods_receipts")
        .select(
          `
          id,
          goods_receipt_items (
            product_id,
            quantity
          )
        `
        )
        .eq(
          "purchase_order_id",
          id
        );

    if (receiptError) {
      return NextResponse.json(
        {
          error:
            receiptError.message,
        },
        {
          status: 500,
        }
      );
    }

    const receivedByItem: Record<
      string,
      number
    > = {};

    for (const item of items ?? []) {
      receivedByItem[item.id] = 0;
    }

    for (const receipt of receipts ?? []) {
      for (const receiptItem of
        receipt.goods_receipt_items ??
        []) {
        const matchingItem =
          items?.find(
            (item) =>
              item.product_id ===
              receiptItem.product_id
          );

        if (!matchingItem) {
          continue;
        }

        receivedByItem[
          matchingItem.id
        ] =
          (receivedByItem[
            matchingItem.id
          ] ?? 0) +
          Number(
            receiptItem.quantity
          );
      }
    }

    return NextResponse.json({
      received: receivedByItem,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر جلب حالة الاستلام.",
      },
      {
        status: 500,
      }
    );
  }
}