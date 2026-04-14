"use client";

import { useState, useCallback, useEffect } from "react";
import { apiGet, apiPost, apiPut, apiDelete, ApiResponse } from "@/lib/api-client";

interface UseCrudOptions<T> {
  endpoint: string;
  writeEndpoint?: string;
  pageSize?: number;
  countEndpoint?: string;
  autoLoad?: boolean;
  extraParams?: Record<string, string | number>;
}

interface CrudState<T> {
  items: T[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

export function useCrud<T extends { id?: number }>({
  endpoint,
  writeEndpoint,
  pageSize = 10,
  countEndpoint,
  autoLoad = true,
  extraParams,
}: UseCrudOptions<T>) {
  const mutateEndpoint = writeEndpoint ?? endpoint;
  const [state, setState] = useState<CrudState<T>>({
    items: [],
    total: 0,
    page: 1,
    loading: false,
    error: null,
    saving: false,
  });

  const load = useCallback(
    async (page = 1) => {
      setState((s) => ({ ...s, loading: true, error: null, page }));
      try {
        const skip = (page - 1) * pageSize;
        const extraQs = extraParams
          ? "&" + Object.entries(extraParams).map(([k, v]) => `${k}=${v}`).join("&")
          : "";
        const sep = endpoint.includes("?") ? "&" : "?";
        const listUrl = `${endpoint}${sep}skip=${skip}&top=${pageSize}${extraQs}`;
        const countUrl = countEndpoint
          ? `${countEndpoint}${countEndpoint.includes("?") ? "&" : "?"}${extraQs.replace(/^&/, "")}`
          : `${endpoint}/count${extraQs ? "?" + extraQs.replace(/^&/, "") : ""}`;
        const [listResp, countResp] = await Promise.all([
          apiGet<T[]>(listUrl),
          apiGet<{ intResponse: number }>(countUrl),
        ]);
        setState((s) => ({
          ...s,
          items: listResp.successData ?? [],
          total: countResp.successData?.intResponse ?? (listResp.successData?.length ?? 0),
          loading: false,
        }));
      } catch (err: unknown) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load data",
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endpoint, pageSize, countEndpoint, JSON.stringify(extraParams)]
  );

  const create = useCallback(
    async (item: Partial<T>): Promise<ApiResponse<T>> => {
      setState((s) => ({ ...s, saving: true }));
      try {
        const resp = await apiPost<Partial<T>, T>(mutateEndpoint, item);
        setState((s) => ({ ...s, saving: false }));
        if (resp.isError) {
          throw new Error(resp.errorData?.displayMessage ?? "Failed to create");
        }
        await load(state.page);
        return resp;
      } catch (err: unknown) {
        setState((s) => ({ ...s, saving: false }));
        throw err;
      }
    },
    [endpoint, load, state.page]
  );

  const update = useCallback(
    async (item: Partial<T>): Promise<ApiResponse<unknown>> => {
      setState((s) => ({ ...s, saving: true }));
      try {
        const id = (item as { id?: number }).id;
        const url = id ? `${mutateEndpoint}/${id}` : mutateEndpoint;
        const resp = await apiPut<Partial<T>, unknown>(url, item);
        setState((s) => ({ ...s, saving: false }));
        if (resp.isError) {
          throw new Error(resp.errorData?.displayMessage ?? "Failed to update");
        }
        await load(state.page);
        return resp;
      } catch (err: unknown) {
        setState((s) => ({ ...s, saving: false }));
        throw err;
      }
    },
    [endpoint, load, state.page]
  );

  const remove = useCallback(
    async (id: number): Promise<ApiResponse<unknown>> => {
      setState((s) => ({ ...s, saving: true }));
      try {
        const resp = await apiDelete<unknown>(`${mutateEndpoint}/${id}`);
        setState((s) => ({ ...s, saving: false }));
        if (!resp.isError) {
          await load(state.page);
        }
        return resp;
      } catch (err: unknown) {
        setState((s) => ({ ...s, saving: false }));
        throw err;
      }
    },
    [endpoint, load, state.page]
  );

  useEffect(() => {
    if (autoLoad) load(1);
  }, [autoLoad, load]);

  return {
    ...state,
    load,
    create,
    update,
    remove,
    setPage: (p: number) => load(p),
    pageSize,
  };
}
