import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Expense } from "@shared/schema";
import { CATEGORIES, MEMBER_NAMES } from "@shared/schema";
import { formatSAR, formatDate } from "@/lib/format";
import { AvatarCircle } from "@/components/avatar-circle";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, ExternalLink, Search, Trash2, ReceiptText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useLanguage } from "@/lib/language-context";
import { useMember } from "@/lib/member-context";
import { fetchExpenses, deleteExpense, fetchGovernance } from "@/lib/supabaseQueries";
import { AttachReceiptDialog } from "@/components/attach-receipt-dialog";

const ALL = "__ALL__";

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Rent: "cat_rent",
  Setup: "cat_setup",
  Operating: "cat_operating",
  Worker: "cat_worker",
  Other: "cat_other",
};

function CategoryBadge({ category }: { category: string }) {
  const { t } = useLanguage();
  const tone: Record<string, string> = {
    Rent: "bg-primary/12 text-primary border-primary/25",
    Setup: "bg-accent/15 text-accent border-accent/30",
    Operating: "bg-muted text-foreground border-border",
    Worker: "bg-secondary text-secondary-foreground border-secondary-border",
    Other: "bg-muted text-muted-foreground border-border",
  };
  const labelKey = CATEGORY_LABEL_KEYS[category] ?? "cat_other";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", tone[category] ?? tone.Other)}>
      {t(labelKey as any)}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  if (status === "Paid") {
    return <span className="inline-flex items-center rounded-full bg-success/15 text-success border border-success/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{t("status_paid")}</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-warning/30 text-earth-brown border border-warning/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{t("status_unpaid")}</span>;
}

export default function ExpensesPage() {
  const { t, lang } = useLanguage();
  const { currentMember } = useMember();
  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
  });
  const { data: governance } = useQuery({ queryKey: ["governance"], queryFn: fetchGovernance });
  const budgetController = governance?.budget_controller ?? "Raid";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [paidBy, setPaidBy] = useState<string>(ALL);
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const { toast } = useToast();

  const filtered = useMemo(() => {
    let list = expenses ?? [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.notes ?? "").toLowerCase().includes(q) ||
          e.paid_by.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q),
      );
    }
    if (category !== ALL) list = list.filter((e) => e.category === category);
    if (paidBy !== ALL) list = list.filter((e) => e.paid_by === paidBy);
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "date_desc") return b.date.localeCompare(a.date);
      if (sort === "date_asc") return a.date.localeCompare(b.date);
      if (sort === "amount_desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return sorted;
  }, [expenses, query, category, paidBy, sort]);

  const del = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: t("deleted_title"), description: t("deleted_desc") });
    },
    onError: (err: any) => toast({ title: t("delete_error"), description: err.message, variant: "destructive" }),
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const entryWord = filtered.length === 1 ? t("entry") : t("entries");

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("nav_expenses")}</div>
          <h1 className="font-display text-xl font-bold mt-1">{t("expenses_title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} {entryWord} · <span className="tabular font-display font-bold text-foreground">{formatSAR(total, {}, lang)}</span>
          </p>
        </div>
        <Link href="/submit">
          <Button data-testid="link-submit-from-expenses">{t("expenses_add_btn")}</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-9"
            data-testid="input-search"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="select-filter-category"><SelectValue placeholder={t("filter_all_categories")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filter_all_categories")}</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(CATEGORY_LABEL_KEYS[c] as any)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paidBy} onValueChange={setPaidBy}>
          <SelectTrigger data-testid="select-filter-paid-by"><SelectValue placeholder={t("filter_all_members")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filter_all_members")}</SelectItem>
            {MEMBER_NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger data-testid="select-sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">{t("sort_newest")}</SelectItem>
            <SelectItem value="date_asc">{t("sort_oldest")}</SelectItem>
            <SelectItem value="amount_desc">{t("sort_amount_high")}</SelectItem>
            <SelectItem value="amount_asc">{t("sort_amount_low")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center" data-testid="empty-expenses">
          <ReceiptText className="h-10 w-10 text-muted-foreground mx-auto" />
          <div className="mt-3 font-display font-bold text-lg">{t("empty_no_match")}</div>
          <p className="text-sm text-muted-foreground mt-1">{t("empty_no_match_hint")}</p>
          <Link href="/submit">
            <Button className="mt-5">{t("expenses_add_btn")}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const canAttach =
              !e.receipt_url &&
              !!currentMember &&
              (currentMember === e.paid_by || currentMember === budgetController);
            return (
              <ExpenseCard
                key={e.id}
                expense={e}
                onDelete={() => del.mutate(e.id)}
                deleting={del.isPending}
                canAttach={canAttach}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpenseCard({ expense, onDelete, deleting, canAttach }: { expense: Expense; onDelete: () => void; deleting: boolean; canAttach: boolean }) {
  const { t, lang } = useLanguage();
  // receipt_url is now a full Supabase public URL — use directly
  const receiptUrl = expense.receipt_url ?? null;
  const isImage = receiptUrl && /\.(jpe?g|png|gif|webp|heic)$/i.test(receiptUrl);
  const isPdf = receiptUrl && /\.pdf$/i.test(receiptUrl);

  return (
    <div
      className="group rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
      data-testid={`card-expense-${expense.id}`}
    >
      {/* Receipt thumbnail */}
      <div className="aspect-[16/10] bg-muted/50 relative overflow-hidden">
        {isImage && receiptUrl ? (
          <img
            src={receiptUrl}
            alt={`Receipt for ${expense.description}`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : isPdf && receiptUrl ? (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-secondary to-muted text-foreground hover:from-secondary/80 transition-colors"
          >
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-xs font-semibold">{t("pdf_receipt")}</span>
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              {t("pdf_open")} <ExternalLink className="h-2.5 w-2.5" />
            </span>
          </a>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-muted to-secondary/40 text-muted-foreground">
            <ImageIcon className="h-7 w-7 opacity-50" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">{t("no_receipt")}</span>
            <span className="text-[10px]">{t("seeded_entry")}</span>
          </div>
        )}

        <div className="absolute top-3 start-3 flex gap-1.5">
          <CategoryBadge category={expense.category} />
        </div>
        <div className="absolute top-3 end-3">
          <StatusPill status={expense.status} />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{expense.description}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{formatDate(expense.date, lang)} · {expense.payment_method}</div>
          </div>
          <div className="text-end shrink-0">
            <div className="kpi-number text-2xl">{formatSAR(expense.amount, { decimals: 0, withSuffix: false }, lang)}</div>
            <div className="text-[10px] text-muted-foreground font-medium">{t("currency")}</div>
          </div>
        </div>

        {expense.notes && (
          <div className="mt-3 text-xs text-muted-foreground line-clamp-2">{expense.notes}</div>
        )}

        <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2 min-w-0">
            <AvatarCircle name={expense.paid_by} size={26} />
            <div className="text-xs">
              <div className="text-muted-foreground">{t("paid_by_label")}</div>
              <div className="font-semibold truncate">{expense.paid_by}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {receiptUrl && (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={t("view_receipt")}
                data-testid={`link-receipt-${expense.id}`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {!receiptUrl && canAttach && (
              <AttachReceiptDialog
                target="expense"
                rowId={expense.id}
                variant="icon"
                triggerTestId={`button-attach-receipt-${expense.id}`}
              />
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm(`${t("delete_confirm")} "${expense.description}"?`)) onDelete();
              }}
              disabled={deleting}
              className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              aria-label={t("delete_confirm")}
              data-testid={`button-delete-${expense.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
