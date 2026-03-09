import {
  CONFIGURED_CATEGORIES,
  type BackpackMode,
  type CategoryCounts,
  type ConfiguredCategory,
  type Stratagem,
} from "@/app/types/stratagem";
import { shuffle } from "@/app/utils/array";

interface PickOptions {
  /** All stratagems available from the user's selected warbonds. */
  pool: Stratagem[];
  /** Per-category pin counts (null = unconstrained). */
  counts: CategoryCounts;
  /** Currently active backpack mode. */
  backpackMode: BackpackMode;
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
 * and the active backpack mode. Returns the final selection in order.
 */
export function pickStratagems({
  pool,
  counts,
  backpackMode,
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

  // Step 2 — apply backpack mode guarantees.
  if (backpackMode !== "no_preference" && picked.length < 4) {
    const hasStandaloneBackpack = picked.some((s) => s.category === "backpack");
    const hasBackpackSW = picked.some(
      (s) => s.subcategory === "backpack_weapon",
    );
    const hasRegularSW = picked.some(
      (s) =>
        s.category === "support_weapon" && s.subcategory !== "backpack_weapon",
    );

    if (backpackMode === "sw_and_backpack") {
      // Guarantee a regular (non-backpack) support weapon.
      if (!hasRegularSW && picked.length < 4) {
        const candidates = shuffle(
          levelledPool.filter(
            (s) =>
              !usedIds.has(s.id) &&
              s.category === "support_weapon" &&
              s.subcategory !== "backpack_weapon",
          ),
        );
        if (candidates.length > 0) {
          picked.push(candidates[0]);
          usedIds.add(candidates[0].id);
        }
      }
      // Guarantee a standalone backpack.
      if (!hasStandaloneBackpack && picked.length < 4) {
        const candidates = shuffle(
          levelledPool.filter(
            (s) => !usedIds.has(s.id) && s.category === "backpack",
          ),
        );
        if (candidates.length > 0) {
          picked.push(candidates[0]);
          usedIds.add(candidates[0].id);
        }
      }
    }

    if (backpackMode === "backpack_sw") {
      // Guarantee a backpack-type support weapon.
      if (!hasBackpackSW && picked.length < 4) {
        const candidates = shuffle(
          levelledPool.filter(
            (s) => !usedIds.has(s.id) && s.subcategory === "backpack_weapon",
          ),
        );
        if (candidates.length > 0) {
          picked.push(candidates[0]);
          usedIds.add(candidates[0].id);
        }
      }
    }

    if (backpackMode === "backpack_only") {
      // Guarantee a standalone backpack.
      if (!hasStandaloneBackpack && picked.length < 4) {
        const candidates = shuffle(
          levelledPool.filter(
            (s) => !usedIds.has(s.id) && s.category === "backpack",
          ),
        );
        if (candidates.length > 0) {
          picked.push(candidates[0]);
          usedIds.add(candidates[0].id);
        }
      }
    }
  }

  // Step 3 — fill remaining slots from the rest of the pool.
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

  // Track total backpack-slot usage for backpack mode constraints.
  let backpackSlotCount = picked.filter(usesBackpackSlot).length;

  const candidates = shuffle(levelledPool.filter((s) => !usedIds.has(s.id)));
  for (const s of candidates) {
    if (picked.length >= 4) break;

    // Respect pinned category maximums.
    if ((CONFIGURED_CATEGORIES as readonly string[]).includes(s.category)) {
      const pinnedMax = counts[s.category as ConfiguredCategory];
      if (pinnedMax !== null) {
        const current = pickedPerCategory.get(s.category) ?? 0;
        if (current >= pinnedMax) continue;
      }
    }

    // You only have one backpack slot — never allow more than 1 backpack-slot
    // item regardless of mode.
    if (usesBackpackSlot(s) && backpackSlotCount >= 1) continue;

    // "backpack_only" — also exclude backpack-type support weapons entirely.
    if (backpackMode === "backpack_only" && s.subcategory === "backpack_weapon")
      continue;

    // "sw_and_backpack" — exclude backpack-type support weapons (we wanted a
    // regular SW, not one that also takes the backpack slot).
    if (
      backpackMode === "sw_and_backpack" &&
      s.subcategory === "backpack_weapon"
    )
      continue;

    picked.push(s);
    usedIds.add(s.id);
    pickedPerCategory.set(
      s.category,
      (pickedPerCategory.get(s.category) ?? 0) + 1,
    );
    if (usesBackpackSlot(s)) backpackSlotCount++;
  }

  return picked;
}
