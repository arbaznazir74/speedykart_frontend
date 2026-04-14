"use client";

import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { getImageSrc } from "@/lib/format";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Brand {
  id: number;
  name: string;
  image: string | null;
  status: string | number;
}

const columns: ColumnDef<Brand>[] = [
  { key: "id", header: "ID", className: "w-16" },
  {
    key: "image",
    header: "Image",
    className: "w-16",
    render: (item) => (
      <Avatar className="h-9 w-9">
        {item.image ? <AvatarImage src={getImageSrc(item.image)} /> : null}
        <AvatarFallback className="text-xs">{item.name?.charAt(0)}</AvatarFallback>
      </Avatar>
    ),
  },
  { key: "name", header: "Brand Name" },
  {
    key: "status",
    header: "Status",
    render: (item) => <StatusBadge status={item.status} />,
  },
];

const formFields: FormField[] = [
  { key: "name", label: "Brand Name", required: true, placeholder: "Enter brand name" },
  { key: "image", label: "Brand Image", type: "image" },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { label: "Active", value: 0 },
      { label: "Inactive", value: 1 },
    ],
  },
];

export default function BrandsPage() {
  const crud = useCrud<Brand>({ endpoint: API_ENDPOINTS.BRAND });

  return (
    <CrudPage
      title="Brands"
      description="Manage SpeedyMart product brands"
      columns={columns}
      formFields={formFields}
      items={crud.items}
      total={crud.total}
      page={crud.page}
      pageSize={crud.pageSize}
      loading={crud.loading}
      saving={crud.saving}
      onPageChange={crud.setPage}
      onCreate={async (data) => { await crud.create(data as Partial<Brand>); }}
      onUpdate={async (data) => { await crud.update(data as Partial<Brand>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(item) => item.id}
      getFormDefaults={(item) => ({ name: item.name, image: item.image ?? "", status: item.status })}
    />
  );
}
