import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { useMember } from "@/lib/member-context";
import { useAuth } from "@/lib/auth-context";
import {
  fetchMembers,
  fetchGovernance,
  adminCreateMember,
  adminRenameMember,
  adminResetPassword,
  adminDeleteMember,
  nameToSyntheticEmail,
} from "@/lib/supabaseQueries";
import type { Member } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Users, UserPlus, Pencil, KeyRound, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const PATRIARCH_EMAIL = "raid.a.alghamdi@gmail.com";

export default function MembersPage() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { currentMember } = useMember();
  const { toast } = useToast();

  const { data: governance } = useQuery({ queryKey: ["governance"], queryFn: fetchGovernance });
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: fetchMembers,
  });

  const isPatriarch =
    user?.email === PATRIARCH_EMAIL ||
    (!!currentMember && !!governance && currentMember === governance.esteraha_prince);

  // Dialog states
  const [addOpen, setAddOpen] = useState(false);
  const [renameMember, setRenameMember] = useState<Member | null>(null);
  const [resetMember, setResetMember] = useState<Member | null>(null);
  const [deleteMember, setDeleteMember] = useState<Member | null>(null);

  // Form values
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [resetValue, setResetValue] = useState("");

  // Mutations
  const createMutation = useMutation({
    mutationFn: () => adminCreateMember(newName.trim(), newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: t("member_added"), description: nameToSyntheticEmail(newName.trim()) });
      setAddOpen(false);
      setNewName("");
      setNewPassword("");
    },
    onError: (err: any) =>
      toast({ title: t("member_action_error"), description: err.message, variant: "destructive" }),
  });

  const renameMutation = useMutation({
    mutationFn: () => adminRenameMember(renameMember!.id, renameValue.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: t("member_renamed") });
      setRenameMember(null);
      setRenameValue("");
    },
    onError: (err: any) =>
      toast({ title: t("member_action_error"), description: err.message, variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: () => adminResetPassword(resetMember!.id, resetValue),
    onSuccess: () => {
      toast({ title: t("member_password_reset") });
      setResetMember(null);
      setResetValue("");
    },
    onError: (err: any) =>
      toast({ title: t("member_action_error"), description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminDeleteMember(deleteMember!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: t("member_deleted") });
      setDeleteMember(null);
    },
    onError: (err: any) =>
      toast({ title: t("member_action_error"), description: err.message, variant: "destructive" }),
  });

  // Patriarch-only guard
  if (!isPatriarch) {
    return (
      <div className="p-5 md:p-8 lg:p-10 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-card-border bg-card p-8 md:p-12 text-center shadow-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1
            className="font-bold text-xl mb-2"
            style={{ fontFamily: lang === "ar" ? "Tajawal, sans-serif" : "Manrope, sans-serif" }}
          >
            {t("members_title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("members_only_patriarch")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-[0.18em] font-medium mb-2">
            <Users className="h-4 w-4" />
            <span>{t("nav_members")}</span>
          </div>
          <h1
            className="font-bold text-xl"
            style={{ fontFamily: lang === "ar" ? "Tajawal, sans-serif" : "Manrope, sans-serif" }}
          >
            {t("members_title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("members_subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setNewName("");
            setNewPassword("");
            setAddOpen(true);
          }}
          className="gap-2"
          data-testid="button-add-member"
        >
          <UserPlus className="h-4 w-4" />
          {t("member_add")}
        </Button>
      </div>

      {/* Members table */}
      <div className="rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">…</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("members_empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
                  <th className="py-3 px-5 font-semibold text-start">{t("member_name")}</th>
                  <th className="py-3 px-3 font-semibold text-start hidden md:table-cell">
                    {t("member_synthetic_email")}
                  </th>
                  <th className="py-3 px-5 font-semibold text-end">{t("member_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/20 transition-colors"
                    data-testid={`row-member-${m.id}`}
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold">{m.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell text-muted-foreground font-mono text-xs">
                      {nameToSyntheticEmail(m.name)}
                    </td>
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => {
                            setRenameMember(m);
                            setRenameValue(m.name);
                          }}
                          data-testid={`button-rename-${m.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("member_rename")}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => {
                            setResetMember(m);
                            setResetValue("");
                          }}
                          data-testid={`button-reset-${m.id}`}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("member_reset_password")}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setDeleteMember(m)}
                          data-testid={`button-delete-${m.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">{t("member_delete")}</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("member_add")}</DialogTitle>
            <DialogDescription>{t("members_subtitle")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">{t("member_name")}</Label>
              <Input
                id="add-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={lang === "ar" ? "مثال: أحمد" : "e.g. Ahmed"}
                data-testid="input-add-name"
              />
              {newName.trim() && (
                <p className="text-[11px] text-muted-foreground font-mono">
                  → {nameToSyntheticEmail(newName.trim())}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">{t("member_password")}</Label>
              <Input
                id="add-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                data-testid="input-add-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t("btn_cancel")}
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || newPassword.length < 6 || createMutation.isPending}
              data-testid="button-confirm-add"
            >
              {t("member_add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameMember} onOpenChange={(o) => !o && setRenameMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("member_rename")}</DialogTitle>
            <DialogDescription>{renameMember?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-value">{t("member_new_name")}</Label>
            <Input
              id="rename-value"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              data-testid="input-rename"
            />
            {renameValue.trim() && (
              <p className="text-[11px] text-muted-foreground font-mono">
                → {nameToSyntheticEmail(renameValue.trim())}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameMember(null)}>
              {t("btn_cancel")}
            </Button>
            <Button
              onClick={() => renameMutation.mutate()}
              disabled={
                !renameValue.trim() ||
                renameValue.trim() === renameMember?.name ||
                renameMutation.isPending
              }
              data-testid="button-confirm-rename"
            >
              {t("btn_save_short")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetMember} onOpenChange={(o) => !o && setResetMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("member_reset_password")}</DialogTitle>
            <DialogDescription>{resetMember?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-value">{t("member_new_password")}</Label>
            <Input
              id="reset-value"
              type="password"
              value={resetValue}
              onChange={(e) => setResetValue(e.target.value)}
              autoComplete="new-password"
              data-testid="input-reset"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetMember(null)}>
              {t("btn_cancel")}
            </Button>
            <Button
              onClick={() => resetMutation.mutate()}
              disabled={resetValue.length < 6 || resetMutation.isPending}
              data-testid="button-confirm-reset"
            >
              {t("btn_save_short")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteMember} onOpenChange={(o) => !o && setDeleteMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("member_delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block font-semibold mb-1">{deleteMember?.name}</span>
              {t("member_delete_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              data-testid="button-confirm-delete"
            >
              {t("member_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
