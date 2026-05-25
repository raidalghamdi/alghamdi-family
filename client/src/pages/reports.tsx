import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { useMember } from "@/lib/member-context";
import { useAuth } from "@/lib/auth-context";
import {
  fetchExpenses,
  fetchMembers,
  fetchCostLines,
  fetchContributions,
  fetchGovernance,
  fetchGovernanceChanges,
  fetchReportSettings,
  updateReportSettings,
  computeSummary,
  annualizeCostLine,
  sumAnnualBudget,
} from "@/lib/supabaseQueries";
import { REPORT_KEYS, type ReportKey, type Expense, type Member, type CostLine } from "@shared/schema";
import { formatSAR, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Users,
  Wallet,
  Tag,
  Clock,
  Calendar,
  ListChecks,
  History,
  ArrowLeft,
  ArrowRight,
  Printer,
  Download,
  Settings as SettingsIcon,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PATRIARCH_EMAIL = "raid.a.alghamdi@gmail.com";

const REPORT_ICONS: Record<ReportKey, React.ComponentType<{ className?: string }>> = {
  member_balance: Wallet,
  monthly_contributions: Calendar,
  expenses_by_category: Tag,
  expenses_by_member: Users,
  pending_approvals: Clock,
  annual_summary: BarChart3,
  cost_lines_snapshot: ListChecks,
  governance_history: History,
};

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ReportsPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { currentMember } = useMember();
  const { toast } = useToast();

  const { data: governance } = useQuery({ queryKey: ["governance"], queryFn: fetchGovernance });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: costLines = [] } = useQuery({ queryKey: ["costLines"], queryFn: fetchCostLines });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses });
  const { data: contributions = [] } = useQuery({
    queryKey: ["contributions"],
    queryFn: fetchContributions,
  });
  const { data: governanceChanges = [] } = useQuery({
    queryKey: ["governance_changes"],
    queryFn: () => fetchGovernanceChanges(100),
  });
  const { data: reportSettings } = useQuery({
    queryKey: ["report_settings"],
    queryFn: fetchReportSettings,
  });

  const isPatriarch =
    user?.email === PATRIARCH_EMAIL ||
    (!!currentMember && !!governance && currentMember === governance.esteraha_prince);

  const enabledMap = reportSettings?.enabled ?? {};
  const visibleKeys = REPORT_KEYS.filter((k) => enabledMap[k] !== false);

  const [selected, setSelected] = useState<ReportKey | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState<Record<ReportKey, boolean> | null>(null);

  const approvedContributions = useMemo(
    () => contributions.filter((c) => c.status === "Approved"),
    [contributions],
  );

  const summary = useMemo(
    () => computeSummary(expenses, members, costLines, approvedContributions),
    [expenses, members, costLines, approvedContributions],
  );

  const annualBudget = useMemo(() => sumAnnualBudget(costLines), [costLines]);

  const noData = members.length === 0 || costLines.length === 0;

  const saveMutation = useMutation({
    mutationFn: () => updateReportSettings(draftEnabled!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_settings"] });
      toast({ title: t("saved_toast"), description: t("saved_toast_desc") });
      setManageOpen(false);
    },
    onError: (err: any) =>
      toast({ title: t("action_error"), description: err.message, variant: "destructive" }),
  });

  function openManage() {
    setDraftEnabled({
      ...(REPORT_KEYS.reduce(
        (acc, k) => ({ ...acc, [k]: true }),
        {} as Record<ReportKey, boolean>,
      )),
      ...enabledMap,
    });
    setManageOpen(true);
  }

  // ── Detail view ─────────────────────────────
  if (selected) {
    return (
      <ReportDetail
        reportKey={selected}
        onBack={() => setSelected(null)}
        expenses={expenses}
        members={members}
        costLines={costLines}
        contributions={contributions}
        governanceChanges={governanceChanges}
        summary={summary}
        annualBudget={annualBudget}
      />
    );
  }

  // ── Grid view ───────────────────────────────
  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-[0.18em] font-medium mb-2">
            <BarChart3 className="h-4 w-4" />
            <span>{t("nav_reports")}</span>
          </div>
          <h1
            className="font-bold text-xl"
            style={{ fontFamily: lang === "ar" ? "Tajawal, sans-serif" : "Manrope, sans-serif" }}
          >
            {t("reports_title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("reports_subtitle")}</p>
        </div>
        {isPatriarch && (
          <Button variant="outline" onClick={openManage} className="gap-2" data-testid="button-manage-reports">
            <SettingsIcon className="h-4 w-4" />
            {t("reports_manage")}
          </Button>
        )}
      </div>

      {noData ? (
        <div className="rounded-2xl border border-dashed border-card-border bg-card p-12 text-center shadow-sm">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("reports_empty")}</p>
        </div>
      ) : visibleKeys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-card-border bg-card p-12 text-center shadow-sm">
          <p className="text-muted-foreground">{t("reports_manage_subtitle")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleKeys.map((key) => {
            const Icon = REPORT_ICONS[key];
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className="group text-start rounded-2xl border border-card-border bg-card p-5 hover:shadow-md hover:border-primary/40 transition-all"
                data-testid={`card-report-${key}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="rounded-xl bg-primary/10 text-primary p-2.5 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground ms-auto mt-2 group-hover:text-primary transition-colors",
                      lang === "ar" && "rotate-180",
                    )}
                  />
                </div>
                <h3 className="font-bold text-base mb-1 leading-tight">{t(`report_${key}` as any)}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(`report_${key}_desc` as any)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* Manage reports dialog */}
      {isPatriarch && (
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("reports_manage")}</DialogTitle>
              <DialogDescription>{t("reports_manage_subtitle")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {REPORT_KEYS.map((k) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{t(`report_${k}` as any)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t(`report_${k}_desc` as any)}
                    </div>
                  </div>
                  <Switch
                    checked={draftEnabled?.[k] ?? true}
                    onCheckedChange={(v) =>
                      setDraftEnabled((prev) =>
                        prev ? { ...prev, [k]: v } : prev,
                      )
                    }
                    data-testid={`switch-report-${k}`}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManageOpen(false)}>
                {t("btn_cancel")}
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {t("btn_save_short")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Report detail view
// ────────────────────────────────────────────────
function ReportDetail({
  reportKey,
  onBack,
  expenses,
  members,
  costLines,
  contributions,
  governanceChanges,
  summary,
  annualBudget,
}: {
  reportKey: ReportKey;
  onBack: () => void;
  expenses: Expense[];
  members: Member[];
  costLines: CostLine[];
  contributions: any[];
  governanceChanges: any[];
  summary: ReturnType<typeof computeSummary>;
  annualBudget: number;
}) {
  const { t, lang } = useLanguage();
  const Icon = REPORT_ICONS[reportKey];

  function handleDownload() {
    const rows = buildCsvRows(reportKey, {
      expenses,
      members,
      costLines,
      contributions,
      governanceChanges,
      summary,
      annualBudget,
      lang,
    });
    downloadCsv(`${reportKey}.csv`, rows);
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-6 print:p-0 print:max-w-none">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-reports-back"
        >
          {lang === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t("reports_back")}
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2"
            data-testid="button-print"
          >
            <Printer className="h-4 w-4" />
            {t("reports_print")}
          </Button>
          <Button onClick={handleDownload} className="gap-2" data-testid="button-download-csv">
            <Download className="h-4 w-4" />
            {t("reports_download_csv")}
          </Button>
        </div>
      </div>

      {/* Report header */}
      <div className="rounded-2xl border border-card-border bg-card p-6 md:p-8 shadow-sm print:shadow-none print:border-0">
        <div className="flex items-start gap-3 mb-2">
          <div className="rounded-xl bg-primary/10 text-primary p-2.5 print:bg-transparent">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h1
              className="font-bold text-xl leading-tight"
              style={{ fontFamily: lang === "ar" ? "Tajawal, sans-serif" : "Manrope, sans-serif" }}
            >
              {t(`report_${reportKey}` as any)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t(`report_${reportKey}_desc` as any)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2 font-mono">
              {formatDate(new Date().toISOString().slice(0, 10), lang)}
            </p>
          </div>
        </div>
      </div>

      {/* Report body */}
      <div className="rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden print:shadow-none print:border-0">
        <ReportBody
          reportKey={reportKey}
          expenses={expenses}
          members={members}
          costLines={costLines}
          contributions={contributions}
          governanceChanges={governanceChanges}
          summary={summary}
          annualBudget={annualBudget}
        />
      </div>
    </div>
  );
}

function ReportBody({
  reportKey,
  expenses,
  members,
  costLines,
  contributions,
  governanceChanges,
  summary,
  annualBudget,
}: {
  reportKey: ReportKey;
  expenses: Expense[];
  members: Member[];
  costLines: CostLine[];
  contributions: any[];
  governanceChanges: any[];
  summary: ReturnType<typeof computeSummary>;
  annualBudget: number;
}) {
  const { t, lang } = useLanguage();

  switch (reportKey) {
    case "member_balance":
      return (
        <Table headers={[t("member_name"), t("total_paid_label"), t("share_owed_label"), t("balance_label")]}>
          {summary.members.map((m) => (
            <tr key={m.name} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 px-5 font-semibold">{m.name}</td>
              <td className="py-2.5 px-3 tabular text-end">{formatSAR(m.paid, { decimals: 0 }, lang)}</td>
              <td className="py-2.5 px-3 tabular text-end">{formatSAR(m.share, { decimals: 0 }, lang)}</td>
              <td className={cn("py-2.5 px-5 tabular text-end font-semibold",
                m.balance > 100 ? "text-success" : m.balance < -100 ? "text-destructive" : "")}>
                {m.balance >= 0 ? "+" : ""}{formatSAR(m.balance, { decimals: 0 }, lang)}
              </td>
            </tr>
          ))}
        </Table>
      );

    case "monthly_contributions":
      return (
        <Table headers={[t("col_month"), t("member_name"), t("col_amount"), t("col_payment_method"), t("col_status_contrib")]}>
          {contributions.length === 0 ? (
            <tr><td colSpan={5} className="py-6 px-5 text-center text-sm text-muted-foreground">{t("reports_empty")}</td></tr>
          ) : contributions.map((c) => (
            <tr key={c.id} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 px-5 font-mono">{c.month}</td>
              <td className="py-2.5 px-3">{c.member_name}</td>
              <td className="py-2.5 px-3 tabular text-end">{formatSAR(c.amount, {}, lang)}</td>
              <td className="py-2.5 px-3 text-muted-foreground text-xs">{c.payment_method}</td>
              <td className="py-2.5 px-5">{c.status}</td>
            </tr>
          ))}
        </Table>
      );

    case "expenses_by_category": {
      const byCat = new Map<string, number>();
      expenses.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
      const rows = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]);
      const total = rows.reduce((s, [, v]) => s + v, 0);
      return (
        <Table headers={[t("col_category"), t("col_amount"), "%"]}>
          {rows.length === 0 ? (
            <tr><td colSpan={3} className="py-6 px-5 text-center text-sm text-muted-foreground">{t("reports_empty")}</td></tr>
          ) : rows.map(([cat, amt]) => (
            <tr key={cat} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 px-5 font-semibold">{cat}</td>
              <td className="py-2.5 px-3 tabular text-end">{formatSAR(amt, { decimals: 0 }, lang)}</td>
              <td className="py-2.5 px-5 tabular text-end text-muted-foreground">
                {total > 0 ? `${((amt / total) * 100).toFixed(1)}%` : "—"}
              </td>
            </tr>
          ))}
        </Table>
      );
    }

    case "expenses_by_member": {
      const byMember = new Map<string, number>();
      members.forEach((m) => byMember.set(m.name, 0));
      expenses
        .filter((e) => e.status === "Paid")
        .forEach((e) => byMember.set(e.paid_by, (byMember.get(e.paid_by) ?? 0) + e.amount));
      const rows = Array.from(byMember.entries()).sort((a, b) => b[1] - a[1]);
      return (
        <Table headers={[t("member_name"), t("total_paid_label")]}>
          {rows.length === 0 ? (
            <tr><td colSpan={2} className="py-6 px-5 text-center text-sm text-muted-foreground">{t("reports_empty")}</td></tr>
          ) : rows.map(([name, amt]) => (
            <tr key={name} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 px-5 font-semibold">{name}</td>
              <td className="py-2.5 px-5 tabular text-end">{formatSAR(amt, { decimals: 0 }, lang)}</td>
            </tr>
          ))}
        </Table>
      );
    }

    case "pending_approvals": {
      const pending = contributions.filter((c) => c.status === "Pending");
      return (
        <Table headers={[t("col_month"), t("member_name"), t("col_amount"), t("col_payment_method")]}>
          {pending.length === 0 ? (
            <tr><td colSpan={4} className="py-6 px-5 text-center text-sm text-muted-foreground">{t("reports_empty")}</td></tr>
          ) : pending.map((c) => (
            <tr key={c.id} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 px-5 font-mono">{c.month}</td>
              <td className="py-2.5 px-3">{c.member_name}</td>
              <td className="py-2.5 px-3 tabular text-end">{formatSAR(c.amount, {}, lang)}</td>
              <td className="py-2.5 px-5 text-muted-foreground text-xs">{c.payment_method}</td>
            </tr>
          ))}
        </Table>
      );
    }

    case "annual_summary":
      return (
        <div className="p-5 md:p-6 space-y-4">
          <SummaryRow label={t("kpi_annual_budget")} value={formatSAR(annualBudget, { decimals: 0 }, lang)} />
          <SummaryRow label={t("kpi_total_recorded")} value={formatSAR(summary.total_expenses, { decimals: 0 }, lang)} />
          <SummaryRow label={t("kpi_total_paid")} value={formatSAR(summary.total_paid, { decimals: 0 }, lang)} />
          <SummaryRow label={t("kpi_total_unpaid")} value={formatSAR(summary.total_unpaid, { decimals: 0 }, lang)} />
          <SummaryRow label={t("members_count_label").replace("{n}", "").trim() || "Members"} value={String(summary.members_count)} />
          <SummaryRow
            label={t("your_target")}
            value={formatSAR(summary.per_member_monthly_target, { decimals: 0 }, lang)}
          />
        </div>
      );

    case "cost_lines_snapshot": {
      const active = costLines.filter((l) => l.active);
      return (
        <Table headers={[t("cl_label"), t("cl_frequency"), t("cl_amount"), t("cl_annual_equivalent")]}>
          {active.length === 0 ? (
            <tr><td colSpan={4} className="py-6 px-5 text-center text-sm text-muted-foreground">{t("reports_empty")}</td></tr>
          ) : active.map((l) => (
            <tr key={l.id} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 px-5 font-semibold">{lang === "ar" ? l.name_ar || l.name_en : l.name_en}</td>
              <td className="py-2.5 px-3 text-muted-foreground text-xs">{t(`freq_${l.frequency}` as any)}</td>
              <td className="py-2.5 px-3 tabular text-end">{formatSAR(l.amount, { decimals: 0 }, lang)}</td>
              <td className="py-2.5 px-5 tabular text-end font-semibold">{formatSAR(annualizeCostLine(l), { decimals: 0 }, lang)}</td>
            </tr>
          ))}
        </Table>
      );
    }

    case "governance_history":
      return (
        <Table headers={[t("col_date"), "Field", "Old", "New", "By"]}>
          {governanceChanges.length === 0 ? (
            <tr><td colSpan={5} className="py-6 px-5 text-center text-sm text-muted-foreground">{t("reports_empty")}</td></tr>
          ) : governanceChanges.map((c) => (
            <tr key={c.id} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 px-5 text-muted-foreground text-xs">{formatDate(c.changed_at, lang)}</td>
              <td className="py-2.5 px-3 font-mono text-xs">{c.field}</td>
              <td className="py-2.5 px-3 text-xs truncate max-w-[180px]" title={c.old_value ?? ""}>
                {c.old_value ?? "—"}
              </td>
              <td className="py-2.5 px-3 text-xs truncate max-w-[180px]" title={c.new_value ?? ""}>
                {c.new_value ?? "—"}
              </td>
              <td className="py-2.5 px-5 text-muted-foreground text-xs">{c.changed_by ?? "—"}</td>
            </tr>
          ))}
        </Table>
      );
  }
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30 print:bg-transparent">
            {headers.map((h, i) => (
              <th
                key={i}
                className={cn(
                  "py-3 px-3 font-semibold",
                  i === 0 ? "px-5 text-start" : i === headers.length - 1 ? "px-5 text-end" : "text-start",
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 last:border-0 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display font-bold text-base tabular">{value}</span>
    </div>
  );
}

// ── CSV builders ───────────────────────────────
function buildCsvRows(
  key: ReportKey,
  ctx: {
    expenses: Expense[];
    members: Member[];
    costLines: CostLine[];
    contributions: any[];
    governanceChanges: any[];
    summary: ReturnType<typeof computeSummary>;
    annualBudget: number;
    lang: "en" | "ar";
  },
): (string | number | null)[][] {
  const { expenses, members, costLines, contributions, governanceChanges, summary, annualBudget, lang } = ctx;
  switch (key) {
    case "member_balance":
      return [
        ["Member", "Paid (SAR)", "Share (SAR)", "Balance (SAR)"],
        ...summary.members.map((m) => [m.name, m.paid.toFixed(2), m.share.toFixed(2), m.balance.toFixed(2)]),
      ];
    case "monthly_contributions":
      return [
        ["Month", "Member", "Amount", "Payment Method", "Status", "Submitted At"],
        ...contributions.map((c) => [c.month, c.member_name, c.amount, c.payment_method, c.status, c.submitted_at]),
      ];
    case "expenses_by_category": {
      const byCat = new Map<string, number>();
      expenses.forEach((e) => byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount));
      return [["Category", "Total (SAR)"], ...Array.from(byCat.entries()).map(([k, v]) => [k, v.toFixed(2)])];
    }
    case "expenses_by_member": {
      const byMember = new Map<string, number>();
      members.forEach((m) => byMember.set(m.name, 0));
      expenses.filter((e) => e.status === "Paid").forEach((e) =>
        byMember.set(e.paid_by, (byMember.get(e.paid_by) ?? 0) + e.amount),
      );
      return [["Member", "Total Paid (SAR)"], ...Array.from(byMember.entries()).map(([k, v]) => [k, v.toFixed(2)])];
    }
    case "pending_approvals": {
      const pending = contributions.filter((c) => c.status === "Pending");
      return [
        ["Month", "Member", "Amount", "Payment Method", "Submitted At"],
        ...pending.map((c) => [c.month, c.member_name, c.amount, c.payment_method, c.submitted_at]),
      ];
    }
    case "annual_summary":
      return [
        ["Metric", "Value"],
        ["Annual Budget (SAR)", annualBudget.toFixed(2)],
        ["Total Expenses (SAR)", summary.total_expenses.toFixed(2)],
        ["Total Paid (SAR)", summary.total_paid.toFixed(2)],
        ["Total Unpaid (SAR)", summary.total_unpaid.toFixed(2)],
        ["Members Count", summary.members_count],
        ["Per-Member Monthly Target (SAR)", summary.per_member_monthly_target.toFixed(2)],
      ];
    case "cost_lines_snapshot":
      return [
        ["Name (EN)", "Name (AR)", "Frequency", "Amount", "Active", "Annual Equivalent"],
        ...costLines.map((l) => [
          l.name_en,
          l.name_ar,
          l.frequency,
          l.amount.toFixed(2),
          l.active ? "yes" : "no",
          annualizeCostLine(l).toFixed(2),
        ]),
      ];
    case "governance_history":
      return [
        ["Changed At", "Field", "Old Value", "New Value", "Changed By"],
        ...governanceChanges.map((c) => [c.changed_at, c.field, c.old_value, c.new_value, c.changed_by]),
      ];
  }
  return [];
}
