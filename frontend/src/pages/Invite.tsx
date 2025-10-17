import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { useAuthStore } from "../store/auth";
import BrandMark from "../components/BrandMark";

export default function Invite() {
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { joinWithInvite, error, loading, clearError } = useAuthStore();
  const navigate = useNavigate();

  async function submit() {
    if (!token.trim() || !name.trim() || !email.trim() || !password.trim()) return;
    await joinWithInvite({
      token: token.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    if (!useAuthStore.getState().error) navigate("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-6 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-10">
        <BrandMark className="mx-auto" />

        <div className="w-full rounded-3xl border border-white/50 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Link2 size={34} strokeWidth={2.4} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Join Family Group</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter the invite token to join your family
          </p>

          <div className="mt-6 space-y-3 text-left">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Invite Token
            </label>
            <input
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-sm font-medium tracking-[0.35em] text-gray-700 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (error) clearError();
              }}
            />
            <p className="text-xs text-gray-400">
              Ask your family admin for the invite token
            </p>
          </div>

          <div className="mt-6 space-y-3 text-left">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Full Name
              </label>
              <input
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Your full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) clearError();
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Password
              </label>
              <input
                type="password"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Create a password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
              />
            </div>
            {error && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <button
            disabled={loading}
            className="mt-6 w-full rounded-full bg-primary py-3 text-base font-semibold text-white shadow-[0_18px_35px_rgba(76,175,80,0.3)] transition hover:bg-primaryDark disabled:opacity-70"
            onClick={submit}
          >
            {loading ? "Joining..." : "Join Family Group"}
          </button>

          <Link
            to="/auth"
            className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}






