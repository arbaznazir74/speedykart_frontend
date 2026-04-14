"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";

interface Faq { id: number; question: string; answer: string; status: string; sortOrder: number; }
const columns: ColumnDef<Faq>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "question", header: "Question" },
  { key: "answer", header: "Answer", render: (i) => <span className="line-clamp-2 max-w-sm text-xs">{i.answer}</span> },
  { key: "sortOrder", header: "Order" },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
];
const formFields: FormField[] = [
  { key: "question", label: "Question", required: true },
  { key: "answer", label: "Answer", type: "textarea", required: true },
  { key: "sortOrder", label: "Sort Order", type: "number" },
  { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: 0 }, { label: "Inactive", value: 1 }] },
];

export default function FaqsPage() {
  const crud = useCrud<Faq>({ endpoint: API_ENDPOINTS.FAQ });
  return (
    <CrudPage title="FAQs" description="Manage frequently asked questions" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<Faq>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<Faq>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ question: i.question, answer: i.answer, sortOrder: i.sortOrder, status: i.status })}
    />
  );
}
