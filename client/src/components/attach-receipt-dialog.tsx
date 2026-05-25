import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import {
  uploadReceiptFile,
  attachReceiptToExpense,
  attachReceiptToContribution,
} from "@/lib/supabaseQueries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Paperclip, Upload } from "lucide-react";

interface Props {
  target: "expense" | "contribution";
  rowId: string;
  /** Test id for the trigger button */
  triggerTestId?: string;
  /** Optional extra invalidation keys (e.g., ["contributions", memberName]) */
  extraInvalidate?: (string | number)[][];
  /** Render variant — "button" or "icon" */
  variant?: "button" | "icon";
}

export function AttachReceiptDialog({
  target,
  rowId,
  triggerTestId,
  extraInvalidate = [],
  variant = "button",
}: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t("choose_file_hint"));
      const folder = target === "expense" ? "expenses" : "contributions";
      const { publicUrl, filename } = await uploadReceiptFile(file, folder);
      if (target === "expense") {
        await attachReceiptToExpense(rowId, publicUrl, filename);
      } else {
        await attachReceiptToContribution(rowId, publicUrl, filename);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["contributions"] });
      queryClient.invalidateQueries({ queryKey: ["contributions_pending"] });
      extraInvalidate.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
      toast({ title: t("receipt_uploaded") });
      setOpen(false);
      setFile(null);
    },
    onError: (err: any) => {
      toast({ title: t("upload_error"), description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setFile(null); }}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            aria-label={t("attach_receipt")}
            data-testid={triggerTestId}
            className="rounded-md p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            data-testid={triggerTestId}
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="text-xs">{t("attach_receipt")}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("upload_receipt")}</DialogTitle>
          <DialogDescription>{t("choose_file_hint")}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <input
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 5 * 1024 * 1024) {
                toast({
                  title: t("upload_error"),
                  description: t("choose_file_hint"),
                  variant: "destructive",
                });
                e.target.value = "";
                return;
              }
              setFile(f);
            }}
            className="block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground file:font-semibold file:cursor-pointer hover:file:bg-primary/90"
            data-testid="input-receipt-file"
          />
          {file && (
            <div className="mt-2 text-xs text-muted-foreground">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={upload.isPending}>
            {t("btn_cancel")}
          </Button>
          <Button
            onClick={() => upload.mutate()}
            disabled={!file || upload.isPending}
            data-testid="button-upload-receipt-confirm"
          >
            <Upload className="h-3.5 w-3.5 me-1.5" />
            {t("upload_receipt")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
