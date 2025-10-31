import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import BrandMark from "../components/BrandMark";

export default function Auth() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    name: string | null;
    email: string | null;
    password: string | null;
  }>({
    name: null,
    email: null,
    password: null,
  });
  const { login, register, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  type FieldKey = "name" | "email" | "password";

  const getValue = (field: FieldKey) => {
    switch (field) {
      case "name":
        return name;
      case "email":
        return email;
      case "password":
        return password;
      default:
        return "";
    }
  };

  const validateField = (field: FieldKey, value: string, mode: "login" | "register") => {
    const trimmed = value.trim();
    if (field === "name") {
      if (mode === "register" && !trimmed) return "Full name is required.";
      return null;
    }

    if (field === "email") {
      if (!trimmed) return "Email is required.";
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmed)) return "Please enter a valid email address.";
      return null;
    }

    if (!trimmed) return "Password is required.";
    if (trimmed.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const updateFieldError = (field: FieldKey, value: string, mode: "login" | "register") => {
    setFieldErrors((prev) => ({
      ...prev,
      [field]: validateField(field, value, mode),
    }));
  };

  const handleChange =
    (field: FieldKey) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;

      if (field === "name") setName(nextValue);
      if (field === "email") setEmail(nextValue);
      if (field === "password") setPassword(nextValue);

      updateFieldError(field, nextValue, tab);
      if (error) clearError();
    };

  const handleBlur = (field: FieldKey) => () => {
    updateFieldError(field, getValue(field), tab);
  };

  const resetFieldState = () => {
    setFieldErrors({
      name: null,
      email: null,
      password: null,
    });
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedValues = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
    };

    const newErrors: typeof fieldErrors = {
      name: validateField("name", trimmedValues.name, tab),
      email: validateField("email", trimmedValues.email, tab),
      password: validateField("password", trimmedValues.password, tab),
    };

    if (tab === "login") {
      newErrors.name = null;
    }

    setFieldErrors(newErrors);
    const hasErrors = Object.values(newErrors).some(Boolean);
    if (hasErrors) {
      return;
    }

    clearError();
    setEmail(trimmedValues.email);
    setPassword(trimmedValues.password);
    if (tab === "register") {
      setName(trimmedValues.name);
    }

    if (tab === "login") {
      await login({ email: trimmedValues.email, password: trimmedValues.password });
    } else {
      await register({
        email: trimmedValues.email,
        password: trimmedValues.password,
        name: trimmedValues.name,
      });
    }
    if (!useAuthStore.getState().error) {
      navigate(tab === "register" ? "/family" : "/dashboard");
    }
  }

  const switchTab = (mode: "login" | "register") => {
    setTab(mode);
    resetFieldState();
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
                  className={`w-full rounded-2xl border ${
                    fieldErrors.name ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-gray-50"
                  } px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                  value={name}
                  onChange={handleChange("name")}
                  onBlur={handleBlur("name")}
                  placeholder="Enter your full name"
                  autoComplete="off"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby="auth-name-error"
                />
                <p id="auth-name-error" className="min-h-[18px] text-xs text-red-600">
                  {fieldErrors.name}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className={`w-full rounded-2xl border ${
                  fieldErrors.email ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-gray-50"
                } px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                value={email}
                onChange={handleChange("email")}
                onBlur={handleBlur("email")}
                placeholder="your@email.com"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby="auth-email-error"
              />
              <p id="auth-email-error" className="min-h-[18px] text-xs text-red-600">
                {fieldErrors.email}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className={`w-full rounded-2xl border ${
                  fieldErrors.password ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-gray-50"
                } px-4 py-3 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                value={password}
                onChange={handleChange("password")}
                onBlur={handleBlur("password")}
                placeholder="********"
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby="auth-password-error"
              />
              <p id="auth-password-error" className="min-h-[18px] text-xs text-red-600">
                {fieldErrors.password}
              </p>
            </div>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <button
              disabled={loading}
              className="w-full rounded-full bg-primary py-3 text-base font-semibold text-white shadow-[0_18px_35px_rgba(76,175,80,0.3)] transition hover:bg-primaryDark disabled:opacity-70"
            >
              {loading ? "Please wait..." : tab === "login" ? "Login" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
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
    </main>
  );
}






