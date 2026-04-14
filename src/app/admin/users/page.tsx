"use client";
import { useCrud } from "@/hooks/use-crud";
import { CrudPage, ColumnDef, FormField } from "@/components/shared/crud-page";
import { StatusBadge } from "@/components/shared/status-badge";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";

interface AppUser {
  id: number;
  name: string | null;
  username: string;
  email: string | null;
  mobile: string | null;
  countryCode: string | null;
  balance: number;
  referralCode: string | null;
  status: string;
  loginStatus: string;
  isMobileConfirmed: boolean;
  isEmailConfirmed: boolean;
}

const columns: ColumnDef<AppUser>[] = [
  { key: "id", header: "ID", className: "w-16" },
  { key: "name", header: "Name", render: (i) => <span>{i.name ?? "—"}</span> },
  { key: "username", header: "Username" },
  { key: "mobile", header: "Mobile", render: (i) => <span>{i.countryCode ? `${i.countryCode} ` : ""}{i.mobile ?? "—"}</span> },
  { key: "email", header: "Email", render: (i) => <span>{i.email ?? "—"}</span> },
  { key: "balance", header: "Balance", render: (i) => formatCurrency(i.balance) },
  { key: "isMobileConfirmed", header: "Mobile ✓", render: (i) => <StatusBadge status={i.isMobileConfirmed ? "Active" : "Inactive"} /> },
  { key: "status", header: "Status", render: (i) => <StatusBadge status={i.status} /> },
];
const formFields: FormField[] = [];

export default function UsersPage() {
  const crud = useCrud<AppUser>({ endpoint: API_ENDPOINTS.USER });
  return (
    <CrudPage title="Users" description="View registered users" columns={columns} formFields={formFields}
      items={crud.items} total={crud.total} page={crud.page} pageSize={crud.pageSize}
      loading={crud.loading} saving={crud.saving} onPageChange={crud.setPage}
      onCreate={async () => {}} onUpdate={async () => {}} onDelete={async () => {}}
      getId={(i) => i.id}
      hideCreate hideEdit hideDelete
    />
  );
}
