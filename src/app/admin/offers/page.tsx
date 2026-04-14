"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

interface Offer {
  id: number;
  name: string;
  description: string | null;
  pathBase64: string | null;
  extensionType: string | null;
  platformType: string;
  percentage: number | null;
  offerValue: number | null;
  minAmount: number | null;
  maxDiscountAmount: number | null;
  createdBy: string | null;
}

const columns: ColumnDef<Offer>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "name", header: "Offer Name" },
  { key: "description", header: "Description", render: (i) => <span className="truncate max-w-[200px] block">{i.description ?? "—"}</span> },
  { key: "percentage", header: "Discount", render: (i) => <span>{i.percentage != null ? `${i.percentage}%` : i.offerValue != null ? formatCurrency(i.offerValue) : "—"}</span> },
  { key: "minAmount", header: "Min Order", render: (i) => <span>{i.minAmount != null ? formatCurrency(i.minAmount) : "—"}</span> },
  { key: "maxDiscountAmount", header: "Max Discount", render: (i) => <span>{i.maxDiscountAmount != null ? formatCurrency(i.maxDiscountAmount) : "—"}</span> },
  { key: "platformType", header: "Platform", render: (i) => <StatusBadge status={i.platformType} /> },
];
const formFields: FormField[] = [
  { key: "name", label: "Offer Name", required: true, placeholder: "e.g. Summer Sale" },
  { key: "description", label: "Description", placeholder: "Offer details" },
  { key: "percentage", label: "Discount (%)", type: "number", placeholder: "e.g. 10" },
  { key: "offerValue", label: "Flat Discount (₹)", type: "number", placeholder: "e.g. 50" },
  { key: "minAmount", label: "Min Order Amount", type: "number", placeholder: "e.g. 100" },
  { key: "maxDiscountAmount", label: "Max Discount Amount", type: "number", placeholder: "e.g. 500" },
  { key: "platformType", label: "Platform", type: "select", required: true, options: [
    { label: "HotBox", value: "HotBox" },
    { label: "SpeedyMart", value: "SpeedyMart" },
  ]},
  { key: "pathBase64", label: "Offer Image", type: "image" },
];

export default function OffersPage() {
  const crud = useCrud<Offer>({ endpoint: API_ENDPOINTS.OFFER });
  return (
    <CrudPage title="Offers" description="Manage promotional offers & discounts" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<Offer>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<Offer>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({
        name: i.name, description: i.description ?? "", percentage: i.percentage ?? "",
        offerValue: i.offerValue ?? "", minAmount: i.minAmount ?? "",
        maxDiscountAmount: i.maxDiscountAmount ?? "", platformType: i.platformType,
        pathBase64: i.pathBase64 ?? "",
      })}
    />
  );
}
