"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  PackageOpen,
  Ban,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  approveTransfer,
  prepareTransfer,
  shipTransfer,
  receiveTransfer,
  cancelTransfer,
  updateTransferRequest,
} from "../actions";

type ProductUnit = {
  id: string;
  unit_id: string;
  conversion_factor: number;
  is_base: boolean;

  units: {
    id: string;
    name: string;
    symbol: string | null;
  } | null;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  is_active: boolean;
  product_units: ProductUnit[];
};

type TransferItem = {
  id: string;
  product_id: string;
  unit_id: string;
  requested_quantity: number;
  products:
    | {
        id: string;
        name: string;
        sku: string;
      }
    | null;
  units:
    | {
        id: string;
        name: string;
        symbol: string | null;
      }
    | null;
};

type EditRow = {
  id: string;
  product_id: string;
  unit_id: string;
  quantity: string;
};

type Props = {
  transferId: string;
  status: string;
  items: TransferItem[];
  products: Product[];
  notes: string | null;
};

export default function TransferActions({
  transferId,
  status,
  items,
  products,
  notes,
}: Props) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editOpen, setEditOpen] =
    useState(false);

  function canEdit() {
    return [
      "pending",
      "approved",
      "preparing",
      "shipped",
    ].includes(status);
  }

  async function execute(
    action: () => Promise<{
      success: boolean;
      error?: string;
    }>
  ) {
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await action();

      if (!result.success) {
        setError(
          result.error ||
            "تعذر تنفيذ العملية."
        );
        return;
      }

      router.refresh();

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 300)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    const confirmed =
      window.confirm(
        "هل أنت متأكد من إلغاء طلب النقل؟"
      );

    if (!confirmed) {
      return;
    }

    await execute(() =>
      cancelTransfer(transferId)
    );
  }

  return (
    <>
      <div className="flex flex-col items-stretch gap-2 lg:items-end">
        {error && (
          <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 lg:max-w-sm">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* التعديل */}
          {canEdit() && (
            <ActionButton
              label="تعديل الطلب"
              icon={
                <Pencil size={17} />
              }
              loading={loading}
              onClick={() => {
                setError("");
                setEditOpen(true);
              }}
              variant="slate"
            />
          )}

          {/* الاعتماد */}
          {status === "pending" && (
            <ActionButton
              label="اعتماد الطلب"
              icon={
                <CheckCircle2
                  size={17}
                />
              }
              loading={loading}
              onClick={() =>
                execute(() =>
                  approveTransfer(
                    transferId
                  )
                )
              }
              variant="teal"
            />
          )}

          {/* التجهيز */}
          {status === "approved" && (
            <ActionButton
              label="بدء التجهيز"
              icon={
                <PackageCheck
                  size={17}
                />
              }
              loading={loading}
              onClick={() =>
                execute(() =>
                  prepareTransfer(
                    transferId
                  )
                )
              }
              variant="purple"
            />
          )}

          {/* الشحن */}
          {status === "preparing" && (
            <ActionButton
              label="شحن الطلب"
              icon={
                <Truck size={17} />
              }
              loading={loading}
              onClick={() =>
                execute(() =>
                  shipTransfer(
                    transferId
                  )
                )
              }
              variant="indigo"
            />
          )}

          {/* الاستلام */}
          {status === "shipped" && (
            <ActionButton
              label="تأكيد الاستلام"
              icon={
                <PackageOpen
                  size={17}
                />
              }
              loading={loading}
              onClick={() =>
                execute(() =>
                  receiveTransfer(
                    transferId
                  )
                )
              }
              variant="green"
            />
          )}

          {/* الإلغاء */}
          {[
            "pending",
            "approved",
            "preparing",
          ].includes(status) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <Ban size={16} />
              )}

              إلغاء
            </button>
          )}
        </div>
      </div>

      {editOpen && (
        <TransferEditModal
          transferId={transferId}
          initialItems={items}
          products={products}
          initialNotes={notes}
          onClose={() =>
            setEditOpen(false)
          }
          onSaved={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function ActionButton({
  label,
  icon,
  loading,
  onClick,
  variant,
}: {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  onClick: () => void;
  variant:
    | "teal"
    | "purple"
    | "indigo"
    | "green"
    | "slate";
}) {
  const colors = {
    slate:
      "bg-slate-800 hover:bg-slate-900",

    teal:
      "bg-teal-600 hover:bg-teal-700 hover:shadow-teal-100",

    purple:
      "bg-purple-600 hover:bg-purple-700 hover:shadow-purple-100",

    indigo:
      "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-100",

    green:
      "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 ${colors[variant]}`}
    >
      {loading ? (
        <Loader2
          size={16}
          className="animate-spin"
        />
      ) : (
        icon
      )}

      {loading
        ? "جاري التنفيذ..."
        : label}
    </button>
  );
}

function TransferEditModal({
  transferId,
  initialItems,
  products,
  initialNotes,
  onClose,
  onSaved,
}: {
  transferId: string;
  initialItems: TransferItem[];
  products: Product[];
  initialNotes: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] =
    useState<EditRow[]>(
      initialItems.map((item) => ({
        id: item.id,
        product_id: item.product_id,
        unit_id: item.unit_id,
        quantity: String(
          item.requested_quantity
        ),
      }))
    );

  const [notes, setNotes] =
    useState(
      initialNotes ?? ""
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const activeProducts =
    products.filter(
      (product) =>
        product.is_active !== false
    );

  function addRow() {
    setRows((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        product_id: "",
        unit_id: "",
        quantity: "1",
      },
    ]);
  }

  function removeRow(id: string) {
    setRows((current) =>
      current.length === 1
        ? current
        : current.filter(
            (row) =>
              row.id !== id
          )
    );
  }

  function updateRow(
    id: string,
    field: keyof EditRow,
    value: string
  ) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        if (
          field === "product_id"
        ) {
          const product =
            activeProducts.find(
              (item) =>
                item.id === value
            );

          return {
            ...row,
            product_id: value,
            unit_id:
              product?.product_units?.find(
                (unit) =>
                  unit.is_base
              )?.unit_id ??
              product
                ?.product_units?.[0]
                ?.unit_id ??
              "",
          };
        }

        return {
          ...row,
          [field]: value,
        };
      })
    );
  }

  async function handleSave() {
    setError("");

    if (rows.length === 0) {
      setError(
        "أضف منتجًا واحدًا على الأقل."
      );
      return;
    }

    const invalid =
      rows.find((row) => {
        const quantity =
          Number(row.quantity);

        return (
          !row.product_id ||
          !row.unit_id ||
          !Number.isFinite(
            quantity
          ) ||
          quantity <= 0
        );
      });

    if (invalid) {
      setError(
        "تأكد من تحديد المنتج والوحدة والكمية لكل صنف."
      );
      return;
    }

    const duplicateProducts =
      new Set<string>();

    for (const row of rows) {
      if (
        duplicateProducts.has(
          row.product_id
        )
      ) {
        setError(
          "لا يمكن تكرار نفس المنتج في الطلب."
        );
        return;
      }

      duplicateProducts.add(
        row.product_id
      );
    }

    setLoading(true);

    try {
      const result =
        await updateTransferRequest({
          transferId,
          items: rows.map(
            (row) => ({
              product_id:
                row.product_id,
              unit_id:
                row.unit_id,
              requested_quantity:
                Number(
                  row.quantity
                ),
            })
          ),
          notes,
        });

      if (!result.success) {
        setError(
          result.error ??
            "تعذر تعديل الطلب."
        );
        return;
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ غير متوقع."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* الرأس */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              تعديل طلب النقل
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              يمكنك تعديل المنتجات والكميات والملاحظات.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div>
                <h3 className="font-semibold text-slate-800">
                  أصناف الطلب
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  عدّل نوع المنتج أو الكمية.
                </p>
              </div>

              <button
                type="button"
                onClick={addRow}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                <Plus size={15} />
                إضافة منتج
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-white text-right">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">
                      المنتج
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">
                      الوحدة
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">
                      الكمية
                    </th>

                    <th className="w-16 px-5 py-3" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const product =
                      activeProducts.find(
                        (item) =>
                          item.id ===
                          row.product_id
                      );

                    const units =
                      product?.product_units ??
                      [];

                    return (
                      <tr
                        key={row.id}
                        className="transition hover:bg-slate-50/50"
                      >
                        <td className="px-5 py-4">
                          <select
                            value={
                              row.product_id
                            }
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                "product_id",
                                event.target.value
                              )
                            }
                            disabled={loading}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
                          >
                            <option value="">
                              اختر المنتج
                            </option>

                            {activeProducts.map(
                              (product) => (
                                <option
                                  key={
                                    product.id
                                  }
                                  value={
                                    product.id
                                  }
                                >
                                  {product.name} —{" "}
                                  {product.sku}
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={
                              row.unit_id
                            }
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                "unit_id",
                                event.target.value
                              )
                            }
                            disabled={
                              loading ||
                              !product
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:bg-slate-100"
                          >
                            <option value="">
                              اختر الوحدة
                            </option>

                            {units.map(
                              (item) => (
                                <option
                                  key={
                                    item.id
                                  }
                                  value={
                                    item.unit_id
                                  }
                                >
                                  {item.units
                                    ?.name ??
                                    "وحدة"}
                                  {item.units
                                    ?.symbol
                                    ? ` (${item.units.symbol})`
                                    : ""}
                                </option>
                              )
                            )}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={
                              row.quantity
                            }
                            onChange={(event) =>
                              updateRow(
                                row.id,
                                "quantity",
                                event.target.value
                              )
                            }
                            disabled={loading}
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
                          />
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              removeRow(
                                row.id
                              )
                            }
                            disabled={
                              loading ||
                              rows.length ===
                                1
                            }
                            className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2
                              size={17}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              ملاحظات
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              disabled={loading}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50 disabled:bg-slate-100"
              placeholder="أضف أي ملاحظات..."
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="rounded-xl bg-slate-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "جاري الحفظ..."
                : "حفظ التعديلات"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}