import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Invite from "./pages/Invite";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Members from "./pages/Members";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/BottomNav";
import { useAuthStore } from "./store/auth";
import { useThemeStore } from "./store/theme";
import type { JSX } from "react";

function Protected({ children }: { children: JSX.Element }) {
  const user = useAuthStore(s => s.currentUser);
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  const mode = useThemeStore(state => state.mode);

  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors duration-300"
      data-theme-mode={mode}
    >
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
        <Route path="/members" element={<Protected><Members /></Protected>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
      <Toaster />
    </div>
  );
}
