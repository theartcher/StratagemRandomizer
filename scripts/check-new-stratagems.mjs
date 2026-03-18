#!/usr/bin/env node
/**
 * check-new-stratagems.mjs
 *
 * All-in-one script that:
 *   1. Scrapes https://helldivers.wiki.gg/wiki/Stratagems for the "Current Stratagems"
 *      section and compares them against data/stratagems.json.
 *   2. If new stratagems are found, downloads icons from the upstream icon repo
 *      (nvigneux/Helldivers-2-Stratagems-icons-svg) and copies them to public/icons/.
 *   3. Merges new stratagem entries into data/stratagems.json (and data/warbonds.json
 *      if new warbonds are detected).
 *   4. Outputs a JSON file (new-stratagems.json) summarising what was added.
 *
 * Exit codes:
 *   0 — completed successfully (whether or not new stratagems were found)
 *   1 — error during execution
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  statSync,
  rmSync,
  existsSync,
} from "fs";
import { join, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// ── Wiki section → internal category mapping ─────────────────────────────────
const SECTION_CATEGORY_MAP = {
  "Support Weapons": "support_weapon",
  "Orbital Strikes": "orbital",
  "Eagle Strikes": "eagle",
  Emplacements: "emplacement",
  Sentries: "sentry",
  Backpacks: "backpack",
  Vehicles: "vehicle",
};

// ── Direction arrow mapping ──────────────────────────────────────────────────
const ARROW_MAP = {
  "Arrow Up": "up",
  "Arrow Down": "down",
  "Arrow Left": "left",
  "Arrow Right": "right",
};

/**
 * Fetch the Stratagems wiki page HTML.
 */
async function fetchWikiPage() {
  const url = "https://helldivers.wiki.gg/wiki/Stratagems";
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching wiki`);
  return res.text();
}

/**
 * Parse stratagem names from the wiki HTML.
 * We look for the "Current Stratagems" section and extract each table row's
 * stratagem name (second column after the icon).
 *
 * Returns an array of { name, category, code, source } objects.
 */
function parseCurrentStratagems(html) {
  const stratagems = [];

  // Find the Current Stratagems section
  const currentIdx = html.indexOf('id="Current_Stratagems"');
  if (currentIdx === -1) {
    // Try alternate heading format
    const altIdx = html.indexOf("Current Stratagems");
    if (altIdx === -1)
      throw new Error("Could not find Current Stratagems section");
  }

  // Find the Mission Stratagems section (end boundary)
  const missionIdx = html.indexOf('id="Mission_Stratagems"');
  const endIdx = missionIdx !== -1 ? missionIdx : html.length;

  // Extract the relevant HTML chunk
  const chunk = html.substring(html.indexOf('id="Current_Stratagems"'), endIdx);

  // We'll parse section by section looking for h3 headings and table rows
  let currentSection = null;

  // Split by h3 headings to identify sections
  // Wiki uses <span class="mw-headline" id="Support_Weapons">Support Weapons</span>
  const headlineRegex =
    /<span class="mw-headline" id="([^"]+)">([^<]+)<\/span>/g;
  const headlines = [];
  let m;
  while ((m = headlineRegex.exec(chunk)) !== null) {
    headlines.push({
      id: m[1],
      name: m[2].trim(),
      index: m.index,
    });
  }

  // For each section, extract table rows
  for (let i = 0; i < headlines.length; i++) {
    const section = headlines[i];
    const sectionEnd =
      i + 1 < headlines.length ? headlines[i + 1].index : chunk.length;
    const sectionHtml = chunk.substring(section.index, sectionEnd);
    const category = SECTION_CATEGORY_MAP[section.name];

    if (!category) continue; // skip unknown sections

    // Match table rows. Each stratagem row has:
    // <td>...<a ...title="StratagemName">StratagemName</a>...</td>
    // We look for rows with stratagem data
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
    let row;
    while ((row = rowRegex.exec(sectionHtml)) !== null) {
      const rowHtml = row[1];

      // Extract all <td> cells
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const cells = [];
      let cell;
      while ((cell = cellRegex.exec(rowHtml)) !== null) {
        cells.push(cell[1].trim());
      }

      if (cells.length < 2) continue;

      // The name cell is typically the second cell (index 1)
      // Extract the stratagem name from <a> tag or plain text
      const nameCell = cells[1];
      const nameMatch = nameCell.match(/title="([^"]+)"[^>]*>([^<]+)<\/a>/);

      let name;
      if (nameMatch) {
        // Use the link text (display name), not the title attribute
        name = nameMatch[2].trim();
      } else {
        // Fallback: strip HTML tags
        name = nameCell.replace(/<[^>]+>/g, "").trim();
      }

      if (!name || name.length < 2) continue;

      // Skip rows that look like headers or empty
      if (name === "Name" || name === "Stratagem") continue;

      // Skip translated/localized entries (e.g. "/zh" suffix)
      if (name.includes("/zh") || name.includes("/ja") || name.includes("/ko"))
        continue;

      // Parse the code (arrow directions) from the third cell if available
      let code = [];
      if (cells.length > 2) {
        const codeCell = cells[2];
        for (const [arrowText, dir] of Object.entries(ARROW_MAP)) {
          // Count occurrences in order
          const arrowRegex = new RegExp(arrowText.replace(" ", "[_ ]"), "gi");
          let arrowMatch;
          while ((arrowMatch = arrowRegex.exec(codeCell)) !== null) {
            code.push({ index: arrowMatch.index, dir });
          }
        }
        // Sort by position in the string to get correct order
        code.sort((a, b) => a.index - b.index);
        code = code.map((c) => c.dir);
      }

      // Parse source/unlock info from remaining cells
      let source = null;
      if (cells.length > 5) {
        source = cells[5].replace(/<[^>]+>/g, "").trim();
      }

      stratagems.push({ name, category, code, source });
    }
  }

  return stratagems;
}

/**
 * Load the local stratagems.json and return an array of name strings.
 */
function loadLocalStratagems() {
  const path = join(projectRoot, "data", "stratagems.json");
  const data = JSON.parse(readFileSync(path, "utf-8"));
  return data.stratagems;
}

/**
 * Normalise a stratagem name for comparison (lowercase, strip special chars).
 */
function normaliseName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Convert a stratagem name to a kebab-case ID.
 */
function nameToId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Parse warbond info from source string like "Siege Breakers P2" or "Patriotic Administration Center".
 */
function parseSource(source) {
  if (!source) return { warbond: null, warbond_page: null, ship_module: null };

  const shipModules = [
    "Patriotic Administration Center",
    "Engineering Bay",
    "Robotics Workshop",
    "Orbital Cannons",
    "Hangar",
    "Bridge",
  ];

  for (const mod of shipModules) {
    if (source.includes(mod)) {
      return { warbond: null, warbond_page: null, ship_module: mod };
    }
  }

  // Check for warbond with page number (e.g. "Siege Breakers P2")
  const warbondPageMatch = source.match(/^(.+?)\s+P(\d+)$/);
  if (warbondPageMatch) {
    return {
      warbond: warbondPageMatch[1].trim(),
      warbond_page: parseInt(warbondPageMatch[2]),
      ship_module: null,
    };
  }

  // Plain warbond name
  return { warbond: source, warbond_page: null, ship_module: null };
}

/**
 * Parse cost info from the cost cell text.
 */
function parseCost(cells) {
  if (!cells || cells.length < 4) return { cost_type: null, cost_amount: null };
  const costCell = cells[3].replace(/<[^>]+>/g, "").trim();

  if (costCell.includes("Free"))
    return { cost_type: "requisition_slips", cost_amount: 0 };

  const reqMatch = costCell.match(/([\d,]+)\s*Requisition/i);
  if (reqMatch)
    return {
      cost_type: "requisition_slips",
      cost_amount: parseInt(reqMatch[1].replace(/,/g, "")),
    };

  const medalMatch = costCell.match(/([\d,]+)\s*Medal/i);
  if (medalMatch)
    return {
      cost_type: "medals",
      cost_amount: parseInt(medalMatch[1].replace(/,/g, "")),
    };

  return { cost_type: null, cost_amount: null };
}

/**
 * Parse unlock level from the level cell.
 */
function parseLevel(cells) {
  if (!cells || cells.length < 5) return null;
  const levelCell = cells[4].replace(/<[^>]+>/g, "").trim();
  if (levelCell === "N/A" || levelCell === "" || levelCell === "-") return null;
  const num = parseInt(levelCell);
  return isNaN(num) ? null : num;
}

// ── Icon repo filename → stratagem ID(s) mapping ────────────────────────────
// Key   : relative path inside the upstream zip  (folder/filename.svg)
// Value : one or more stratagem IDs from stratagems.json
const ICON_MAP = {
  "Borderline Justice/Hover Pack.svg": ["lift-860-hover-pack"],
  "Bridge/Grenadier Battlement.svg": ["egl-21-grenadier-battlement"],
  "Bridge/HMG Emplacement.svg": ["emg-101-hmg-emplacement"],
  "Bridge/Orbital EMS Strike.svg": ["orbital-ems-strike"],
  "Bridge/Orbital Gas Strike.svg": ["orbital-gas-strike"],
  "Bridge/Orbital Precision Strike.svg": ["orbital-precision-strike"],
  "Bridge/Orbital Smoke Strike.svg": ["orbital-smoke-strike"],
  "Bridge/Shield Generator Relay.svg": ["fx-12-shield-generator-relay"],
  "Bridge/Tesla Tower.svg": ["arc-3-tesla-tower"],
  "Chemical Agents/Guard Dog Breath.svg": ["axtx-13-dog-breath"],
  "Chemical Agents/Sterilizer.svg": ["tx-41-sterilizer"],
  "Control Group/Epoch.svg": ["plas-45-epoch"],
  "Control Group/Laser Sentry.svg": ["alas-98-laser-sentry"],
  "Control Group/Warp Pack.svg": ["lift-182-warp-pack"],
  "Dust Devils/Expendable Napalm.svg": ["eat-700-expendable-napalm"],
  "Dust Devils/Solo Silo.svg": ["ms-11-solo-silo"],
  "Dust Devils/Speargun.svg": ["s-11-speargun"],
  "Engineering Bay/Anti-Personnel Minefield.svg": [
    "md-6-anti-personnel-minefield",
  ],
  "Engineering Bay/Anti-Tank Mines.svg": ["md-17-anti-tank-mines"],
  "Engineering Bay/Arc Thrower.svg": ["arc-3-arc-thrower"],
  "Engineering Bay/Ballistic Shield Backpack.svg": [
    "sh-20-ballistic-shield-backpack",
  ],
  "Engineering Bay/Gas Mine.svg": ["md-8-gas-mines"],
  "Engineering Bay/Grenade Launcher.svg": ["gl-21-grenade-launcher"],
  "Engineering Bay/Guard Dog Rover.svg": ["axlas-5-rover"],
  "Engineering Bay/Incendiary Mines.svg": ["md-i4-incendiary-mines"],
  "Engineering Bay/Laser Cannon.svg": ["las-98-laser-cannon"],
  "Engineering Bay/Quasar Cannon.svg": ["las-99-quasar-cannon"],
  "Engineering Bay/Shield Generator Pack.svg": ["sh-32-shield-generator-pack"],
  "Engineering Bay/Supply Pack.svg": ["b-1-supply-pack"],
  "Force of Law/GL-52 De-Escalator.svg": ["gl-52-de-escalator"],
  "Force of Law/Guard Dog K-9.svg": ["axarc-3-k-9"],
  "General Stratagems/Reinforce.svg": ["reinforce"],
  "General Stratagems/Resupply.svg": ["resupply"],
  "General Stratagems/SOS Beacon.svg": ["sos-beacon"],
  "Hangar/Eagle 110MM Rocket Pods.svg": ["eagle-110mm-rocket-pods"],
  "Hangar/Eagle 500KG Bomb.svg": ["eagle-500kg-bomb"],
  "Hangar/Eagle Airstrike.svg": ["eagle-airstrike"],
  "Hangar/Eagle Cluster Bomb.svg": ["eagle-cluster-bomb"],
  "Hangar/Eagle Napalm Airstrike.svg": ["eagle-napalm-airstrike"],
  "Hangar/Eagle Smoke Strike.svg": ["eagle-smoke-strike"],
  "Hangar/Eagle Strafing Run.svg": ["eagle-strafing-run"],
  "Hangar/Fast Recon Vehicle.svg": ["m-102-fast-recon-vehicle"],
  "Hangar/Jump Pack.svg": ["lift-850-jump-pack"],
  "Masters of Ceremony/One True Flag.svg": ["cqc-1-one-true-flag"],
  "Orbital Cannons/Orbital 120MM HE Barrage.svg": ["orbital-120mm-he-barrage"],
  "Orbital Cannons/Orbital 380MM HE Barrage.svg": ["orbital-380mm-he-barrage"],
  "Orbital Cannons/Orbital Airburst Strike.svg": ["orbital-airburst-strike"],
  "Orbital Cannons/Orbital Gatling Barrage.svg": ["orbital-gatling-barrage"],
  "Orbital Cannons/Orbital Laser.svg": ["orbital-laser"],
  "Orbital Cannons/Orbital Napalm Barrage.svg": ["orbital-napalm-barrage"],
  "Orbital Cannons/Orbital Railcannon Strike.svg": [
    "orbital-railcannon-strike",
  ],
  "Orbital Cannons/Orbital Walking Barrage.svg": ["orbital-walking-barrage"],
  "Patriotic Administration Center/Airburst Rocket Launcher.svg": [
    "rl-77-airburst-rocket-launcher",
  ],
  "Patriotic Administration Center/Anti-Materiel Rifle.svg": [
    "apw-1-anti-materiel-rifle",
  ],
  "Patriotic Administration Center/Autocannon.svg": ["ac-8-autocannon"],
  "Patriotic Administration Center/Commando.svg": ["mls-4x-commando"],
  "Patriotic Administration Center/Expendable Anti-Tank.svg": [
    "eat-17-expendable-anti-tank",
    "eat-411-leveller",
  ],
  "Patriotic Administration Center/Flamethrower.svg": ["flam-40-flamethrower"],
  "Patriotic Administration Center/Heavy Machine Gun.svg": [
    "mg-206-heavy-machine-gun",
  ],
  "Patriotic Administration Center/Machine Gun.svg": ["mg-43-machine-gun"],
  "Patriotic Administration Center/Railgun.svg": ["rs-422-railgun"],
  "Patriotic Administration Center/Recoilless Rifle.svg": [
    "gr-8-recoilless-rifle",
  ],
  "Patriotic Administration Center/Spear.svg": ["faf-14-spear"],
  "Patriotic Administration Center/StA-X3 W.A.S.P. Launcher.svg": [
    "sta-x3-wasp-launcher",
  ],
  "Patriotic Administration Center/Stalwart.svg": ["m-105-stalwart"],
  "Python Commandos/Defoliation Tool.svg": ["cqc-9-defoliation-tool"],
  "Python Commandos/Guard Dog Hot Dog.svg": ["axflam-75-hot-dog"],
  "Python Commandos/Maxigun.svg": ["m-1000-maxigun"],
  "Redacted Regiment/C4 Pack.svg": ["bmd-c4-pack"],
  "Robotics Workshop/Autocannon Sentry.svg": ["aac-8-autocannon-sentry"],
  "Robotics Workshop/Emancipator Exosuit.svg": ["exo-49-emancipator-exosuit"],
  "Robotics Workshop/EMS Mortar Sentry.svg": ["am-23-ems-mortar-sentry"],
  "Robotics Workshop/Gatling Sentry.svg": ["ag-16-gatling-sentry"],
  "Robotics Workshop/Guard Dog.svg": ["axar-23-guard-dog"],
  "Robotics Workshop/Machine Gun Sentry.svg": ["amg-43-machine-gun-sentry"],
  "Robotics Workshop/Mortar Sentry.svg": ["am-12-mortar-sentry"],
  "Robotics Workshop/Patriot Exosuit.svg": ["exo-45-patriot-exosuit"],
  "Robotics Workshop/Rocket Sentry.svg": ["amls-4x-rocket-sentry"],
  "Servants of Freedom/Hellbomb Portable.svg": ["b-100-portable-hellbomb"],
  "Siege Breakers/Bastion MK XVI.svg": ["td-220-bastion-mk-xvi"],
  "Siege Breakers/CQC-20.svg": ["cqc-20-breaching-hammer"],
  "Siege Breakers/EAT-411.svg": ["eat-411-leveller"],
  "Siege Breakers/GL-28.svg": ["gl-28-belt-fed-grenade-launcher"],
  "Urban Legends/Anti-Tank Emplacement.svg": ["eat-12-anti-tank-emplacement"],
  "Urban Legends/Directional Shield.svg": ["sh-51-directional-shield"],
  "Urban Legends/Flame Sentry.svg": ["aflam-40-flame-sentry"],
};

// ── Icon utilities ───────────────────────────────────────────────────────────

const ICON_REPO_README_URL =
  "https://raw.githubusercontent.com/nvigneux/Helldivers-2-Stratagems-icons-svg/master/README.md";
const ICON_REPO_ZIP_URL =
  "https://github.com/nvigneux/Helldivers-2-Stratagems-icons-svg/archive/refs/heads/master.zip";
const ICON_OUT_DIR = join(projectRoot, "public", "icons");

// Sections in the README to ignore when parsing icon entries
const IGNORED_README_SECTIONS = new Set([
  "General Stratagems",
  "Experimental Stratagems",
]);

/**
 * Fetch the upstream icon repo README and extract the set of icon entries
 * listed in the "Icons Catalog". Each entry is returned as "Section/Name.svg".
 *
 * @returns {Promise<Set<string>>} set of relative paths (e.g. "Bridge/Tesla Tower.svg")
 */
async function fetchReadmeIconList() {
  console.log("[icons 0/4] Fetching icon repo README...");
  const res = await fetch(ICON_REPO_README_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching icon repo README`);
  const md = await res.text();

  const icons = new Set();
  let currentSection = null;

  for (const line of md.split("\n")) {
    // Detect section headers like "## Patriotic Administration Center"
    const headerMatch = line.match(/^##\s+(.+)$/);
    if (headerMatch) {
      currentSection = headerMatch[1].trim();
      continue;
    }

    // Skip ignored sections
    if (!currentSection || IGNORED_README_SECTIONS.has(currentSection))
      continue;

    // Table rows with icon names use HTML: <td>Machine Gun</td>
    // The last <td> in a row is typically the name column.
    const tdMatches = [...line.matchAll(/<td>([^<]+)<\/td>/g)];
    if (tdMatches.length > 0) {
      const name = tdMatches[tdMatches.length - 1][1].trim();
      if (name && name !== "Icon" && name !== "Name") {
        // Clean up display quotes (e.g. "Guard Dog" → Guard Dog)
        const cleanName = name.replace(/[\u201C\u201D""]/g, "").trim();
        icons.add(`${currentSection}/${cleanName}.svg`);
      }
    }
  }

  console.log(`      Found ${icons.size} icon(s) listed in README`);
  return icons;
}

/**
 * Compare the README icon list against our ICON_MAP to determine if the
 * upstream repo has new icons that can be matched to our stratagems.
 *
 * @param {Set<string>} readmeIcons - icons parsed from the README
 * @param {string[]} stratagemIds - all local stratagem IDs
 * @returns {{ newIcons: string[], matchableIcons: string[], unmatchableIcons: string[], missingLocal: string[], changed: boolean }}
 */
function checkForNewIcons(readmeIcons, stratagemIds) {
  const mappedKeys = new Set(Object.keys(ICON_MAP));
  const newIcons = [...readmeIcons].filter((icon) => !mappedKeys.has(icon));

  // Pre-match new icons against local stratagem IDs using the same auto-match logic
  const matchableIcons = [];
  const unmatchableIcons = [];
  for (const icon of newIcons) {
    const iconBaseName = basename(icon, extname(icon));
    const candidate = toKebabCase(iconBaseName);
    const matched = stratagemIds.some(
      (id) =>
        id === candidate || id.includes(candidate) || candidate.includes(id),
    );
    if (matched) {
      matchableIcons.push(icon);
    } else {
      unmatchableIcons.push(icon);
    }
  }

  // Check if any local stratagems are missing icons on disk
  const missingLocal = stratagemIds.filter(
    (id) => !existsSync(join(ICON_OUT_DIR, `${id}.svg`)),
  );

  const changed = matchableIcons.length > 0 || missingLocal.length > 0;
  return { newIcons, matchableIcons, unmatchableIcons, missingLocal, changed };
}

/**
 * Recursively list all files under a directory, returning paths relative to root.
 */
function listFilesRecursive(dir, root = dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...listFilesRecursive(full, root));
    } else {
      results.push(full.substring(root.length + 1).replace(/\\/g, "/"));
    }
  }
  return results;
}

/**
 * Convert a string to kebab-case for ID matching.
 */
function toKebabCase(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Return stratagem IDs that actually need an icon refresh:
 * - icon file missing
 * - icon file is still the placeholder icon
 */
function getIdsNeedingIconRefresh(stratagemIds) {
  const needsRefresh = new Set();
  const placeholderPath = join(ICON_OUT_DIR, "placeholder.svg");
  const placeholderBuf = existsSync(placeholderPath)
    ? readFileSync(placeholderPath)
    : null;

  for (const id of stratagemIds) {
    const iconPath = join(ICON_OUT_DIR, `${id}.svg`);
    if (!existsSync(iconPath)) {
      needsRefresh.add(id);
      continue;
    }

    if (placeholderBuf) {
      const iconBuf = readFileSync(iconPath);
      if (iconBuf.equals(placeholderBuf)) {
        needsRefresh.add(id);
      }
    }
  }

  return needsRefresh;
}

/**
 * Download the upstream icon repo zip, extract it, copy mapped icons to
 * public/icons/<id>.svg, and auto-match any unmapped SVGs by name.
 *
 * First checks the repo README to see if any new icons exist before
 * downloading the full ZIP.
 *
 * @param {string[]} stratagemIds - all stratagem IDs after merging new entries
 * @param {boolean} force - skip the README pre-check and always download
 * @param {Set<string>|null} targetIds - when provided, only these stratagem IDs are eligible for writes
 * @returns {{ copied: number, autoMatched: string[], unmapped: string[], missing: string[], skipped: boolean }}
 */
async function updateIcons(stratagemIds, force = false, targetIds = null) {
  // ── Pre-check: compare README icon list against ICON_MAP ───────────────────
  if (!force) {
    const readmeIcons = await fetchReadmeIconList();
    const {
      newIcons,
      matchableIcons,
      unmatchableIcons,
      missingLocal,
      changed,
    } = checkForNewIcons(readmeIcons, stratagemIds);

    if (newIcons.length > 0) {
      console.log(`      ${newIcons.length} new icon(s) detected in README:`);
      newIcons.forEach((i) => console.log(`        ${i}`));
    }
    if (unmatchableIcons.length > 0) {
      console.log(
        `      ${unmatchableIcons.length} new icon(s) don't match any local stratagem (manual ICON_MAP entry needed if relevant):`,
      );
      unmatchableIcons.forEach((i) => console.log(`        ${i}`));
    }
    if (missingLocal.length > 0) {
      console.log(
        `      ${missingLocal.length} local stratagem(s) missing icons:`,
      );
      missingLocal.forEach((id) => console.log(`        ${id}`));
    }

    if (!changed) {
      console.log(
        "      No actionable icon changes found. Skipping ZIP download.",
      );
      return {
        copied: 0,
        autoMatched: [],
        unmapped: [],
        missing: [],
        skipped: true,
      };
    }

    if (matchableIcons.length > 0) {
      console.log(
        `      ${matchableIcons.length} matchable icon(s) to download:`,
      );
      matchableIcons.forEach((i) => console.log(`        ${i}`));
    }
  }

  const tempDir = join(tmpdir(), `hd2-icons-${randomBytes(4).toString("hex")}`);
  mkdirSync(tempDir, { recursive: true });

  const zipPath = join(tempDir, "icons.zip");

  // ── Download ───────────────────────────────────────────────────────────────
  console.log("\n[icons 1/4] Downloading icon repo...");
  const res = await fetch(ICON_REPO_ZIP_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading icon repo`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(zipPath, buf);
  console.log(`      Downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MB`);

  // ── Extract ────────────────────────────────────────────────────────────────
  console.log("[icons 2/4] Extracting...");
  const extractDir = join(tempDir, "extracted");
  mkdirSync(extractDir, { recursive: true });

  // Use the platform's built-in unzip (available on Linux/macOS CI and Windows)
  try {
    execSync(
      process.platform === "win32"
        ? `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`
        : `unzip -q "${zipPath}" -d "${extractDir}"`,
      { stdio: "pipe" },
    );
  } catch (e) {
    throw new Error(`Failed to extract zip: ${e.message}`);
  }

  // The zip contains a single root folder
  const repoRoot = join(
    extractDir,
    readdirSync(extractDir).find((d) =>
      statSync(join(extractDir, d)).isDirectory(),
    ),
  );
  console.log(`      Repo root: ${repoRoot}`);

  // ── Copy mapped icons ─────────────────────────────────────────────────────
  console.log("[icons 3/4] Copying mapped icons...");
  mkdirSync(ICON_OUT_DIR, { recursive: true });

  let copied = 0;
  let skipped = 0;
  const notFound = [];

  for (const [relPath, ids] of Object.entries(ICON_MAP)) {
    const srcFile = join(repoRoot, ...relPath.split("/"));
    if (existsSync(srcFile)) {
      const srcBuf = readFileSync(srcFile);
      const idsToCopy = targetIds ? ids.filter((id) => targetIds.has(id)) : ids;

      for (const id of idsToCopy) {
        const destPath = join(ICON_OUT_DIR, `${id}.svg`);
        if (existsSync(destPath) && readFileSync(destPath).equals(srcBuf)) {
          skipped++;
          continue;
        }
        writeFileSync(destPath, srcBuf);
        copied++;
      }
    } else {
      notFound.push(relPath);
    }
  }
  console.log(
    `      Copied ${copied} mapped icon(s) (${skipped} unchanged, skipped)`,
  );

  // ── Auto-match unmapped SVGs ──────────────────────────────────────────────
  console.log("[icons 4/4] Auto-matching unmapped icons...");

  const allRepoSvgs = listFilesRecursive(repoRoot).filter((f) =>
    f.endsWith(".svg"),
  );
  const mappedKeys = new Set(Object.keys(ICON_MAP));
  const unmappedRepo = allRepoSvgs.filter(
    (f) => !mappedKeys.has(f) && !f.startsWith("General Stratagems/"),
  );

  const autoMatched = [];
  const stillUnmapped = [];

  for (const relPath of unmappedRepo) {
    const baseName = basename(relPath, extname(relPath));
    const candidate = toKebabCase(baseName);

    // Try exact match, then substring
    let matchedId = stratagemIds.find((id) => id === candidate);
    if (!matchedId) {
      matchedId = stratagemIds.find(
        (id) => id.includes(candidate) || candidate.includes(id),
      );
    }

    if (matchedId) {
      if (targetIds && !targetIds.has(matchedId)) {
        continue;
      }
      const srcFile = join(repoRoot, ...relPath.split("/"));
      const srcBuf = readFileSync(srcFile);
      const destPath = join(ICON_OUT_DIR, `${matchedId}.svg`);
      if (!existsSync(destPath) || !readFileSync(destPath).equals(srcBuf)) {
        writeFileSync(destPath, srcBuf);
        copied++;
        autoMatched.push(`${relPath}  →  ${matchedId}`);
      }
    } else {
      stillUnmapped.push(relPath);
    }
  }

  if (autoMatched.length > 0) {
    console.log(`\n  [+] Auto-matched ${autoMatched.length} new icon(s):`);
    autoMatched.forEach((m) => console.log(`      ${m}`));
  }
  if (stillUnmapped.length > 0) {
    console.log(
      `\n  [!] ${stillUnmapped.length} repo SVG(s) not matched (manual ICON_MAP entry needed):`,
    );
    stillUnmapped.forEach((f) => console.log(`      ${f}`));
  }

  // Check for stratagems still missing an icon
  const idsToCheck = targetIds ? [...targetIds] : stratagemIds;
  const missing = idsToCheck.filter(
    (id) => !existsSync(join(ICON_OUT_DIR, `${id}.svg`)),
  );
  if (missing.length > 0) {
    console.log(
      `\n  [!] ${missing.length} stratagem(s) still missing an icon:`,
    );
    missing.forEach((id) => console.log(`      ${id}`));
  } else {
    console.log("      All stratagems have an icon.");
  }

  if (notFound.length > 0) {
    console.log(
      `\n  [!] ${notFound.length} mapped key(s) not found in downloaded repo:`,
    );
    notFound.forEach((k) => console.log(`      ${k}`));
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  rmSync(tempDir, { recursive: true, force: true });
  console.log("      Temp files cleaned up.");

  return { copied, autoMatched, unmapped: stillUnmapped, missing };
}

/**
 * For each new stratagem detected on the wiki, check whether a matching icon
 * already exists in the upstream icon repo's README list.
 *
 * @param {Array} newStratagems - array of wiki stratagem objects (have .name)
 * @param {Set<string>} readmeIcons - icon paths from fetchReadmeIconList()
 * @returns {{ available: string[], missing: string[], allAvailable: boolean }}
 */
function checkNewStratagemIcons(newStratagems, readmeIcons) {
  const available = [];
  const missing = [];

  // Only icons that are NOT already in ICON_MAP are candidates for new stratagems.
  // Existing mapped icons (e.g. "Mortar Sentry") must not produce false positives
  // through substring matching against new stratagem names like "Gas Mortar Sentry".
  const mappedKeys = new Set(Object.keys(ICON_MAP));
  const newReadmeIcons = [...readmeIcons].filter(
    (iconPath) => !mappedKeys.has(iconPath),
  );

  for (const strat of newStratagems) {
    const candidate = toKebabCase(strat.name);
    const found = newReadmeIcons.some((iconPath) => {
      const iconBaseName = basename(iconPath, extname(iconPath));
      const iconId = toKebabCase(iconBaseName);
      return (
        iconId === candidate ||
        iconId.includes(candidate) ||
        candidate.includes(iconId)
      );
    });
    if (found) {
      available.push(strat.name);
    } else {
      missing.push(strat.name);
    }
  }

  return { available, missing, allAvailable: missing.length === 0 };
}

// ── Data merging ─────────────────────────────────────────────────────────────

/**
 * Merge new stratagem entries into data/stratagems.json and data/warbonds.json.
 */
function mergeNewStratagems(entries) {
  const stratagemPath = join(projectRoot, "data", "stratagems.json");
  const warbondPath = join(projectRoot, "data", "warbonds.json");

  const localData = JSON.parse(readFileSync(stratagemPath, "utf-8"));
  const warbondData = JSON.parse(readFileSync(warbondPath, "utf-8"));
  const existingWarbonds = new Set(warbondData.warbonds.map((w) => w.name));

  let warbondsUpdated = false;

  for (const strat of entries) {
    // Remove internal fields
    delete strat._source_raw;

    localData.stratagems.push(strat);
    console.log(`  Added stratagem: ${strat.name}`);

    // Add new warbond if needed
    if (strat.warbond && !existingWarbonds.has(strat.warbond)) {
      const warbondId = strat.warbond
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      warbondData.warbonds.push({
        id: warbondId,
        name: strat.warbond,
        pages: strat.warbond_page ?? 3,
      });
      existingWarbonds.add(strat.warbond);
      warbondsUpdated = true;
      console.log(`  Added new warbond: ${strat.warbond}`);
    }
  }

  writeFileSync(stratagemPath, JSON.stringify(localData, null, 2) + "\n");
  console.log(`  Updated data/stratagems.json`);

  if (warbondsUpdated) {
    writeFileSync(warbondPath, JSON.stringify(warbondData, null, 2) + "\n");
    console.log(`  Updated data/warbonds.json`);
  }

  return localData.stratagems.map((s) => s.id);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    // ── Step 1: Scrape wiki ──────────────────────────────────────────────────
    const html = await fetchWikiPage();
    const wikiStratagems = parseCurrentStratagems(html);
    const localStratagems = loadLocalStratagems();

    console.log(`Wiki: ${wikiStratagems.length} stratagems found`);
    console.log(`Local: ${localStratagems.length} stratagems in data`);

    // Build a set of normalised local names for comparison
    const localNames = new Set(
      localStratagems.map((s) => normaliseName(s.name)),
    );

    // Find stratagems on the wiki but not in local data
    const newStratagems = wikiStratagems.filter(
      (ws) => !localNames.has(normaliseName(ws.name)),
    );

    if (newStratagems.length === 0) {
      console.log("\n✓ No new stratagems found. Local data is up to date.");

      // Still update icons for existing stratagems (replaces placeholders once
      // real icons become available in the upstream repo).
      console.log("\nUpdating icons for existing stratagems...");
      const allIds = localStratagems.map((s) => s.id);
      const refreshIds = getIdsNeedingIconRefresh(allIds);
      const iconResult = await updateIcons(allIds, false, refreshIds);
      const iconsUpdated = (iconResult.copied ?? 0) > 0;

      writeFileSync(
        join(projectRoot, "new-stratagems.json"),
        JSON.stringify(
          {
            new_stratagems: [],
            icons_updated: iconsUpdated,
            // autoMatched contains "src/path → dest-id" entries for every icon
            // that was written (new or overwritten, e.g. placeholder → real icon).
            updated_icons: iconResult.autoMatched ?? [],
          },
          null,
          2,
        ) + "\n",
      );
      return;
    }

    console.log(`\n⚡ Found ${newStratagems.length} new stratagem(s):`);

    // Build full stratagem entries for the new ones
    const entries = newStratagems.map((s) => {
      const sourceInfo = parseSource(s.source);
      return {
        id: nameToId(s.name),
        name: s.name,
        code: s.code,
        category: s.category,
        subcategory: null, // Needs manual review
        requires_backpack: false, // Needs manual review
        ...sourceInfo,
        _source_raw: s.source,
      };
    });

    for (const e of entries) {
      console.log(
        `  - ${e.name} (${e.category}) [source: ${e._source_raw || "unknown"}]`,
      );
    }

    // ── Step 2: Check icon availability for the new stratagems ──────────────
    console.log("\nChecking icon availability for new stratagems...");
    const readmeIcons = await fetchReadmeIconList();
    const iconCheck = checkNewStratagemIcons(newStratagems, readmeIcons);

    if (iconCheck.available.length > 0) {
      console.log(
        `  ✓ ${iconCheck.available.length} new stratagem(s) have icons available: ${iconCheck.available.join(", ")}`,
      );
    }
    if (iconCheck.missing.length > 0) {
      console.log(
        `  ✗ ${iconCheck.missing.length} new stratagem(s) are missing icons in the upstream repo:`,
      );
      iconCheck.missing.forEach((name) => console.log(`      - ${name}`));
    }

    const outPath = join(projectRoot, "new-stratagems.json");

    if (!iconCheck.allAvailable) {
      console.log(
        "\n⚠️  Icons not yet available for all new stratagems. A PR will still be created using placeholder icon(s).",
      );
    }

    // ── Step 3: Merge new stratagems into data files ─────────────────────────
    console.log("\nMerging new stratagems into data files...");
    const allIds = mergeNewStratagems(entries);
    const newIds = entries.map((e) => e.id);
    const iconTargetIds = new Set(newIds);

    // ── Step 4: Update icons (force download since we have new stratagems) ──
    console.log("\nUpdating icons...");
    await updateIcons(allIds, true, iconTargetIds);

    // ── Step 5: Copy placeholder for any stratagems still missing an icon ────
    const placeholderSrc = join(ICON_OUT_DIR, "placeholder.svg");
    const placeholderIds = newIds.filter(
      (id) => !existsSync(join(ICON_OUT_DIR, `${id}.svg`)),
    );
    if (placeholderIds.length > 0) {
      if (existsSync(placeholderSrc)) {
        console.log(
          `\nCopying placeholder icon for ${placeholderIds.length} stratagem(s) without an icon:`,
        );
        for (const id of placeholderIds) {
          copyFileSync(placeholderSrc, join(ICON_OUT_DIR, `${id}.svg`));
          console.log(`  - ${id}`);
        }
      } else {
        console.warn(
          `\n⚠️  placeholder.svg not found; ${placeholderIds.length} stratagem(s) will have no icon.`,
        );
      }
    }

    // ── Step 6: Write summary output ─────────────────────────────────────────
    const output = {
      new_stratagems: entries,
      icons_available: iconCheck.allAvailable,
      missing_icons: iconCheck.missing,
      placeholder_icons: placeholderIds,
    };
    writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
    console.log(`\nSummary written to ${outPath}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
