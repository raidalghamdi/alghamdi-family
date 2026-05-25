import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { updateGovernanceField, type GovernanceField } from "@/lib/supabaseQueries";
import { MEMBER_NAMES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  field: GovernanceField;
  value: string;
  canEdit: boolean;
  changedBy: string;
  accent?: "primary" | "accent";
  editLabel: string;
  testIdPrefix: string;
}

export function EditableGovernanceCard({
  label,
  field,
  value,
  canEdit,
  changedBy,
  accent = "primary",
  editLabel,
  testIdPrefix,
}: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value);

  const mutation = useMutation({
    mutationFn: () => updateGovernanceField(field, draft, changedBy, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance"] });
      queryClient.invalidateQueries({ queryKey: ["governance_changes"] });
      toast({ title: t("saved_toast"), description: t("saved_toast_desc") });
      setEditing(false);
    },
    onError: (err: any) => {
      toast({ title: t("action_error"), description: err.message, variant: "destructive" });
    },
  });

  const iconColor = accent === "accent" ? "text-accent" : "text-primary";

  return (
    <div className="rounded-xl bg-muted/50 p-4 border border-border">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => { setDraft(value); setEditing(true); }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
            data-testid={`${testIdPrefix}-edit`}
          >
            <Pencil className="h-3 w-3" />
            {editLabel}
          </button>
        )}
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          <User className={cn("h-4 w-4", iconColor)} />
          <span className="font-bold text-lg" data-testid={`${testIdPrefix}-value`}>
            {value}
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={draft} onValueChange={setDraft}>
            <SelectTrigger className="h-9 bg-background" data-testid={`${testIdPrefix}-select`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_NAMES.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 flex-1"
              disabled={draft === value || mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid={`${testIdPrefix}-save`}
            >
              <Check className="h-3.5 w-3.5" />
              {t("btn_save_short")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => { setEditing(false); setDraft(value); }}
              disabled={mutation.isPending}
              data-testid={`${testIdPrefix}-cancel`}
            >
              <X className="h-3.5 w-3.5" />
              {t("btn_cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
