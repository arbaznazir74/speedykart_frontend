"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";

interface RiderEarning {
  id: number;
  deliveryBoyId: number;
  amount: number;
  transactionDate: string;
  transactionId: string | null;
  createdBy: string | null;
}

const columns: ColumnDef<RiderEarning>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "deliveryBoyId", header: "Rider ID" },
  { key: "amount", header: "Amount", render: (i) => formatCurrency(i.amount) },
  { key: "transactionId", header: "Transaction ID", render: (i) => <span>{i.transactionId ?? "—"}</span> },
  { key: "transactionDate", header: "Date", render: (i) => i.transactionDate ? formatDateTime(i.transactionDate) : "—" },
  { key: "createdBy", header: "Created By", render: (i) => <span>{i.createdBy ?? "—"}</span> },
];
const formFields: FormField[] = [];

export default function RiderEarningsPage() {
  const crud = useCrud<RiderEarning>({ endpoint: API_ENDPOINTS.DELIVERY_BOY_TRANSACTION });
  return (
    <CrudPage title="Rider Earnings" description="View rider earning transactions" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async () => {}} onUpdate={async () => {}} onDelete={async () => {}}
      getId={(i) => i.id} hideCreate hideEdit hideDelete
    />
  );
}
