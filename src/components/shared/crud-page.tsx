"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageHeader } from "./page-header";
import { PaginationControls } from "./pagination-controls";
import { ConfirmDialog } from "./confirm-dialog";
import { Pencil, Trash2, Loader2, Search } from "lucide-react";
import { getImageSrc } from "@/lib/format";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface FormField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "image";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string | number }[];
  /** When set, this field auto-generates a slug from the field with the given key */
  slugFrom?: string;
}

interface CrudPageProps<T> {
  title: string;
  description?: string;
  columns: ColumnDef<T>[];
  formFields: FormField[];
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  saving: boolean;
  onPageChange: (page: number) => void;
  onCreate: (data: Record<string, unknown>) => Promise<void>;
  onUpdate: (data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  getId: (item: T) => number;
  getFormDefaults?: (item: T) => Record<string, unknown>;
  extraActions?: (item: T) => React.ReactNode;
  hideCreate?: boolean;
  hideEdit?: boolean;
  hideDelete?: boolean;
  searchable?: boolean;
  onSearch?: (query: string) => void;
}

export function CrudPage<T>({
  title,
  description,
  columns,
  formFields,
  items,
  total,
  page,
  pageSize,
  loading,
  saving,
  onPageChange,
  onCreate,
  onUpdate,
  onDelete,
  getId,
  getFormDefaults,
  extraActions,
  hideCreate,
  hideEdit,
  hideDelete,
  searchable,
  onSearch,
}: CrudPageProps<T>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  function openCreate() {
    setEditing(null);
    setFormData({});
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: T) {
    setEditing(item);
    setFormData(getFormDefaults ? getFormDefaults(item) : (item as Record<string, unknown>));
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      if (editing) {
        await onUpdate({ ...formData, id: getId(editing) });
      } else {
        await onCreate(formData);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function handleFieldChange(key: string, value: unknown) {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-generate slug for any field that has slugFrom pointing to this key
      const slugField = formFields.find((f) => f.slugFrom === key);
      if (slugField && typeof value === "string") {
        next[slugField.key] = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actionLabel={hideCreate ? undefined : `Add ${title.replace(/Management|s$/g, "").trim()}`}
        onAction={hideCreate ? undefined : openCreate}
      >
        {searchable && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 w-52"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch?.(e.target.value);
              }}
            />
          </div>
        )}
      </PageHeader>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">No records found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search or create a new entry</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col.key} className={col.className}>
                        {col.header}
                      </TableHead>
                    ))}
                    {(!hideEdit || !hideDelete || extraActions) && (
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={getId(item)}>
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render
                            ? col.render(item)
                            : String((item as Record<string, unknown>)[col.key] ?? "—")}
                        </TableCell>
                      ))}
                      {(!hideEdit || !hideDelete || extraActions) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {extraActions?.(item)}
                            {!hideEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(item)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {!hideDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(getId(item))}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Create"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            {formFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.type === "image" ? (
                  <div className="space-y-2">
                    <input
                      id={field.key}
                      type="file"
                      accept="image/*"
                      required={field.required && !formData[field.key]}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = reader.result as string;
                          const base64 = result.includes(",") ? result.split(",")[1] : result;
                          handleFieldChange(field.key, base64);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    {formData[field.key] ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={getImageSrc(formData[field.key] as string)}
                          alt="Preview"
                          className="h-16 w-16 rounded-md object-cover border"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive text-xs"
                          onClick={() => handleFieldChange(field.key, "")}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : field.type === "textarea" ? (
                  <textarea
                    id={field.key}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={field.placeholder}
                    required={field.required}
                    value={String(formData[field.key] ?? "")}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  />
                ) : field.type === "select" && field.options ? (
                  <select
                    id={field.key}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required={field.required}
                    value={String(formData[field.key] ?? "")}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "number" : "text"}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={String(formData[field.key] ?? "")}
                    onChange={(e) =>
                      handleFieldChange(
                        field.key,
                        field.type === "number" ? Number(e.target.value) : e.target.value
                      )
                    }
                  />
                )}
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={saving}
        onConfirm={async () => {
          if (deleteId !== null) {
            await onDelete(deleteId);
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
