"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

interface SupportTicket { id: number; userId: number; subject: string; message: string; status: string; createdAt: string; reply: string; }
const columns: ColumnDef<SupportTicket>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "userId", header: "User ID" },
  { key: "subject", header: "Subject" },
  { key: "message", header: "Message", render: (i) => <span className="line-clamp-2 max-w-xs text-xs">{i.message}</span> },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
  { key: "createdAt", header: "Date", render: (i) => i.createdAt ? formatDateTime(i.createdAt) : "—" },
];
const formFields: FormField[] = [
  { key: "reply", label: "Reply", type: "textarea", required: true },
  { key: "status", label: "Status", type: "select", options: [{ label: "Open", value: "Open" }, { label: "Resolved", value: "Resolved" }, { label: "Closed", value: "Closed" }] },
];

export default function UserSupportPage() {
  const crud = useCrud<SupportTicket>({ endpoint: API_ENDPOINTS.USER_SUPPORT });
  return (
    <CrudPage title="User Support" description="Manage user support tickets" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async () => {}} onUpdate={async (d) => { await crud.update(d as Partial<SupportTicket>); }}
      onDelete={async (id) => { await crud.remove(id); }}
      getId={(i) => i.id}
      getFormDefaults={(i) => ({ reply: i.reply ?? "", status: i.status })}
      hideCreate
    />
  );
}
