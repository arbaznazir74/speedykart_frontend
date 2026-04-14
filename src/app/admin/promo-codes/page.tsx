"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

interface PromoCode {
  id: number;
  code: string;
  type: number;
  discountValue: number;
  maxDiscountAmount: number | null;
  minimumCartAmount: number | null;
  usageLimit: number;
  usedCount: number;
  usagePerUserLimit: number | null;
  isActive: boolean;
  isFirstOrderOnly: boolean;
  platformType: string;
  createdBy: string | null;
}

const columns: ColumnDef<PromoCode>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "code", header: "Code", render: (i) => <span className="font-mono font-bold">{i.code}</span> },
  { key: "discountValue", header: "Discount", render: (i) => <span>{i.discountValue}</span> },
  { key: "maxDiscountAmount", header: "Max Disc.", render: (i) => <span>{i.maxDiscountAmount != null ? formatCurrency(i.maxDiscountAmount) : "—"}</span> },
  { key: "minimumCartAmount", header: "Min Cart", render: (i) => <span>{i.minimumCartAmount != null ? formatCurrency(i.minimumCartAmount) : "—"}</span> },
  { key: "usageLimit", header: "Limit" },
  { key: "usedCount", header: "Used" },
  { key: "isActive", header: "Active", render: (i) => <StatusBadge status={i.isActive ? "Active" : "Inactive"} /> },
  { key: "platformType", header: "Platform", render: (i) => <StatusBadge status={i.platformType} /> },
];
const formFields: FormField[] = [
  { key: "code", label: "Promo Code", required: true, placeholder: "e.g. SAVE20" },
  { key: "discountValue", label: "Discount Value", type: "number", required: true, placeholder: "e.g. 10" },
  { key: "maxDiscountAmount", label: "Max Discount Amount", type: "number", placeholder: "e.g. 500" },
  { key: "minimumCartAmount", label: "Min Cart Amount", type: "number", placeholder: "e.g. 200" },
  { key: "usageLimit", label: "Usage Limit", type: "number", required: true, placeholder: "e.g. 100" },
  { key: "usagePerUserLimit", label: "Per User Limit", type: "number", placeholder: "e.g. 1" },
  { key: "isActive", label: "Active", type: "select", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
  { key: "isFirstOrderOnly", label: "First Order Only", type: "select", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
  { key: "platformType", label: "Platform", type: "select", options: [
    { label: "All", value: "None" },
    { label: "HotBox", value: "HotBox" },
    { label: "SpeedyMart", value: "SpeedyMart" },
  ]},
];

export default function PromoCodesPage() {
  const crud = useCrud<PromoCode>({ endpoint: API_ENDPOINTS.PROMOCODE });
  return (
    <CrudPage title="Promo Codes" description="Manage promotional codes" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<PromoCode>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<PromoCode>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({
        code: i.code, discountValue: i.discountValue, maxDiscountAmount: i.maxDiscountAmount ?? "",
        minimumCartAmount: i.minimumCartAmount ?? "", usageLimit: i.usageLimit,
        usagePerUserLimit: i.usagePerUserLimit ?? "", isActive: String(i.isActive),
        isFirstOrderOnly: String(i.isFirstOrderOnly), platformType: i.platformType,
      })}
    />
  );
}
