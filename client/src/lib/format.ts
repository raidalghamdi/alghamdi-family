import type { Lang } from "./i18n";

// ── Avatar helpers ──────────────────────────────────────────────
const AVATAR_PALETTE = [
  ["#C8E6C9", "#1B5E20"],
  ["#BBDEFB", "#0D47A1"],
  ["#F8BBD0", "#880E4F"],
  ["#FFF9C4", "#F57F17"],
  ["#D1C4E9", "#4527A0"],
  ["#B2EBF2", "#006064"],
  ["#FFE0B2", "#E65100"],
  ["#F0F4C3", "#827717"],
  ["#FFCCBC", "#BF360C"],
];

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function avatarStyle(name: string): { background: string; color: string } {
  const [bg, fg] = AVATAR_PALETTE[nameHash(name) % AVATAR_PALETTE.length];
  return { background: bg, color: fg };
}

export function formatSAR(
  value: number,
  options?: { decimals?: number; withSuffix?: boolean },
  lang: Lang = "en",
): string {
  const decimals = options?.decimals ?? 0;
  const withSuffix = options?.withSuffix !== false;

  // Always use Latin (Western) digits for numbers, even in Arabic UI
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });

  const num = formatter.format(value);
  const currency = lang === "ar" ? "ر.س" : "SAR";

  if (!withSuffix) return num;
  return `${num} ${currency}`;
}

export function formatDate(date: string | Date, lang: Lang = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // Use Latin digits in both languages; only translate month names in Arabic
  const locale = lang === "ar" ? "ar-SA-u-nu-latn" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
