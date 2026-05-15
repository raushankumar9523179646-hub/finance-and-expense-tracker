import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AmbientBackdrop } from "./AmbientBackdrop.jsx";
import { api, setAuthToken } from "./api.js";
import { AnimatedGradientBackground } from "./AnimatedGradientBackground.jsx";
import { FullScreenGrid } from "./FullScreenGrid.jsx";

function AuthTab({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "glass border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 via-teal-500/10 to-cyan-500/5 text-emerald-100 shadow-[0_0_24px_-6px_rgba(52,211,153,0.4)]"
          : "glass-muted text-slate-400 hover:border-white/15 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, className = "", ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input className={`glass-input ${className}`.trim()} {...props} />
    </label>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [googleOAuth, setGoogleOAuth] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .googleOAuthEnabled()
      .then((d) => {
        if (!cancelled) setGoogleOAuth(!!d?.enabled);
      })
      .catch(() => {
        if (!cancelled) setGoogleOAuth(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const oerr = searchParams.get("oauth_error");
    if (!oerr) return;
    setFormError(oerr);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("oauth_error");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  function switchMode(next) {
    setMode(next);
    setFormError(null);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = loginEmail.trim();
    if (!email || !loginPassword) return;
    setBusy(true);
    setFormError(null);
    try {
      const data = await api.login({ email, password: loginPassword });
      setAuthToken(data.token);
      navigate("/app");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    const email = signupEmail.trim();
    if (!email || !signupPassword) return;
    if (signupPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const body = {
        email,
        password: signupPassword,
        name: name.trim() || undefined,
      };
      const data = await api.register(body);
      setAuthToken(data.token);
      navigate("/app");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#070a10] lg:bg-transparent">
      <div className="relative z-0 flex min-h-screen flex-col lg:flex-row">
        {/* Left ~70% — hero + bubbles (clipped to this column only) */}
        <div className="relative flex min-h-[42vh] flex-[7] flex-col justify-center overflow-hidden px-6 py-12 sm:px-10 lg:min-h-screen lg:px-14 xl:px-20">
          <AnimatedGradientBackground />

          <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] hidden w-px bg-gradient-to-b from-transparent via-white/12 to-transparent lg:block" />

          <div className="relative z-[2] flex flex-col justify-center">
          <p className="text-sm font-medium text-emerald-400/90">Personal finance</p>
          <h1 className="font-display mt-2 max-w-xl bg-gradient-to-r from-white via-emerald-100 to-cyan-200/90 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl xl:text-6xl">
            Expense tracker
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400 sm:text-lg">
            Track accounts, categories, transactions, and budgets in one place. Sign in on the right to
            sync with your secure backend.
          </p>
          <ul className="mt-8 hidden max-w-md space-y-3 text-sm text-slate-500 sm:block">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80" />
              Monthly summaries and balances at a glance
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/70" />
              Full CRUD wired to your Flask API & SQLite database
            </li>
          </ul>
          </div>
        </div>

        {/* Right ~30% — login card */}
        <div className="relative flex min-h-0 flex-[3] flex-col justify-center border-t border-white/[0.08] bg-[#070a10]/88 px-5 py-10 backdrop-blur-xl lg:min-h-screen lg:border-l lg:border-t-0 lg:px-8 lg:py-12 xl:px-10">
          <FullScreenGrid />
          <div className="mx-auto w-full max-w-md">
            <header className="mb-6 lg:hidden">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/80">
                Welcome back
              </p>
              <h2 className="font-display mt-1 text-2xl font-semibold text-white">Sign in</h2>
            </header>

            <section className="glass card-fog relative overflow-hidden rounded-2xl p-6 sm:p-8">
              <span className="card-fog-vapor" aria-hidden />
              <span className="card-fog-vapor card-fog-vapor--b" aria-hidden />
              <span className="card-fog-noise" aria-hidden />

              <div className="relative z-10">
                <header className="mb-6 hidden lg:block">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/80">
                    Account
                  </p>
                  <h2 className="font-display mt-1 text-xl font-semibold text-white">
                    Log in or register
                  </h2>
                </header>

                <div className="mb-6 flex justify-center gap-2 rounded-2xl glass-muted p-1.5">
                  <AuthTab active={mode === "login"} onClick={() => switchMode("login")}>
                    Log in
                  </AuthTab>
                  <AuthTab active={mode === "signup"} onClick={() => switchMode("signup")}>
                    Sign up
                  </AuthTab>
                </div>

                {formError && (
                  <div className="mb-4 rounded-xl glass-danger px-3 py-2 text-sm">{formError}</div>
                )}

                {mode === "login" ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Field
                      label="Email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                    <Field
                      label="Password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="mt-2 w-full rounded-lg border border-emerald-400/30 bg-emerald-600/85 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/25 backdrop-blur-sm hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busy ? "Signing in…" : "Log in"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignup} className="space-y-4">
                    <Field
                      label="Display name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Optional"
                    />
                    <Field
                      label="Email"
                      type="email"
                      autoComplete="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                    <Field
                      label="Password"
                      type="password"
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      required
                    />
                    <Field
                      label="Confirm password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      minLength={8}
                      required
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="mt-2 w-full rounded-lg border border-emerald-400/30 bg-emerald-600/85 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/25 backdrop-blur-sm hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busy ? "Creating account…" : "Create account"}
                    </button>
                  </form>
                )}

                <div className="relative my-6 flex items-center justify-center gap-2">
                  <span className="h-px flex-1 bg-white/12" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    or continue with
                  </span>
                  <span className="h-px flex-1 bg-white/12" />
                </div>

                <button
                  type="button"
                  disabled={!googleOAuth}
                  title={
                    googleOAuth
                      ? "Sign in with Google"
                      : "Google sign-in is not configured (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on the server)"
                  }
                  onClick={() => {
                    window.location.assign("/api/auth/google/start");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
