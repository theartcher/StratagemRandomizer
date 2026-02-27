// ── Stratagem shape ───────────────────────────────────────────────────────────

export interface Stratagem {
  id: string;
  name: string;
  code: string[];
  category: string;
  warbond: string | null;
  /** Minimum player level required to use this stratagem. null = no restriction. */
  unlock_level: number | null;
}

// ── Category types ────────────────────────────────────────────────────────────

export const CONFIGURED_CATEGORIES = [
  "orbital",
  "eagle",
  "sentry",
  "vehicle",
  "emplacement",
  "support_weapon",
] as const;

export type ConfiguredCategory = (typeof CONFIGURED_CATEGORIES)[number];

/** null = unconstrained (pick freely); number = exact count required */
export type CategoryCounts = Record<ConfiguredCategory, number | null>;

// ── Rules ─────────────────────────────────────────────────────────────────────

export const RULES = [
  {
    key: "no_double_backpack",
    label: "Singular backpack",
    description: "You've only got one back to carry with.",
    category: "backpack",
    max: 1,
  },
] as const;

export type RuleKey = (typeof RULES)[number]["key"];
