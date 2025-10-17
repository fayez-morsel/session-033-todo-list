import { create } from "zustand";
import type { Task, ID, TaskStatus } from "../types";
import {
  fetchTasksApi,
  createTaskApi,
  updateTaskApi,
  deleteTaskApi,
} from "../services/endpoints";

type ViewMode = "list" | "cards";

type Filters = {
  assigneeId?: ID;
  status?: TaskStatus | "all";
};

type TaskState = {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  view: ViewMode;
  filters: Filters;
  fetch: () => Promise<void>;
  setView: (v: ViewMode) => void;
  setFilters: (f: Partial<Filters>) => void;
  add: (t: Partial<Task>) => Promise<void>;
  update: (id: ID, t: Partial<Task>) => Promise<void>;
  remove: (id: ID) => Promise<void>;
  toggleStatus: (id: ID) => Promise<void>;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  view: "list",
  filters: { status: "all" },

  async fetch() {
    set({ loading: true, error: null });
    try {
      const { assigneeId, status } = get().filters;
      const tasks = await fetchTasksApi({
        assigneeId,
        status: status && status !== "all" ? status : undefined,
      });
      set({ tasks, loading: false });
    } catch (e: any) {
      set({
        error: e?.response?.data?.error || "Failed to fetch tasks",
        loading: false,
      });
    }
  },

  setView(v) {
    set({ view: v });
  },

  setFilters(f) {
    set({ filters: { ...get().filters, ...f } });
  },

  async add(t) {
    try {
      set({ error: null });
      const newTask = await createTaskApi(t);
      set({ tasks: [newTask, ...get().tasks] });
    } catch (e: any) {
      set({
        error: e?.response?.data?.error || "Failed to create task",
      });
      throw e;
    }
  },

  async update(id, t) {
    try {
      const upd = await updateTaskApi(id, t);
      set({ tasks: get().tasks.map((x) => (x.id === id ? upd : x)) });
    } catch (e: any) {
      set({
        error: e?.response?.data?.error || "Failed to update task",
      });
      throw e;
    }
  },

  async remove(id) {
    try {
      await deleteTaskApi(id);
      set({ tasks: get().tasks.filter((x) => x.id !== id) });
    } catch (e: any) {
      set({
        error: e?.response?.data?.error || "Failed to delete task",
      });
      throw e;
    }
  },

  async toggleStatus(id) {
    const current = get().tasks.find((t) => t.id === id);
    if (!current) return;
    const next: TaskStatus =
      current.status === "completed" ? "pending" : "completed";
    await get().update(id, { status: next });
  },
}));
