import { create } from "zustand";
import { persist } from "zustand/middleware";

export type StoredSentInvite = {
  token: string;
  email?: string;
  sentAt: string;
  method: "manual" | "email";
  inviteeHasFamily?: boolean;
  inviteeRecognized?: boolean;
  emailSent?: boolean;
};

type InviteHistoryState = {
  historyByUser: Record<string, StoredSentInvite[]>;
  addInvite: (userId: number | string, invite: StoredSentInvite) => void;
  replaceInvites: (userId: number | string, invites: StoredSentInvite[]) => void;
  clearForUser: (userId: number | string) => void;
};

const MAX_HISTORY = 20;

export const useInviteHistoryStore = create<InviteHistoryState>()(
  persist(
    (set, get) => ({
      historyByUser: {},
      addInvite(userId, invite) {
        const key = String(userId);
        if (!key) return;
        const current = get().historyByUser[key] ?? [];
        const next = [invite, ...current].slice(0, MAX_HISTORY);
        set((state) => ({
          historyByUser: {
            ...state.historyByUser,
            [key]: next,
          },
        }));
      },
      replaceInvites(userId, invites) {
        const key = String(userId);
        if (!key) return;
        set((state) => ({
          historyByUser: {
            ...state.historyByUser,
            [key]: invites.slice(0, MAX_HISTORY),
          },
        }));
      },
      clearForUser(userId) {
        const key = String(userId);
        if (!key) return;
        set((state) => {
          const next = { ...state.historyByUser };
          delete next[key];
          return { historyByUser: next };
        });
      },
    }),
    {
      name: "invite-history-store",
      partialize: (state) => ({ historyByUser: state.historyByUser }),
    }
  )
);
