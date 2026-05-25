import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) || "Family";

function BrandMark() {
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14" aria-label={`${APP_NAME} logo`}>
      <rect width="56" height="56" rx="14" fill="#0C2341" />
      <path d="M11 39 L28 12 L45 39 Z" fill="none" stroke="#8B84D7" strokeWidth="3" strokeLinejoin="round" />
      <path d="M19 39 L19 28 L37 28 L37 39" fill="none" stroke="white" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="28" cy="33.5" r="2.2" fill="#8B84D7" />
    </svg>
  );
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const { t, lang, setLang, dir } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError(t("login_required_name"));
      return;
    }
    if (!password) {
      setError(t("login_required_password"));
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await signIn(identifier.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError(t("login_invalid"));
    }
  }

  function toggleLang() {
    setLang(lang === "ar" ? "en" : "ar");
  }

  return (
    <div
      dir={dir}
      className="min-h-screen flex flex-col bg-brand-dark text-white"
      style={{
        backgroundImage:
          "radial-gradient(1200px 600px at 80% -10%, rgba(139,132,215,0.18), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(139,132,215,0.10), transparent 60%)",
      }}
    >
      {/* Top bar with language toggle */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-secondary/70 text-[11px] uppercase tracking-[0.18em] font-semibold">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#8B84D7]" />
          {t("app_tagline")}
        </div>
        <button
          type="button"
          onClick={toggleLang}
          aria-label="Toggle language"
          data-testid="button-lang-toggle-login"
          className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-secondary/85 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
        >
          {t("lang_toggle")}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Logo + heading */}
          <div className="flex flex-col items-center text-center gap-4 mb-8">
            <BrandMark />
            <div className="space-y-1">
              <div className="text-secondary/70 text-sm font-medium">{t("login_subtitle")}</div>
              <h1 className="font-display text-3xl font-bold tracking-tight">{APP_NAME}</h1>
            </div>
          </div>

          {/* Card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-6 sm:p-7 shadow-2xl space-y-5"
            data-testid="form-login"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] uppercase tracking-[0.16em] font-semibold text-secondary/70"
              >
                {t("login_name")}
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("login_name_placeholder")}
                data-testid="input-name"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-white placeholder:text-white/30 outline-none focus:border-[#8B84D7] focus:bg-white/10 transition-colors"
                disabled={submitting}
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] uppercase tracking-[0.16em] font-semibold text-secondary/70"
              >
                {t("login_password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login_password_placeholder")}
                  data-testid="input-password"
                  className={cn(
                    "w-full rounded-lg bg-white/5 border border-white/10 px-3.5 py-2.5 text-white placeholder:text-white/30 outline-none focus:border-[#8B84D7] focus:bg-white/10 transition-colors",
                    dir === "rtl" ? "pl-11" : "pr-11"
                  )}
                  disabled={submitting}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("login_hide_password") : t("login_show_password")}
                  data-testid="button-toggle-password"
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 rounded-md p-1.5 text-secondary/70 hover:text-white hover:bg-white/5 transition-colors",
                    dir === "rtl" ? "left-1.5" : "right-1.5"
                  )}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                data-testid="text-login-error"
                className="rounded-lg bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-sm text-red-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="button-submit-login"
              className="w-full rounded-lg bg-[#8B84D7] hover:bg-[#9c95e2] active:bg-[#7d76c9] text-white font-semibold py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("login_submitting")}
                </>
              ) : (
                t("login_submit")
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-secondary/60 leading-relaxed px-4">
            {t("login_footer_note")}
          </p>
        </div>
      </div>

      <div className="px-6 py-4 text-center text-[11px] text-secondary/50">
        {APP_NAME} · {t("members_location")}
      </div>
    </div>
  );
}
