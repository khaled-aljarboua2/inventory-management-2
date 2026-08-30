"use client";

import { useMemo, useState } from "react";
import {
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import ProductSearchPicker, {
  type ProductSearchResult,
} from "@/components/products/ProductSearchPicker";

import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  deletePurchaseOrder,
  receivePurchaseOrder,
} from "./actions";

type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type Location = {
  id: string;
  name: string;
  code: string;
  type: string;
};

type Unit = {
  id: string;
  name: string;
  symbol: string | null;
};

type OrderItem = {
  id: string;
  product_id: string;
  unit_id: string;
  quantity: number;
  unit_cost: number;
  total: number;

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

type Order = {
  id: string;
  order_number: string;
  supplier_id: string;
  location_id: string;
  status: string;
  ordered_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;

  suppliers:
    | {
        id: string;
        name: string;
      }
    | null;

  locations:
    | {
        id: string;
        name: string;
        code: string;
      }
    | null;

  purchase_order_items: OrderItem[];
};

type Props = {
  orders: Order[];
  suppliers: Supplier[];
  locations: Location[];
  units: Unit[];
};

type NewItem = {
  product_id: string;
  unit_id: string;
  quantity: string;
  unit_cost: string;
};

type ReceiptItem = {
  item: OrderItem;
  orderedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
};

export default function PurchaseTable({
  orders,
  suppliers,
  locations,
  units,
}: Props) {
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showCreate, setShowCreate] =
    useState(false);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [showReceive, setShowReceive] =
    useState(false);

  const [supplierId, setSupplierId] =
    useState("");

  const [locationId, setLocationId] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [newItems, setNewItems] =
    useState<NewItem[]>([
      {
        product_id: "",
        unit_id: "",
        quantity: "",
        unit_cost: "",
      },
    ]);

  const [receiveQuantities, setReceiveQuantities] =
    useState<Record<string, string>>({});

  const [receiptItems, setReceiptItems] =
    useState<ReceiptItem[]>([]);

  const [receiveNotes, setReceiveNotes] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [selectedProducts, setSelectedProducts] = useState<
    Map<string, ProductSearchResult>
  >(() => new Map());

  const filteredOrders = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.order_number
          .toLowerCase()
          .includes(query) ||
        order.suppliers?.name
          ?.toLowerCase()
          .includes(query) ||
        order.locations?.name
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    orders,
    search,
    statusFilter,
  ]);

  function totalOrder(order: Order) {
    return order.purchase_order_items.reduce(
      (sum, item) =>
        sum + Number(item.total),
      0
    );
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat(
      "ar-SA",
      {
        style: "currency",
        currency: "SAR",
      }
    ).format(value);
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(
      "ar-SA",
      {
        dateStyle: "medium",
      }
    ).format(new Date(value));
  }

  function statusLabel(status: string) {
    switch (
      status.toLowerCase()
    ) {
      case "draft":
        return "مسودة";

      case "approved":
        return "معتمد";

      case "pending":
        return "معلق";

      case "received":
        return "مستلم";

      case "cancelled":
        return "ملغي";

      default:
        return status;
    }
  }

  function statusClass(status: string) {
    switch (
      status.toLowerCase()
    ) {
      case "approved":
        return "bg-teal-50 text-teal-700";

      case "received":
        return "bg-emerald-50 text-emerald-700";

      case "cancelled":
        return "bg-red-50 text-red-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  }

  function addItem() {
    setNewItems((items) => [
      ...items,
      {
        product_id: "",
        unit_id: "",
        quantity: "",
        unit_cost: "",
      },
    ]);
  }

  function removeItem(index: number) {
    setNewItems((items) =>
      items.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  function updateItem(
    index: number,
    field: keyof NewItem,
    value: string
  ) {
    setNewItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function selectProduct(
    index: number,
    product: ProductSearchResult | null
  ) {
    updateItem(index, "product_id", product?.id ?? "");

    if (product) {
      setSelectedProducts((current) => {
        const next = new Map(current);
        next.set(product.id, product);
        return next;
      });
    }
  }

  function resetCreate() {
    setSupplierId("");
    setLocationId("");
    setNotes("");
    setNewItems([
      {
        product_id: "",
        unit_id: "",
        quantity: "",
        unit_cost: "",
      },
    ]);
    setMessage(null);
  }

  async function handleCreate() {
    setLoading(true);
    setMessage(null);

    const items =
      newItems.map((item) => ({
        product_id:
          item.product_id,
        unit_id: item.unit_id,
        quantity:
          Number(item.quantity),
        unit_cost:
          Number(item.unit_cost),
      }));

    const result =
      await createPurchaseOrder({
        supplierId,
        locationId,
        notes,
        items,
      });

    setLoading(false);

    if (!result.success) {
      setMessage(
        result.error ??
          "تعذر إنشاء أمر الشراء."
      );
      return;
    }

    window.location.reload();
  }

  async function handleApprove(
    order: Order
  ) {
    setLoading(true);
    setMessage(null);

    const result =
      await approvePurchaseOrder(
        order.id
      );

    setLoading(false);

    if (!result.success) {
      setMessage(
        result.error ??
          "تعذر اعتماد الأمر."
      );
      return;
    }

    window.location.reload();
  }

  async function handleDelete(
    order: Order
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف أمر الشراء ${order.order_number}؟\n\nسيتم حذف الأمر وأصنافه نهائيًا، ولا يمكن التراجع عن العملية.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const result =
      await deletePurchaseOrder(
        order.id
      );

    setLoading(false);

    if (!result.success) {
      setMessage(
        result.error ??
          "تعذر حذف أمر الشراء."
      );
      return;
    }

    window.location.reload();
  }

  async function handleCancel(
    order: Order
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من إلغاء أمر الشراء ${order.order_number}؟\n\nبعد الإلغاء لن يمكن اعتماد الأمر أو استلامه.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage(null);

    const result =
      await cancelPurchaseOrder(
        order.id
      );

    setLoading(false);

    if (!result.success) {
      setMessage(
        result.error ??
          "تعذر إلغاء أمر الشراء."
      );
      return;
    }

    window.location.reload();
  }

  async function openReceive(order: Order) {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/purchases/${order.id}/receipt-status`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
            "تعذر جلب حالة الاستلام."
        );
      }

      const items: ReceiptItem[] =
        order.purchase_order_items.map(
          (item) => {
            const received =
              Number(
                result.received?.[
                  item.id
                ] ?? 0
              );

            const ordered =
              Number(item.quantity);

            const remaining = Math.max(
              ordered - received,
              0
            );

            return {
              item,
              orderedQuantity: ordered,
              receivedQuantity: received,
              remainingQuantity:
                remaining,
            };
          }
        );

      setSelectedOrder(order);
      setReceiptItems(items);

      const initial: Record<
        string,
        string
      > = {};

      items.forEach((item) => {
        initial[item.item.id] =
          item.remainingQuantity > 0
            ? String(
                item.remainingQuantity
              )
            : "0";
      });

      setReceiveQuantities(initial);
      setReceiveNotes("");
      setShowReceive(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "تعذر جلب حالة الاستلام."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReceive() {
    if (!selectedOrder) {
      return;
    }

    setMessage(null);

    const items =
      receiptItems
        .map((receiptItem) => {
          const requested =
            Number(
              receiveQuantities[
                receiptItem.item.id
              ] ?? 0
            );

          const remaining =
            receiptItem.remainingQuantity;

          if (
            requested < 0 ||
            requested > remaining
          ) {
            throw new Error(
              `كمية الاستلام للصنف "${receiptItem.item.products?.name ?? ""}" يجب ألا تتجاوز الكمية المتبقية (${remaining}).`
            );
          }

          return {
            purchase_order_item_id:
              receiptItem.item.id,
            quantity: requested,
          };
        })
        .filter(
          (item) =>
            item.quantity > 0
        );

    if (!items.length) {
      setMessage(
        "لا توجد كمية متبقية للاستلام."
      );
      return;
    }

    setLoading(true);

    const result =
      await receivePurchaseOrder({
        purchaseOrderId:
          selectedOrder.id,
        items,
        notes: receiveNotes,
      });

    setLoading(false);

    if (!result.success) {
      setMessage(
        result.error ??
          "تعذر استلام الأمر."
      );
      return;
    }

    window.location.reload();
  }

  const totalRemaining =
    receiptItems.reduce(
      (sum, item) =>
        sum + item.remainingQuantity,
      0
    );

  return (
    <>
      {/* القائمة الرئيسية */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                أوامر الشراء
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredOrders.length}{" "}
                أمر
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:w-80">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="ابحث برقم الأمر أو المورد..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 text-sm outline-none focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              >
                <option value="all">
                  جميع الحالات
                </option>

                <option value="draft">
                  مسودة
                </option>

                <option value="approved">
                  معتمد
                </option>

                <option value="received">
                  مستلم
                </option>

                <option value="cancelled">
                  ملغي
                </option>
              </select>

              <button
                type="button"
                onClick={() => {
                  resetCreate();
                  setShowCreate(true);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-md"
              >
                <Plus size={17} />
                أمر شراء جديد
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs text-slate-500">
                  رقم الأمر
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  المورد
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  الموقع
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  المنتجات
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  الإجمالي
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  الحالة
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  التاريخ
                </th>

                <th className="px-6 py-4 text-xs text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-20 text-center"
                  >
                    <ShoppingCart
                      size={32}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="font-semibold text-slate-700">
                      لا توجد أوامر شراء
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(
                  (order) => (
                    <tr
                      key={order.id}
                      className="transition hover:bg-teal-50/40"
                    >
                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                          className="font-mono text-sm font-bold text-slate-800 transition-colors hover:text-teal-600"
                        >
                          {
                            order.order_number
                          }
                        </button>
                      </td>

                      <td className="px-6 py-5 font-medium text-slate-700">
                        {
                          order.suppliers
                            ?.name
                        }
                      </td>

                      <td className="px-6 py-5">
                        <p className="font-medium text-slate-700">
                          {
                            order.locations
                              ?.name
                          }
                        </p>

                        <p className="text-xs text-slate-400">
                          {
                            order.locations
                              ?.code
                          }
                        </p>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {
                          order
                            .purchase_order_items
                            .length
                        }
                      </td>

                      <td className="px-6 py-5 font-semibold text-slate-800">
                        {formatMoney(
                          totalOrder(
                            order
                          )
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
                            order.status
                          )}`}
                        >
                          {statusLabel(
                            order.status
                          )}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-500">
                        {formatDate(
                          order.created_at
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOrder(
                                order
                              )
                            }
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-teal-600 transition-colors hover:bg-teal-50"
                          >
                            التفاصيل
                          </button>

                          {order.status ===
                            "draft" && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  loading
                                }
                                onClick={() =>
                                  handleApprove(
                                    order
                                  )
                                }
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                              >
                                اعتماد
                              </button>

                              <button
                                type="button"
                                disabled={
                                  loading
                                }
                                onClick={() =>
                                  handleDelete(
                                    order
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                                حذف
                              </button>
                            </>
                          )}

                          {order.status ===
                            "approved" && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  loading
                                }
                                onClick={() =>
                                  handleCancel(
                                    order
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                إلغاء
                              </button>

                              <button
                                type="button"
                                disabled={
                                  loading
                                }
                                onClick={() =>
                                  openReceive(
                                    order
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                              >
                                <PackageCheck
                                  size={14}
                                />
                                استلام
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* إنشاء أمر شراء */}
      {showCreate && (
        <Modal
          title="إنشاء أمر شراء"
          subtitle="أدخل بيانات أمر الشراء والمنتجات المطلوبة."
          onClose={() =>
            setShowCreate(false)
          }
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="المورد">
                <select
                  value={supplierId}
                  onChange={(event) =>
                    setSupplierId(
                      event.target.value
                    )
                  }
                  className="input"
                >
                  <option value="">
                    اختر المورد
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field label="الموقع المستلم">
                <select
                  value={locationId}
                  onChange={(event) =>
                    setLocationId(
                      event.target.value
                    )
                  }
                  className="input"
                >
                  <option value="">
                    اختر الموقع
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name} (
                        {location.code})
                      </option>
                    )
                  )}
                </select>
              </Field>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">
                  المنتجات
                </h3>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
                >
                  <Plus size={14} />
                  إضافة منتج
                </button>
              </div>

              {newItems.map(
                (item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-4">
                      <ProductSearchPicker
                        value={item.product_id}
                        initialProduct={
                          selectedProducts.get(item.product_id) ?? null
                        }
                        disabled={loading}
                        onChange={(product) => selectProduct(index, product)}
                      />

                      <select
                        value={
                          item.unit_id
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "unit_id",
                            event.target
                              .value
                          )
                        }
                        className="input"
                      >
                        <option value="">
                          الوحدة
                        </option>

                        {units.map(
                          (unit) => (
                            <option
                              key={unit.id}
                              value={unit.id}
                            >
                              {unit.name}
                              {unit.symbol
                                ? ` (${unit.symbol})`
                                : ""}
                            </option>
                          )
                        )}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={
                          item.quantity
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "quantity",
                            event.target
                              .value
                          )
                        }
                        placeholder="الكمية"
                        className="input"
                      />

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={
                          item.unit_cost
                        }
                        onChange={(event) =>
                          updateItem(
                            index,
                            "unit_cost",
                            event.target
                              .value
                          )
                        }
                        placeholder="سعر الوحدة"
                        className="input"
                      />
                    </div>

                    {newItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            index
                          )
                        }
                        className="mt-3 text-xs font-semibold text-red-500"
                      >
                        حذف المنتج
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            <Field label="ملاحظات">
              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="ملاحظات أمر الشراء..."
                className="input resize-none py-3"
              />
            </Field>

            {message && (
              <Message text={message} />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleCreate}
                className="flex-1 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-teal-700 hover:shadow-md disabled:opacity-50"
              >
                {loading
                  ? "جاري الحفظ..."
                  : "إنشاء أمر الشراء"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* تفاصيل الأمر */}
      {selectedOrder &&
        !showReceive && (
          <Modal
            title={
              selectedOrder.order_number
            }
            subtitle="تفاصيل أمر الشراء"
            onClose={() =>
              setSelectedOrder(null)
            }
          >
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <Info
                  label="المورد"
                  value={
                    selectedOrder
                      .suppliers?.name ??
                    "—"
                  }
                />

                <Info
                  label="الموقع"
                  value={
                    selectedOrder
                      .locations?.name ??
                    "—"
                  }
                />

                <Info
                  label="الحالة"
                  value={statusLabel(
                    selectedOrder.status
                  )}
                />
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-right">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-xs text-slate-500">
                        المنتج
                      </th>

                      <th className="px-4 py-3 text-xs text-slate-500">
                        الوحدة
                      </th>

                      <th className="px-4 py-3 text-xs text-slate-500">
                        الكمية
                      </th>

                      <th className="px-4 py-3 text-xs text-slate-500">
                        السعر
                      </th>

                      <th className="px-4 py-3 text-xs text-slate-500">
                        الإجمالي
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.purchase_order_items.map(
                      (item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 text-sm font-semibold">
                            {
                              item.products
                                ?.name
                            }
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-500">
                            {
                              item.units
                                ?.name
                            }
                          </td>

                          <td className="px-4 py-4 text-sm">
                            {
                              item.quantity
                            }
                          </td>

                          <td className="px-4 py-4 text-sm">
                            {formatMoney(
                              Number(
                                item.unit_cost
                              )
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm font-bold">
                            {formatMoney(
                              Number(
                                item.total
                              )
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between rounded-2xl bg-teal-50 p-4">
                <span className="font-semibold text-slate-500">
                  الإجمالي
                </span>

                <span className="text-xl font-bold text-teal-700">
                  {formatMoney(
                    totalOrder(
                      selectedOrder
                    )
                  )}
                </span>
              </div>

              {selectedOrder.notes && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    الملاحظات
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {
                      selectedOrder.notes
                    }
                  </p>
                </div>
              )}

              {selectedOrder.status ===
                "approved" && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      handleCancel(
                        selectedOrder
                      )
                    }
                    className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    إلغاء أمر الشراء
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      openReceive(
                        selectedOrder
                      )
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-teal-700 hover:shadow-md disabled:opacity-50"
                  >
                    <PackageCheck
                      size={17}
                    />
                    استلام البضاعة
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}

      {/* نافذة الاستلام */}
      {showReceive &&
        selectedOrder && (
          <Modal
            title={`استلام ${selectedOrder.order_number}`}
            subtitle="حدد الكميات التي تم استلامها فعليًا."
            onClose={() => {
              setShowReceive(false);
              setSelectedOrder(null);
            }}
          >
            <div className="space-y-5">
              <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-800">
                الموقع المستلم:
                <strong className="mr-1">
                  {
                    selectedOrder
                      .locations?.name
                  }
                </strong>
              </div>

              {receiptItems.map(
                (receiptItem) => {
                  const item =
                    receiptItem.item;

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {
                              item.products
                                ?.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            SKU:{" "}
                            {
                              item.products
                                ?.sku
                            }
                          </p>
                        </div>

                        <PackageCheck
                          size={20}
                          className={
                            receiptItem.remainingQuantity >
                            0
                              ? "text-teal-500"
                              : "text-emerald-500"
                          }
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[11px] text-slate-400">
                            المطلوب
                          </p>

                          <p className="mt-1 font-bold text-slate-800">
                            {
                              receiptItem.orderedQuantity
                            }
                          </p>
                        </div>

                        <div className="rounded-xl bg-teal-50 p-3">
                          <p className="text-[11px] text-teal-500">
                            المستلم
                          </p>

                          <p className="mt-1 font-bold text-teal-700">
                            {
                              receiptItem.receivedQuantity
                            }
                          </p>
                        </div>

                        <div
                          className={`rounded-xl p-3 ${
                            receiptItem.remainingQuantity >
                            0
                              ? "bg-teal-50"
                              : "bg-emerald-50"
                          }`}
                        >
                          <p
                            className={`text-[11px] ${
                              receiptItem.remainingQuantity >
                              0
                                ? "text-teal-500"
                                : "text-emerald-500"
                            }`}
                          >
                            المتبقي
                          </p>

                          <p
                            className={`mt-1 font-bold ${
                              receiptItem.remainingQuantity >
                              0
                                ? "text-teal-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {
                              receiptItem.remainingQuantity
                            }
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          كمية الاستلام الآن
                        </label>

                        <input
                          type="number"
                          min="0"
                          max={
                            receiptItem.remainingQuantity
                          }
                          step="any"
                          disabled={
                            receiptItem.remainingQuantity ===
                            0
                          }
                          value={
                            receiveQuantities[
                              item.id
                            ] ?? "0"
                          }
                          onChange={(event) => {
                            const value =
                              Number(
                                event.target
                                  .value
                              );

                            const max =
                              receiptItem.remainingQuantity;

                            if (
                              value > max
                            ) {
                              setReceiveQuantities(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [item.id]:
                                    String(
                                      max
                                    ),
                                })
                              );

                              return;
                            }

                            setReceiveQuantities(
                              (
                                current
                              ) => ({
                                ...current,
                                [item.id]:
                                  event
                                    .target
                                    .value,
                              })
                            );
                          }}
                          className="input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        />

                        {receiptItem.remainingQuantity ===
                          0 && (
                          <p className="mt-2 text-xs font-medium text-emerald-600">
                            تم استلام هذا الصنف بالكامل.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              {totalRemaining === 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <PackageCheck
                    size={30}
                    className="mx-auto mb-2 text-emerald-600"
                  />

                  <p className="font-bold text-emerald-800">
                    تم استلام أمر الشراء بالكامل
                  </p>

                  <p className="mt-1 text-sm text-emerald-600">
                    لا توجد كميات متبقية للاستلام.
                  </p>
                </div>
              )}

              <Field label="ملاحظات الاستلام">
                <textarea
                  value={receiveNotes}
                  onChange={(event) =>
                    setReceiveNotes(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="ملاحظات الاستلام..."
                  className="input resize-none py-3"
                />
              </Field>

              {message && (
                <Message text={message} />
              )}

              {totalRemaining > 0 && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleReceive}
                  className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-teal-700 hover:shadow-md disabled:opacity-50"
                >
                  {loading
                    ? "جاري الاستلام..."
                    : "تأكيد الاستلام"}
                </button>
              )}
            </div>
          </Modal>
        )}
    </>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(event) =>
          event.stopPropagation()
        }
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              {subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Message({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {text}
    </div>
  );
}
