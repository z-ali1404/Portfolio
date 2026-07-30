import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_ROLE, ROLE_IDS, type RoleId } from "@/types/roles";
import { ROLE_CONFIG, type RoleConfig } from "@/config/roleConfig";

interface RoleContextValue {
  role: RoleId;
  config: RoleConfig;
  setRole: (role: RoleId) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const STORAGE_KEY = "ctd:role";
const QUERY_PARAM = "role";

/** Converts a RoleId (camelCase) to the URL/query-param form the spec asked for (kebab-case), e.g.
 *  "evidenceReviewer" <-> "evidence-reviewer". */
function toQueryValue(role: RoleId): string {
  return role.replace(/([A-Z])/g, "-$1").toLowerCase();
}

function fromQueryValue(value: string): RoleId | undefined {
  const camel = value.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return (ROLE_IDS as readonly string[]).includes(camel) ? (camel as RoleId) : undefined;
}

function getInitialRole(): RoleId {
  if (typeof window === "undefined") return DEFAULT_ROLE;

  const fromUrl = new URLSearchParams(window.location.search).get(QUERY_PARAM);
  if (fromUrl) {
    const parsed = fromQueryValue(fromUrl);
    if (parsed) return parsed;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (ROLE_IDS as readonly string[]).includes(stored)) return stored as RoleId;

  return DEFAULT_ROLE;
}

/**
 * Role state, following the same provider/hook pattern as `ThemeContext` for
 * consistency with the rest of the app. The selected role is persisted to a
 * `?role=` query param (e.g. `?role=evidence-reviewer`) via
 * `history.replaceState` — no page reload, no router dependency — and
 * mirrored to localStorage so it survives a visit without the param (e.g.
 * a bookmarked bare URL). Switching role only ever changes which config
 * object downstream components read; it never touches search results or
 * search state.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<RoleId>(getInitialRole);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, role);

    const url = new URL(window.location.href);
    if (role === DEFAULT_ROLE) {
      url.searchParams.delete(QUERY_PARAM);
    } else {
      url.searchParams.set(QUERY_PARAM, toQueryValue(role));
    }
    window.history.replaceState(null, "", url.toString());
  }, [role]);

  const value = useMemo<RoleContextValue>(
    () => ({ role, config: ROLE_CONFIG[role], setRole: setRoleState }),
    [role]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within a RoleProvider");
  return ctx;
}
