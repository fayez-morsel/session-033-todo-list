import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import BrandMark from "../components/BrandMark";

export default function Auth() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (tab === "login") {
      await login({ email, password });
    } else {
      await register({ email, password, name });
    }
    if (!useAuthStore.getState().error) navigate("/dashboard");
  }

  const switchTab = (mode: "login" | "register") => {
    setTab(mode);
    clearError();
  };

  const oppositeTabText =
    tab === "login"
      ? { text: "Don't have an account?", action: "Register", target: () => switchTab("register") }
      : { text: "Already have an account?", action: "Login", target: () => switchTab("login") };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <BrandMark className="mx-auto" />

        <div className="rounded-3xl border border-white/40 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {tab === "login" ? "Welcome back" : "Create account"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {tab === "login"
                  ? "Log in to keep your family on track."
                  : "Let's get your family workspace ready."}
              </p>
            </div>
          </div>

          <div className="mb-6 flex rounded-full bg-gray-100 p-1">
            <button
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                tab === "login"
                  ? "bg-white text-primary shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => switchTab("login")}
            >
              Login
            </button>
            <button
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                tab === "register"
                  ? "bg-white text-primary shadow"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => switchTab("register")}
            >
              Register
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {tab === "register" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <input
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) clearError();
                  }}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
                placeholder="your@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                placeholder="********"
                required
              />
            </div>
            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
            <button
              disabled={loading}
              className="w-full rounded-full bg-primary py-3 text-base font-semibold text-white shadow-[0_18px_35px_rgba(76,175,80,0.3)] transition hover:bg-primaryDark disabled:opacity-70"
            >
              {loading ? "Please wait..." : tab === "login" ? "Login" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center text-sm">
            <Link className="font-semibold text-primary hover:underline" to="/invite">
              Join with invite link
            </Link>
            <p className="text-gray-500">
              {oppositeTabText.text}{" "}
              <button
                type="button"
                onClick={oppositeTabText.target}
                className="font-semibold text-primary hover:underline"
              >
                {oppositeTabText.action}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}






