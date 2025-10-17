import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  Filter,
  LayoutGrid,
  List,
  Plus,
  UserRound,
  UsersRound,
  CheckCircle2,
} from "lucide-react";
import { useTaskStore } from "../store/tasks";
import { useAuthStore } from "../store/auth";
import type { Task, TaskStatus } from "../types";
import TaskCard from "../components/TaskCard";
import TaskRow from "../components/TaskRow";
import Modal from "../components/Modal";

type FormState = {
  title: string;
  description: string;
  date: string;
  time: string;
  assigneeId: string;
  status: TaskStatus;
};

type ModalMode = "create" | "edit";

function toLocalParts(value?: string) {
  if (!value) return { date: "", time: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  const [date, time] = local.split("T");
  return { date, time: time ?? "" };
}

function combineDateTime(date: string, time: string) {
  if (!date) return undefined;
  const base = `${date}T${time || "00:00"}`;
  const d = new Date(base);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toISOString();
}

const FILTERS = ["all", "me", "completed"] as const;
type FilterKey = (typeof FILTERS)[number];

export default function Tasks() {
  const {
    tasks,
    fetch,
    view,
    setView,
    setFilters,
    add,
    update,
    remove,
    toggleStatus,
    error: taskError,
  } = useTaskStore();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const makeInitialForm = useCallback(
    (): FormState => ({
      title: "",
      description: "",
      date: "",
      time: "",
      assigneeId: currentUser?.id ? String(currentUser.id) : "",
      status: "pending",
    }),
    [currentUser?.id]
  );

  const [form, setForm] = useState<FormState>(() => makeInitialForm());

  useEffect(() => {
    setForm(makeInitialForm());
  }, [makeInitialForm]);

  useEffect(() => {
    if (activeFilter === "all") {
      setFilters({ status: "all", assigneeId: undefined });
    } else if (activeFilter === "completed") {
      setFilters({ status: "completed", assigneeId: undefined });
    } else if (activeFilter === "me") {
      if (!currentUser?.id) {
        setActiveFilter("all");
        return;
      }
      setFilters({
        assigneeId: currentUser.id,
        status: "all",
      });
    }
    fetch();
  }, [activeFilter, currentUser?.id, setFilters, fetch]);

  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime()
      ),
    [tasks]
  );

  const canSave =
    !!form.title.trim() &&
    !!(Number(form.assigneeId) || currentUser?.id);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingTask(null);
    setForm(makeInitialForm());
    setFormError(null);
    setOpen(true);
  };

  const openEditModal = (task: Task) => {
    setModalMode("edit");
    setEditingTask(task);
    const { date, time } = toLocalParts(task.dueAt);
    setForm({
      title: task.title,
      description: task.description ?? "",
      date,
      time,
      assigneeId: String(task.assigneeId ?? ""),
      status: task.status,
    });
    setFormError(null);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  const handleInput =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        field === "title" || field === "description"
          ? e.target.value
          : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const save = async () => {
    if (!form.title.trim()) {
      setFormError("Task title is required.");
      return;
    }
    const assigneeId = Number(form.assigneeId) || currentUser?.id;
    if (!assigneeId) {
      setFormError("Assign this task to a valid family member.");
      return;
    }

    setFormError(null);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueAt: combineDateTime(form.date, form.time),
        assigneeId,
        status: form.status,
      };

      if (modalMode === "create") {
        await add(payload);
      } else if (editingTask) {
        await update(editingTask.id, payload);
      }

      setOpen(false);
      setForm(makeInitialForm());
      setEditingTask(null);
      setModalMode("create");
    } catch (e: any) {
      setFormError(
        e?.response?.data?.error || "Failed to save task. Try again."
      );
    }
  };

  const filterLabel = (filter: FilterKey) => {
    switch (filter) {
      case "all":
        return "All";
      case "me":
        return "Me";
      case "completed":
        return "Completed";
      default:
        return filter;
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 pb-28 pt-10">
      <section className="rounded-3xl border border-white/40 bg-white p-6 shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/15 p-3 text-primary">
              <UsersRound size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
              <p className="text-sm text-gray-500">
                Manage and track your family&apos;s to-dos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-primary hover:text-primary">
              <Filter size={16} />
              Filter
            </button>
            <div className="flex overflow-hidden rounded-full border border-gray-200">
              <button
                className={`grid h-10 w-10 place-items-center transition ${
                  view === "list"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-500 hover:bg-gray-100"
                }`}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List size={18} strokeWidth={2.5} />
              </button>
              <button
                className={`grid h-10 w-10 place-items-center transition ${
                  view === "cards"
                    ? "bg-primary text-white"
                    : "bg-white text-gray-500 hover:bg-gray-100"
                }`}
                onClick={() => setView("cards")}
                aria-label="Card view"
              >
                <LayoutGrid size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
            {FILTERS.map((filter) => {
              const disabled = filter === "me" && !currentUser?.id;
              return (
                <button
                  key={filter}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeFilter === filter
                      ? "bg-white text-primary shadow"
                      : "text-gray-500 hover:text-gray-700"
                  } ${disabled ? "cursor-not-allowed opacity-60 hover:text-gray-500" : ""}`}
                  onClick={() => !disabled && setActiveFilter(filter)}
                  type="button"
                  disabled={disabled}
                >
                  {filter === "all" && <UsersRound size={16} />}
                  {filter === "me" && <UserRound size={16} />}
                  {filter === "completed" && <CheckCircle2 size={16} />}
                  {filterLabel(filter)}
                </button>
              );
            })}
          </div>

          <button
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(76,175,80,0.3)] transition hover:bg-primaryDark"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            New Task
          </button>
        </div>

        {taskError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {taskError}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {sorted.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-500">
              No tasks yet. Click &ldquo;New Task&rdquo; to create your first one.
            </div>
          ) : view === "list" ? (
            <div className="space-y-3">
              {sorted.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleStatus(task.id)}
                  onEdit={() => openEditModal(task)}
                  onDelete={() => remove(task.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sorted.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleStatus(task.id)}
                  onEdit={() => openEditModal(task)}
                  onDelete={() => remove(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <button
        className="fixed bottom-[106px] right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_18px_40px_rgba(76,175,80,0.35)] transition hover:bg-primaryDark"
        onClick={openCreateModal}
        aria-label="Create new task"
      >
        <Plus size={24} />
      </button>

      <Modal
        open={open}
        onClose={closeModal}
        title={modalMode === "edit" ? "Edit Task" : "Add Task"}
        actions={
          <>
            <button
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-100"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(76,175,80,0.3)] transition hover:bg-primaryDark disabled:opacity-60"
              onClick={save}
              disabled={!canSave}
            >
              {modalMode === "edit" ? "Update Task" : "Save Task"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Task Title</label>
            <input
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={form.title}
              onChange={handleInput("title")}
              placeholder="Enter task title"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="h-24 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={form.description}
              onChange={handleInput("description")}
              placeholder="Add more details..."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.date}
                onChange={handleInput("date")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Time</label>
              <input
                type="time"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={form.time}
                onChange={handleInput("time")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Assign To</label>
            <input
              type="number"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={form.assigneeId}
              onChange={handleInput("assigneeId")}
              placeholder="Select family member (id)"
              min={0}
            />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
            <input
              id="mark-completed"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/60"
              checked={form.status === "completed"}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.checked ? "completed" : "pending",
                }))
              }
            />
            <label htmlFor="mark-completed" className="text-sm font-medium text-gray-600">
              Mark as completed
            </label>
          </div>
          {formError && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {formError}
            </p>
          )}
        </div>
      </Modal>
    </main>
  );
}
