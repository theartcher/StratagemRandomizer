import type { CategoryCounts, ConfiguredCategory } from "@/app/types/stratagem";

// Human-readable labels shown in the UI for each stratagem category.
export const CATEGORY_LABELS: Record<ConfiguredCategory, string> = {
  orbital: "Orbitals",
  eagle: "Eagles",
  sentry: "Sentries",
  vehicle: "Vehicles",
  emplacement: "Mines & Emplacements",
  support_weapon: "Support Weapons",
};

// Ant Design tag colours mapped to each stratagem category.
export const CATEGORY_COLOR: Record<string, string> = {
  support_weapon: "blue",
  backpack: "green",
  eagle: "gold",
  orbital: "purple",
  sentry: "cyan",
  emplacement: "orange",
  vehicle: "volcano",
};

// Default state: every category is unconstrained (user can pin counts later).
export const DEFAULT_COUNTS: CategoryCounts = {
  orbital: null,
  eagle: null,
  sentry: null,
  vehicle: null,
  emplacement: null,
  support_weapon: null,
};
