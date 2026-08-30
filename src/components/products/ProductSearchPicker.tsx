"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Loader2, Search, X } from "lucide-react";

export type ProductSearchResult = {
  id: string;
  name: string;
  sku: string;
  is_active: boolean;
  product_units: Array<{
    id: string;
    unit_id: string;
    conversion_factor: number | string;
    is_base: boolean;
    units: {
      id: string;
      name: string;
      symbol: string | null;
    } | null;
  }>;
  barcodes: string[];
};

function productLabel(product: ProductSearchResult | null) {
  return product ? `${product.name} — ${product.sku}` : "";
}

export default function ProductSearchPicker({
  value,
  initialProduct = null,
  disabled,
  onChange,
  ariaLabel = "اختر المنتج",
}: {
  value: string;
  initialProduct?: ProductSearchResult | null;
  disabled: boolean;
  onChange: (product: ProductSearchResult | null) => void;
  ariaLabel?: string;
}) {
  const [query, setQuery] = useState(() => productLabel(initialProduct));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<ProductSearchResult | null>(initialProduct);
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const resultsId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: "30",
        });
        const response = await fetch(
          `/api/products/search?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "تعذر البحث في المنتجات.");
        }

        setResults(result.products ?? []);
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }

        setResults([]);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "تعذر البحث في المنتجات."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const visibleProducts = useMemo(() => {
    if (!selectedProduct) {
      return results;
    }

    return [
      selectedProduct,
      ...results.filter((product) => product.id !== selectedProduct.id),
    ];
  }, [results, selectedProduct]);

  function selectProduct(product: ProductSearchResult) {
    setSelectedProduct(product);
    setQuery(productLabel(product));
    setOpen(false);
    onChange(product);
  }

  function clearSelection() {
    setSelectedProduct(null);
    setQuery("");
    setOpen(true);
    onChange(null);
  }

  return (
    <div className="relative min-w-[260px]">
      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={open ? query : productLabel(selectedProduct)}
          onFocus={() => {
            setQuery(productLabel(selectedProduct));
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          disabled={disabled}
          placeholder="ابحث بالاسم أو SKU أو الباركود"
          aria-label={ariaLabel}
          role="combobox"
          aria-controls={resultsId}
          aria-expanded={open}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-9 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-50 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        {loading ? (
          <Loader2
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-teal-600"
          />
        ) : value ? (
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            className="absolute left-2 top-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed"
            aria-label="إزالة المنتج المختار"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {open && !disabled ? (
        <div
          id={resultsId}
          className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {error ? (
            <p className="px-3 py-4 text-center text-xs text-red-600">{error}</p>
          ) : visibleProducts.length === 0 && !loading ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">
              لا توجد منتجات مطابقة
            </p>
          ) : (
            visibleProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => selectProduct(product)}
                className={`w-full rounded-lg px-3 py-2.5 text-right transition hover:bg-teal-50 ${
                  product.id === value
                    ? "bg-teal-50 text-teal-800"
                    : "text-slate-700"
                }`}
              >
                <span className="block truncate text-sm font-semibold">
                  {product.name}
                </span>
                <span className="mt-1 block font-mono text-[11px] text-slate-400">
                  {product.sku}
                  {product.barcodes[0]
                    ? ` · ${product.barcodes[0]}`
                    : ""}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
