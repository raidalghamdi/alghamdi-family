/**
 * All Supabase data access helpers used by React Query.
 * Each function can be used as a queryFn.
 */

import { supabase } from "./supabase";
import type { Member, Settings, Expense, Summary, SummaryMember } from "@shared/schema";
import { MEMBER_NAMES } from "@shared/schema";

// ──────────────────────────────────────────
// Types for new tables
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
  return data as Member[];
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
// Expenses
// ──────────────────────────────────────────
export async function fetchExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Expense[];
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
  // If governance table doesn't exist yet, return defaults
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

// ──────────────────────────────────────────
// Governance Changes (audit log)
// ──────────────────────────────────────────
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
  // Insert audit row first (id is BIGSERIAL — let the DB assign it)
  const { error: insertErr } = await supabase.from("governance_changes").insert({
    field,
    old_value: oldValue,
    new_value: newValue,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    note: note ?? null,
  });
  if (insertErr) throw new Error(insertErr.message);

  // Then update governance row
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  patch[field] = newValue;
  const { error: updateErr } = await supabase
    .from("governance")
    .update(patch)
    .eq("id", 1);
  if (updateErr) throw new Error(updateErr.message);
}

// ──────────────────────────────────────────
// Receipt attach (existing expenses + contributions)
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
// Summary (computed client-side)
// ──────────────────────────────────────────
export function computeSummary(
  expenses: Expense[],
  settings: Settings,
  approvedContributions: Contribution[] = []
): Summary {
  const total_expenses = expenses.reduce((s, e) => s + e.amount, 0);
  const total_paid = expenses
    .filter((e) => e.status === "Paid")
    .reduce((s, e) => s + e.amount, 0);
  const total_unpaid = expenses
    .filter((e) => e.status === "Unpaid")
    .reduce((s, e) => s + e.amount, 0);

  const per_member_share = total_paid / MEMBER_NAMES.length;

  const members: SummaryMember[] = MEMBER_NAMES.map((name) => {
    // Direct expenses paid by this member
    const directPaid = expenses
      .filter((e) => e.status === "Paid" && e.paid_by === name)
      .reduce((s, e) => s + e.amount, 0);
    // Approved monthly contributions by this member
    const contributionsPaid = approvedContributions
      .filter((c) => c.status === "Approved" && c.member_name === name)
      .reduce((s, c) => s + c.amount, 0);
    const paid = directPaid + contributionsPaid;
    const balance = paid - per_member_share;
    let status: SummaryMember["status"] = "Settled";
    if (balance > 100) status = "Credit";
    else if (balance < -100) status = "Owes group";
    return { name, paid, share: per_member_share, balance, status };
  });

  const annual_budget =
    settings.annual_rent +
    settings.monthly_operating * 12 +
    settings.worker_monthly * 12;
  const first_year_total = annual_budget + settings.setup_cost;

  const second_rent_due = settings.annual_rent / 2;
  const today = new Date();
  const second = new Date(settings.second_rent_date);
  const monthsDiff =
    (second.getFullYear() - today.getFullYear()) * 12 +
    (second.getMonth() - today.getMonth());
  const months_until_2nd_rent = Math.max(0, monthsDiff);
  const monthly_save_needed =
    second_rent_due / MEMBER_NAMES.length / Math.max(months_until_2nd_rent, 1);

  return {
    total_expenses,
    total_paid,
    total_unpaid,
    per_member_share,
    members,
    annual_budget,
    first_year_total,
    second_rent_due,
    months_until_2nd_rent,
    monthly_save_needed,
  };
}

// ──────────────────────────────────────────
// Monthly contribution target (from settings)
// ──────────────────────────────────────────
export function computeMonthlyTarget(settings: Settings): number {
  const annual_budget =
    settings.annual_rent +
    settings.setup_cost +
    (settings.monthly_operating + settings.worker_monthly) * 12;
  return Math.round(annual_budget / 9 / 12);
}
