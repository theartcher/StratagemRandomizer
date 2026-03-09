// ── Stratagem shape ───────────────────────────────────────────────────────────

export interface Stratagem {
  id: string;
  name: string;
  code: string[];
  category: string;
  /** Further classification within a category (e.g. "backpack_weapon" for support weapons that occupy the backpack slot). */
  subcategory: string | null;
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
    label: "Limit to one backpack slot",
    description:
      "Your loadout will contain at most one backpack slot item — either a standalone backpack (e.g. Guard Dog) or a support weapon that requires a backpack, not both.",
    category: "backpack",
    max: 1,
  },
  {
    key: "guarantee_backpack",
    label: "Guarantee a backpack",
    description:
      "Your loadout will always include a backpack slot item — either a standalone backpack or a support weapon that requires one.",
    category: "backpack",
    min: 1,
  },
] as const;

export type RuleKey = (typeof RULES)[number]["key"];

/** Rules that cannot be active at the same time. */
export const RULE_CONFLICTS: Partial<Record<RuleKey, RuleKey>> = {
  no_double_backpack: "guarantee_backpack",
  guarantee_backpack: "no_double_backpack",
};
