"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

interface DeliveryPlace {
  id: number;
  pincode: string;
  status: string;
  latitude: number;
  longitude: number;
  deliveryCharges: number;
  deliveryTimeInMinutes: number;
  sellerId: number;
  createdBy: string | null;
}

const columns: ColumnDef<DeliveryPlace>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "pincode", header: "Pincode" },
  { key: "sellerId", header: "Seller ID" },
  { key: "deliveryCharges", header: "Delivery Charges", render: (i) => formatCurrency(i.deliveryCharges) },
  { key: "deliveryTimeInMinutes", header: "Time (mins)" },
  { key: "latitude", header: "Lat", render: (i) => <span>{i.latitude?.toFixed(4) ?? "—"}</span> },
  { key: "longitude", header: "Lng", render: (i) => <span>{i.longitude?.toFixed(4) ?? "—"}</span> },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
];
const formFields: FormField[] = [
  { key: "pincode", label: "Pincode", required: true, placeholder: "e.g. 110001" },
  { key: "sellerId", label: "Seller ID", type: "number", required: true },
  { key: "deliveryCharges", label: "Delivery Charges", type: "number", placeholder: "e.g. 30" },
  { key: "deliveryTimeInMinutes", label: "Delivery Time (mins)", type: "number", placeholder: "e.g. 45" },
  { key: "latitude", label: "Latitude", type: "number" },
  { key: "longitude", label: "Longitude", type: "number" },
  { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }] },
];

export default function DeliveryPlacesPage() {
  const crud = useCrud<DeliveryPlace>({ endpoint: API_ENDPOINTS.DELIVERY_PLACES });
  return (
    <CrudPage title="Delivery Places" description="Manage delivery locations & pincodes" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { await crud.create(d as Partial<DeliveryPlace>); }}
      onUpdate={async (d) => { await crud.update(d as Partial<DeliveryPlace>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ pincode: i.pincode, sellerId: i.sellerId, deliveryCharges: i.deliveryCharges, deliveryTimeInMinutes: i.deliveryTimeInMinutes, latitude: i.latitude, longitude: i.longitude, status: i.status })}
    />
  );
}
