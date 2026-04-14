"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, ChevronDown, Loader2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";

interface TagItem {
  id: number;
  name: string;
}

interface TagPickerProps {
  value: string;
  onChange: (value: string) => void;
  max?: number;
  label?: string;
}

export function TagPicker({ value, onChange, max = 3, label = "Tags" }: TagPickerProps) {
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagSaving, setNewTagSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  const selected: string[] = value
    ? value.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setOpen(false);
        setCreating(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const r = await apiGet<TagItem[]>(`${API_ENDPOINTS.PRODUCT_TAG}?skip=0&top=500`);
      setAllTags(r.successData ?? []);
    } catch {
      setAllTags([]);
    } finally {
      setLoading(false);
    }
  }

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || selected.length >= max) return;
    if (selected.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    const next = [...selected, trimmed].join(", ");
    onChange(next);
    setSearch("");
    setOpen(false);
  }

  function removeTag(name: string) {
    const next = selected.filter((t) => t.toLowerCase() !== name.toLowerCase()).join(", ");
    onChange(next);
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    setNewTagSaving(true);
    try {
      const r = await apiPost<unknown, TagItem>(API_ENDPOINTS.PRODUCT_TAG, { name: newTagName.trim() });
      if (r.successData) {
        setAllTags((prev) => [...prev, r.successData!]);
        addTag(r.successData.name);
      }
      setNewTagName("");
      setCreating(false);
    } catch {
      /* empty */
    } finally {
      setNewTagSaving(false);
    }
  }

  const filtered = allTags.filter(
    (t) =>
      !selected.some((s) => s.toLowerCase() === t.name.toLowerCase()) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}

      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {selected.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="pl-2.5 pr-1 py-1 text-xs font-medium gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown trigger */}
      {selected.length < max && (
        <div className="relative" ref={dropdownRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => { const next = !open; setOpen(next); setCreating(false); setSearch(""); if (next) updatePosition(); }}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            <span>
              {loading ? "Loading tags..." : `Select tag (${selected.length}/${max})`}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] rounded-md border bg-popover shadow-md"
              style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
            >
              {/* Search */}
              <div className="p-2 border-b">
                <Input
                  className="h-8 text-sm"
                  placeholder="Search tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Tag list */}
              <div className="max-h-40 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {search ? "No matching tags" : "No tags available"}
                  </div>
                ) : (
                  filtered.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => addTag(t.name)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                    >
                      {t.name}
                    </button>
                  ))
                )}
              </div>

              {/* Create new tag */}
              <div className="border-t p-2">
                {creating ? (
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 text-sm flex-1"
                      placeholder="New tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateTag(); } }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-3"
                      disabled={!newTagName.trim() || newTagSaving}
                      onClick={handleCreateTag}
                    >
                      {newTagSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2"
                      onClick={() => { setCreating(false); setNewTagName(""); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-primary hover:bg-accent transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create new tag
                  </button>
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {selected.length >= max && (
        <p className="text-xs text-muted-foreground">Maximum {max} tags reached</p>
      )}
    </div>
  );
}
