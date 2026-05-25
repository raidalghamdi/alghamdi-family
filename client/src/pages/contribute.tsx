import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { useMember } from "@/lib/member-context";
import {
  fetchSettings,
  fetchContributionsByMember,
  insertContribution,
  fetchMembers,
  fetchCostLines,
  computeMonthlyTargetFromLines,
  type Contribution,
} from "@/lib/supabaseQueries";
import { supabase } from "@/lib/supabase";
import { formatSAR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Image as ImageIcon, Upload, X, Target, CheckCircle2, Info } from "lucide-react";

function StatusBadge({ status, rejectionReason }: { status: string; rejectionReason?: string | null }) {
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
      {status === "Rejected" && rejectionReason && (
        <span className="ms-1.5 text-[10px] opacity-80">— {rejectionReason}</span>
      )}
    </span>
  );
}

const PAYMENT_METHODS = ["Cash", "Bank transfer", "Card"] as const;
const PAYMENT_LABEL_KEYS: Record<string, string> = {
  Cash: "pay_cash",
  "Bank transfer": "pay_bank",
  Card: "pay_card",
};

function currentMonthDefault() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function maxMonth() {
  return currentMonthDefault();
}

export default function ContributePage() {
  const { t, lang } = useLanguage();
  const { currentMember } = useMember();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [memberName, setMemberName] = useState<string>(currentMember ?? "");
  const [month, setMonth] = useState(currentMonthDefault());
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [amountOverride, setAmountOverride] = useState<string>("");

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: fetchMembers });
  const { data: costLines = [] } = useQuery({ queryKey: ["costLines"], queryFn: fetchCostLines });

  const target = computeMonthlyTargetFromLines(costLines, members.length);

  const { data: myContributions, isLoading: loadingContribs } = useQuery({
    queryKey: ["contributions", memberName],
    queryFn: () => fetchContributionsByMember(memberName),
    enabled: !!memberName,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t("field_receipt_required"));
      if (!memberName) throw new Error(t("field_member_placeholder"));
      if (!paymentMethod) throw new Error(lang === "ar" ? "اختر طريقة الدفع" : "Select payment method");

      const amount = amountOverride ? parseFloat(amountOverride) : target;
      if (!amount || amount <= 0) throw new Error(lang === "ar" ? "المبلغ غير صالح" : "Invalid amount");

      // Upload to Supabase Storage
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `contributions/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("receipts")
        .upload(path, file, { contentType: file.type });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: pub } = supabase.storage.from("receipts").getPublicUrl(path);
      const receipt_url = pub.publicUrl;

      return insertContribution({
        member_name: memberName,
        month,
        amount,
        payment_method: paymentMethod,
        receipt_url,
        receipt_filename: file.name,
        notes: notes || null,
        status: "Pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      toast({ title: t("awaiting_approval"), description: t("awaiting_approval_desc") });
      // Reset form
      setFile(null);
      setFilePreview(null);
      setNotes("");
      setAmountOverride("");
      setPaymentMethod("");
    },
    onError: (err: any) => {
      toast({ title: t("contribute_error"), description: err.message ?? "Try again.", variant: "destructive" });
    },
  });

  function onFileChange(f: File | null) {
    setFileError(null);
    if (!f) { setFile(null); setFilePreview(null); return; }
    if (f.size > 5 * 1024 * 1024) {
      setFileError(lang === "ar" ? "الملف أكبر من 5 ميجابايت." : "File is larger than 5MB.");
      return;
    }
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") {
      setFileError(lang === "ar" ? "يُسمح فقط بالصور أو ملفات PDF." : "Only images or PDF allowed.");
      return;
    }
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  }

  const canSubmit = !!memberName && !!month && !!paymentMethod && !!file && !submit.isPending;

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("nav_contribute")}</div>
        <h1 className="font-display text-2xl font-bold mt-1">{t("contribute_title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("contribute_subtitle")}</p>
      </div>

      {/* Monthly target card */}
      {settings && (
        <div className="rounded-2xl hero-brand text-white p-6 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary/80">{t("your_target")}</span>
          </div>
          <div className="kpi-number text-4xl text-primary">{formatSAR(target, {}, lang)}</div>
          <div className="text-xs text-secondary/70 mt-1.5">{t("your_target_hint")}</div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-2xl border border-card-border bg-card p-6 md:p-8 shadow-sm space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Member */}
          <div>
            <label className="text-sm font-medium">{t("field_member")} <span className="text-destructive">*</span></label>
            <Select value={memberName} onValueChange={setMemberName}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={t("field_member_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month */}
          <div>
            <label className="text-sm font-medium">{t("field_month")} <span className="text-destructive">*</span></label>
            <Input
              type="month"
              value={month}
              max={maxMonth()}
              onChange={(e) => setMonth(e.target.value)}
              className="mt-1.5"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium">{t("field_amount")} <span className="text-destructive">*</span></label>
            <Input
              type="number"
              step="1"
              min="1"
              placeholder={String(target)}
              value={amountOverride}
              onChange={(e) => setAmountOverride(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "ar" ? `الهدف: ${formatSAR(target, {}, lang)}` : `Target: ${formatSAR(target, {}, lang)}`}
            </p>
          </div>

          {/* Payment method */}
          <div>
            <label className="text-sm font-medium">{t("field_payment_method")} <span className="text-destructive">*</span></label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={t("field_payment_method_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{t(PAYMENT_LABEL_KEYS[m] as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium">{t("field_notes")}</label>
          <Textarea
            rows={2}
            placeholder={t("field_notes_placeholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5"
          />
        </div>

        {/* Receipt upload */}
        <div>
          <label className="text-sm font-medium">{t("field_receipt")} <span className="text-destructive">*</span></label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 w-full rounded-xl border-2 border-dashed border-input bg-muted/40 hover:bg-muted/60 transition-colors px-5 py-8 flex flex-col items-center justify-center gap-2 text-center"
            >
              <Upload className="h-5 w-5 text-primary" />
              <div className="font-semibold text-sm">{t("field_receipt_upload")}</div>
              <div className="text-xs text-muted-foreground">{t("field_receipt_upload_hint")}</div>
            </button>
          ) : (
            <div className="mt-2 rounded-xl border border-card-border bg-muted/30 p-3 flex items-center gap-3">
              {filePreview ? (
                <img src={filePreview} alt="" className="h-16 w-16 rounded-md object-cover border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                  {file.type === "application/pdf" ? <FileText className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                  {file.name}
                </div>
                <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setFilePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {fileError && <div className="text-sm text-destructive mt-2">{fileError}</div>}
          {!file && (
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Info className="h-3 w-3" /> {t("field_receipt_no_without")}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => submit.mutate()}
            disabled={!canSubmit}
            className="min-w-[180px]"
          >
            {submit.isPending ? t("btn_submitting_contribution") : t("btn_submit_for_approval")}
          </Button>
        </div>
      </div>

      {/* My contributions list */}
      <div className="rounded-2xl border border-card-border bg-card p-5 md:p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold mb-4">{t("my_contributions")}</h2>
        {!memberName ? (
          <p className="text-sm text-muted-foreground py-4">{t("field_member_placeholder")}</p>
        ) : loadingContribs ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : !myContributions || myContributions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("no_contributions_yet")}</p>
        ) : (
          <div className="overflow-x-auto -mx-5 md:-mx-6 px-5 md:px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="pb-3 pe-3 font-semibold text-start">{t("col_month")}</th>
                  <th className="pb-3 px-3 font-semibold text-end">{t("col_amount")}</th>
                  <th className="pb-3 px-3 font-semibold text-start hidden sm:table-cell">{t("col_payment_method")}</th>
                  <th className="pb-3 px-3 font-semibold text-start hidden md:table-cell">{t("col_submitted")}</th>
                  <th className="pb-3 ps-3 font-semibold text-end">{t("col_status")}</th>
                </tr>
              </thead>
              <tbody>
                {myContributions.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pe-3 font-semibold">{c.month}</td>
                    <td className="py-3 px-3 text-end tabular font-display font-semibold">{formatSAR(c.amount, {}, lang)}</td>
                    <td className="py-3 px-3 hidden sm:table-cell text-muted-foreground">
                      {c.payment_method === "Cash" ? t("pay_cash")
                       : c.payment_method === "Bank transfer" ? t("pay_bank")
                       : t("pay_card")}
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell text-muted-foreground text-xs">
                      {formatDate(c.submitted_at.slice(0, 10), lang)}
                    </td>
                    <td className="py-3 ps-3 text-end">
                      <StatusBadge status={c.status} rejectionReason={c.rejection_reason} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
