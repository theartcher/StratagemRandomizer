import { useEffect, useState } from "react";

import type { CategoryCounts, RuleKey } from "@/app/types/stratagem";
import { DEFAULT_COUNTS } from "@/app/constants/categories";
import { DEFAULT_RULES } from "@/app/constants/rules";
import {
  ALL_KEYS,
  DEFAULT_PLAYER_LEVEL,
  STORAGE_KEY_COUNTS,
  STORAGE_KEY_LEVEL,
  STORAGE_KEY_RULES,
  STORAGE_KEY_WARBONDS,
} from "@/app/constants/storage";
import { loadFromStorage } from "@/app/utils/storage";

/**
 * Manages warbond selection, category counts, and active rules.
 * Hydrates all three from localStorage on mount and persists changes back.
 *
 * Returns null for each value while the initial hydration is pending, which
 * prevents an SSR/client mismatch on the first render.
 */
export function useStratagemSettings() {
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [counts, setCounts] = useState<CategoryCounts | null>(null);
  const [rules, setRules] = useState<Set<RuleKey> | null>(null);
  // null = not yet hydrated; number once loaded
  const [level, setLevel] = useState<number | null>(null);

  // ── Hydrate from localStorage after first client render ──────────────────
  useEffect(() => {
    setSelected(
      new Set(loadFromStorage<string[]>(STORAGE_KEY_WARBONDS, ALL_KEYS)),
    );
    setCounts(
      loadFromStorage<CategoryCounts>(STORAGE_KEY_COUNTS, DEFAULT_COUNTS),
    );
    setRules(
      new Set(loadFromStorage<RuleKey[]>(STORAGE_KEY_RULES, DEFAULT_RULES)),
    );
    setLevel(loadFromStorage<number>(STORAGE_KEY_LEVEL, DEFAULT_PLAYER_LEVEL));
  }, []);

  // ── Persist on every change ───────────────────────────────────────────────
  useEffect(() => {
    if (selected === null) return;
    localStorage.setItem(STORAGE_KEY_WARBONDS, JSON.stringify([...selected]));
  }, [selected]);

  useEffect(() => {
    if (counts === null) return;
    localStorage.setItem(STORAGE_KEY_COUNTS, JSON.stringify(counts));
  }, [counts]);

  useEffect(() => {
    if (rules === null) return;
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify([...rules]));
  }, [rules]);

  useEffect(() => {
    if (level === null) return;
    localStorage.setItem(STORAGE_KEY_LEVEL, JSON.stringify(level));
  }, [level]);

  return {
    selected,
    setSelected,
    counts,
    setCounts,
    rules,
    setRules,
    level,
    setLevel,
  };
}
