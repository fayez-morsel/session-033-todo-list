import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

type ThemeState = {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
};

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", mode);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "light",
      toggle() {
        const next = get().mode === "light" ? "dark" : "light";
        set({ mode: next });
        applyTheme(next);
      },
      setMode(mode) {
        set({ mode });
        applyTheme(mode);
      },
    }),
    {
      name: "theme-store",
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        const mode = state?.mode ?? "light";
        applyTheme(mode);
      },
    }
  )
);

if (typeof document !== "undefined") {
  applyTheme(useThemeStore.getState().mode);
}

