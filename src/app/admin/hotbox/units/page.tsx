"use client";
import { useMemo } from "react";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { API_ENDPOINTS } from "@/lib/constants";

interface Unit { id: number; name: string; shortCode: string; parentId: number | null; conversion: number | null; createdBy: string | null; }

export default function HotBoxUnitsPage() {
  const crud = useCrud<Unit>({ endpoint: API_ENDPOINTS.UNIT });

  const unitMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const u of crud.items) map[u.id] = u.name;
    return map;
  }, [crud.items]);

  const columns: ColumnDef<Unit>[] = [
    { key: "id", header: "ID", className: "w-16" },
    { key: "name", header: "Unit Name" },
    { key: "shortCode", header: "Short Code" },
    { key: "parentId", header: "Parent Unit", render: (i) => <span>{i.parentId ? (unitMap[i.parentId] ?? String(i.parentId)) : "—"}</span> },
    { key: "conversion", header: "Conversion", render: (i) => <span>{i.conversion ?? "—"}</span> },
    { key: "createdBy", header: "Created By", render: (i) => <span>{i.createdBy ?? "—"}</span> },
  ];

  const formFields: FormField[] = [
    { key: "name", label: "Unit Name", required: true, placeholder: "e.g. Small, Medium, Large" },
    { key: "shortCode", label: "Short Code", required: true, placeholder: "e.g. S, M, L" },
    { key: "parentId", label: "Parent Unit", type: "select",
      options: crud.items.map((u) => ({ label: `${u.name} (${u.shortCode})`, value: u.id })) },
    { key: "conversion", label: "Conversion", type: "number" },
  ];

  return (
    <CrudPage title="HotBox Units" description="Manage serving sizes and units for food items" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<Unit>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<Unit>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ name: i.name, shortCode: i.shortCode, parentId: i.parentId ?? "", conversion: i.conversion ?? "" })}
    />
  );
}
