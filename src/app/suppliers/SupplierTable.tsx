"use client";

import { useMemo, useState } from "react";
import {
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Truck,
  UserRound,
  X,
  Trash2,
  Power,
} from "lucide-react";

import {
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
  deleteSupplier,
} from "./actions";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_person: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  suppliers: Supplier[];
};

type FormData = {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
};

const emptyForm: FormData = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
};

export default function SupplierTable({
  suppliers,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");
  const [showModal, setShowModal] =
    useState(false);
  const [editingSupplier, setEditingSupplier] =
    useState<Supplier | null>(null);
  const [form, setForm] =
    useState<FormData>(emptyForm);
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const matchesSearch =
        !query ||
        supplier.name.toLowerCase().includes(query) ||
        supplier.contact_person
          ?.toLowerCase()
          .includes(query) ||
        supplier.phone?.toLowerCase().includes(query) ||
        supplier.email?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          supplier.is_active) ||
        (statusFilter === "inactive" &&
          !supplier.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, search, statusFilter]);

  function openCreate() {
    setEditingSupplier(null);
    setForm(emptyForm);
    setMessage(null);
    setShowModal(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name,
      contact_person:
        supplier.contact_person ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
    });

    setMessage(null);
    setShowModal(true);
  }

  function closeModal() {
    if (loading) return;

    setShowModal(false);
    setEditingSupplier(null);
    setForm(emptyForm);
    setMessage(null);
  }

  async function handleSubmit() {
    setMessage(null);
    setLoading(true);

    const result = editingSupplier
      ? await updateSupplier(
          editingSupplier.id,
          form
        )
      : await createSupplier(form);

    setLoading(false);

    if (!result.success) {
      setMessage(result.error ?? "حدث خطأ.");
      return;
    }

    window.location.reload();
  }

  async function handleToggle(
    supplier: Supplier
  ) {
    const action = supplier.is_active
      ? "تعطيل"
      : "تفعيل";

    const confirmed = window.confirm(
      `هل تريد ${action} المورد "${supplier.name}"؟`
    );

    if (!confirmed) return;

    setLoading(true);

    const result = await toggleSupplierStatus(
      supplier.id,
      !supplier.is_active
    );

    setLoading(false);

    if (!result.success) {
      window.alert(
        result.error ??
          "تعذر تغيير حالة المورد."
      );
      return;
    }

    window.location.reload();
  }

  async function handleDelete(
    supplier: Supplier
  ) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف المورد "${supplier.name}"؟\n\nإذا كان المورد مرتبطًا بأوامر شراء فلن يمكن حذفه.`
    );

    if (!confirmed) return;

    setLoading(true);

    const result = await deleteSupplier(
      supplier.id
    );

    setLoading(false);

    if (!result.success) {
      window.alert(
        result.error ?? "تعذر حذف المورد."
      );
      return;
    }

    window.location.reload();
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* رأس الصفحة */}
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                قائمة الموردين
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredSuppliers.length} مورد
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* البحث */}
              <div className="relative sm:w-80">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="ابحث عن مورد..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-50"
                />
              </div>

              {/* الحالة */}
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50"
              >
                <option value="all">
                  جميع الموردين
                </option>

                <option value="active">
                  النشطون
                </option>

                <option value="inactive">
                  غير النشطين
                </option>
              </select>

              {/* إضافة */}
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-teal-600"
              >
                <Plus size={17} />
                إضافة مورد
              </button>
            </div>
          </div>
        </div>

        {/* الجدول */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  المورد
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  المسؤول
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  التواصل
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  العنوان
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الحالة
                </th>

                <th className="px-6 py-4 text-xs font-semibold text-slate-500">
                  الإجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-20 text-center"
                  >
                    <Truck
                      size={34}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="font-semibold text-slate-700">
                      لا يوجد موردون
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      أضف أول مورد للبدء بالمشتريات.
                    </p>

                    <button
                      type="button"
                      onClick={openCreate}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
                    >
                      <Plus size={16} />
                      إضافة مورد
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(
                  (supplier) => (
                    <tr
                      key={supplier.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      {/* المورد */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                            <Truck size={19} />
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {supplier.name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-400">
                              مورد
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* المسؤول */}
                      <td className="px-6 py-5">
                        {supplier.contact_person ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <UserRound
                              size={15}
                              className="text-slate-400"
                            />

                            {supplier.contact_person}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      {/* التواصل */}
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          {supplier.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Phone
                                size={14}
                                className="text-slate-400"
                              />

                              {supplier.phone}
                            </div>
                          )}

                          {supplier.email && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Mail
                                size={14}
                                className="text-slate-400"
                              />

                              {supplier.email}
                            </div>
                          )}

                          {!supplier.phone &&
                            !supplier.email && (
                              <span className="text-sm text-slate-400">
                                —
                              </span>
                            )}
                        </div>
                      </td>

                      {/* العنوان */}
                      <td className="px-6 py-5">
                        {supplier.address ? (
                          <div className="flex max-w-[220px] items-start gap-2 text-sm text-slate-500">
                            <MapPin
                              size={15}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <span>
                              {supplier.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      {/* الحالة */}
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                            supplier.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {supplier.is_active
                            ? "نشط"
                            : "غير نشط"}
                        </span>
                      </td>

                      {/* الإجراءات */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1">
                          {/* تعديل */}
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              openEdit(supplier)
                            }
                            title="تعديل"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-teal-50 hover:text-teal-600"
                          >
                            <Edit3 size={16} />
                          </button>

                          {/* تفعيل / تعطيل */}
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              handleToggle(supplier)
                            }
                            title={
                              supplier.is_active
                                ? "تعطيل"
                                : "تفعيل"
                            }
                            className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                              supplier.is_active
                                ? "text-amber-500 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            <Power size={16} />
                          </button>

                          {/* حذف */}
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() =>
                              handleDelete(supplier)
                            }
                            title="حذف"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
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

      {/* نافذة الإضافة والتعديل */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            dir="rtl"
            onClick={(event) =>
              event.stopPropagation()
            }
            className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingSupplier
                    ? "تعديل المورد"
                    : "إضافة مورد جديد"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {editingSupplier
                    ? "تحديث بيانات المورد."
                    : "أدخل بيانات المورد الأساسية."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-5 p-6">
              {/* اسم المورد */}
              <Field label="اسم المورد *">
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="مثال: شركة التوريد المتحدة"
                  className="input"
                />
              </Field>

              {/* المسؤول + الجوال */}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الشخص المسؤول">
                  <input
                    type="text"
                    value={form.contact_person}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        contact_person:
                          event.target.value,
                      }))
                    }
                    placeholder="اسم المسؤول"
                    className="input"
                  />
                </Field>

                <Field label="رقم الجوال">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="05xxxxxxxx"
                    className="input"
                  />
                </Field>
              </div>

              {/* البريد */}
              <Field label="البريد الإلكتروني">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="supplier@example.com"
                  className="input"
                />
              </Field>

              {/* العنوان */}
              <Field label="العنوان">
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="عنوان المورد..."
                  className="input resize-none py-3"
                />
              </Field>

              {/* الخطأ */}
              {message && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {message}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "جاري الحفظ..."
                    : editingSupplier
                    ? "حفظ التعديلات"
                    : "إضافة المورد"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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