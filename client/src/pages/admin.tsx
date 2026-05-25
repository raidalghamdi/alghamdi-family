import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { useMember } from "@/lib/member-context";
import {
  fetchPendingContributions,
  fetchContributions,
  fetchGovernance,
  approveContribution,
  rejectContribution,
  type Contribution,
} from "@/lib/supabaseQueries";
import { formatSAR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, ShieldCheck, FileText, Image as ImageIcon, History } from "lucide-react";
import { EditableGovernanceCard } from "@/components/governance-card";
import { GovernanceHistory } from "@/components/governance-history";

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

function ReceiptCell({ url, filename }: { url: string; filename?: string | null }) {
  const { t } = useLanguage();
  const isPdf = url?.includes(".pdf") || filename?.endsWith(".pdf");
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
      {isPdf ? <FileText className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
      {isPdf ? t("pdf_open") : t("view_receipt")}
    </a>
  );
}

export default function AdminPage() {
  const { t, lang } = useLanguage();
  const { currentMember } = useMember();
  const { toast } = useToast();

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: governance } = useQuery({ queryKey: ["governance"], queryFn: fetchGovernance });
  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ["contributions_pending"],
    queryFn: fetchPendingContributions,
  });
  const { data: allContributions = [] } = useQuery({
    queryKey: ["contributions"],
    queryFn: fetchContributions,
  });

  const recently = allContributions.filter((c) => c.status !== "Pending").slice(0, 10);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveContribution(id, currentMember ?? "admin"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions_pending"] });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      toast({ title: t("approved_toast") });
    },
    onError: (err: any) => {
      toast({ title: t("action_error"), description: err.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectContribution(id, currentMember ?? "admin", reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions_pending"] });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      setRejectId(null);
      setRejectReason("");
      toast({ title: t("rejected_toast") });
    },
    onError: (err: any) => {
      toast({ title: t("action_error"), description: err.message, variant: "destructive" });
    },
  });

  function handleRejectConfirm() {
    if (!rejectId || !rejectReason.trim()) return;
    rejectMutation.mutate({ id: rejectId, reason: rejectReason.trim() });
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("nav_admin")}</div>
        <h1 className="font-display text-2xl font-bold mt-1">{t("admin_title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin_subtitle")}</p>
      </div>

      {/* Section 1: Pending Approvals */}
      <section className="rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{t("pending_approvals")}</h2>
          {pending.length > 0 && (
            <span className="rounded-full bg-warning/20 text-orange-700 dark:text-warning text-xs font-bold px-2.5 py-1 border border-warning/40">
              {pending.length}
            </span>
          )}
        </div>

        {loadingPending ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            {t("pending_approvals_empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-3 px-5 font-semibold text-start">{t("col_member")}</th>
                  <th className="py-3 px-3 font-semibold text-start">{t("col_month")}</th>
                  <th className="py-3 px-3 font-semibold text-end">{t("col_amount")}</th>
                  <th className="py-3 px-3 font-semibold text-start hidden sm:table-cell">{t("col_payment_method")}</th>
                  <th className="py-3 px-3 font-semibold text-start hidden md:table-cell">{t("col_receipt")}</th>
                  <th className="py-3 px-3 font-semibold text-start hidden md:table-cell">{t("col_submitted")}</th>
                  <th className="py-3 px-5 font-semibold text-end">{t("col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                          {c.member_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold">{c.member_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-sm">{c.month}</td>
                    <td className="py-3 px-3 text-end tabular font-display font-bold">{formatSAR(c.amount, {}, lang)}</td>
                    <td className="py-3 px-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {c.payment_method === "Cash" ? t("pay_cash")
                       : c.payment_method === "Bank transfer" ? t("pay_bank")
                       : t("pay_card")}
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      <ReceiptCell url={c.receipt_url} filename={c.receipt_filename} />
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell text-muted-foreground text-xs">
                      {formatDate(c.submitted_at.slice(0, 10), lang)}
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90 text-success-foreground h-8 px-3 gap-1.5"
                          onClick={() => approveMutation.mutate(c.id)}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("btn_approve")}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 px-3 gap-1.5"
                          onClick={() => { setRejectId(c.id); setRejectReason(""); }}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("btn_reject")}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 2: Governance Settings */}
      <section className="rounded-2xl border border-card-border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">{t("governance_settings")}</h2>
        </div>
        {(() => {
          const prince = governance?.esteraha_prince ?? "Raid";
          const controller = governance?.budget_controller ?? "Raid";
          const isPrince = !!currentMember && currentMember === prince;
          return (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <EditableGovernanceCard
                  label={t("esteraha_prince_label")}
                  field="esteraha_prince"
                  value={prince}
                  canEdit={isPrince}
                  changedBy={currentMember ?? "unknown"}
                  accent="accent"
                  editLabel={t("edit_prince")}
                  testIdPrefix="governance-prince"
                />
                <EditableGovernanceCard
                  label={t("budget_controller_label")}
                  field="budget_controller"
                  value={controller}
                  canEdit={isPrince}
                  changedBy={currentMember ?? "unknown"}
                  accent="primary"
                  editLabel={t("edit_controller")}
                  testIdPrefix="governance-controller"
                />
              </div>
              {!isPrince && (
                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  {t("only_prince_can_edit")}
                </p>
              )}
            </>
          );
        })()}
      </section>

      {/* Section 2b: Governance History */}
      <section className="rounded-2xl border border-card-border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">{t("governance_history")}</h2>
        </div>
        <GovernanceHistory limit={10} />
      </section>

      {/* Section 3: Recently Reviewed */}
      <section className="rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-border">
          <h2 className="font-display text-lg font-bold">{t("recently_reviewed")}</h2>
        </div>
        {recently.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t("recently_reviewed_empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-3 px-5 font-semibold text-start">{t("col_member")}</th>
                  <th className="py-3 px-3 font-semibold text-start">{t("col_month")}</th>
                  <th className="py-3 px-3 font-semibold text-end">{t("col_amount")}</th>
                  <th className="py-3 px-3 font-semibold text-end">{t("col_status")}</th>
                  <th className="py-3 px-5 font-semibold text-start hidden md:table-cell">{t("rejection_reason")}</th>
                </tr>
              </thead>
              <tbody>
                {recently.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-5 font-semibold">{c.member_name}</td>
                    <td className="py-3 px-3 font-mono text-sm">{c.month}</td>
                    <td className="py-3 px-3 text-end tabular font-display font-semibold">{formatSAR(c.amount, {}, lang)}</td>
                    <td className="py-3 px-3 text-end">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-5 hidden md:table-cell text-xs text-muted-foreground">
                      {c.rejection_reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={(open) => { if (!open) setRejectId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reject_dialog_title")}</DialogTitle>
            <DialogDescription>{t("reject_dialog_desc")}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={t("reject_reason_placeholder")}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              {t("btn_cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={handleRejectConfirm}
            >
              {t("btn_reject_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
