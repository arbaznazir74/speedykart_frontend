"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";

interface DeliveryRequest {
  id: number;
  userId: number;
  pincode: string;
  latitude: number;
  longitude: number;
  address: string | null;
  platform: string;
  adminRemarks: string | null;
  isResolved: boolean;
  createdBy: string | null;
}

const columns: ColumnDef<DeliveryRequest>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "userId", header: "User ID" },
  { key: "pincode", header: "Pincode" },
  { key: "address", header: "Address", render: (i) => <span className="truncate max-w-[200px] block">{i.address ?? "—"}</span> },
  { key: "platform", header: "Platform", render: (i) => <StatusBadge status={i.platform} /> },
  { key: "isResolved", header: "Resolved", render: (i) => <StatusBadge status={i.isResolved ? "Active" : "Inactive"} /> },
  { key: "adminRemarks", header: "Admin Remarks", render: (i) => <span>{i.adminRemarks ?? "—"}</span> },
];
const formFields: FormField[] = [
  { key: "adminRemarks", label: "Admin Remarks", type: "textarea", placeholder: "Add remarks..." },
  { key: "isResolved", label: "Resolved", type: "select", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
];

export default function DeliveryRequestsPage() {
  const crud = useCrud<DeliveryRequest>({ endpoint: API_ENDPOINTS.DELIVERY_REQUEST });
  return (
    <CrudPage title="Delivery Requests" description="User delivery area requests" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async () => {}} onUpdate={async (d) => { await crud.update(d as Partial<DeliveryRequest>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ adminRemarks: i.adminRemarks ?? "", isResolved: String(i.isResolved) })}
      hideCreate
    />
  );
}
