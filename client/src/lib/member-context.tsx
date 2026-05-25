import { createContext, useContext, useMemo } from "react";
import { MEMBER_NAMES, type MemberName } from "@shared/schema";
import { useAuth } from "./auth-context";

interface MemberContextValue {
  currentMember: MemberName | null;
  setCurrentMember: (name: MemberName | null) => void;
}

const MemberContext = createContext<MemberContextValue | null>(null);

function resolveMemberFromUser(user: ReturnType<typeof useAuth>["user"]): MemberName | null {
  if (!user) return null;
  // 1. Prefer explicit user_metadata.member_name
  const metaName = (user.user_metadata as Record<string, unknown> | undefined)?.member_name;
  if (typeof metaName === "string" && MEMBER_NAMES.includes(metaName as MemberName)) {
    return metaName as MemberName;
  }
  // 2. Fall back to matching the email local-part against known members (case-insensitive)
  const email = user.email ?? "";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (!local) return null;
  for (const m of MEMBER_NAMES) {
    const lower = m.toLowerCase();
    if (local === lower || local.startsWith(lower + ".") || local.startsWith(lower + "_") || local.includes("." + lower) || local.includes("_" + lower)) {
      return m;
    }
  }
  return null;
}

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<MemberContextValue>(() => ({
    currentMember: resolveMemberFromUser(user),
    // setter is a no-op now — kept for API compatibility with existing callers
    setCurrentMember: () => {},
  }), [user]);

  return (
    <MemberContext.Provider value={value}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember must be used within MemberProvider");
  return ctx;
}
