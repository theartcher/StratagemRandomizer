import {
  CONFIGURED_CATEGORIES,
  RULES,
  type CategoryCounts,
  type ConfiguredCategory,
  type RuleKey,
  type Stratagem,
} from "@/app/types/stratagem";
import { shuffle } from "@/app/utils/array";

interface PickOptions {
  /** All stratagems available from the user's selected warbonds. */
  pool: Stratagem[];
  /** Per-category pin counts (null = unconstrained). */
  counts: CategoryCounts;
  /** Currently active rule keys. */
  rules: Set<RuleKey>;
  /** Player level — stratagems with a higher unlock_level are excluded. */
  playerLevel: number;
}

/**
 * Picks up to 4 stratagems from the pool, respecting pinned category counts
 * and active rules. Returns the final selection in order.
 */
export function pickStratagems({
  pool,
  counts,
  rules,
  playerLevel,
}: PickOptions): Stratagem[] {
  // Exclude stratagems the player hasn't unlocked yet.
  const levelledPool = pool.filter(
    (s) => s.unlock_level === null || s.unlock_level <= playerLevel,
  );

  const picked: Stratagem[] = [];
  const usedIds = new Set<string>();

  // Step 1 — honour pinned category counts first.
  for (const cat of CONFIGURED_CATEGORIES) {
    const count = counts[cat];
    if (count === null) continue;

    const catPool = shuffle(
      levelledPool.filter((s) => s.category === cat && !usedIds.has(s.id)),
    );
    for (const s of catPool.slice(0, count)) {
      picked.push(s);
      usedIds.add(s.id);
    }
  }

  // Step 2 — fill remaining slots from the rest of the pool.
  const remaining = 4 - picked.length;
  if (remaining <= 0) return picked;

  // Track how many of each category we've already picked.
  const pickedPerCategory = new Map<string, number>();
  for (const s of picked) {
    pickedPerCategory.set(
      s.category,
      (pickedPerCategory.get(s.category) ?? 0) + 1,
    );
  }

  /**
   * The maximum number of stratagems allowed for a given category,
   * taking into account pinned counts and active rules.
   */
  const getEffectiveMax = (category: string): number => {
    if ((CONFIGURED_CATEGORIES as readonly string[]).includes(category)) {
      const pinnedMax = counts[category as ConfiguredCategory];
      if (pinnedMax !== null) return pinnedMax;
    }
    const rule = RULES.find((r) => r.category === category);
    if (rule && rules.has(rule.key)) return rule.max;
    return Infinity;
  };

  const candidates = shuffle(levelledPool.filter((s) => !usedIds.has(s.id)));
  for (const s of candidates) {
    if (picked.length >= 4) break;

    const max = getEffectiveMax(s.category);
    const current = pickedPerCategory.get(s.category) ?? 0;
    if (current >= max) continue;

    picked.push(s);
    usedIds.add(s.id);
    pickedPerCategory.set(s.category, current + 1);
  }

  return picked;
}
