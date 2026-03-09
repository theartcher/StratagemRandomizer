import { useEffect, useState } from "react";

import type { BackpackMode, CategoryCounts } from "@/app/types/stratagem";
import { DEFAULT_COUNTS } from "@/app/constants/categories";
import { DEFAULT_BACKPACK_MODE } from "@/app/constants/rules";
import {
  ALL_KEYS,
  DEFAULT_PLAYER_LEVEL,
  STORAGE_KEY_BACKPACK,
  STORAGE_KEY_COUNTS,
  STORAGE_KEY_LEVEL,
  STORAGE_KEY_WARBONDS,
} from "@/app/constants/storage";
import { loadFromStorage } from "@/app/utils/storage";

/**
 * Manages warbond selection, category counts, and active backpack mode.
 * Hydrates all three from localStorage on mount and persists changes back.
 *
 * Returns null for each value while the initial hydration is pending, which
 * prevents an SSR/client mismatch on the first render.
 */
export function useStratagemSettings() {
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [counts, setCounts] = useState<CategoryCounts | null>(null);
  /**
   * undefined = not yet hydrated from localStorage.
   * string    = hydrated, a specific BackpackMode is active.
   */
  const [backpackMode, setBackpackMode] = useState<BackpackMode | undefined>(
    undefined,
  );
  // null = not yet hydrated; number once loaded
  const [level, setLevel] = useState<number | null>(null);
  // Track which keys were already saved in localStorage at hydration time
  // null = not yet hydrated
  const [savedKeys, setSavedKeys] = useState<Set<string> | null>(null);

  // ── Hydrate from localStorage after first client render ──────────────────
  useEffect(() => {
    const keys = new Set<string>();
    if (localStorage.getItem(STORAGE_KEY_WARBONDS) !== null)
      keys.add(STORAGE_KEY_WARBONDS);
    if (localStorage.getItem(STORAGE_KEY_LEVEL) !== null)
      keys.add(STORAGE_KEY_LEVEL);
    setSavedKeys(keys);

    setSelected(
      new Set(loadFromStorage<string[]>(STORAGE_KEY_WARBONDS, ALL_KEYS)),
    );
    setCounts(
      loadFromStorage<CategoryCounts>(STORAGE_KEY_COUNTS, DEFAULT_COUNTS),
    );
    setBackpackMode(
      loadFromStorage<BackpackMode>(
        STORAGE_KEY_BACKPACK,
        DEFAULT_BACKPACK_MODE,
      ),
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
    if (backpackMode === undefined) return;
    localStorage.setItem(STORAGE_KEY_BACKPACK, JSON.stringify(backpackMode));
  }, [backpackMode]);

  useEffect(() => {
    if (level === null) return;
    localStorage.setItem(STORAGE_KEY_LEVEL, JSON.stringify(level));
  }, [level]);

  return {
    selected,
    setSelected,
    counts,
    setCounts,
    backpackMode,
    setBackpackMode,
    level,
    setLevel,
    savedKeys,
  };
}
