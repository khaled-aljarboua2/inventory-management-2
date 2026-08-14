import { notFound } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import EditProductForm from "./EditProductForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: product },
    { data: categories },
    { data: brands },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, sku, name, description, category_id, brand_id, minimum_quantity"
      )
      .eq("id", id)
      .single(),

    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("brands")
      .select("id, name")
      .order("name"),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <DashboardLayout>
      <div dir="rtl" className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            تعديل المنتج
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            تعديل بيانات المنتج.
          </p>
        </div>

        <EditProductForm
          product={product}
          categories={categories ?? []}
          brands={brands ?? []}
        />
      </div>
    </DashboardLayout>
  );
}