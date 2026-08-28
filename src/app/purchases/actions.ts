"use server";

import { createClient } from "@/lib/supabase/server";

type PurchaseItem = {
  product_id: string;
  unit_id: string;
  quantity: number;
  unit_cost: number;
};

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("يجب تسجيل الدخول أولًا.");
  }

  const { data: dbUser, error } =
    await supabase
      .from("users")
      .select("id, company_id, is_active")
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .single();

  if (error || !dbUser) {
    throw new Error(
      "لم يتم العثور على المستخدم في النظام."
    );
  }

  return {
    supabase,
    user: dbUser,
  };
}

async function checkPermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  permission: string
) {
  const { data, error } =
    await supabase.rpc("has_permission", {
      permission_code: permission,
    });

  if (error) {
    throw new Error(error.message);
  }

  if (data !== true) {
    throw new Error(
      "ليس لديك صلاحية تنفيذ هذه العملية."
    );
  }
}

export async function createPurchaseOrder(input: {
  supplierId: string;
  locationId: string;
  notes: string;
  items: PurchaseItem[];
}) {
  try {
    const { supabase, user } =
      await getCurrentUser();

    await checkPermission(
      supabase,
      "purchases.create"
    );

    if (!input.supplierId) {
      throw new Error("اختر المورد.");
    }

    if (!input.locationId) {
      throw new Error("اختر الموقع.");
    }

    if (!input.items.length) {
      throw new Error(
        "أضف منتجًا واحدًا على الأقل."
      );
    }

    for (const item of input.items) {
      if (!item.product_id) {
        throw new Error(
          "يوجد منتج غير محدد."
        );
      }

      if (!item.unit_id) {
        throw new Error(
          "يجب تحديد الوحدة لكل منتج."
        );
      }

      if (
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new Error(
          "الكمية يجب أن تكون أكبر من صفر."
        );
      }

      if (
        !Number.isFinite(item.unit_cost) ||
        item.unit_cost < 0
      ) {
        throw new Error(
          "سعر الوحدة غير صحيح."
        );
      }
    }

    const { data: supplier } =
      await supabase
        .from("suppliers")
        .select("id")
        .eq("id", input.supplierId)
        .eq("company_id", user.company_id)
        .eq("is_active", true)
        .single();

    if (!supplier) {
      throw new Error(
        "المورد غير صالح."
      );
    }

    const { data: location } =
      await supabase
        .from("locations")
        .select("id")
        .eq("id", input.locationId)
        .eq("company_id", user.company_id)
        .eq("is_active", true)
        .single();

    if (!location) {
      throw new Error(
        "الموقع غير صالح."
      );
    }

    const orderNumber =
      `PO-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error: orderError } =
      await supabase
        .from("purchase_orders")
        .insert({
          id: crypto.randomUUID(),
          company_id: user.company_id,
          supplier_id: input.supplierId,
          location_id: input.locationId,
          order_number: orderNumber,
          status: "draft",
          ordered_by: user.id,
          notes:
            input.notes.trim() || null,
        })
        .select("id, order_number")
        .single();

    if (orderError || !order) {
      throw new Error(
        orderError?.message ??
          "تعذر إنشاء أمر الشراء."
      );
    }

    const items = input.items.map(
      (item) => ({
        id: crypto.randomUUID(),
        purchase_order_id: order.id,
        product_id: item.product_id,
        unit_id: item.unit_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total:
          item.quantity *
          item.unit_cost,
      })
    );

    const { error: itemsError } =
      await supabase
        .from("purchase_order_items")
        .insert(items);

    if (itemsError) {
      await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", order.id);

      throw new Error(
        itemsError.message
      );
    }

    return {
      success: true,
      orderId: order.id,
      orderNumber:
        order.order_number,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع.",
    };
  }
}

export async function approvePurchaseOrder(
  purchaseOrderId: string
) {
  try {
    const { supabase, user } =
      await getCurrentUser();

    await checkPermission(
      supabase,
      "purchases.approve"
    );

    const { data: order, error } =
      await supabase
        .from("purchase_orders")
        .select(
          "id, company_id, status"
        )
        .eq("id", purchaseOrderId)
        .single();

    if (error || !order) {
      throw new Error(
        "أمر الشراء غير موجود."
      );
    }

    if (
      order.company_id !==
      user.company_id
    ) {
      throw new Error(
        "أمر الشراء لا يتبع لشركتك."
      );
    }

    if (
      String(order.status).toLowerCase() !==
      "draft"
    ) {
      throw new Error(
        "لا يمكن اعتماد أمر الشراء بهذه الحالة."
      );
    }

    const { data: items } =
      await supabase
        .from("purchase_order_items")
        .select("id")
        .eq(
          "purchase_order_id",
          purchaseOrderId
        );

    if (!items?.length) {
      throw new Error(
        "لا يمكن اعتماد أمر شراء بدون منتجات."
      );
    }

    const { error: updateError } =
      await supabase
        .from("purchase_orders")
        .update({
          status: "approved",
        })
        .eq("id", purchaseOrderId);

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع.",
    };
  }
}

export async function receivePurchaseOrder(
  input: {
    purchaseOrderId: string;
    items: {
      purchase_order_item_id: string;
      quantity: number;
    }[];
    notes: string;
  }
) {
  try {
    const { supabase } =
      await getCurrentUser();

    const receivedItems =
      input.items.filter(
        (item) =>
          Number(item.quantity) > 0
      );

    if (!receivedItems.length) {
      throw new Error(
        "أدخل كمية واحدة على الأقل للاستلام."
      );
    }

    const { data, error } =
      await supabase.rpc(
        "receive_purchase_order",
        {
          target_purchase_order_id:
            input.purchaseOrderId,

          received_items:
            receivedItems,

          receipt_notes:
            input.notes.trim() || null,
        }
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    return {
      success: true,
      receiptId: data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر استلام أمر الشراء.",
    };
  }
}

/*
|--------------------------------------------------------------------------
| حذف أمر الشراء
|--------------------------------------------------------------------------
|
| يسمح بالحذف فقط إذا:
| 1. المستخدم لديه purchases.delete
| 2. الأمر موجود ويتبع لنفس الشركة
| 3. حالة الأمر draft
| 4. لا يوجد سند استلام مرتبط به
|
*/

export async function deletePurchaseOrder(
  purchaseOrderId: string
) {
  try {
    const { supabase, user } =
      await getCurrentUser();

    await checkPermission(
      supabase,
      "purchases.delete"
    );

    if (!purchaseOrderId) {
      throw new Error(
        "أمر الشراء غير صحيح."
      );
    }

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("purchase_orders")
      .select(
        "id, company_id, status"
      )
      .eq("id", purchaseOrderId)
      .eq(
        "company_id",
        user.company_id
      )
      .single();

    if (orderError || !order) {
      throw new Error(
        "أمر الشراء غير موجود أو لا يتبع لشركتك."
      );
    }

    const status =
      String(order.status).toLowerCase();

    if (status !== "draft") {
      throw new Error(
        "لا يمكن حذف أمر الشراء إلا إذا كانت حالته مسودة."
      );
    }

    /*
     * التأكد من عدم وجود سند استلام
     */
    const {
      data: receipts,
      error: receiptsError,
    } = await supabase
      .from("goods_receipts")
      .select("id")
      .eq(
        "purchase_order_id",
        purchaseOrderId
      )
      .limit(1);

    if (receiptsError) {
      throw new Error(
        receiptsError.message
      );
    }

    if (
      receipts &&
      receipts.length > 0
    ) {
      throw new Error(
        "لا يمكن حذف أمر الشراء لأنه مرتبط بسند استلام."
      );
    }

    /*
     * حذف تفاصيل أمر الشراء أولًا
     */
    const {
      error: itemsError,
    } = await supabase
      .from("purchase_order_items")
      .delete()
      .eq(
        "purchase_order_id",
        purchaseOrderId
      );

    if (itemsError) {
      throw new Error(
        itemsError.message
      );
    }

    /*
     * حذف أمر الشراء
     */
    const {
      error: deleteError,
    } = await supabase
      .from("purchase_orders")
      .delete()
      .eq("id", purchaseOrderId)
      .eq(
        "company_id",
        user.company_id
      );

    if (deleteError) {
      throw new Error(
        deleteError.message
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر حذف أمر الشراء.",
    };
  }
}
export async function cancelPurchaseOrder(
  purchaseOrderId: string
) {
  try {
    const { supabase, user } =
      await getCurrentUser();

    await checkPermission(
      supabase,
      "purchases.cancel"
    );

    if (!purchaseOrderId) {
      throw new Error(
        "أمر الشراء غير صحيح."
      );
    }

    /*
     * جلب أمر الشراء والتأكد من الشركة
     */
    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("purchase_orders")
      .select(
        "id, company_id, status"
      )
      .eq("id", purchaseOrderId)
      .eq(
        "company_id",
        user.company_id
      )
      .single();

    if (orderError || !order) {
      throw new Error(
        "أمر الشراء غير موجود أو لا يتبع لشركتك."
      );
    }

    const status =
      String(order.status).toLowerCase();

    /*
     * الإلغاء مسموح فقط للطلب المعتمد
     */
    if (status !== "approved") {
      throw new Error(
        "لا يمكن إلغاء أمر الشراء إلا إذا كانت حالته معتمدة."
      );
    }

    /*
     * التأكد من عدم وجود أي سند استلام
     */
    const {
      data: receipts,
      error: receiptsError,
    } = await supabase
      .from("goods_receipts")
      .select("id")
      .eq(
        "purchase_order_id",
        purchaseOrderId
      )
      .limit(1);

    if (receiptsError) {
      throw new Error(
        receiptsError.message
      );
    }

    if (
      receipts &&
      receipts.length > 0
    ) {
      throw new Error(
        "لا يمكن إلغاء أمر الشراء لأنه يحتوي على سند استلام."
      );
    }

    /*
     * تغيير الحالة إلى cancelled
     */
    const {
      error: updateError,
    } = await supabase
      .from("purchase_orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchaseOrderId)
      .eq(
        "company_id",
        user.company_id
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر إلغاء أمر الشراء.",
    };
  }
}
