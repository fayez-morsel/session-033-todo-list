import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, AuthCredentials, InviteJoinPayload } from "../types";
import {
  loginApi,
  registerApi,
  joinWithInviteApi,
  createFamilyApi,
  joinFamilyWithTokenApi,
  acceptInviteByIdApi,
} from "../services/endpoints";
import { setAuthToken } from "../services/api";

type AuthState = {
  currentUser: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (cred: AuthCredentials) => Promise<void>;
  register: (cred: AuthCredentials) => Promise<void>;
  joinWithInvite: (payload: InviteJoinPayload) => Promise<void>;
  createFamily: (name?: string) => Promise<void>;
  joinFamilyWithToken: (token: string, options?: { forceLeave?: boolean }) => Promise<void>;
  acceptInviteById: (inviteId: string, options?: { forceLeave?: boolean }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      currentUser: null,
      token: null,
      loading: false,
      error: null,

      async login(cred) {
        set({ loading: true, error: null });
        try {
          const { token, user } = await loginApi(cred);
          setAuthToken(token);
          set({ currentUser: user, token, loading: false });
        } catch (e: any) {
          set({ error: e?.response?.data?.error || "Login failed", loading: false });
        }
      },

      async register(cred) {
        set({ loading: true, error: null });
        try {
          const { token, user } = await registerApi(cred);
          setAuthToken(token);
          set({ currentUser: user, token, loading: false });
        } catch (e: any) {
          set({ error: e?.response?.data?.error || "Register failed", loading: false });
        }
      },

      async joinWithInvite(payload) {
        set({ loading: true, error: null });
        try {
          const { token, user } = await joinWithInviteApi(payload);
          setAuthToken(token);
          set({ currentUser: user, token, loading: false });
        } catch (e: any) {
          set({ error: e?.response?.data?.error || "Invite join failed", loading: false });
        }
      },

      async createFamily(name) {
        set({ loading: true, error: null });
        try {
          const { token, user } = await createFamilyApi(name);
          setAuthToken(token);
          set({ currentUser: user, token, loading: false });
        } catch (e: any) {
          set({ error: e?.response?.data?.error || "Failed to create family", loading: false });
        }
      },

      async joinFamilyWithToken(tokenValue, options) {
        set({ loading: true, error: null });
        try {
          const { token, user } = await joinFamilyWithTokenApi(
            tokenValue,
            options?.forceLeave
          );
          setAuthToken(token);
          set({ currentUser: user, token, loading: false });
        } catch (e: any) {
          set({ error: e?.response?.data?.error || "Failed to join family", loading: false });
          throw e;
        }
      },

      async acceptInviteById(inviteId, options) {
        set({ loading: true, error: null });
        try {
          const { token, user } = await acceptInviteByIdApi(
            inviteId,
            options?.forceLeave
          );
          setAuthToken(token);
          set({ currentUser: user, token, loading: false });
        } catch (e: any) {
          set({ error: e?.response?.data?.error || "Failed to accept invite", loading: false });
          throw e;
        }
      },

      logout() {
        setAuthToken(undefined);
        set({ currentUser: null, token: null, error: null, loading: false });
      },
      clearError() {
        set({ error: null });
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token);
      },
    }
  )
);



