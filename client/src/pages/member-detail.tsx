import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { useMember } from "@/lib/member-context";
import {
  fetchExpenses,
  fetchMembers,
  fetchCostLines,
  fetchContributionsByMember,
  fetchGovernance,
  computeSummary,
} from "@/lib/supabaseQueries";
import { AttachReceiptDialog } from "@/components/attach-receipt-dialog";
import { formatSAR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, ReceiptText, Wallet, FileText, Image as ImageIcon } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const label =
    status === "Approved" ? t("status_approved")
    : status === "Rejected" ? t("status_rejected")
    : t("status_pending");
  const styles =
    status === "Approved"
      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
      : status === "Rejected"
      ? "bg-destructive/12 text-destructive border-destructive/25"
      : "bg-warning/20 text-orange-700 border-warning/40 dark:text-warning dark:bg-warning/10";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", styles)}>
      {label}
    </span>
  );
}

export default function MemberDetailPage() {
  const { t, lang } = useLanguage();
  const { currentMember } = useMember();
  const params = useParams<{ name: string }>();
  const memberName = decodeURIComponent(params.name ?? "");

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });
  const isValidMember = members.some((m) => m.name === memberName);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
  });
  const { data: costLines = [] } = useQuery({
    queryKey: ["costLines"],
    queryFn: fetchCostLines,
  });
  const { data: contributions = [] } = useQuery({
    queryKey: ["contributions", memberName],
    queryFn: () => fetchContributionsByMember(memberName),
    enabled: isValidMember,
  });
  const { data: governance } = useQuery({ queryKey: ["governance"], queryFn: fetchGovernance });
  const budgetController = governance?.budget_controller ?? "Raid";

  const approvedContributions = useMemo(
    () => contributions.filter((c) => c.status === "Approved"),
    [contributions]
  );

  const summary = useMemo(() => {
    if (members.length === 0) return null;
    return computeSummary(expenses, members, costLines, approvedContributions);
  }, [expenses, members, costLines, approvedContributions]);

  const memberSummary = summary?.members.find((m) => m.name === memberName);
  const memberExpenses = expenses.filter((e) => e.status === "Paid" && e.paid_by === memberName);
  const directExpensesTotal = memberExpenses.reduce((s, e) => s + e.amount, 0);
  const contributionsTotal = approvedContributions.reduce((s, c) => s + c.amount, 0);

  if (!isValidMember) {
    return (
      <div className="p-5 md:p-8 text-center">
        <p className="text-muted-foreground">{lang === "ar" ? "عضو غير موجود" : "Member not found"}</p>
        <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
          {t("back_to_dashboard")}
        </Link>
      </div>
    );
  }

  const balanceColor =
    (memberSummary?.balance ?? 0) > 100
      ? "text-success"
      : (memberSummary?.balance ?? 0) < -100
      ? "text-destructive"
      : "text-foreground";

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {lang === "ar" ? (
          <ArrowRight className="h-4 w-4" />
        ) : (
          <ArrowLeft className="h-4 w-4" />
        )}
        {t("back_to_dashboard")}
      </Link>

      {/* Member header */}
      <div className="rounded-2xl hero-brand text-white p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
            {memberName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-secondary/70 font-medium">{t("member_detail_title")}</div>
            <h1 className="font-display text-3xl font-bold text-white">{memberName}</h1>
          </div>
          {memberSummary && (
            <div className="text-end">
              <div className="text-[10px] uppercase tracking-wider text-secondary/70 font-medium">{t("balance_label")}</div>
              <div className={cn("kpi-number text-3xl font-bold", balanceColor)}>
                {(memberSummary.balance ?? 0) >= 0 ? "+" : ""}
                {formatSAR(memberSummary.balance ?? 0, { decimals: 0 }, lang)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direct Expenses */}
      <section className="rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-bold">{t("member_direct_expenses")}</h2>
          </div>
          <div className="font-display font-bold text-lg tabular">{formatSAR(directExpensesTotal, {}, lang)}</div>
        </div>
        {memberExpenses.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t("no_expenses_for_member")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-3 px-5 font-semibold text-start">{t("col_date")}</th>
                  <th className="py-3 px-3 font-semibold text-start">{t("col_description")}</th>
                  <th className="py-3 px-3 font-semibold text-start hidden sm:table-cell">{t("col_category")}</th>
                  <th className="py-3 px-3 font-semibold text-end">{t("col_amount")}</th>
                  <th className="py-3 px-5 font-semibold text-start hidden md:table-cell">{t("col_receipt")}</th>
                </tr>
              </thead>
              <tbody>
                {memberExpenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-5 text-muted-foreground text-xs">{formatDate(e.date, lang)}</td>
                    <td className="py-3 px-3 font-semibold">{e.description}</td>
                    <td className="py-3 px-3 hidden sm:table-cell text-muted-foreground text-xs">{e.category}</td>
                    <td className="py-3 px-3 text-end tabular font-display font-bold">{formatSAR(e.amount, {}, lang)}</td>
                    <td className="py-3 px-5 hidden md:table-cell">
                      {e.receipt_url ? (
                        <a
                          href={e.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                        >
                          {e.receipt_filename?.endsWith(".pdf") ? (
                            <FileText className="h-3.5 w-3.5" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5" />
                          )}
                          {t("view_receipt")}
                        </a>
                      ) : !!currentMember && (currentMember === e.paid_by || currentMember === budgetController) ? (
                        <AttachReceiptDialog
                          target="expense"
                          rowId={e.id}
                          variant="button"
                          triggerTestId={`button-attach-receipt-${e.id}`}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">{t("no_receipt")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Monthly Contributions */}
      <section className="rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-bold">{t("member_contributions")}</h2>
          </div>
          <div className="font-display font-bold text-lg tabular">{formatSAR(contributionsTotal, {}, lang)}</div>
        </div>
        {contributions.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t("no_contributions_for_member")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-3 px-5 font-semibold text-start">{t("col_month")}</th>
                  <th className="py-3 px-3 font-semibold text-end">{t("col_amount")}</th>
                  <th className="py-3 px-3 font-semibold text-start hidden sm:table-cell">{t("col_payment_method")}</th>
                  <th className="py-3 px-5 font-semibold text-end">{t("col_status_contrib")}</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((c) => {
                  const canAttachContrib =
                    !c.receipt_url &&
                    !!currentMember &&
                    (currentMember === c.member_name || currentMember === budgetController);
                  return (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-5 font-semibold font-mono">{c.month}</td>
                    <td className="py-3 px-3 text-end tabular font-display font-bold">{formatSAR(c.amount, {}, lang)}</td>
                    <td className="py-3 px-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {c.payment_method === "Cash" ? t("pay_cash")
                       : c.payment_method === "Bank transfer" ? t("pay_bank")
                       : t("pay_card")}
                    </td>
                    <td className="py-3 px-5 text-end">
                      <div className="inline-flex items-center gap-2">
                        {c.receipt_url ? (
                          <a
                            href={c.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                            aria-label={t("view_receipt")}
                          >
                            {c.receipt_filename?.endsWith(".pdf") ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5" />
                            )}
                          </a>
                        ) : canAttachContrib ? (
                          <AttachReceiptDialog
                            target="contribution"
                            rowId={c.id}
                            variant="icon"
                            triggerTestId={`button-attach-contrib-${c.id}`}
                            extraInvalidate={[["contributions", memberName]]}
                          />
                        ) : null}
                        <StatusBadge status={c.status} />
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Settlement Math */}
      {memberSummary && (
        <section className="rounded-2xl border border-card-border bg-card p-5 md:p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold mb-4">{t("member_settlement_math")}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{t("total_paid_label")}</div>
              <div className="font-display font-bold text-xl tabular">{formatSAR(memberSummary.paid, { decimals: 0 }, lang)}</div>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{t("share_owed_label")}</div>
              <div className="font-display font-bold text-xl tabular">{formatSAR(memberSummary.share, { decimals: 0 }, lang)}</div>
            </div>
            <div className={cn("rounded-xl border p-4 text-center",
              memberSummary.balance > 100 ? "bg-success/10 border-success/30"
              : memberSummary.balance < -100 ? "bg-destructive/10 border-destructive/30"
              : "bg-muted/50 border-border"
            )}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{t("balance_label")}</div>
              <div className={cn("font-display font-bold text-xl tabular", balanceColor)}>
                {memberSummary.balance >= 0 ? "+" : ""}{formatSAR(memberSummary.balance, { decimals: 0 }, lang)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
