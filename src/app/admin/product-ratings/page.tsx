"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { API_ENDPOINTS } from "@/lib/constants";

interface ProductRating { id: number; productId: number; userId: number; rating: number; review: string; }
const columns: ColumnDef<ProductRating>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "productId", header: "Product ID" },
  { key: "userId", header: "User ID" },
  { key: "rating", header: "Rating", render: (i) => `${"★".repeat(i.rating)}${"☆".repeat(5 - i.rating)}` },
  { key: "review", header: "Review" },
];
const formFields: FormField[] = [
  { key: "productId", label: "Product ID", type: "number", required: true },
  { key: "userId", label: "User ID", type: "number", required: true },
  { key: "rating", label: "Rating (1-5)", type: "number", required: true },
  { key: "review", label: "Review", type: "textarea" },
];

export default function ProductRatingsPage() {
  const crud = useCrud<ProductRating>({ endpoint: API_ENDPOINTS.PRODUCT_RATING });
  return (
    <CrudPage title="Product Ratings" description="Manage product ratings & reviews" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<ProductRating>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<ProductRating>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ productId: i.productId, userId: i.userId, rating: i.rating, review: i.review })}
    />
  );
}
