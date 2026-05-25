/**
 * All Supabase data access helpers used by React Query.
 * Each function can be used as a queryFn.
 */

import { supabase } from "./supabase";
import type {
  Member,
  Settings,
  Expense,
  Summary,
  SummaryMember,
  CostLine,
  Frequency,
  ReportSettings,
  ReportKey,
} from "@shared/schema";

// ──────────────────────────────────────────
// Types for ancillary tables
// ──────────────────────────────────────────
export interface Contribution {
  id: string;
  member_name: string;
  month: string; // YYYY-MM
  amount: number;
  payment_method: string;
  receipt_url: string;
  receipt_filename: string | null;
  notes: string | null;
  status: "Pending" | "Approved" | "Rejected";
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface Governance {
  id: number;
  budget_controller: string;
  esteraha_prince: string;
  charter_text: string | null;
  charter_accepted_by: string | null;
  updated_at: string | null;
}

export type GovernanceField = "budget_controller" | "esteraha_prince" | "charter_text";

export interface GovernanceChange {
  id: string;
  field: GovernanceField;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  note: string | null;
}

// ──────────────────────────────────────────
// Members
// ──────────────────────────────────────────
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Member[];
}

// Edge-function-backed admin actions (Patriarch only)
export async function adminCreateMember(name: string, password: string) {
  const { data, error } = await supabase.functions.invoke("family-admin", {
    body: { action: "create", name, password },
  });
  if (error) throw new Error(((data as any)?.error) ?? error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true; id: string; email: string; name: string };
}

export async function adminRenameMember(id: string, name: string) {
  const { data, error } = await supabase.functions.invoke("family-admin", {
    body: { action: "rename", id, name },
  });
  if (error) throw new Error(((data as any)?.error) ?? error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export async function adminResetPassword(id: string, password: string) {
  const { data, error } = await supabase.functions.invoke("family-admin", {
    body: { action: "reset_password", id, password },
  });
  if (error) throw new Error(((data as any)?.error) ?? error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export async function adminDeleteMember(id: string) {
  const { data, error } = await supabase.functions.invoke("family-admin", {
    body: { action: "delete", id },
  });
  if (error) throw new Error(((data as any)?.error) ?? error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

// ──────────────────────────────────────────
// Settings
// ──────────────────────────────────────────
export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  return data as Settings;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .update(patch)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Settings;
}

// ──────────────────────────────────────────
// Cost lines
// ──────────────────────────────────────────
export async function fetchCostLines(): Promise<CostLine[]> {
  const { data, error } = await supabase
    .from("cost_lines")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CostLine[];
}

export async function insertCostLine(row: Omit<CostLine, "id" | "created_at" | "updated_at">): Promise<CostLine> {
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("cost_lines")
    .insert({ ...row, id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CostLine;
}

export async function updateCostLine(id: string, patch: Partial<CostLine>): Promise<CostLine> {
  const { data, error } = await supabase
    .from("cost_lines")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CostLine;
}

export async function deleteCostLine(id: string): Promise<void> {
  const { error } = await supabase.from("cost_lines").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Annualize a single cost line to an annual SAR amount
export function annualizeCostLine(line: CostLine): number {
  if (!line.active) return 0;
  switch (line.frequency) {
    case "one_time":
      return line.amount;
    case "monthly":
      return line.amount * 12;
    case "quarterly":
      return line.amount * 4;
    case "annual":
      return line.amount;
    default:
      return 0;
  }
}

export function sumAnnualBudget(lines: CostLine[]): number {
  return lines.reduce((s, l) => s + annualizeCostLine(l), 0);
}

// ──────────────────────────────────────────
// Expenses
// ──────────────────────────────────────────
export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Expense[];
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ──────────────────────────────────────────
// Contributions
// ──────────────────────────────────────────
export async function fetchContributions(): Promise<Contribution[]> {
  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Contribution[];
}

export async function fetchContributionsByMember(memberName: string): Promise<Contribution[]> {
  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("member_name", memberName)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Contribution[];
}

export async function fetchPendingContributions(): Promise<Contribution[]> {
  const { data, error } = await supabase
    .from("contributions")
    .select("*")
    .eq("status", "Pending")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Contribution[];
}

export async function insertContribution(contribution: Omit<Contribution, "id" | "submitted_at" | "reviewed_at" | "reviewed_by" | "rejection_reason">): Promise<Contribution> {
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("contributions")
    .insert({ ...contribution, id, submitted_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Contribution;
}

export async function approveContribution(id: string, reviewedBy: string): Promise<void> {
  const { error } = await supabase
    .from("contributions")
    .update({
      status: "Approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function rejectContribution(id: string, reviewedBy: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("contributions")
    .update({
      status: "Rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      rejection_reason: reason,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ──────────────────────────────────────────
// Governance
// ──────────────────────────────────────────
export async function fetchGovernance(): Promise<Governance> {
  const { data, error } = await supabase
    .from("governance")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) {
    return {
      id: 1,
      budget_controller: "Raid",
      esteraha_prince: "Raid",
      charter_text: null,
      charter_accepted_by: null,
      updated_at: null,
    };
  }
  return data as Governance;
}

export async function fetchGovernanceChanges(limit = 10): Promise<GovernanceChange[]> {
  const { data, error } = await supabase
    .from("governance_changes")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("fetchGovernanceChanges:", error.message);
    return [];
  }
  return (data ?? []) as GovernanceChange[];
}

export async function updateGovernanceField(
  field: GovernanceField,
  newValue: string,
  changedBy: string,
  oldValue: string | null,
  note?: string,
): Promise<void> {
  const { error: insertErr } = await supabase.from("governance_changes").insert({
    field,
    old_value: oldValue,
    new_value: newValue,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    note: note ?? null,
  });
  if (insertErr) throw new Error(insertErr.message);

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  patch[field] = newValue;
  const { error: updateErr } = await supabase
    .from("governance")
    .update(patch)
    .eq("id", 1);
  if (updateErr) throw new Error(updateErr.message);
}

// ──────────────────────────────────────────
// Receipt attach
// ──────────────────────────────────────────
export async function uploadReceiptFile(file: File, folder: "expenses" | "contributions"): Promise<{ publicUrl: string; filename: string }> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File too large (max 5MB)");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type });
  if (uploadErr) throw new Error(uploadErr.message);
  const { data: pub } = supabase.storage.from("receipts").getPublicUrl(path);
  return { publicUrl: pub.publicUrl, filename: file.name };
}

export async function attachReceiptToExpense(expenseId: string, publicUrl: string, filename: string): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .update({ receipt_url: publicUrl, receipt_filename: filename })
    .eq("id", expenseId);
  if (error) throw new Error(error.message);
}

export async function attachReceiptToContribution(contributionId: string, publicUrl: string, filename: string): Promise<void> {
  const { error } = await supabase
    .from("contributions")
    .update({ receipt_url: publicUrl, receipt_filename: filename })
    .eq("id", contributionId);
  if (error) throw new Error(error.message);
}

// ──────────────────────────────────────────
// Report settings
// ──────────────────────────────────────────
const DEFAULT_REPORT_ENABLED: Record<ReportKey, boolean> = {
  member_balance: true,
  monthly_contributions: true,
  expenses_by_category: true,
  expenses_by_member: true,
  pending_approvals: true,
  annual_summary: true,
  cost_lines_snapshot: true,
  governance_history: true,
};

export async function fetchReportSettings(): Promise<ReportSettings> {
  const { data, error } = await supabase
    .from("report_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.warn("fetchReportSettings:", error.message);
    return { id: 1, enabled: { ...DEFAULT_REPORT_ENABLED } };
  }
  if (!data) return { id: 1, enabled: { ...DEFAULT_REPORT_ENABLED } };
  return {
    id: 1,
    enabled: { ...DEFAULT_REPORT_ENABLED, ...((data.enabled as Record<ReportKey, boolean>) ?? {}) },
    updated_at: data.updated_at,
  };
}

export async function updateReportSettings(enabled: Record<ReportKey, boolean>): Promise<void> {
  // Upsert id=1
  const { error } = await supabase
    .from("report_settings")
    .upsert({ id: 1, enabled, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

// ──────────────────────────────────────────
// Summary (computed client-side from live data)
// ──────────────────────────────────────────
export function computeSummary(
  expenses: Expense[],
  members: Member[],
  costLines: CostLine[],
  approvedContributions: Contribution[] = []
): Summary {
  const members_count = members.length;
  const annual_budget = sumAnnualBudget(costLines);

  const total_expenses = expenses.reduce((s, e) => s + e.amount, 0);
  const total_paid = expenses
    .filter((e) => e.status === "Paid")
    .reduce((s, e) => s + e.amount, 0);
  const total_unpaid = expenses
    .filter((e) => e.status === "Unpaid")
    .reduce((s, e) => s + e.amount, 0);

  const per_member_share = members_count > 0 ? annual_budget / members_count : 0;
  const per_member_monthly_target = members_count > 0 ? per_member_share / 12 : 0;

  const memberRows: SummaryMember[] = members.map((m) => {
    const directPaid = expenses
      .filter((e) => e.status === "Paid" && e.paid_by === m.name)
      .reduce((s, e) => s + e.amount, 0);
    const contributionsPaid = approvedContributions
      .filter((c) => c.status === "Approved" && c.member_name === m.name)
      .reduce((s, c) => s + c.amount, 0);
    const paid = directPaid + contributionsPaid;
    const balance = paid - per_member_share;
    let status: SummaryMember["status"] = "Settled";
    if (balance > 100) status = "Credit";
    else if (balance < -100) status = "Owes group";
    return { name: m.name, paid, share: per_member_share, balance, status };
  });

  return {
    members_count,
    total_expenses,
    total_paid,
    total_unpaid,
    per_member_share,
    per_member_monthly_target,
    members: memberRows,
    annual_budget,
  };
}

// ──────────────────────────────────────────
// Helpers used by individual pages
// ──────────────────────────────────────────
export function computeAnnualBudget(costLines: CostLine[]): number {
  return sumAnnualBudget(costLines);
}

export function computeMonthlyTargetFromLines(costLines: CostLine[], membersCount: number): number {
  if (membersCount <= 0) return 0;
  const annual = sumAnnualBudget(costLines);
  return Math.round(annual / membersCount / 12);
}

/** Convert a free-text name into the synthetic email used by per-member auth. */
export function nameToSyntheticEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "member";
  return `${slug}@family.local`;
}

/** Returns true if a string looks like an email. Used by login to decide
 *  whether to slugify (member name) or just sign in directly (admin bootstrap). */
export function looksLikeEmail(s: string): boolean {
  return /@/.test(s) && /\./.test(s.split("@").pop() ?? "");
}
