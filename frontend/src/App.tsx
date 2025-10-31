import { useEffect, type JSX } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Invite from "./pages/Invite";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Members from "./pages/Members";
import NotFound from "./pages/NotFound";
import FamilySetup from "./pages/FamilySetup";
import BottomNav from "./components/BottomNav";
import { useAuthStore } from "./store/auth";
import { useThemeStore } from "./store/theme";
import { useUiStore } from "./store/ui";

function Protected({
  children,
  requireFamily = false,
}: {
  children: JSX.Element;
  requireFamily?: boolean;
}) {
  const user = useAuthStore(s => s.currentUser);
  if (!user) return <Navigate to="/auth" replace />;
  if (requireFamily && !user.familyId) {
    return <Navigate to="/family" replace />;
  }
  return children;
}

export default function App() {
  const mode = useThemeStore(state => state.mode);
  const setLastVisitedPath = useUiStore(state => state.setLastVisitedPath);
  const location = useLocation();

  useEffect(() => {
    setLastVisitedPath(location.pathname);
  }, [location.pathname, setLastVisitedPath]);

  return (
    <div
      className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors duration-300"
      data-theme-mode={mode}
    >
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/invite" element={<Invite />} />
        <Route
          path="/family"
          element={
            <Protected>
              <FamilySetup />
            </Protected>
          }
        />
        <Route
          path="/dashboard"
          element={<Protected requireFamily><Dashboard /></Protected>}
        />
        <Route
          path="/tasks"
          element={<Protected requireFamily><Tasks /></Protected>}
        />
        <Route
          path="/members"
          element={<Protected requireFamily><Members /></Protected>}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
      <Toaster />
    </div>
  );
}
