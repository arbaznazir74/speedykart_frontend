"use client";
import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { API_ENDPOINTS, PlatformType } from "@/lib/constants";
import { apiGet } from "@/lib/api-client";

interface SpeedyMartProduct {
  id: number;
  name: string;
  slug: string;
  sellerId: number;
  categoryId: number;
  categoryName: string | null;
  brandId: number;
  brandName: string | null;
  taxPercentage: number | null;
  tags: string | null;
}

interface LookupItem { id: number; name: string; }

const columns: ColumnDef<SpeedyMartProduct>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "name", header: "Product Name" },
  { key: "slug", header: "Slug" },
  { key: "categoryName", header: "Category", render: (i) => <span>{i.categoryName ?? "—"}</span> },
  { key: "brandName", header: "Brand", render: (i) => <span>{i.brandName ?? "—"}</span> },
  { key: "sellerId", header: "Seller ID", className: "w-20" },
  { key: "taxPercentage", header: "Tax %", render: (i) => <span>{i.taxPercentage != null ? `${i.taxPercentage}%` : "—"}</span> },
  { key: "tags", header: "Tags", render: (i) => <span className="text-xs">{i.tags ?? "—"}</span> },
];

export default function SpeedyMartProductsPage() {
  const crud = useCrud<SpeedyMartProduct>({
    endpoint: `${API_ENDPOINTS.PRODUCT}?platformType=${PlatformType.SpeedyMart}`,
    writeEndpoint: `${API_ENDPOINTS.PRODUCT}/admin`,
  });
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [brands, setBrands] = useState<LookupItem[]>([]);

  useEffect(() => {
    apiGet<LookupItem[]>(`${API_ENDPOINTS.CATEGORY}/parent/admin?platform=2&skip=0&top=200`)
      .then((r) => setCategories(r.successData ?? []))
      .catch(() => {});
    apiGet<LookupItem[]>(API_ENDPOINTS.BRAND, { top: 200 })
      .then((r) => setBrands(r.successData ?? []))
      .catch(() => {});
  }, []);

  const formFields: FormField[] = [
    { key: "name", label: "Product Name", required: true, placeholder: "Enter product name" },
    { key: "slug", label: "Slug", placeholder: "product-slug", slugFrom: "name" },
    { key: "tags", label: "Tags", placeholder: "e.g. organic, fresh, imported" },
    { key: "categoryId", label: "Category", type: "select", required: true,
      options: categories.map((c) => ({ label: c.name, value: c.id })) },
    { key: "brandId", label: "Brand", type: "select",
      options: brands.map((b) => ({ label: b.name, value: b.id })) },
    { key: "taxPercentage", label: "Tax Percentage", type: "number", placeholder: "0" },
  ];

  return (
    <CrudPage title="SpeedyMart Products" description="View grocery & mart products (products are created by sellers)" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async () => {}}
      onUpdate={async () => {}}
      onDelete={async (id) => { await crud.remove(id); }}
      hideCreate hideEdit
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ name: i.name, slug: i.slug, tags: i.tags ?? "", categoryId: i.categoryId, brandId: i.brandId, taxPercentage: i.taxPercentage ?? 0 })}
    />
  );
}
