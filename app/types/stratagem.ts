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

// ── Backpack Mode ─────────────────────────────────────────────────────────────

export const BACKPACK_MODES = [
  {
    key: "no_preference",
    label: "No preference",
    description: "Anything goes.",
  },
  {
    key: "sw_and_backpack",
    label: "Support weapon + backpack",
    description: "One regular support weapon and one backpack.",
  },
  {
    key: "backpack_sw",
    label: "Backpack support weapon",
    description: "A support weapon that takes the backpack slot.",
  },
  {
    key: "backpack_only",
    label: "Backpack only",
    description: "A standalone backpack, no backpack support weapons.",
  },
] as const;

export type BackpackMode = (typeof BACKPACK_MODES)[number]["key"];

/**
 * Minimum number of support-weapon slots required by each backpack mode.
 * Used to auto-enforce the pin count and disable lower options in the UI.
 */
export const MIN_SUPPORT_WEAPONS: Record<BackpackMode, number> = {
  no_preference: 0,
  sw_and_backpack: 2,
  backpack_sw: 1,
  backpack_only: 1,
};
