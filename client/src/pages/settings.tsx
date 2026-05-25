import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Settings, CostLine, Frequency } from "@shared/schema";
import { updateSettingsSchema, FREQUENCIES, CATEGORIES } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarCog,
  AlertTriangle,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { z } from "zod";
import {
  fetchSettings,
  updateSettings,
  fetchCostLines,
  insertCostLine,
  updateCostLine,
  deleteCostLine,
  annualizeCostLine,
  sumAnnualBudget,
} from "@/lib/supabaseQueries";
import { useLanguage } from "@/lib/language-context";
import { formatSAR } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formSchema = updateSettingsSchema;
type FormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const { data: costLines = [], isLoading: loadingLines } = useQuery({
    queryKey: ["costLines"],
    queryFn: fetchCostLines,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        plan_start_date: settings.plan_start_date ?? "",
        plan_duration_months: settings.plan_duration_months ?? 12,
      });
    }
  }, [settings, form]);

  const savePlan = useMutation({
    mutationFn: (values: FormValues) => updateSettings(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: t("settings_saved"), description: t("settings_subtitle") });
    },
    onError: (err: any) => toast({ title: t("settings_save_failed"), description: err.message, variant: "destructive" }),
  });

  const totalAnnual = sumAnnualBudget(costLines);

  if (isLoading || loadingLines) {
    return (
      <div className="p-6 md:p-10">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="mt-6 h-80 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-6">
      <div className="mb-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("nav_settings")}</div>
        <h1 className="font-display text-xl font-bold mt-1">{t("settings_title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings_subtitle")}</p>
      </div>

      <div className="rounded-xl border border-warning/40 bg-warning/15 text-foreground p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-earth-brown shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold">{t("settings_warning_title")}</div>
          <div className="text-muted-foreground">{t("settings_warning_body")}</div>
        </div>
      </div>

      {/* Cost Lines section */}
      <SectionCard icon={<Layers className="h-4 w-4" />} title={t("settings_section_costs")} subtitle={t("settings_section_costs_sub")}>
        <CostLinesEditor costLines={costLines} totalAnnual={totalAnnual} lang={lang} t={t} />
      </SectionCard>

      {/* Plan section */}
      <SectionCard icon={<CalendarCog className="h-4 w-4" />} title={t("settings_section_plan")} subtitle={t("settings_section_plan_sub")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => savePlan.mutate(v))} className="space-y-5" data-testid="form-settings">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="plan_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings_plan_start")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                        data-testid="input-plan-start"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plan_duration_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings_plan_horizon")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        data-testid="input-plan-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={savePlan.isPending} data-testid="button-save-settings" className="min-w-[140px]">
                {savePlan.isPending ? t("btn_saving") : t("btn_save")}
              </Button>
            </div>
          </form>
        </Form>
      </SectionCard>
    </div>
  );
}

function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-6 md:p-7 shadow-sm">
      <div className="flex items-start gap-3 mb-5 pb-4 border-b border-border">
        <div className="rounded-md p-2 bg-primary/10 text-primary">{icon}</div>
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function frequencyLabel(freq: Frequency, t: (k: any) => string) {
  switch (freq) {
    case "one_time": return t("freq_one_time");
    case "monthly": return t("freq_monthly");
    case "quarterly": return t("freq_quarterly");
    case "annual": return t("freq_annual");
  }
}

interface CostLinesEditorProps {
  costLines: CostLine[];
  totalAnnual: number;
  lang: string;
  t: (k: any) => string;
}

function CostLinesEditor({ costLines, totalAnnual, lang, t }: CostLinesEditorProps) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const addMutation = useMutation({
    mutationFn: (row: Omit<CostLine, "id" | "created_at" | "updated_at">) => insertCostLine(row),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costLines"] });
      toast({ title: t("cl_added") });
      setAdding(false);
    },
    onError: (e: any) => toast({ title: t("settings_save_failed"), description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CostLine> }) => updateCostLine(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costLines"] });
      toast({ title: t("cl_updated") });
      setEditingId(null);
    },
    onError: (e: any) => toast({ title: t("settings_save_failed"), description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCostLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["costLines"] });
      toast({ title: t("cl_deleted") });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: t("settings_save_failed"), description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      {costLines.length === 0 && !adding ? (
        <div className="text-center py-10 text-sm text-muted-foreground" data-testid="empty-cost-lines">
          {t("cl_empty")}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="pb-3 px-2 font-semibold text-start">{t("cl_label")}</th>
                <th className="pb-3 px-2 font-semibold text-end">{t("cl_amount")}</th>
                <th className="pb-3 px-2 font-semibold text-start">{t("cl_frequency")}</th>
                <th className="pb-3 px-2 font-semibold text-end">{t("cl_annual_equivalent")}</th>
                <th className="pb-3 px-2 font-semibold text-center">{t("cl_active")}</th>
                <th className="pb-3 px-2 font-semibold text-end">{t("cl_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {costLines.map((line) =>
                editingId === line.id ? (
                  <CostLineRowEdit
                    key={line.id}
                    initial={line}
                    onCancel={() => setEditingId(null)}
                    onSave={(patch) => updateMutation.mutate({ id: line.id, patch })}
                    saving={updateMutation.isPending}
                    lang={lang}
                    t={t}
                  />
                ) : (
                  <tr key={line.id} className="border-b border-border/60 last:border-0" data-testid={`row-cost-line-${line.id}`}>
                    <td className="py-3 px-2 font-semibold">{lang === "ar" ? line.name_ar || line.name_en : line.name_en}</td>
                    <td className="py-3 px-2 text-end tabular">{formatSAR(line.amount, {}, lang)}</td>
                    <td className="py-3 px-2 text-muted-foreground">{frequencyLabel(line.frequency, t)}</td>
                    <td className="py-3 px-2 text-end tabular font-display font-semibold">{formatSAR(annualizeCostLine(line), {}, lang)}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${line.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {line.active ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-end">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(line.id)}
                          data-testid={`button-edit-${line.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(line.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-${line.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              )}
              {adding && (
                <CostLineRowEdit
                  onCancel={() => setAdding(false)}
                  onSave={(row) => addMutation.mutate(row as any)}
                  saving={addMutation.isPending}
                  lang={lang}
                  t={t}
                />
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td colSpan={3} className="pt-3 px-2 font-semibold text-end">{t("cl_total_annual")}</td>
                <td className="pt-3 px-2 text-end tabular font-display font-bold text-primary text-base" data-testid="text-total-annual">
                  {formatSAR(totalAnnual, {}, lang)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!adding && (
        <div>
          <Button onClick={() => setAdding(true)} variant="outline" data-testid="button-add-cost-line">
            <Plus className="h-4 w-4 me-1" />
            {t("cl_add")}
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cl_delete_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cl_delete")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-cost-line"
            >
              {t("cl_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CostLineRowEditProps {
  initial?: CostLine;
  onCancel: () => void;
  onSave: (patch: Partial<CostLine>) => void;
  saving: boolean;
  lang: string;
  t: (k: any) => string;
}

function CostLineRowEdit({ initial, onCancel, onSave, saving, lang, t }: CostLineRowEditProps) {
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "monthly");
  const [active, setActive] = useState<boolean>(initial?.active ?? true);

  function handleSave() {
    if (!nameEn.trim() && !nameAr.trim()) return;
    onSave({
      name_en: nameEn.trim() || nameAr.trim(),
      name_ar: nameAr.trim() || nameEn.trim(),
      amount: Number(amount) || 0,
      frequency,
      active,
      sort_order: initial?.sort_order ?? 0,
    });
  }

  return (
    <tr className="border-b border-border/60 bg-muted/20" data-testid="row-cost-line-edit">
      <td className="py-2 px-2">
        <div className="space-y-1">
          <Input
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder={lang === "ar" ? "EN: Rent" : "EN: Rent"}
            className="h-8 text-sm"
            data-testid="input-cl-name-en"
          />
          <Input
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder={lang === "ar" ? "AR: إيجار" : "AR: إيجار"}
            className="h-8 text-sm"
            dir="rtl"
            data-testid="input-cl-name-ar"
          />
        </div>
      </td>
      <td className="py-2 px-2">
        <Input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="h-8 text-end tabular"
          data-testid="input-cl-amount"
        />
      </td>
      <td className="py-2 px-2">
        <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
          <SelectTrigger className="h-8" data-testid="select-cl-frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCIES.map((f) => (
              <SelectItem key={f} value={f}>{frequencyLabel(f, t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-2 px-2 text-end text-xs text-muted-foreground">—</td>
      <td className="py-2 px-2 text-center">
        <Switch checked={active} onCheckedChange={setActive} data-testid="switch-cl-active" />
      </td>
      <td className="py-2 px-2 text-end">
        <div className="inline-flex items-center gap-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || (!nameEn.trim() && !nameAr.trim())}
            data-testid="button-save-cost-line"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} data-testid="button-cancel-cost-line">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
