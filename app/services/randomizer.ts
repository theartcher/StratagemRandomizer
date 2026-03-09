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
 * Returns true when a stratagem occupies the backpack slot — either it IS a
 * standalone backpack, or it is a support weapon that ships with a backpack
 * (subcategory "backpack_weapon").
 */
const usesBackpackSlot = (s: Stratagem): boolean =>
  s.category === "backpack" || s.subcategory === "backpack_weapon";

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

  // Track total backpack-slot usage (standalone backpacks + backpack weapons)
  // for both the no_double_backpack and guarantee_backpack rules.
  let backpackSlotCount = picked.filter(usesBackpackSlot).length;

  // guarantee_backpack — if no backpack slot item has been pinned yet, reserve
  // one slot for a backpack or backpack-type support weapon before filling the
  // remaining slots at random.
  if (rules.has("guarantee_backpack") && picked.length < 4) {
    if (backpackSlotCount === 0) {
      const backpackCandidates = shuffle(
        levelledPool.filter((s) => !usedIds.has(s.id) && usesBackpackSlot(s)),
      );
      if (backpackCandidates.length > 0) {
        const bp = backpackCandidates[0];
        picked.push(bp);
        usedIds.add(bp.id);
        pickedPerCategory.set(
          bp.category,
          (pickedPerCategory.get(bp.category) ?? 0) + 1,
        );
        backpackSlotCount++;
      }
    }
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
    const rule = RULES.find(
      (r): r is Extract<(typeof RULES)[number], { max: number }> =>
        r.category === category && "max" in r,
    );
    if (rule && rules.has(rule.key)) return rule.max;
    return Infinity;
  };

  const candidates = shuffle(levelledPool.filter((s) => !usedIds.has(s.id)));
  for (const s of candidates) {
    if (picked.length >= 4) break;

    const max = getEffectiveMax(s.category);
    const current = pickedPerCategory.get(s.category) ?? 0;
    if (current >= max) continue;

    // no_double_backpack — prevent any second backpack-slot item regardless of
    // whether it is a standalone backpack or a backpack-type support weapon.
    if (
      rules.has("no_double_backpack") &&
      usesBackpackSlot(s) &&
      backpackSlotCount >= 1
    )
      continue;

    picked.push(s);
    usedIds.add(s.id);
    pickedPerCategory.set(s.category, current + 1);
    if (usesBackpackSlot(s)) backpackSlotCount++;
  }

  return picked;
}
