"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

    if (!confirm(`هل أنت متأكد من ${action} المنتج؟`)) {
      return;
    }

    setLoading(true);

    const result = await setProductStatus(productId, !isActive);

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
      className={
        isActive
          ? "text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
          : "text-sm font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
      }
    >
      {loading
        ? "جاري..."
        : isActive
          ? "تعطيل"
          : "تفعيل"}
    </button>
  );
}
