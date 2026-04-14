import { jwtDecode } from "jwt-decode";
import { TOKEN_KEYS, RoleType } from "./constants";

export interface LoginUser {
  id: number;
  status: string;
  loginStatus: string;
  roleType: string;
  username: string;
  email: string | null;
  image: string | null;
  mobile: string;
  isMobileConfirmed: boolean;
  isEmailConfirmed: boolean;
  role: string;
}

export interface TokenPayload {
  [key: string]: unknown;
  exp: number;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    null
  );
}

export function getLoginUser(): LoginUser | null {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem("login_user") ||
    sessionStorage.getItem("login_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const exp = decoded.exp;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

export function getRoleFromToken(token: string): RoleType | null {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const roleStr = decoded[TOKEN_KEYS.Role] as string;
    if (!roleStr) return null;
    const roleMap: Record<string, RoleType> = {
      SuperAdmin: RoleType.SuperAdmin,
      SystemAdmin: RoleType.SystemAdmin,
      Seller: RoleType.Seller,
      User: RoleType.User,
      DeliveryBoy: RoleType.DeliveryBoy,
    };
    return roleMap[roleStr] ?? null;
  } catch {
    return null;
  }
}

export function getUserNameFromToken(token: string): string | null {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    return (decoded[TOKEN_KEYS.UserName] as string) || null;
  } catch {
    return null;
  }
}

export function saveAuth(
  token: string,
  user: LoginUser,
  remember: boolean
): void {
  if (remember) {
    localStorage.setItem("access_token", token);
    localStorage.setItem("login_user", JSON.stringify(user));
  } else {
    sessionStorage.setItem("access_token", token);
    sessionStorage.setItem("login_user", JSON.stringify(user));
  }
}

export function clearAuth(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("login_user");
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("login_user");
}

export function isAdmin(role: RoleType | null): boolean {
  return role === RoleType.SuperAdmin || role === RoleType.SystemAdmin;
}

export function isSeller(role: RoleType | null): boolean {
  return role === RoleType.Seller;
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

export function getCurrentRole(): RoleType | null {
  const token = getToken();
  if (!token) return null;
  if (isTokenExpired(token)) return null;
  return getRoleFromToken(token);
}
