import { z } from "zod";

// ──────────────────────────────────────────
// Legacy constant — kept for backward compatibility only.
// All UI now reads the live members table; nothing should hard-code
// these names. If you find a new reference, replace it.
// ──────────────────────────────────────────
export const MEMBER_NAMES = [] as const;
export type MemberName = string;

export const CATEGORIES = ["Rent", "Setup", "Operating", "Worker", "Other"] as const;
export const PAYMENT_METHODS = ["Cash", "Bank transfer", "Card"] as const;
export const STATUSES = ["Paid", "Unpaid"] as const;

export const FREQUENCIES = ["one_time", "monthly", "quarterly", "annual"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export interface Member {
  id: string;
  name: string;
}

// v2 Settings — old rent/setup/etc. columns still exist in DB but are ignored.
// We only read/write plan_start_date and plan_duration_months from app code.
export interface Settings {
  id: number;
  plan_start_date: string | null;
  plan_duration_months: number | null;
  // Legacy fields kept here so TS doesn't break in old reads, but never used:
  annual_rent?: number;
  setup_cost?: number;
  monthly_operating?: number;
  monthly_worker?: number;
  worker_monthly?: number;
  first_rent_date?: string;
  second_rent_date?: string;
  plan_start?: string;
  plan_horizon_months?: number;
}

export interface CostLine {
  id: string;
  name_en: string;
  name_ar: string;
  amount: number;
  frequency: Frequency;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: string;
  date: string;
  paid_by: string;
  amount: number;
  category: string;
  payment_method: string;
  description: string;
  notes: string | null;
  receipt_url: string | null;
  receipt_filename: string | null;
  status: string;
  created_at: string;
}

// Validation schemas
export const insertExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  paid_by: z.string().min(1, "Select a member"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.enum(CATEGORIES),
  payment_method: z.enum(PAYMENT_METHODS),
  description: z.string().min(3, "Description must be at least 3 characters"),
  notes: z.string().optional().nullable(),
  status: z.enum(STATUSES).default("Paid"),
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// v2 settings schema — only plan fields
export const updateSettingsSchema = z.object({
  plan_start_date: z.string().optional().nullable(),
  plan_duration_months: z.coerce.number().int().positive().optional().nullable(),
});

export type UpdateSettings = z.infer<typeof updateSettingsSchema>;

export type SummaryMember = {
  name: string;
  paid: number;
  share: number;
  balance: number;
  status: "Credit" | "Owes group" | "Settled";
};

export type Summary = {
  members_count: number;
  total_expenses: number;
  total_paid: number;
  total_unpaid: number;
  per_member_share: number;
  per_member_monthly_target: number;
  members: SummaryMember[];
  annual_budget: number;
};

// Report keys (kept in sync with report_settings.enabled JSONB)
export const REPORT_KEYS = [
  "member_balance",
  "monthly_contributions",
  "expenses_by_category",
  "expenses_by_member",
  "pending_approvals",
  "annual_summary",
  "cost_lines_snapshot",
  "governance_history",
] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export interface ReportSettings {
  id: number;
  enabled: Record<ReportKey, boolean>;
  updated_at?: string | null;
}
