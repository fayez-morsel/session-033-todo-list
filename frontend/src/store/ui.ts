import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  lastVisitedPath: string;
  notificationOpen: boolean;
  setLastVisitedPath: (path: string) => void;
  setNotificationOpen: (open: boolean) => void;
  toggleNotification: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      lastVisitedPath: "/",
      notificationOpen: false,
      setLastVisitedPath(path) {
        set({ lastVisitedPath: path });
      },
      setNotificationOpen(open) {
        set({ notificationOpen: open });
      },
      toggleNotification() {
        set({ notificationOpen: !get().notificationOpen });
      },
    }),
    {
      name: "ui-store",
      partialize: (state) => ({
        lastVisitedPath: state.lastVisitedPath,
        notificationOpen: state.notificationOpen,
      }),
    }
  )
);
