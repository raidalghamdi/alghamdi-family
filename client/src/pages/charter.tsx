import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-context";
import { fetchGovernance, fetchMembers } from "@/lib/supabaseQueries";
import { Crown, Shield, Users, BookOpen, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { GovernanceHistory } from "@/components/governance-history";

function Section({
  icon,
  title,
  children,
  accent = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-6 md:p-8 shadow-sm",
        accent
          ? "border-primary/30 bg-primary/5"
          : "border-card-border bg-card"
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("rounded-xl p-2.5", accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
          {icon}
        </div>
        <h2
          className={cn(
            "font-bold text-xl leading-tight",
            accent ? "text-primary" : "text-foreground"
          )}
          style={{ fontFamily: "Manrope, Tajawal, sans-serif" }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function CharterPage() {
  const { t, lang } = useLanguage();

  const { data: governance } = useQuery({ queryKey: ["governance"], queryFn: fetchGovernance });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });

  const introText = governance?.charter_text || t("charter_intro_fallback");

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl hero-brand text-white p-8 md:p-12 shadow-lg">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
          <svg width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <pattern id="charter-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#charter-grid)" />
          </svg>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 text-secondary/70 text-[11px] uppercase tracking-[0.18em] font-medium mb-4">
            <BookOpen className="h-4 w-4" />
            <span>{t("nav_charter")}</span>
          </div>
          <h1
            className="text-3xl md:text-5xl font-extrabold leading-tight text-white"
            style={{ fontFamily: lang === "ar" ? "Tajawal, sans-serif" : "Manrope, sans-serif" }}
          >
            {t("charter_title")}
          </h1>
          <p className="text-secondary/75 mt-3 text-base md:text-lg leading-relaxed max-w-2xl">
            {t("charter_subtitle")}
          </p>
        </div>
      </div>

      {/* Charter intro text */}
      <div className="rounded-2xl border border-card-border bg-card p-6 md:p-8 shadow-sm">
        <p className="text-base leading-relaxed text-foreground/85 font-medium">
          {introText}
        </p>
      </div>

      {/* The Esteraha Prince */}
      <Section icon={<Crown className="h-5 w-5" />} title={t("charter_prince_title")} accent>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {t("charter_prince_desc")}
        </p>
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
            {(governance?.esteraha_prince ?? "Raid").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold">{t("charter_prince_title")}</div>
            <div className="font-bold text-primary text-lg">{governance?.esteraha_prince ?? "Raid"}</div>
          </div>
        </div>
      </Section>

      {/* Members */}
      <Section icon={<Users className="h-5 w-5" />} title={t("charter_members_title")}>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {t("charter_members_desc")}
        </p>
        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            {t("charter_no_members")}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {members.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-border bg-muted/30 p-3 flex items-center gap-2.5"
                data-testid={`charter-member-${m.id}`}
              >
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{m.name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Budget Controller */}
      <Section icon={<Shield className="h-5 w-5" />} title={t("charter_controller_title")}>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {t("charter_controller_desc")}
        </p>
        <div className="rounded-xl bg-muted/50 border border-border p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm shrink-0">
            {(governance?.budget_controller ?? "Raid").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("charter_controller_current")}</div>
            <div className="font-bold text-lg">{governance?.budget_controller ?? "Raid"}</div>
          </div>
        </div>
      </Section>

      {/* Recent Governance Changes (mini history) */}
      <Section icon={<History className="h-5 w-5" />} title={t("recent_governance_changes")}>
        <GovernanceHistory limit={5} compact />
      </Section>

      {/* Version note */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border">
        {t("charter_version_note")}
      </div>
    </div>
  );
}
