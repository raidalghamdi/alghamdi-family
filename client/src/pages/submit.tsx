import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertExpenseSchema, type InsertExpense, type Member, CATEGORIES, PAYMENT_METHODS } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, Upload, Lock, Info, X, CheckCircle2 } from "lucide-react";
import { AvatarCircle } from "@/components/avatar-circle";
import { formatSAR, formatDate } from "@/lib/format";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { fetchMembers } from "@/lib/supabaseQueries";
import { useLanguage } from "@/lib/language-context";

const formSchema = insertExpenseSchema.extend({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
});

type FormValues = z.infer<typeof formSchema>;

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Rent: "cat_rent",
  Setup: "cat_setup",
  Operating: "cat_operating",
  Worker: "cat_worker",
  Other: "cat_other",
};

const PAYMENT_LABEL_KEYS: Record<string, string> = {
  Cash: "pay_cash",
  "Bank transfer": "pay_bank",
  Card: "pay_card",
};

export default function SubmitPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const { data: members } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      date: today,
      paid_by: undefined as any,
      amount: undefined as any,
      category: undefined as any,
      payment_method: undefined as any,
      description: "",
      notes: "",
      status: "Paid",
    },
  });

  const watched = form.watch();

  useEffect(() => {
    if (!file) {
      setFilePreview(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setFilePreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setFilePreview(null);
  }, [file]);

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!file) throw new Error(t("field_receipt_required"));

      // Upload to Supabase Storage
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("receipts")
        .upload(path, file, { contentType: file.type });
      if (uploadErr) throw new Error(uploadErr.message);

      // Get public URL
      const { data: pub } = supabase.storage.from("receipts").getPublicUrl(path);
      const receipt_url = pub.publicUrl;

      // Insert row
      const id = crypto.randomUUID();
      const { error: insertErr } = await supabase.from("expenses").insert({
        id,
        date: values.date,
        paid_by: values.paid_by,
        amount: values.amount,
        category: values.category,
        payment_method: values.payment_method,
        description: values.description,
        notes: values.notes ?? null,
        receipt_url,
        receipt_filename: file.name,
        status: values.status ?? "Paid",
        created_at: new Date().toISOString(),
      });
      if (insertErr) throw new Error(insertErr.message);
      return { id, receipt_url };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: t("submit_success"), description: t("submit_success_desc") });
      navigate("/expenses");
    },
    onError: (err: any) => {
      toast({ title: t("submit_error"), description: err.message ?? "Try again.", variant: "destructive" });
    },
  });

  function onFileChange(f: File | null) {
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError(lang === "ar" ? "الملف أكبر من 5 ميجابايت." : "File is larger than 5MB.");
      return;
    }
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") {
      setFileError(lang === "ar" ? "يُسمح فقط بالصور أو ملفات PDF." : "Only images or PDF allowed.");
      return;
    }
    setFile(f);
  }

  const onSubmit = (values: FormValues) => {
    if (!file) {
      setFileError(t("field_receipt_required"));
      return;
    }
    submit.mutate(values);
  };

  const canSubmit = form.formState.isValid && !!file && !submit.isPending;

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("nav_submit")}</div>
        <h1 className="font-display text-xl font-bold mt-1">{t("submit_title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("submit_subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Decorative left/right rail */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl bg-brand-dark text-white p-6 shadow-md">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Lock className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">{t("tip_title")}</span>
            </div>
            <h3 className="font-display text-lg font-bold leading-tight">{t("tip_body")}</h3>
            <ul className="mt-4 space-y-2 text-xs text-secondary/75">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> {t("tip_rules_1")}</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> {t("tip_rules_2")}</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> {t("tip_rules_3")}</li>
            </ul>
          </div>

          {/* Live preview */}
          <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">{t("preview_title")}</div>
            <div className="flex items-center gap-3">
              {watched.paid_by ? (
                <AvatarCircle name={watched.paid_by} size={40} />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted" />
              )}
              <div className="min-w-0">
                <div className="font-semibold truncate">{watched.paid_by || t("preview_member_placeholder")}</div>
                <div className="text-xs text-muted-foreground">
                  {watched.date ? formatDate(watched.date, lang) : t("preview_date_placeholder")}{watched.category ? ` · ${watched.category}` : ""}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("preview_amount_label")}</div>
              <div className="kpi-number text-3xl mt-1">
                {watched.amount && Number(watched.amount) > 0 ? formatSAR(Number(watched.amount), { decimals: 0, withSuffix: false }, lang) : "—"}
                <span className="text-sm text-muted-foreground font-normal ms-2">{t("currency")}</span>
              </div>
            </div>
            {watched.description && (
              <div className="mt-3 text-sm text-foreground/80 line-clamp-3">{watched.description}</div>
            )}
          </div>
        </aside>

        {/* Form */}
        <div className="lg:col-span-2 rounded-2xl border border-card-border bg-card p-6 md:p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" data-testid="form-submit-expense">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="paid_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("field_paid_by")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-paid-by">
                            <SelectValue placeholder={t("field_paid_by_placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(members ?? []).map((m) => (
                            <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("field_date")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("field_amount")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t("field_amount_placeholder")}
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("field_category")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder={t("field_category_placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{t(CATEGORY_LABEL_KEYS[c] as any)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>{t("field_payment_method")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue placeholder={t("field_payment_method_placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>{t(PAYMENT_LABEL_KEYS[m] as any)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("field_description")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("field_description_placeholder")} {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("field_notes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder={t("field_notes_placeholder")} {...field} value={field.value ?? ""} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Receipt upload */}
              <div>
                <label className="text-sm font-medium leading-none">
                  {t("field_receipt")} <span className="text-destructive">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  data-testid="input-receipt"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />

                {!file ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 w-full rounded-xl border-2 border-dashed border-input bg-muted/40 hover:bg-muted/60 transition-colors px-5 py-8 flex flex-col items-center justify-center gap-2 text-center"
                    data-testid="button-upload-receipt"
                  >
                    <Upload className="h-5 w-5 text-primary" />
                    <div className="font-semibold text-sm">{t("field_receipt_upload")}</div>
                    <div className="text-xs text-muted-foreground">{t("field_receipt_upload_hint")}</div>
                  </button>
                ) : (
                  <div className="mt-2 rounded-xl border border-card-border bg-muted/30 p-3 flex items-center gap-3" data-testid="preview-receipt">
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
                      <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · {file.type || "file"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="rounded-md p-1.5 hover:bg-muted text-muted-foreground"
                      aria-label="Remove file"
                      data-testid="button-remove-receipt"
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

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/expenses")} data-testid="button-cancel">
                  {t("btn_cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="min-w-[140px]"
                  data-testid="button-submit"
                >
                  {submit.isPending ? t("btn_submitting") : t("btn_submit")}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
