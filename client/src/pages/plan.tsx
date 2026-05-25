import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Settings, Expense, Summary } from "@shared/schema";
import { MEMBER_NAMES } from "@shared/schema";
import { formatSAR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CalendarDays, TrendingUp, PiggyBank } from "lucide-react";
import { fetchExpenses, fetchSettings, computeSummary } from "@/lib/supabaseQueries";
import { useLanguage } from "@/lib/language-context";

function monthLabel(year: number, monthIndex: number, lang: "ar" | "en") {
  return new Date(year, monthIndex, 1).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US", { month: "short", year: "2-digit" });
}

function ymKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export default function PlanPage() {
  const { t, lang } = useLanguage();

  const { data: settings } = useQuery<Settings>({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: expenses } = useQuery<Expense[]>({ queryKey: ["expenses"], queryFn: fetchExpenses });

  const summary = useMemo<Summary | null>(() => {
    if (!expenses || !settings) return null;
    return computeSummary(expenses, settings);
  }, [expenses, settings]);

  if (!settings || !expenses || !summary) {
    return (
      <div className="p-6 md:p-10">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="mt-6 h-80 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  const planStart = new Date(settings.plan_start);
  const horizon = settings.plan_horizon_months;
  const firstRent = new Date(settings.first_rent_date);
  const secondRent = new Date(settings.second_rent_date);

  // Build months
  const months: { year: number; monthIndex: number; key: string; label: string }[] = [];
  for (let i = 0; i < horizon; i++) {
    const d = new Date(planStart.getFullYear(), planStart.getMonth() + i, 1);
    months.push({
      year: d.getFullYear(),
      monthIndex: d.getMonth(),
      key: ymKey(d.getFullYear(), d.getMonth()),
      label: monthLabel(d.getFullYear(), d.getMonth(), lang),
    });
  }

  // Aggregate actual expenses per month/category
  const actuals: Record<string, { total: number; byCat: Record<string, number> }> = {};
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = ymKey(d.getFullYear(), d.getMonth());
    if (!actuals[key]) actuals[key] = { total: 0, byCat: {} };
    actuals[key].total += e.amount;
    actuals[key].byCat[e.category] = (actuals[key].byCat[e.category] || 0) + e.amount;
  }

  // Build planned rows
  const rows = months.map((m) => {
    const isFirstRent = m.year === firstRent.getFullYear() && m.monthIndex === firstRent.getMonth();
    const isSecondRent = m.year === secondRent.getFullYear() && m.monthIndex === secondRent.getMonth();
    const planned_rent = isFirstRent || isSecondRent ? settings.annual_rent / 2 : 0;
    const planned_setup = isFirstRent ? settings.setup_cost : 0;
    const planned_operating = settings.monthly_operating;
    const planned_worker = settings.worker_monthly;
    const planned_total = planned_rent + planned_setup + planned_operating + planned_worker;
    const actual = actuals[m.key]?.total ?? 0;
    return { ...m, planned_rent, planned_setup, planned_operating, planned_worker, planned_total, actual };
  });

  const plannedAnnual = rows.reduce((s, r) => s + r.planned_total, 0);
  const smoothed_monthly_per_member = plannedAnnual / MEMBER_NAMES.length / horizon;

  const planStartLocale = planStart.toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US", { month: "long", year: "numeric" });

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("nav_plan")}</div>
        <h1 className="font-display text-xl font-bold mt-1">{t("plan_title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("plan_intro").replace("{n}", String(horizon)).replace("{start}", planStartLocale)}
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          icon={<CalendarDays className="h-4 w-4" />}
          label={t("plan_planned_annual")}
          value={formatSAR(plannedAnnual, {}, lang)}
          hint={t("hint_across_all")}
        />
        <SummaryTile
          icon={<PiggyBank className="h-4 w-4" />}
          label={t("plan_smoothed_pm_label")}
          value={formatSAR(smoothed_monthly_per_member, { decimals: 0 }, lang)}
          hint={t("plan_smoothed_if")}
          accent
        />
        <SummaryTile
          icon={<TrendingUp className="h-4 w-4" />}
          label={t("plan_save_2nd_rent")}
          value={formatSAR(summary.monthly_save_needed, { decimals: 0 }, lang)}
          hint={t("hint_months_left").replace("{n}", String(summary.months_until_2nd_rent))}
        />
      </div>

      {/* Cash flow table */}
      <div className="rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-border">
          <h2 className="font-display text-lg font-bold">{t("plan_cashflow_title")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("plan_cashflow_subtitle")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-muted/60">
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4 font-semibold text-start">{t("col_month")}</th>
                <th className="py-3 px-3 font-semibold text-end">{t("col_rent")}</th>
                <th className="py-3 px-3 font-semibold text-end">{t("col_setup")}</th>
                <th className="py-3 px-3 font-semibold text-end">{t("col_operating")}</th>
                <th className="py-3 px-3 font-semibold text-end">{t("col_worker")}</th>
                <th className="py-3 px-3 font-semibold text-end">{t("col_planned")}</th>
                <th className="py-3 px-4 font-semibold text-end">{t("col_actual")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.key}
                  className={cn(
                    "border-t border-border/60",
                    idx % 2 === 1 && "bg-muted/20",
                    r.planned_rent > 0 && "bg-primary/[0.04]",
                  )}
                  data-testid={`row-month-${r.key}`}
                >
                  <td className="py-3 px-4 font-semibold">{r.label}</td>
                  <td className="py-3 px-3 text-end tabular text-muted-foreground">
                    {r.planned_rent > 0 ? <span className="text-primary font-semibold">{formatSAR(r.planned_rent, { decimals: 0, withSuffix: false }, lang)}</span> : "—"}
                  </td>
                  <td className="py-3 px-3 text-end tabular text-muted-foreground">
                    {r.planned_setup > 0 ? <span className="text-accent font-semibold">{formatSAR(r.planned_setup, { decimals: 0, withSuffix: false }, lang)}</span> : "—"}
                  </td>
                  <td className="py-3 px-3 text-end tabular text-muted-foreground">{formatSAR(r.planned_operating, { decimals: 0, withSuffix: false }, lang)}</td>
                  <td className="py-3 px-3 text-end tabular text-muted-foreground">{formatSAR(r.planned_worker, { decimals: 0, withSuffix: false }, lang)}</td>
                  <td className="py-3 px-3 text-end tabular font-display font-bold">{formatSAR(r.planned_total, { decimals: 0, withSuffix: false }, lang)}</td>
                  <td className="py-3 px-4 text-end tabular">
                    {r.actual > 0 ? (
                      <span className="font-display font-bold text-success">{formatSAR(r.actual, { decimals: 0, withSuffix: false }, lang)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/40">
                <td className="py-3 px-4 font-display font-bold uppercase text-[11px] tracking-wider">{t("plan_year_total")}</td>
                <td className="py-3 px-3 text-end tabular font-display font-bold">{formatSAR(rows.reduce((s, r) => s + r.planned_rent, 0), { decimals: 0, withSuffix: false }, lang)}</td>
                <td className="py-3 px-3 text-end tabular font-display font-bold">{formatSAR(rows.reduce((s, r) => s + r.planned_setup, 0), { decimals: 0, withSuffix: false }, lang)}</td>
                <td className="py-3 px-3 text-end tabular font-display font-bold">{formatSAR(rows.reduce((s, r) => s + r.planned_operating, 0), { decimals: 0, withSuffix: false }, lang)}</td>
                <td className="py-3 px-3 text-end tabular font-display font-bold">{formatSAR(rows.reduce((s, r) => s + r.planned_worker, 0), { decimals: 0, withSuffix: false }, lang)}</td>
                <td className="py-3 px-3 text-end tabular font-display font-bold text-primary">{formatSAR(plannedAnnual, { decimals: 0, withSuffix: false }, lang)}</td>
                <td className="py-3 px-4 text-end tabular font-display font-bold text-success">{formatSAR(rows.reduce((s, r) => s + r.actual, 0), { decimals: 0, withSuffix: false }, lang)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Smoothed plan */}
      <div className="rounded-2xl border border-card-border premium-card p-6 md:p-8 shadow-sm">
        <h2 className="font-display text-lg font-bold">{t("plan_smoothed_title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("plan_smoothed_body").replace("{n}", String(horizon))}
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("plan_group_month")}</div>
            <div className="kpi-number text-3xl mt-1">{formatSAR(plannedAnnual / horizon, { decimals: 0, withSuffix: false }, lang)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("currency")}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("plan_member_month")}</div>
            <div className="kpi-number text-3xl mt-1 text-primary">{formatSAR(smoothed_monthly_per_member, { decimals: 0, withSuffix: false }, lang)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("plan_members_count")}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("plan_member_year")}</div>
            <div className="kpi-number text-3xl mt-1">{formatSAR(plannedAnnual / MEMBER_NAMES.length, { decimals: 0, withSuffix: false }, lang)}</div>
            <div className="text-xs text-muted-foreground mt-1">{t("plan_full_year_share")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm", accent ? "border-primary/30 premium-card" : "border-card-border")}>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-[11px] uppercase tracking-wider font-semibold">{label}</span>
        <span className={cn("rounded-md p-1.5", accent ? "bg-primary/15 text-primary" : "bg-muted")}>{icon}</span>
      </div>
      <div className="kpi-number text-3xl md:text-4xl mt-3">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-2 font-medium">{hint}</div>}
    </div>
  );
}
