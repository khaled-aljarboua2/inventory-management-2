"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type TransferItemInput = {
  product_id: string;
  unit_id: string;
  requested_quantity: number;
};

type TransferAction =
  | "approve"
  | "prepare"
  | "ship"
  | "receive"
  | "cancel";

/* ============================================================
   المستخدم الحالي
============================================================ */

async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "يجب تسجيل الدخول أولًا."
    );
  }

  const {
    data: dbUser,
    error,
  } = await supabase
    .from("users")
    .select(
      "id, company_id, location_id, is_active"
    )
    .eq(
      "auth_user_id",
      user.id
    )
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

/* ============================================================
   إنشاء طلب نقل
============================================================ */

export async function createTransferRequest(
  input: {
    sourceLocationId: string;
    destinationLocationId: string;
    items: TransferItemInput[];
    notes?: string;
  }
) {
  try {
    const { supabase } =
      await getCurrentUser();

    if (!input.sourceLocationId) {
      throw new Error(
        "اختر موقع المصدر."
      );
    }

    if (!input.destinationLocationId) {
      throw new Error(
        "اختر موقع الوجهة."
      );
    }

    if (
      input.sourceLocationId ===
      input.destinationLocationId
    ) {
      throw new Error(
        "لا يمكن أن يكون المصدر والوجهة نفس الموقع."
      );
    }

    if (
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
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

      const quantity = Number(
        item.requested_quantity
      );

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "كمية النقل يجب أن تكون أكبر من صفر."
        );
      }
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "create_transfer_request",
      {
        source_location_id:
          input.sourceLocationId,

        destination_location_id:
          input.destinationLocationId,

        transfer_items:
          input.items.map(
            (item) => ({
              product_id:
                item.product_id,

              unit_id:
                item.unit_id,

              requested_quantity:
                Number(
                  item.requested_quantity
                ),
            })
          ),

        transfer_notes:
          input.notes?.trim() ||
          null,
      }
    );

    if (error) {
      throw new Error(
        error.message
      );
    }

    revalidatePath(
      "/transfers"
    );

    return {
      success: true,
      transferId: data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر إنشاء طلب النقل.",
    };
  }
}

/* ============================================================
   تعديل طلب نقل
============================================================ */

export async function updateTransferRequest(
  input: {
    transferId: string;
    items: TransferItemInput[];
    notes?: string;
  }
) {
  try {
    const { supabase } =
      await getCurrentUser();

    if (!input.transferId) {
      throw new Error(
        "رقم طلب النقل غير صالح."
      );
    }

    if (
      !Array.isArray(input.items) ||
      input.items.length === 0
    ) {
      throw new Error(
        "أضف منتجًا واحدًا على الأقل."
      );
    }

    const seenProducts =
      new Set<string>();

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

      const quantity = Number(
        item.requested_quantity
      );

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "كمية النقل يجب أن تكون أكبر من صفر."
        );
      }

      if (
        seenProducts.has(
          item.product_id
        )
      ) {
        throw new Error(
          "لا يمكن تكرار نفس المنتج في الطلب."
        );
      }

      seenProducts.add(
        item.product_id
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "update_transfer_request",
      {
        target_transfer_id:
          input.transferId,

        target_items:
          input.items.map(
            (item) => ({
              product_id:
                item.product_id,

              unit_id:
                item.unit_id,

              requested_quantity:
                Number(
                  item.requested_quantity
                ),
            })
          ),

        target_notes:
          input.notes?.trim() ||
          null,
      }
    );

    if (error) {
      throw new Error(
        error.message
      );
    }

    revalidatePath(
      "/transfers"
    );

    revalidatePath(
      `/transfers/${input.transferId}`
    );

    return {
      success: true,
      transfer: data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر تعديل طلب النقل.",
    };
  }
}

/* ============================================================
   تنفيذ إجراءات النقل
============================================================ */

export async function processTransfer(
  transferId: string,
  action: TransferAction
) {
  try {
    const { supabase } =
      await getCurrentUser();

    if (!transferId) {
      throw new Error(
        "رقم طلب النقل غير صالح."
      );
    }

    const allowedActions: TransferAction[] =
      [
        "approve",
        "prepare",
        "ship",
        "receive",
        "cancel",
      ];

    if (
      !allowedActions.includes(
        action
      )
    ) {
      throw new Error(
        "إجراء النقل غير صالح."
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "process_transfer",
      {
        target_transfer_id:
          transferId,

        target_action:
          action,
      }
    );

    if (error) {
      throw new Error(
        error.message
      );
    }

    revalidatePath(
      "/transfers"
    );

    revalidatePath(
      `/transfers/${transferId}`
    );

    return {
      success: true,
      transfer: data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر تنفيذ عملية النقل.",
    };
  }
}

/* ============================================================
   اعتماد
============================================================ */

export async function approveTransfer(
  transferId: string
) {
  return processTransfer(
    transferId,
    "approve"
  );
}

/* ============================================================
   بدء التجهيز
============================================================ */

export async function prepareTransfer(
  transferId: string
) {
  return processTransfer(
    transferId,
    "prepare"
  );
}

/* ============================================================
   الشحن
============================================================ */

export async function shipTransfer(
  transferId: string
) {
  return processTransfer(
    transferId,
    "ship"
  );
}

/* ============================================================
   الاستلام
============================================================ */

export async function receiveTransfer(
  transferId: string
) {
  return processTransfer(
    transferId,
    "receive"
  );
}

/* ============================================================
   الإلغاء
============================================================ */

export async function cancelTransfer(
  transferId: string
) {
  return processTransfer(
    transferId,
    "cancel"
  );
}

/* ============================================================
   إنشاء باسم createTransfer
   يستخدمه TransferModal
============================================================ */

export async function createTransfer(
  input: {
    sourceLocationId: string;
    destinationLocationId: string;
    items: TransferItemInput[];
    notes?: string;
  }
) {
  return createTransferRequest(
    input
  );
}

/* ============================================================
   حذف طلب نقل ملغى
============================================================ */

export async function deleteTransfer(
  transferId: string
) {
  try {
    const { supabase } =
      await getCurrentUser();

    if (!transferId) {
      throw new Error(
        "رقم طلب النقل غير صالح."
      );
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "delete_cancelled_transfer",
      {
        target_transfer_id:
          transferId,
      }
    );

    if (error) {
      throw new Error(
        error.message
      );
    }

    revalidatePath(
      "/transfers"
    );

    revalidatePath(
      `/transfers/${transferId}`
    );

    return {
      success: true,
      transferId: data,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "تعذر حذف طلب النقل.",
    };
  }
}