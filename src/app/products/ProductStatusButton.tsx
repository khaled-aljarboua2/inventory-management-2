"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleOff } from "lucide-react";
import { setProductStatus } from "./actions";

type Props = {
  productId: string;
  isActive: boolean;
};

export default function ProductStatusButton({
  productId,
  isActive,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const action = isActive ? "تعطيل" : "تفعيل";

    if (
      !confirm(
        `هل أنت متأكد من ${action} المنتج؟`
      )
    ) {
      return;
    }

    setLoading(true);

    const result = await setProductStatus(
      productId,
      !isActive
    );

    if (!result.success) {
      alert(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-lg
        border
        px-3
        py-2
        text-xs
        font-semibold
        transition-all
        duration-200
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${
          isActive
            ? `
              border-red-200
              bg-red-50
              text-red-600
              hover:-translate-y-0.5
              hover:bg-red-100
              hover:text-red-700
              hover:shadow-sm
            `
            : `
              border-emerald-200
              bg-emerald-50
              text-emerald-600
              hover:-translate-y-0.5
              hover:bg-emerald-100
              hover:text-emerald-700
              hover:shadow-sm
            `
        }
      `}
    >
      {loading ? (
        "جاري..."
      ) : isActive ? (
        <>
          <CircleOff size={14} />
          تعطيل
        </>
      ) : (
        <>
          <CheckCircle2 size={14} />
          تفعيل
        </>
      )}
    </button>
  );
}