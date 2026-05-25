import { createContext, useContext, useMemo } from "react";
import { useAuth } from "./auth-context";

interface MemberContextValue {
  currentMember: string | null;
  setCurrentMember: (name: string | null) => void;
}

const MemberContext = createContext<MemberContextValue | null>(null);

function resolveMemberFromUser(user: ReturnType<typeof useAuth>["user"]): string | null {
  if (!user) return null;
  // 1. Prefer explicit user_metadata.member_name
  const metaName = (user.user_metadata as Record<string, unknown> | undefined)?.member_name;
  if (typeof metaName === "string" && metaName.trim()) {
    return metaName.trim();
  }
  // 2. Fallback: derive from synthetic email local-part (slug → Title case)
  const email = user.email ?? "";
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return null;
  // Bootstrap admin uses real email — keep as-is so checks against governance still work
  if (email === "raid.a.alghamdi@gmail.com") return "Raid";
  // Title-case the slug
  return local.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<MemberContextValue>(() => ({
    currentMember: resolveMemberFromUser(user),
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
