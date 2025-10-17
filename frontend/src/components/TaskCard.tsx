import { CalendarDays, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import type { Task } from "../types";
import { avatarPaletteFor, initialsFor } from "../utils/avatar";

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TaskCard({ task, onToggle, onEdit, onDelete }: Props) {
  const due = formatDate(task.dueAt);
  const isDone = task.status === "completed";
  const palette = avatarPaletteFor(task.assigneeName ?? task.title);
  const initials = initialsFor(task.assigneeName ?? task.title);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-12 w-12 place-items-center rounded-2xl ${palette.bg} ${palette.text} text-lg font-semibold`}
          >
            {initials}
          </span>
          <div className="space-y-1">
            <h3
              className={`text-lg font-semibold ${
                isDone ? "text-gray-400 line-through" : "text-gray-900"
              }`}
            >
              {task.title}
            </h3>
            {task.assigneeName && (
              <p className="text-sm text-gray-500">{task.assigneeName}</p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            isDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          <CheckCircle2 size={14} />
          {isDone ? "Completed" : "Pending"}
        </span>
      </div>

      {task.description && (
        <p
          className={`mt-3 flex-1 text-sm ${
            isDone ? "text-gray-400 line-through" : "text-gray-600"
          }`}
        >
          {task.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-gray-500">
        {due && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1">
            <CalendarDays size={16} />
            Due {due}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm font-medium">
        <button
          className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 transition hover:border-primary hover:text-primary"
          onClick={onToggle}
        >
          {isDone ? "Mark Pending" : "Mark Done"}
        </button>
        <button
          className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 transition hover:border-primary hover:text-primary"
          onClick={onEdit}
        >
          <Pencil size={14} />
          Edit
        </button>
        <button
          className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-red-600 transition hover:border-red-300 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}
