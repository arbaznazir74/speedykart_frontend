"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";

interface RiderOrderTransaction {
  id: number;
  deliveryBoyId: number;
  orderId: number;
  amount: number;
  transactionDate: string;
  transactionId: string | null;
  paymentType: string;
  createdBy: string | null;
}

const columns: ColumnDef<RiderOrderTransaction>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "deliveryBoyId", header: "Rider ID" },
  { key: "orderId", header: "Order ID" },
  { key: "amount", header: "Amount", render: (i) => formatCurrency(i.amount) },
  { key: "paymentType", header: "Payment Type" },
  { key: "transactionId", header: "Transaction ID", render: (i) => <span>{i.transactionId ?? "—"}</span> },
  { key: "transactionDate", header: "Date", render: (i) => i.transactionDate ? formatDateTime(i.transactionDate) : "—" },
];
const formFields: FormField[] = [];

export default function RiderOrderTransactionsPage() {
  const crud = useCrud<RiderOrderTransaction>({ endpoint: API_ENDPOINTS.DELIVERY_BOY_ORDER_TRANSACTIONS });
  return (
    <CrudPage title="Rider Transactions" description="View rider-order transaction history" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async () => {}} onUpdate={async () => {}} onDelete={async () => {}}
      getId={(i) => i.id} hideCreate hideEdit hideDelete
    />
  );
}
