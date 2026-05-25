import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ReceiptText, Users, Wallet, TrendingUp, Info, Layers } from "lucide-react";
import type { Summary, Expense } from "@shared/schema";
import { formatSAR, formatDate } from "@/lib/format";
import { AvatarCircle } from "@/components/avatar-circle";
import { cn } from "@/lib/utils";
import {
  fetchExpenses,
  fetchSettings,
  fetchContributions,
  fetchMembers,
  fetchCostLines,
  computeSummary,
} from "@/lib/supabaseQueries";
import { useLanguage } from "@/lib/language-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function StatusPill({ status }: { status: "Credit" | "Owes group" | "Settled" }) {
  const { t } = useLanguage();
  const label =
    status === "Credit" ? t("status_credit")
    : status === "Owes group" ? t("status_owes")
    : t("status_settled");
  const styles =
    status === "Credit"
      ? "bg-primary/15 text-primary border-primary/25"
      : status === "Owes group"
      ? "bg-destructive/12 text-destructive border-destructive/25"
      : "bg-muted text-muted-foreground border-transparent";
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", styles)}
      data-testid={`pill-status-${status}`}
    >
      {label}
    </span>
  );
}

interface KpiDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  value: string;
  description?: string;
  expenses?: Expense[];
  lang: string;
  t: (key: any) => string;
}

function KpiDialog({ open, onClose, title, value, description, expenses, lang, t }: KpiDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="kpi-number text-4xl text-primary mt-2">{value}</div>
        {expenses && expenses.length > 0 && (
          <div className="mt-4 max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="pb-2 pe-2 font-semibold text-start">{t("col_date")}</th>
                  <th className="pb-2 px-2 font-semibold text-start">{t("col_description")}</th>
                  <th className="pb-2 ps-2 font-semibold text-end">{t("col_amount")}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2 pe-2 text-muted-foreground">{formatDate(e.date, lang)}</td>
                    <td className="py-2 px-2 font-medium truncate max-w-[140px]">{e.description}</td>
                    <td className="py-2 ps-2 text-end tabular font-display font-semibold">{formatSAR(e.amount, {}, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pt-3 border-t border-border">
          <Link
            href="/expenses"
            onClick={onClose}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            {t("recent_view_all")}
            {lang === "ar" ? <ArrowRight className="h-3 w-3 rotate-180" /> : <ArrowRight className="h-3 w-3" />}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WelcomeBanner() {
  const { t } = useLanguage();
  return (
    <section
      className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8 shadow-sm"
      data-testid="welcome-banner"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-primary/15 text-primary p-2 mt-0.5">
          <Info className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-lg md:text-xl font-bold">{t("welcome_banner_title")}</h2>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{t("welcome_banner_body")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/members"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:brightness-95"
              data-testid="link-welcome-members"
            >
              <Users className="h-4 w-4" />
              {t("welcome_banner_cta_members")}
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold hover:bg-muted"
              data-testid="link-welcome-settings"
            >
              <Layers className="h-4 w-4" />
              {t("welcome_banner_cta_settings")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const [, navigate] = useLocation();
  const [kpiDialog, setKpiDialog] = useState<{ title: string; value: string; description?: string; expenses?: Expense[] } | null>(null);

  const { data: expenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
  });
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });
  const { data: costLines = [], isLoading: loadingCostLines } = useQuery({
    queryKey: ["costLines"],
    queryFn: fetchCostLines,
  });
  const { data: allContributions = [] } = useQuery({
    queryKey: ["contributions"],
    queryFn: fetchContributions,
  });

  const approvedContributions = useMemo(
    () => allContributions.filter((c) => c.status === "Approved"),
    [allContributions]
  );

  const summary = useMemo<Summary | null>(() => {
    if (!expenses) return null;
    return computeSummary(expenses, members, costLines, approvedContributions);
  }, [expenses, members, costLines, approvedContributions]);

  const isLoading = loadingExpenses || loadingSettings || loadingMembers || loadingCostLines;

  if (isLoading || !summary) {
    return (
      <div className="p-6 md:p-10">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const recent = (expenses ?? []).slice(0, 5);
  const expenseCount = expenses?.length ?? 0;
  const paidExpenses = (expenses ?? []).filter((e) => e.status === "Paid");
  const unpaidExpenses = (expenses ?? []).filter((e) => e.status === "Unpaid");
  const showWelcome = members.length === 0 || costLines.length === 0;

  function openKpi(title: string, value: string, description?: string, exps?: Expense[]) {
    setKpiDialog({ title, value, description, expenses: exps });
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
      {showWelcome && <WelcomeBanner />}

      {/* Hero KPI band */}
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl hero-brand text-white shadow-lg">
          <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
            <svg width="100%" height="100%" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className="relative p-6 md:p-8">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-secondary/80">
              <span>{t("hero_year1")}</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {t("hero_live")}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-6 md:gap-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="cursor-pointer group"
                    onClick={() => openKpi(
                      t("hero_annual_budget"),
                      formatSAR(summary.annual_budget, {}, lang),
                      t("hero_year1_commitment"),
                    )}
                  >
                    <div className="text-[11px] uppercase tracking-wider text-secondary/70 font-medium group-hover:text-white/90 transition-colors">{t("hero_annual_budget")}</div>
                    <div className="kpi-number text-4xl md:text-5xl mt-2 text-primary group-hover:brightness-110 transition-all" data-testid="kpi-annual-budget">
                      {formatSAR(summary.annual_budget, { withSuffix: false }, lang)}
                    </div>
                    <div className="text-xs text-secondary/70 mt-1.5 font-medium">{t("hero_year1_commitment")}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{lang === "ar" ? "انقر للتفاصيل" : "Click for details"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="cursor-pointer group"
                    onClick={() => openKpi(
                      t("hero_per_member"),
                      formatSAR(summary.per_member_monthly_target, { decimals: 0 }, lang),
                      t("hero_per_member_hint"),
                    )}
                  >
                    <div className="text-[11px] uppercase tracking-wider text-secondary/70 font-medium group-hover:text-white/90 transition-colors">{t("hero_per_member")}</div>
                    <div className="kpi-number text-4xl md:text-5xl mt-2 text-white group-hover:brightness-110 transition-all" data-testid="kpi-per-share">
                      {formatSAR(summary.per_member_monthly_target, { decimals: 0, withSuffix: false }, lang)}
                    </div>
                    <div className="text-xs text-secondary/70 mt-1.5 font-medium">{t("hero_per_member_hint")}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{lang === "ar" ? "انقر للتفاصيل" : "Click for details"}</TooltipContent>
              </Tooltip>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 pt-5 border-t border-white/10">
              <Link
                href="/submit"
                data-testid="link-cta-submit"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-95 active:scale-[0.98] transition-all"
              >
                {t("hero_add_expense")}
                {lang === "ar" ? <ArrowRight className="h-4 w-4 rotate-180" /> : <ArrowRight className="h-4 w-4" />}
              </Link>
              <Link
                href="/expenses"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5 transition-colors"
              >
                {t("hero_view_ledger")}
              </Link>
            </div>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="rounded-2xl premium-card border border-card-border p-6 shadow-sm flex flex-col cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
              onClick={() => openKpi(
                t("kpi_total_paid"),
                formatSAR(summary.total_paid, {}, lang),
                lang === "ar" ? "مجموع المصاريف المدفوعة + المساهمات المعتمدة" : "Sum of paid expenses + approved contributions",
                paidExpenses
              )}
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] uppercase tracking-wider font-semibold">{t("kpi_total_paid")}</span>
                <span className="rounded-md p-1.5 bg-primary/12 text-primary">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="kpi-number text-4xl md:text-5xl mt-3 text-foreground" data-testid="kpi-total-paid">
                {formatSAR(summary.total_paid, { withSuffix: false }, lang)}
              </div>
              <div className="text-xs text-muted-foreground mt-1.5 font-medium">
                {lang === "ar"
                  ? `${expenseCount} ${t("kpi_entries_count")}`
                  : `${t("currency")} · across ${expenseCount} entries`}
              </div>

              <div className="mt-auto pt-5 grid grid-cols-2 gap-4 border-t border-border">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("kpi_members_count")}</div>
                  <div className="font-display font-bold text-lg mt-1 tabular" data-testid="kpi-members-count">
                    {summary.members_count}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{t("kpi_cost_lines_count")}</div>
                  <div className="font-display font-bold text-lg mt-1 tabular" data-testid="kpi-cost-lines-count">
                    {costLines.length}
                  </div>
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>{lang === "ar" ? "انقر للتفاصيل" : "Click for details"}</TooltipContent>
        </Tooltip>
      </section>

      {/* Secondary KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label={t("kpi_annual_budget")}
          value={formatSAR(summary.annual_budget, {}, lang)}
          hint={t("hint_across_all")}
          testId="kpi-annual"
          onClick={() => openKpi(t("kpi_annual_budget"), formatSAR(summary.annual_budget, {}, lang), t("hint_across_all"))}
        />
        <KpiCard
          icon={<ReceiptText className="h-4 w-4" />}
          label={t("kpi_total_recorded")}
          value={formatSAR(summary.total_expenses, {}, lang)}
          hint={t("kpi_ledger_entries").replace("{n}", String(expenseCount))}
          testId="kpi-total-expenses"
          onClick={() => openKpi(t("kpi_total_recorded"), formatSAR(summary.total_expenses, {}, lang),
            t("kpi_ledger_entries").replace("{n}", String(expenseCount)), expenses ?? [])}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          label={t("kpi_total_unpaid")}
          value={formatSAR(summary.total_unpaid, {}, lang)}
          hint={summary.total_unpaid > 0 ? t("kpi_unpaid_entries") : t("kpi_no_unpaid")}
          testId="kpi-unpaid"
          tone={summary.total_unpaid > 0 ? "warn" : "neutral"}
          onClick={() => openKpi(t("kpi_total_unpaid"), formatSAR(summary.total_unpaid, {}, lang),
            summary.total_unpaid > 0 ? t("kpi_unpaid_entries") : t("kpi_no_unpaid"),
            unpaidExpenses)}
        />
      </section>

      {/* Members + Recent expenses */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-card-border bg-card p-5 md:p-6 shadow-sm">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("col_status")}</div>
              <h2 className="font-display text-xl font-bold mt-0.5">{t("section_member_balances")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("member_balances_subtitle")}</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground hidden sm:block" />
          </div>

          {summary.members.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground" data-testid="empty-members">
              {t("members_empty")}
            </div>
          ) : (
          <div className="overflow-x-auto -mx-5 md:-mx-6 px-5 md:px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="pb-3 pe-3 font-semibold text-start">{t("col_member")}</th>
                  <th className="pb-3 px-3 font-semibold text-end">{t("col_paid")}</th>
                  <th className="pb-3 px-3 font-semibold text-end hidden sm:table-cell">{t("col_share")}</th>
                  <th className="pb-3 px-3 font-semibold text-end">{t("col_balance")}</th>
                  <th className="pb-3 ps-3 font-semibold text-end">{t("col_status")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.members.map((m) => (
                  <tr
                    key={m.name}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/member/${encodeURIComponent(m.name)}`)}
                  >
                    <td className="py-3 pe-3">
                      <div className="flex items-center gap-3">
                        <AvatarCircle name={m.name} size={32} />
                        <span className="font-semibold group-hover:text-primary transition-colors" data-testid={`text-member-${m.name}`}>
                          {m.name}
                        </span>
                        <ArrowRight className={cn("h-3 w-3 text-muted-foreground/50 hidden sm:block group-hover:text-primary transition-colors", lang === "ar" && "rotate-180")} />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-end tabular font-display font-semibold">{formatSAR(m.paid, {}, lang)}</td>
                    <td className="py-3 px-3 text-end tabular hidden sm:table-cell text-muted-foreground">
                      {formatSAR(m.share, { decimals: 0 }, lang)}
                    </td>
                    <td
                      className={cn(
                        "py-3 px-3 text-end tabular font-display font-bold",
                        m.balance > 100 && "text-success",
                        m.balance < -100 && "text-destructive",
                      )}
                      data-testid={`text-balance-${m.name}`}
                    >
                      {m.balance >= 0 ? "+" : ""}
                      {formatSAR(m.balance, { decimals: 0 }, lang)}
                    </td>
                    <td className="py-3 ps-3 text-end">
                      <StatusPill status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-card-border bg-card p-5 md:p-6 shadow-sm">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("section_recent_activity")}</div>
              <h2 className="font-display text-xl font-bold mt-0.5">{t("section_recent_activity")}</h2>
            </div>
            <Link
              href="/expenses"
              data-testid="link-view-all"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              {t("recent_view_all")}
              {lang === "ar" ? <ArrowRight className="h-3 w-3 rotate-180" /> : <ArrowRight className="h-3 w-3" />}
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t("no_expenses_yet")}
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((e) => (
                <li key={e.id} className="py-3 flex items-start gap-3" data-testid={`row-recent-${e.id}`}>
                  <AvatarCircle name={e.paid_by} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold truncate">{e.description}</span>
                      <span className="tabular font-display font-bold text-sm shrink-0">{formatSAR(e.amount, {}, lang)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-1.5">
                      <span>{e.paid_by}</span>
                      <span>·</span>
                      <span className="text-accent font-medium">{e.category}</span>
                      <span>·</span>
                      <span>{formatDate(e.date, lang)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {kpiDialog && (
        <KpiDialog
          open={!!kpiDialog}
          onClose={() => setKpiDialog(null)}
          title={kpiDialog.title}
          value={kpiDialog.value}
          description={kpiDialog.description}
          expenses={kpiDialog.expenses}
          lang={lang}
          t={t}
        />
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, hint, testId, tone, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  testId?: string;
  tone?: "warn" | "neutral";
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition-all",
        tone === "warn" ? "border-warning/40 bg-warning/5" : "border-card-border",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30 hover:scale-[1.01]",
      )}
      data-testid={testId}
      onClick={onClick}
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
        <span
          className={cn(
            "rounded-md p-1.5",
            tone === "warn" ? "bg-warning/30 text-earth-brown" : "bg-primary/10 text-primary",
          )}
        >
          {icon}
        </span>
      </div>
      <div className="kpi-number text-3xl md:text-4xl mt-3 text-foreground">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-2 font-medium">{hint}</div>}
      {onClick && (
        <div className="text-[10px] text-muted-foreground/60 mt-2 flex items-center gap-1">
          <Info className="h-2.5 w-2.5" />
          {label}
        </div>
      )}
    </div>
  );
}
