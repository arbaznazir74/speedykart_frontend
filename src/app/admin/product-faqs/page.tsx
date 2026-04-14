"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { API_ENDPOINTS } from "@/lib/constants";

interface ProductFaq { id: number; productId: number; question: string; answer: string; }
const columns: ColumnDef<ProductFaq>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "productId", header: "Product ID" },
  { key: "question", header: "Question" },
  { key: "answer", header: "Answer" },
];
const formFields: FormField[] = [
  { key: "productId", label: "Product ID", type: "number", required: true },
  { key: "question", label: "Question", required: true },
  { key: "answer", label: "Answer", type: "textarea", required: true },
];

export default function ProductFaqsPage() {
  const crud = useCrud<ProductFaq>({ endpoint: API_ENDPOINTS.PRODUCT_FAQ });
  return (
    <CrudPage title="Product FAQs" description="Manage product FAQs" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<ProductFaq>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<ProductFaq>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ productId: i.productId, question: i.question, answer: i.answer })}
    />
  );
}
