"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS, PlatformType } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  price: number;
  discountedPrice: number;
  stock: number;
  status: string;
  measurement: number;
  sku: string | null;
  description: string | null;
  barcode: string | null;
  platformType: number;
}

const columns: ColumnDef<ProductVariant>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "productId", header: "Product" },
  { key: "name", header: "Variant Name" },
  { key: "sku", header: "SKU", render: (i) => <span>{i.sku ?? "—"}</span> },
  { key: "price", header: "Price", render: (i) => formatCurrency(i.price) },
  { key: "discountedPrice", header: "Offer Price", render: (i) => i.discountedPrice ? formatCurrency(i.discountedPrice) : "—" },
  { key: "stock", header: "Stock" },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
];

const formFields: FormField[] = [
  { key: "productId", label: "Product ID", type: "number", required: true },
  { key: "name", label: "Variant Name", required: true },
  { key: "sku", label: "SKU", placeholder: "e.g. RICE-5KG" },
  { key: "barcode", label: "Barcode", placeholder: "Barcode" },
  { key: "price", label: "Price", type: "number", required: true },
  { key: "discountedPrice", label: "Offer Price", type: "number" },
  { key: "stock", label: "Stock", type: "number" },
  { key: "measurement", label: "Measurement", type: "number" },
  { key: "description", label: "Description", type: "textarea" },
  { key: "status", label: "Status", type: "select", options: [{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }] },
];

export default function SellerSpeedyMartVariantsPage() {
  const crud = useCrud<ProductVariant>({
    endpoint: `${API_ENDPOINTS.PRODUCT_VARIANT}/mine`,
    countEndpoint: `${API_ENDPOINTS.PRODUCT_VARIANT}/mine/count`,
    extraParams: { platformType: PlatformType.SpeedyMart },
  });
  return (
    <CrudPage title="SpeedyMart Product Variants" description="Manage grocery item variants (weight, pack size)" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async (d) => { if (Number(d.discountedPrice) > 0 && Number(d.discountedPrice) >= Number(d.price)) throw new Error("Offer Price must be less than Price"); await crud.create({ ...d, platformType: PlatformType.SpeedyMart } as unknown as Partial<ProductVariant>); }}
      onUpdate={async (d) => { if (Number(d.discountedPrice) > 0 && Number(d.discountedPrice) >= Number(d.price)) throw new Error("Offer Price must be less than Price"); await crud.update({ ...d, platformType: PlatformType.SpeedyMart } as unknown as Partial<ProductVariant>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ productId: i.productId, name: i.name, sku: i.sku ?? "", barcode: i.barcode ?? "", price: i.price, discountedPrice: i.discountedPrice ?? 0, stock: i.stock, measurement: i.measurement ?? 0, description: i.description ?? "", status: i.status })}
    />
  );
}
