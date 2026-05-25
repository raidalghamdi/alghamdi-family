import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  PlusCircle,
  ReceiptText,
  CalendarDays,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Menu,
  X,
  Wallet,
  ShieldCheck,
  BookOpen,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { useMember } from "@/lib/member-context";
import { useAuth } from "@/lib/auth-context";
import { fetchGovernance } from "@/lib/supabaseQueries";
import { useQuery } from "@tanstack/react-query";

const APP_NAME = (import.meta.env.VITE_APP_NAME as string | undefined) || "Family";

function Logo({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { t } = useLanguage();
  const accent = "#8B84D7";
  const stroke = variant === "dark" ? "white" : "#0C2341";
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0" aria-label={`${APP_NAME} logo`}>
        <rect width="36" height="36" rx="9" fill="#0C2341" />
        <path d="M7 25 L18 8 L29 25 Z" fill="none" stroke={accent} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M12 25 L12 18 L24 18 L24 25" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx="18" cy="21.5" r="1.5" fill={accent} />
      </svg>
      <div className="leading-tight min-w-0">
        <div className={cn("font-display font-bold text-lg tracking-tight", variant === "dark" ? "text-white" : "text-foreground")}>
          {t("app_name")}
        </div>
        <div className={cn("text-[10px] uppercase tracking-[0.18em] font-medium", variant === "dark" ? "text-secondary/70" : "text-muted-foreground")}>
          {t("app_tagline")}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, lang, setLang } = useLanguage();
  const { currentMember } = useMember();
  const { user, signOut } = useAuth();

  const { data: governance } = useQuery({
    queryKey: ["governance"],
    queryFn: fetchGovernance,
  });

  const budgetController = governance?.budget_controller ?? "Raid";
  const isAdmin = !!currentMember && currentMember === budgetController;

  const NAV = [
    { href: "/", label: t("nav_dashboard"), icon: LayoutDashboard, testId: "link-dashboard" },
    { href: "/submit", label: t("nav_submit"), icon: PlusCircle, testId: "link-submit" },
    { href: "/contribute", label: t("nav_contribute"), icon: Wallet, testId: "link-contribute" },
    { href: "/expenses", label: t("nav_expenses"), icon: ReceiptText, testId: "link-expenses" },
    { href: "/plan", label: t("nav_plan"), icon: CalendarDays, testId: "link-plan" },
    { href: "/charter", label: t("nav_charter"), icon: BookOpen, testId: "link-charter" },
    { href: "/settings", label: t("nav_settings"), icon: SettingsIcon, testId: "link-settings" },
    ...(isAdmin ? [{ href: "/admin", label: t("nav_admin"), icon: ShieldCheck, testId: "link-admin" }] : []),
  ];

  function toggleLang() {
    setLang(lang === "ar" ? "en" : "ar");
  }

  const navList = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = location === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-secondary/85 hover:text-white hover:bg-white/5",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  // Identity block — replaces the old "I am" picker
  const identityBlock = (
    <div className="flex flex-col gap-2 pb-3 border-b border-white/10">
      <div className="text-[10px] uppercase tracking-[0.16em] text-secondary/60 font-semibold px-1">
        {t("signed_in_as")}
      </div>
      <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate" data-testid="text-current-member">
            {currentMember ?? "—"}
          </div>
          <div className="text-[11px] text-secondary/60 truncate" data-testid="text-current-email" dir="ltr">
            {user?.email ?? ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label={t("sign_out")}
          title={t("sign_out")}
          data-testid="button-sign-out"
          className="shrink-0 rounded-md p-1.5 text-secondary/85 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-e border-sidebar-border p-5 gap-4 sticky top-0 h-screen">
        {/* Logo + language toggle at top */}
        <div className="flex items-start justify-between gap-2">
          <Logo variant="dark" />
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Toggle language"
            data-testid="button-lang-toggle"
            className="shrink-0 rounded-md px-2 py-1.5 text-[11px] font-semibold text-secondary/85 hover:text-white hover:bg-white/5 transition-colors border border-white/10 whitespace-nowrap"
          >
            {t("lang_toggle")}
          </button>
        </div>

        {/* Identity */}
        {identityBlock}

        <div className="flex-1">{navList}</div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div className="text-xs leading-snug">
            <div className="font-semibold text-white">{t("members_count")}</div>
            <div className="text-secondary/70">{t("members_location")}</div>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            data-testid="button-theme-toggle"
            className="rounded-md p-2 text-secondary/85 hover:text-white hover:bg-white/5 transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-brand-dark text-white sticky top-0 z-30 border-b border-white/10">
        <Logo variant="dark" />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Toggle language"
            data-testid="button-lang-toggle-mobile"
            className="rounded-md px-2 py-1.5 text-[11px] font-semibold text-secondary/85 hover:text-white hover:bg-white/5 border border-white/10"
          >
            {t("lang_toggle")}
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-md p-2 text-secondary/85 hover:text-white hover:bg-white/5"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Open menu"
            data-testid="button-menu"
            className="rounded-md p-2 text-secondary/85 hover:text-white hover:bg-white/5"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="md:hidden bg-brand-dark text-white px-4 py-4 border-b border-white/10 space-y-3">
          {identityBlock}
          {navList}
        </div>
      )}

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
