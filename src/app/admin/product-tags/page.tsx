"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { API_ENDPOINTS } from "@/lib/constants";

interface ProductTag { id: number; name: string; }
const columns: ColumnDef<ProductTag>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "name", header: "Tag Name" },
];
const formFields: FormField[] = [
  { key: "name", label: "Tag Name", required: true, placeholder: "e.g. Bestseller" },
];

export default function ProductTagsPage() {
  const crud = useCrud<ProductTag>({ endpoint: API_ENDPOINTS.PRODUCT_TAG });
  return (
    <CrudPage title="Product Tags" description="Manage product tags" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<ProductTag>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<ProductTag>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ name: i.name })}
    />
  );
}
