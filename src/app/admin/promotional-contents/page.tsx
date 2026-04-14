"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { getImageSrc } from "@/lib/format";

interface PromoContent {
  id: number;
  title: string;
  iconBase64: string | null;
  platformType: string;
  extensionType: string | null;
  displayLocation: number;
  createdBy: string | null;
}

const columns: ColumnDef<PromoContent>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "iconBase64", header: "Icon", render: (i) => i.iconBase64 ? <img src={getImageSrc(i.iconBase64)} className="h-8 w-8 rounded object-cover" alt="" /> : <span className="text-slate-400">—</span> },
  { key: "title", header: "Title" },
  { key: "platformType", header: "Platform", render: (i) => <StatusBadge status={i.platformType} /> },
  { key: "displayLocation", header: "Display Location", render: (i) => <span>{i.displayLocation}</span> },
  { key: "createdBy", header: "Created By", render: (i) => <span>{i.createdBy ?? "—"}</span> },
];
const formFields: FormField[] = [
  { key: "title", label: "Title", required: true, placeholder: "Promotional content title" },
  { key: "platformType", label: "Platform", type: "select", required: true, options: [
    { label: "HotBox", value: "HotBox" },
    { label: "SpeedyMart", value: "SpeedyMart" },
  ]},
  { key: "displayLocation", label: "Display Location", type: "number", placeholder: "0" },
  { key: "iconBase64", label: "Icon Image", type: "image" },
];

export default function PromoContentsPage() {
  const crud = useCrud<PromoContent>({ endpoint: API_ENDPOINTS.PROMOTIONAL_CONTENT });
  return (
    <CrudPage title="Promotional Content" description="Manage promotional content" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<PromoContent>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<PromoContent>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ title: i.title, platformType: i.platformType, displayLocation: i.displayLocation, iconBase64: i.iconBase64 ?? "" })}
    />
  );
}
