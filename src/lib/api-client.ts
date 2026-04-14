import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./constants";

// Generic API response shape from the backend
export interface ApiResponse<T> {
  successData: T | null;
  isError: boolean;
  errorData: {
    errorType?: string;
    displayMessage?: string;
    additionalProps?: Record<string, unknown>;
  } | null;
}

export interface ApiRequest<T> {
  reqData: T;
}

export interface PaginationParams {
  skip?: number;
  top?: number;
  orderby?: string;
  filter?: string;
  search?: string;
  searchColumns?: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    null
  );
}

const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    targetapitype: "abcd",
    isdeveloperapk: "true",
    appversion: "1.0.1",
  },
});

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("login_user");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("login_user");
        window.location.href = "/login";
      }
    }
    // If the server returned a JSON body with our standard shape, resolve with it
    // so callers can read errorData.displayMessage instead of a generic axios error.
    const body = error.response?.data;
    if (body && typeof body === "object" && "isError" in body) {
      return { data: body };
    }
    // Extract useful error details from .NET validation errors (ProblemDetails / ValidationProblemDetails)
    if (body && typeof body === "object") {
      const title = (body as Record<string, unknown>).title as string | undefined;
      const errors = (body as Record<string, unknown>).errors as Record<string, string[]> | undefined;
      let msg = title || `Request failed with status code ${error.response?.status}`;
      if (errors) {
        const details = Object.entries(errors).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ");
        if (details) msg += ` — ${details}`;
      }
      return Promise.reject(new Error(msg));
    }
    return Promise.reject(error);
  }
);

function buildQueryString(endpoint: string, params?: PaginationParams): string {
  if (!params) return "";
  const parts: string[] = [];
  if (params.skip != null) parts.push(`skip=${params.skip}`);
  if (params.top != null) parts.push(`top=${params.top}`);
  if (params.orderby) parts.push(`$orderby=${encodeURIComponent(params.orderby)}`);
  if (params.filter) parts.push(`$filter=${encodeURIComponent(params.filter)}`);
  if (!parts.length) return "";
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${separator}${parts.join("&")}`;
}

export async function apiGet<T>(
  endpoint: string,
  params?: PaginationParams,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const url = `${endpoint}${buildQueryString(endpoint, params)}`;
  const resp = await client.get<ApiResponse<T>>(url, config);
  return resp.data;
}

export async function apiPost<TReq, TResp>(
  endpoint: string,
  data: TReq,
  config?: AxiosRequestConfig
): Promise<ApiResponse<TResp>> {
  const resp = await client.post<ApiResponse<TResp>>(endpoint, { reqData: data }, config);
  return resp.data;
}

export async function apiPut<TReq, TResp>(
  endpoint: string,
  data?: TReq,
  config?: AxiosRequestConfig
): Promise<ApiResponse<TResp>> {
  const body = data !== undefined ? { reqData: data } : undefined;
  const resp = await client.put<ApiResponse<TResp>>(endpoint, body, config);
  return resp.data;
}

export async function apiDelete<T>(
  endpoint: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const resp = await client.delete<ApiResponse<T>>(endpoint, {
    ...config,
    data: data ? { reqData: data } : undefined,
  });
  return resp.data;
}

// Raw get for endpoints that return data directly (e.g. count)
export async function apiGetRaw<T>(
  endpoint: string,
  params?: PaginationParams,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  return apiGet<T>(endpoint, params, config);
}

export { client as axiosClient };
