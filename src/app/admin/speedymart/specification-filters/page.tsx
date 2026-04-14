"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";

interface SpecFilter { id: number; name: string; status: string; filterType: string; }
const columns: ColumnDef<SpecFilter>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "name", header: "Filter Name" },
  { key: "filterType", header: "Type" },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
];
const formFields: FormField[] = [
  { key: "name", label: "Filter Name", required: true },
  { key: "filterType", label: "Filter Type", placeholder: "e.g. Dropdown, Checkbox" },
  { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: 0 }, { label: "Inactive", value: 1 }] },
];

export default function SpeedyMartSpecFiltersPage() {
  const crud = useCrud<SpecFilter>({ endpoint: API_ENDPOINTS.PRODUCT_SPECIFICATION_FILTER });
  return (
    <CrudPage title="SpeedyMart Spec Filters" description="Manage product specification filters for grocery items" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<SpecFilter>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<SpecFilter>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ name: i.name, filterType: i.filterType, status: i.status })}
    />
  );
}
