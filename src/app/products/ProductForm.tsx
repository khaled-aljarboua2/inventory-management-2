"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Barcode,
  Check,
  ChevronDown,
  FileText,
  Hash,
  PackagePlus,
  Save,
  Tag,
  X,
} from "lucide-react";

import {
  createProduct,
  getProductUnits,
} from "./actions";

type Option = {
  id: string;
  name: string;
};

type Unit = {
  id: string;
  name: string;
  symbol: string | null;
};

type Props = {
  categories: Option[];
  brands: Option[];
};

export default function ProductForm({
  categories,
  brands,
}: Props) {
  const router = useRouter();

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [categoryId, setCategoryId] =
    useState("");
  const [brandId, setBrandId] =
    useState("");
  const [minimumQuantity, setMinimumQuantity] =
    useState("0");

  // الوحدة
  const [units, setUnits] =
    useState<Unit[]>([]);
  const [unitId, setUnitId] =
    useState("");
  const [conversionFactor, setConversionFactor] =
    useState("1");
  const [isBase, setIsBase] =
    useState(true);

  // الباركود
  const [barcode, setBarcode] =
    useState("");
  const [barcodeUnitId, setBarcodeUnitId] =
    useState("");
  const [barcodeDefault, setBarcodeDefault] =
    useState(true);

  const [loadingUnits, setLoadingUnits] =
    useState(true);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    async function loadUnits() {
      const result =
        await getProductUnits();

      if (result.success) {
        setUnits(result.units);
      } else {
        setError(
          result.error ||
            "حدث خطأ أثناء تحميل الوحدات"
        );
      }

      setLoadingUnits(false);
    }

    loadUnits();
  }, []);

  function handleBaseChange(
    checked: boolean
  ) {
    setIsBase(checked);

    if (checked) {
      setConversionFactor("1");
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    if (!unitId) {
      setError(
        "اختر الوحدة الأساسية للمنتج."
      );
      setLoading(false);
      return;
    }

    const factor =
      Number(conversionFactor);

    if (
      !Number.isFinite(factor) ||
      factor <= 0
    ) {
      setError(
        "معامل التحويل يجب أن يكون أكبر من صفر."
      );
      setLoading(false);
      return;
    }

    if (isBase && factor !== 1) {
      setError(
        "الوحدة الأساسية يجب أن يكون معاملها 1."
      );
      setLoading(false);
      return;
    }

    const result =
      await createProduct({
        sku,
        name,
        description,
        category_id:
          categoryId || undefined,
        brand_id:
          brandId || undefined,
        minimum_quantity:
          Number(minimumQuantity),

        unit_id: unitId,
        conversion_factor: factor,
        is_base: isBase,

        barcode:
          barcode.trim() || undefined,
        barcode_unit_id:
          barcodeUnitId || unitId,
        barcode_is_default:
          barcodeDefault,
      });

    if (!result.success) {
      setError(
        result.error ||
          "حدث خطأ غير متوقع."
      );
      setLoading(false);
      return;
    }

    setSuccess(
      "تم إنشاء المنتج بنجاح."
    );

    setSku("");
    setName("");
    setDescription("");
    setCategoryId("");
    setBrandId("");
    setMinimumQuantity("0");

    setUnitId("");
    setConversionFactor("1");
    setIsBase(true);

    setBarcode("");
    setBarcodeUnitId("");
    setBarcodeDefault(true);

    router.refresh();

    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      dir="rtl"
      className="
        overflow-hidden
        rounded-3xl
        border
        border-slate-200
        bg-white
        shadow-sm
      "
    >
      {/* =====================================================
          Header
      ====================================================== */}

      <div
        className="
          relative
          overflow-hidden
          border-b
          border-slate-100
          bg-gradient-to-l
          from-blue-50
          via-white
          to-white
          px-6
          py-7
          sm:px-8
        "
      >
        <div
          className="
            absolute
            -left-10
            -top-10
            h-32
            w-32
            rounded-full
            bg-blue-100/40
            blur-2xl
          "
        />

        <div className="relative flex items-center gap-4">
          <div
            className="
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-blue-600
              text-white
              shadow-lg
              shadow-blue-200
              transition-transform
              duration-300
              hover:scale-105
            "
          >
            <PackagePlus size={27} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              إضافة منتج جديد
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              أضف بيانات المنتج والوحدة والباركود
              في خطوة واحدة.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          Messages
      ====================================================== */}

      <div className="space-y-4 px-6 pt-6 sm:px-8">
        {error && (
          <div
            className="
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-4
              py-4
              text-sm
              text-red-700
            "
          >
            <X
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            className="
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-emerald-200
              bg-emerald-50
              px-4
              py-4
              text-sm
              text-emerald-700
            "
          >
            <Check
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{success}</span>
          </div>
        )}
      </div>

      <div className="space-y-6 p-6 sm:p-8">

        {/* =====================================================
            Product Information
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
              "
            >
              <Boxes size={20} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                بيانات المنتج
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                المعلومات الأساسية للمنتج.
              </p>
            </div>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2">

            {/* SKU */}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Hash size={15} />
                رمز المنتج (SKU)
              </label>

              <input
                type="text"
                value={sku}
                onChange={(event) =>
                  setSku(event.target.value)
                }
                required
                disabled={loading}
                placeholder="مثال: PRD-001"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  font-mono
                  text-sm
                  outline-none
                  transition-all
                  duration-200
                  placeholder:text-slate-400
                  hover:border-slate-300
                  hover:bg-white
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:opacity-50
                "
              />
            </div>

            {/* Name */}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <PackagePlus size={15} />
                اسم المنتج
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
                disabled={loading}
                placeholder="اسم المنتج"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  text-sm
                  outline-none
                  transition-all
                  duration-200
                  placeholder:text-slate-400
                  hover:border-slate-300
                  hover:bg-white
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:opacity-50
                "
              />
            </div>

            {/* Category */}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Tag size={15} />
                التصنيف
              </label>

              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(event) =>
                    setCategoryId(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  className="
                    h-12
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    pl-10
                    text-sm
                    outline-none
                    transition-all
                    duration-200
                    hover:border-slate-300
                    hover:bg-white
                    focus:border-blue-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-50
                    disabled:opacity-50
                  "
                >
                  <option value="">
                    بدون تصنيف
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />
              </div>
            </div>

            {/* Brand */}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Tag size={15} />
                العلامة التجارية
              </label>

              <div className="relative">
                <select
                  value={brandId}
                  onChange={(event) =>
                    setBrandId(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  className="
                    h-12
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-4
                    pl-10
                    text-sm
                    outline-none
                    transition-all
                    duration-200
                    hover:border-slate-300
                    hover:bg-white
                    focus:border-blue-400
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-50
                    disabled:opacity-50
                  "
                >
                  <option value="">
                    بدون علامة تجارية
                  </option>

                  {brands.map((brand) => (
                    <option
                      key={brand.id}
                      value={brand.id}
                    >
                      {brand.name}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />
              </div>
            </div>

            {/* Minimum */}

            <div className="md:col-span-2">
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Boxes size={15} />
                الحد الأدنى للمخزون
              </label>

              <input
                type="number"
                min="0"
                step="any"
                value={minimumQuantity}
                onChange={(event) =>
                  setMinimumQuantity(
                    event.target.value
                  )
                }
                disabled={loading}
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  text-sm
                  outline-none
                  transition-all
                  duration-200
                  hover:border-slate-300
                  hover:bg-white
                  focus:border-blue-400
                  focus:bg-white
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:opacity-50
                  md:max-w-md
                "
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            Unit
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-slate-50/60">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-50
                  text-blue-600
                "
              >
                <Boxes size={20} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  وحدة المنتج
                </h3>

                <p className="mt-0.5 text-xs text-slate-400">
                  حدد الوحدة الأساسية ومعامل التحويل.
                </p>
              </div>
            </div>

            {unitId && (
              <span
                className="
                  inline-flex
                  w-fit
                  items-center
                  gap-1.5
                  rounded-full
                  bg-emerald-50
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-emerald-700
                "
              >
                <Check size={13} />
                تم اختيار الوحدة
              </span>
            )}
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-3">

            {/* Unit */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                الوحدة
              </label>

              <div className="relative">
                <select
                  value={unitId}
                  onChange={(event) =>
                    setUnitId(
                      event.target.value
                    )
                  }
                  disabled={
                    loading ||
                    loadingUnits
                  }
                  className="
                    h-12
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    pl-10
                    text-sm
                    outline-none
                    transition-all
                    duration-200
                    hover:border-blue-300
                    focus:border-blue-400
                    focus:ring-4
                    focus:ring-blue-50
                    disabled:opacity-50
                  "
                >
                  <option value="">
                    {loadingUnits
                      ? "جاري تحميل الوحدات..."
                      : "اختر الوحدة"}
                  </option>

                  {units.map((unit) => (
                    <option
                      key={unit.id}
                      value={unit.id}
                    >
                      {unit.name}
                      {unit.symbol
                        ? ` (${unit.symbol})`
                        : ""}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />
              </div>
            </div>

            {/* Conversion */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                معامل التحويل
              </label>

              <input
                type="number"
                min="0"
                step="any"
                value={conversionFactor}
                onChange={(event) =>
                  setConversionFactor(
                    event.target.value
                  )
                }
                disabled={
                  loading || isBase
                }
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  text-sm
                  outline-none
                  transition-all
                  duration-200
                  hover:border-blue-300
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:bg-slate-100
                  disabled:text-slate-400
                "
              />

              {isBase && (
                <p className="mt-1.5 text-xs text-slate-400">
                  الوحدة الأساسية معاملها دائمًا 1
                </p>
              )}
            </div>

            {/* Base */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                نوع الوحدة
              </label>

              <button
                type="button"
                onClick={() =>
                  handleBaseChange(
                    !isBase
                  )
                }
                disabled={loading}
                className={`
                  flex
                  h-12
                  w-full
                  items-center
                  justify-between
                  rounded-xl
                  border
                  px-4
                  transition-all
                  duration-200
                  ${
                    isBase
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }
                `}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={`
                      flex
                      h-6
                      w-6
                      items-center
                      justify-center
                      rounded-full
                      transition-all
                      ${
                        isBase
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 bg-white"
                      }
                    `}
                  >
                    {isBase && (
                      <Check size={14} />
                    )}
                  </span>

                  {isBase
                    ? "وحدة أساسية"
                    : "وحدة إضافية"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            Barcode
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-slate-50/60">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-50
                  text-blue-600
                "
              >
                <Barcode size={20} />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">
                  الباركود
                </h3>

                <p className="mt-0.5 text-xs text-slate-400">
                  أضف باركود المنتج واربطه بالوحدة المناسبة.
                </p>
              </div>
            </div>

            {barcode.trim() && (
              <span
                className="
                  inline-flex
                  w-fit
                  items-center
                  gap-1.5
                  rounded-full
                  bg-blue-50
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  text-blue-700
                "
              >
                <Barcode size={13} />
                باركود مضاف
              </span>
            )}
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-3">

            {/* Barcode */}

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Barcode size={15} />
                رقم الباركود
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={barcode}
                onChange={(event) =>
                  setBarcode(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="مثال: 6281234567890"
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  font-mono
                  text-sm
                  outline-none
                  transition-all
                  duration-200
                  hover:border-blue-300
                  focus:border-blue-400
                  focus:ring-4
                  focus:ring-blue-50
                  disabled:opacity-50
                "
              />
            </div>

            {/* Barcode unit */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                وحدة الباركود
              </label>

              <div className="relative">
                <select
                  value={barcodeUnitId}
                  onChange={(event) =>
                    setBarcodeUnitId(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  className="
                    h-12
                    w-full
                    appearance-none
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-4
                    pl-10
                    text-sm
                    outline-none
                    transition-all
                    duration-200
                    hover:border-blue-300
                    focus:border-blue-400
                    focus:ring-4
                    focus:ring-blue-50
                    disabled:opacity-50
                  "
                >
                  <option value="">
                    نفس الوحدة الأساسية
                  </option>

                  {units.map((unit) => (
                    <option
                      key={unit.id}
                      value={unit.id}
                    >
                      {unit.name}
                      {unit.symbol
                        ? ` (${unit.symbol})`
                        : ""}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={17}
                  className="
                    pointer-events-none
                    absolute
                    left-4
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />
              </div>
            </div>

            {/* Default */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                إعداد الباركود
              </label>

              <button
                type="button"
                disabled={
                  loading ||
                  !barcode.trim()
                }
                onClick={() =>
                  setBarcodeDefault(
                    !barcodeDefault
                  )
                }
                className={`
                  flex
                  h-12
                  w-full
                  items-center
                  justify-between
                  rounded-xl
                  border
                  px-4
                  transition-all
                  duration-200
                  ${
                    !barcode.trim()
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : barcodeDefault
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }
                `}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={`
                      flex
                      h-6
                      w-6
                      items-center
                      justify-center
                      rounded-full
                      transition-all
                      ${
                        barcodeDefault &&
                        barcode.trim()
                          ? "bg-blue-600 text-white"
                          : "border border-slate-300 bg-white"
                      }
                    `}
                  >
                    {barcodeDefault &&
                      barcode.trim() && (
                        <Check size={14} />
                      )}
                  </span>

                  باركود افتراضي
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            Description
        ====================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-slate-100
                text-slate-600
              "
            >
              <FileText size={20} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                معلومات إضافية
              </h3>

              <p className="mt-0.5 text-xs text-slate-400">
                أضف وصفًا أو ملاحظات عن المنتج.
              </p>
            </div>
          </div>

          <div className="p-5">
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              rows={4}
              disabled={loading}
              placeholder="اكتب وصفًا اختياريًا للمنتج..."
              className="
                w-full
                resize-none
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                px-4
                py-3
                text-sm
                leading-7
                outline-none
                transition-all
                duration-200
                placeholder:text-slate-400
                hover:border-slate-300
                hover:bg-white
                focus:border-blue-400
                focus:bg-white
                focus:ring-4
                focus:ring-blue-50
                disabled:opacity-50
              "
            />
          </div>
        </section>

        {/* =====================================================
            Submit
        ====================================================== */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            الحقول الأساسية والوحدة الأساسية مطلوبة.
          </p>

          <button
            type="submit"
            disabled={
              loading ||
              loadingUnits ||
              !unitId
            }
            className="
              group
              inline-flex
              h-12
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-blue-600
              px-7
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:bg-blue-700
              hover:shadow-lg
              hover:shadow-blue-100
              disabled:cursor-not-allowed
              disabled:opacity-50
              disabled:hover:translate-y-0
              disabled:hover:bg-blue-600
            "
          >
            <Save
              size={18}
              className="
                transition-transform
                duration-200
                group-hover:scale-110
              "
            />

            {loading
              ? "جاري الحفظ..."
              : "حفظ المنتج"}
          </button>
        </div>
      </div>
    </form>
  );
}