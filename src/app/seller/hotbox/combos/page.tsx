"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

interface Combo {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  categoryName: string | null;
  isInHotBox: boolean;
  totalProducts: number;
  bestFor: number;
}

const columns: ColumnDef<Combo>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "name", header: "Combo Name" },
  { key: "categoryName", header: "Category", render: (i) => <span>{i.categoryName ?? "—"}</span> },
  { key: "description", header: "Description", render: (i) => <span className="line-clamp-2 max-w-xs text-xs">{i.description}</span> },
  { key: "price", header: "Price", render: (i) => formatCurrency(i.price) },
  { key: "totalProducts", header: "Items" },
  { key: "isInHotBox", header: "HotBox", render: (i) => <StatusBadge status={i.isInHotBox ? "Active" : "Inactive"} /> },
];

const formFields: FormField[] = [];

export default function HotBoxCombosPage() {
  const crud = useCrud<Combo>({
    endpoint: API_ENDPOINTS.COMBO,
    countEndpoint: `${API_ENDPOINTS.COMBO}/count`,
  });
  return (
    <CrudPage title="Combos" description="View combo offers" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async () => {}} onUpdate={async () => {}} onDelete={async () => {}}
      getId={(i) => i.id}
      hideCreate hideEdit hideDelete
    />
  );
}
