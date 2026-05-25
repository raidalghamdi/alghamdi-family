import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Settings } from "@shared/schema";
import { updateSettingsSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Sliders, CalendarCog, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { fetchSettings, updateSettings } from "@/lib/supabaseQueries";
import { useLanguage } from "@/lib/language-context";

const formSchema = updateSettingsSchema;
type FormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        annual_rent: settings.annual_rent,
        setup_cost: settings.setup_cost,
        monthly_operating: settings.monthly_operating,
        worker_monthly: settings.worker_monthly,
        first_rent_date: settings.first_rent_date,
        second_rent_date: settings.second_rent_date,
        plan_start: settings.plan_start,
        plan_horizon_months: settings.plan_horizon_months,
      });
    }
  }, [settings, form]);

  const save = useMutation({
    mutationFn: (values: FormValues) => updateSettings(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: t("settings_saved"), description: t("settings_subtitle") });
    },
    onError: (err: any) => toast({ title: t("settings_save_failed"), description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="p-6 md:p-10">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="mt-6 h-80 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{t("nav_settings")}</div>
        <h1 className="font-display text-xl font-bold mt-1">{t("settings_title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("settings_subtitle")}</p>
      </div>

      <div className="rounded-xl border border-warning/40 bg-warning/15 text-foreground p-4 flex gap-3 mb-6">
        <AlertTriangle className="h-5 w-5 text-earth-brown shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold">{t("settings_warning_title")}</div>
          <div className="text-muted-foreground">{t("settings_warning_body")}</div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-6" data-testid="form-settings">
          <SectionCard icon={<Sliders className="h-4 w-4" />} title={t("settings_section_costs")} subtitle={t("settings_section_costs_sub")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField name="annual_rent" label={t("settings_annual_rent")} form={form} />
              <NumberField name="setup_cost" label={t("settings_setup_cost")} form={form} />
              <NumberField name="monthly_operating" label={t("settings_monthly_op")} form={form} />
              <NumberField name="worker_monthly" label={t("settings_worker_monthly")} form={form} />
            </div>
          </SectionCard>

          <SectionCard icon={<CalendarCog className="h-4 w-4" />} title={t("settings_section_schedule")} subtitle={t("settings_section_schedule_sub")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <DateField name="first_rent_date" label={t("settings_first_rent")} form={form} />
              <DateField name="second_rent_date" label={t("settings_second_rent")} form={form} />
              <DateField name="plan_start" label={t("settings_plan_start")} form={form} />
              <NumberField name="plan_horizon_months" label={t("settings_plan_horizon")} form={form} />
            </div>
          </SectionCard>

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={save.isPending} data-testid="button-save-settings" className="min-w-[140px]">
              {save.isPending ? t("btn_saving") : t("btn_save")}
            </Button>
          </div>
        </form>
      </Form>
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

function NumberField({ name, label, form }: { name: keyof FormValues; label: string; form: any }) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min="0"
              {...field}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
              className="bg-warning/20 border-warning/40 focus-visible:ring-warning/40"
              data-testid={`input-${name}`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DateField({ name, label, form }: { name: keyof FormValues; label: string; form: any }) {
  return (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="date"
              {...field}
              value={field.value ?? ""}
              className="bg-warning/20 border-warning/40 focus-visible:ring-warning/40"
              data-testid={`input-${name}`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
