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

async function getCurrentUser() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولًا.");

  const { data: dbUser, error } = await supabase
    .from("users")
    .select("id, company_id, location_id, is_active")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (error || !dbUser) throw new Error("لم يتم العثور على المستخدم في النظام.");

  return { supabase, user: dbUser };
}

async function formatTransferError(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  message: string
) {
  const insufficientStock = message.match(
    /Insufficient Stock for product ([0-9a-f-]{36})\. Available: ([0-9.]+), Required: ([0-9.]+)/i
  );

  if (!insufficientStock) return message;

  const [, productId, availableRaw, requiredRaw] = insufficientStock;

  const { data: product } = await supabase
    .from("products")
    .select("id, name, sku, product_barcodes(barcode, is_default)")
    .eq("id", productId)
    .eq("company_id", companyId)
    .maybeSingle();

  const available = Number(availableRaw);
  const required = Number(requiredRaw);
  const formatQuantity = (value: number) =>
    Number.isFinite(value)
      ? new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 3 }).format(value)
      : String(value);

  if (!product) {
    return `الرصيد غير كافٍ لأحد منتجات الطلب. المتاح: ${formatQuantity(available)}، المطلوب: ${formatQuantity(required)}.`;
  }

  const barcodes = Array.isArray(product.product_barcodes)
    ? product.product_barcodes
    : product.product_barcodes
      ? [product.product_barcodes]
      : [];
  const defaultBarcode = barcodes.find((item) => item?.is_default)?.barcode;
  const barcode = defaultBarcode ?? barcodes.find((item) => item?.barcode)?.barcode ?? null;

  const identifiers = [
    product.sku ? `SKU: ${product.sku}` : null,
    barcode ? `الباركود: ${barcode}` : null,
  ].filter(Boolean);

  return `الرصيد غير كافٍ للمنتج «${product.name}»${identifiers.length ? ` — ${identifiers.join(" — ")}` : ""}. المتاح: ${formatQuantity(available)}، المطلوب: ${formatQuantity(required)}.`;
}

export async function createTransferRequest(input: {
  sourceLocationId: string;
  destinationLocationId: string;
  items: TransferItemInput[];
  notes?: string;
}) {
  try {
    const { supabase } = await getCurrentUser();

    if (!input.sourceLocationId) throw new Error("اختر موقع المصدر.");
    if (!input.destinationLocationId) throw new Error("اختر موقع الوجهة.");
    if (input.sourceLocationId === input.destinationLocationId) {
      throw new Error("لا يمكن أن يكون المصدر والوجهة نفس الموقع.");
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("أضف منتجًا واحدًا على الأقل.");
    }

    for (const item of input.items) {
      if (!item.product_id) throw new Error("يوجد منتج غير محدد.");
      if (!item.unit_id) throw new Error("يجب تحديد الوحدة لكل منتج.");
      const quantity = Number(item.requested_quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("كمية النقل يجب أن تكون أكبر من صفر.");
      }
    }

    const { data, error } = await supabase.rpc("create_transfer_request", {
      source_location_id: input.sourceLocationId,
      destination_location_id: input.destinationLocationId,
      transfer_items: input.items.map((item) => ({
        product_id: item.product_id,
        unit_id: item.unit_id,
        requested_quantity: Number(item.requested_quantity),
      })),
      transfer_notes: input.notes?.trim() || null,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/transfers");
    return { success: true, transferId: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر إنشاء طلب النقل.",
    };
  }
}

export async function updateTransferRequest(input: {
  transferId: string;
  items: TransferItemInput[];
  notes?: string;
}) {
  try {
    const { supabase } = await getCurrentUser();

    if (!input.transferId) throw new Error("رقم طلب النقل غير صالح.");
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("أضف منتجًا واحدًا على الأقل.");
    }

    const seenProducts = new Set<string>();
    for (const item of input.items) {
      if (!item.product_id) throw new Error("يوجد منتج غير محدد.");
      if (!item.unit_id) throw new Error("يجب تحديد الوحدة لكل منتج.");
      const quantity = Number(item.requested_quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("كمية النقل يجب أن تكون أكبر من صفر.");
      }
      if (seenProducts.has(item.product_id)) {
        throw new Error("لا يمكن تكرار نفس المنتج في الطلب.");
      }
      seenProducts.add(item.product_id);
    }

    const { data, error } = await supabase.rpc("update_transfer_request", {
      target_transfer_id: input.transferId,
      target_items: input.items.map((item) => ({
        product_id: item.product_id,
        unit_id: item.unit_id,
        requested_quantity: Number(item.requested_quantity),
      })),
      target_notes: input.notes?.trim() || null,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/transfers");
    revalidatePath(`/transfers/${input.transferId}`);
    return { success: true, transfer: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر تعديل طلب النقل.",
    };
  }
}

export async function processTransfer(transferId: string, action: TransferAction) {
  try {
    const { supabase, user } = await getCurrentUser();

    if (!transferId) throw new Error("رقم طلب النقل غير صالح.");

    const allowedActions: TransferAction[] = ["approve", "prepare", "ship", "receive", "cancel"];
    if (!allowedActions.includes(action)) throw new Error("إجراء النقل غير صالح.");

    const { data, error } = await supabase.rpc("process_transfer", {
      target_transfer_id: transferId,
      target_action: action,
    });

    if (error) {
      throw new Error(await formatTransferError(supabase, user.company_id, error.message));
    }

    revalidatePath("/transfers");
    revalidatePath(`/transfers/${transferId}`);
    return { success: true, transfer: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر تنفيذ عملية النقل.",
    };
  }
}

export async function approveTransfer(transferId: string) {
  return processTransfer(transferId, "approve");
}

export async function prepareTransfer(transferId: string) {
  return processTransfer(transferId, "prepare");
}

export async function shipTransfer(transferId: string) {
  return processTransfer(transferId, "ship");
}

export async function receiveTransfer(transferId: string) {
  return processTransfer(transferId, "receive");
}

export async function cancelTransfer(transferId: string) {
  return processTransfer(transferId, "cancel");
}

export async function createTransfer(input: {
  sourceLocationId: string;
  destinationLocationId: string;
  items: TransferItemInput[];
  notes?: string;
}) {
  return createTransferRequest(input);
}

export async function deleteTransfer(transferId: string) {
  try {
    const { supabase } = await getCurrentUser();
    if (!transferId) throw new Error("رقم طلب النقل غير صالح.");

    const { data, error } = await supabase.rpc("delete_cancelled_transfer", {
      target_transfer_id: transferId,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/transfers");
    revalidatePath(`/transfers/${transferId}`);
    return { success: true, transferId: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر حذف طلب النقل.",
    };
  }
}
