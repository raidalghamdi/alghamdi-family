import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-context";
import { fetchGovernanceChanges, type GovernanceChange } from "@/lib/supabaseQueries";
import { History, ArrowRight } from "lucide-react";

function relativeTime(iso: string, t: (k: any) => string, lang: "ar" | "en"): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("just_now");
  if (mins < 60) return t("minutes_ago").replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("hours_ago").replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  if (days < 30) return t("days_ago").replace("{n}", String(days));
  // Fall back to date
  return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US");
}

function fieldLabel(field: string, t: (k: any) => string): string {
  if (field === "esteraha_prince") return t("field_esteraha_prince");
  if (field === "budget_controller") return t("field_budget_controller");
  if (field === "charter_text") return t("field_charter_text");
  return field;
}

export function GovernanceHistory({ limit = 10, compact = false }: { limit?: number; compact?: boolean }) {
  const { t, lang } = useLanguage();
  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["governance_changes", limit],
    queryFn: () => fetchGovernanceChanges(limit),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-3">
        {compact ? t("no_governance_changes_yet") : t("governance_history_empty")}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border" data-testid="list-governance-history">
      {changes.map((c: GovernanceChange) => {
        const isCharter = c.field === "charter_text";
        return (
          <li key={c.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 text-primary p-1.5 mt-0.5 shrink-0">
                <History className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-snug">
                  <span className="text-muted-foreground">{t("gov_changed_label")}</span>{" "}
                  <span className="font-semibold">{fieldLabel(c.field, t)}</span>
                  {!isCharter && c.old_value && c.new_value && (
                    <>
                      {": "}
                      <span className="text-muted-foreground line-through">{c.old_value}</span>
                      <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                      <span className="font-semibold text-primary">{c.new_value}</span>
                    </>
                  )}
                  {isCharter && (
                    <span className="text-muted-foreground"> — {t("charter_text_changed")}</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {c.changed_by && (
                    <>
                      {t("gov_by")} <span className="font-semibold">{c.changed_by}</span>
                      {" · "}
                    </>
                  )}
                  {relativeTime(c.changed_at, t, lang)}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
