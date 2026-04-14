"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RoleType } from "@/lib/constants";
import {
  getToken,
  getLoginUser,
  isTokenExpired,
  getRoleFromToken,
  clearAuth,
  saveAuth,
  LoginUser,
  isAdmin,
  isSeller,
} from "@/lib/auth";
import { apiPost } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/constants";

interface AuthState {
  token: string | null;
  user: LoginUser | null;
  role: RoleType | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (
    loginId: string,
    password: string,
    roleType: number,
    remember: boolean
  ) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSeller: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    role: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      const role = getRoleFromToken(token);
      const user = getLoginUser();
      setState({ token, user, role, isLoading: false });
    } else {
      if (token) clearAuth();
      setState({ token: null, user: null, role: null, isLoading: false });
    }
  }, []);

  const login = useCallback(
    async (
      loginId: string,
      password: string,
      roleType: number,
      remember: boolean
    ) => {
      const resp = await apiPost<
        { loginId: string; password: string; roleType: number },
        { accessToken: string; loginUserDetails: LoginUser; expiresUtc: string }
      >(API_ENDPOINTS.LOGIN, { loginId, password, roleType });

      if (resp.isError || !resp.successData) {
        throw new Error(
          resp.errorData?.displayMessage || "Login failed. Please try again."
        );
      }

      const { accessToken, loginUserDetails } = resp.successData;
      saveAuth(accessToken, loginUserDetails, remember);
      const role = getRoleFromToken(accessToken);

      setState({
        token: accessToken,
        user: loginUserDetails,
        role,
        isLoading: false,
      });

      // Redirect based on role
      if (role === RoleType.SuperAdmin || role === RoleType.SystemAdmin) {
        router.push("/admin/dashboard");
      } else if (role === RoleType.Seller) {
        router.push("/seller/dashboard");
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    clearAuth();
    setState({ token: null, user: null, role: null, isLoading: false });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isAdmin: isAdmin(state.role),
        isSeller: isSeller(state.role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
