import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import type { Task } from "../types";
import { avatarPaletteFor, initialsFor } from "../utils/avatar";

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
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

export default function TaskRow({ task, onToggle, onEdit, onDelete }: Props) {
  const due = formatDate(task.dueAt);
  const isDone = task.status === "completed";
  const palette = avatarPaletteFor(task.assigneeName ?? task.title);
  const initials = initialsFor(task.assigneeName ?? task.title);

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 rounded-full border-2 border-gray-300 text-primary focus:ring-primary"
          checked={isDone}
          onChange={onToggle}
          aria-label={isDone ? "Mark task as pending" : "Mark task as completed"}
        />
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h3
                className={`text-base font-semibold ${
                  isDone ? "text-gray-400 line-through" : "text-gray-900"
                }`}
              >
                {task.title}
              </h3>
              {task.description && (
                <p
                  className={`text-sm ${
                    isDone ? "text-gray-400 line-through" : "text-gray-600"
                  }`}
                >
                  {task.description}
                </p>
              )}
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                isDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {isDone ? "Completed" : "Pending"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {task.assigneeName && (
              <span className="flex items-center gap-2 font-medium">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full ${palette.bg} ${palette.text} font-semibold`}
                >
                  {initials}
                </span>
                {task.assigneeName}
              </span>
            )}
            {due && (
              <span className="flex items-center gap-1.5 text-gray-500">
                <CalendarDays size={16} strokeWidth={2.2} />
                Due {due}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 text-xs font-semibold sm:flex-row sm:items-center">
          <button
            className="flex items-center justify-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 transition hover:border-primary hover:text-primary"
            onClick={onEdit}
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            className="flex items-center justify-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-red-600 transition hover:border-red-300 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
