import warbondsData from "@/data/warbonds.json";

// Sentinel key used to represent base-game stratagems (those with warbond: null).
export const BASE_GAME_KEY = "__base_game__";

// localStorage keys for persisting user preferences.
export const STORAGE_KEY_WARBONDS = "stratagem-randomizer-warbonds";
export const STORAGE_KEY_COUNTS = "stratagem-randomizer-counts";
export const STORAGE_KEY_RULES = "stratagem-randomizer-rules";
export const STORAGE_KEY_LEVEL = "stratagem-randomizer-level";

// The highest unlock_level value in the dataset — treated as "no level gate".
export const MAX_PLAYER_LEVEL = 25;

// Default: max level so all stratagems are included out of the box.
export const DEFAULT_PLAYER_LEVEL = MAX_PLAYER_LEVEL;

// Full list of selectable keys: base game + every warbond id.
export const ALL_KEYS = [
  BASE_GAME_KEY,
  ...warbondsData.warbonds.map((w) => w.id),
];
