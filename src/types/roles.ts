/**
 * Role identifiers for the dashboard's view-layer personalization. Adding a
 * new role (e.g. a future "patient" or "commissioner" view) means adding one
 * entry here and one entry in `config/roleConfig.ts` — nothing else in this
 * file, and no component should ever switch on a role string directly.
 */
export const ROLE_IDS = ["general", "clinician", "evidenceReviewer", "hospitalTeam", "pharma"] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export const DEFAULT_ROLE: RoleId = "general";
