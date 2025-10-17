import { Link, useLocation } from "react-router-dom";
import { Home, ListChecks, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ItemProps = {
  to: string;
  icon: LucideIcon;
  label: string;
};

function Item({ to, icon: Icon, label }: ItemProps) {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition hover:bg-white/60"
    >
      <div
        className={`grid h-9 w-9 place-items-center rounded-full ${
          active ? "bg-primary/15 text-primary" : "text-gray-500"
        }`}
      >
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <span
        className={`text-xs font-medium ${
          active ? "text-primary" : "text-gray-500"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export default function BottomNav() {
  const { pathname } = useLocation();
  const hide = ["/", "/auth", "/invite"].includes(pathname);
  if (hide) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-2 rounded-t-3xl border-t border-gray-200 bg-white/95 px-6 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
      <Item to="/dashboard" icon={Home} label="Home" />
      <Item to="/tasks" icon={ListChecks} label="Tasks" />
      <Item to="/members" icon={Users} label="Members" />
    </nav>
  );
}
