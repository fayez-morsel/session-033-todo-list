import { useEffect, type JSX } from "react";
import { Moon, Sun, ClipboardList, CircleCheck, Clock3, ArrowRight, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useTaskStore } from "../store/tasks";
import { useThemeStore } from "../store/theme";

export default function Dashboard() {
  const user = useAuthStore((state) => state.currentUser);
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetch);
  const loading = useTaskStore((state) => state.loading);
  const { mode, toggle } = useThemeStore();
  const isDark = mode === "dark";

  const familyLabel = user?.familyLabel?.trim() || "Family Dashboard";
  const greetingName =
    user?.firstName || user?.name || user?.fullName || "there";

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const completed = tasks.filter((t) => t.status === "completed").length;
  const pending = tasks.length - completed;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 pb-28 pt-10 transition-colors">
      <section className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 shadow-[var(--surface-shadow)] transition-colors">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <UsersRound size={24} strokeWidth={2.4} />
            </div>
            <h1 className="text-2xl font-bold text-[var(--app-text)]">
              {familyLabel}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              Hi, {greetingName}!
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-[var(--surface-border)] bg-[var(--surface)] p-3 text-[var(--text-muted)] shadow-sm transition hover:border-primary hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun size={18} strokeWidth={2.2} className={loading ? "animate-spin" : ""} />
            ) : (
              <Moon size={18} strokeWidth={2.2} className={loading ? "animate-spin" : ""} />
            )}
          </button>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<ClipboardList size={20} />}
            iconBg="bg-sky-100 text-sky-600"
            label="Total Tasks"
            value={tasks.length}
          />
          <StatCard
            icon={<CircleCheck size={20} />}
            iconBg="bg-emerald-100 text-emerald-600"
            label="Completed Tasks"
            value={completed}
          />
          <StatCard
            icon={<Clock3 size={20} />}
            iconBg="bg-amber-100 text-amber-600"
            label="Pending Tasks"
            value={pending}
          />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <CTAButton to="/tasks" label="View All Tasks" />
          <CTAButton to="/members" label="Manage Members" />
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
}: {
  icon: JSX.Element;
  label: string;
  value: number;
  iconBg: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-5 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--surface-shadow)]">
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--app-text)]">{value}</p>
    </div>
  );
}

function CTAButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group flex flex-1 items-center justify-between rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:border-primary hover:text-primary"
    >
      {label}
      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
    </Link>
  );
}
