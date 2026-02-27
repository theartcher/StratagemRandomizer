"use client";

import { useRef, useState } from "react";
import { ConfigProvider, Grid, Typography, theme as antdTheme } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

import warbondsData from "@/data/warbonds.json";
import stratagemsData from "@/data/stratagems.json";

import {
  CONFIGURED_CATEGORIES,
  RULES,
  type Stratagem,
} from "@/app/types/stratagem";
import {
  HD_BG,
  HD_BORDER,
  HD_CARD_BG,
  HD_TEXT,
  HD_YELLOW,
} from "@/app/constants/theme";
import { CATEGORY_COLOR, DEFAULT_COUNTS } from "@/app/constants/categories";
import { DEFAULT_RULES } from "@/app/constants/rules";
import {
  ALL_KEYS,
  BASE_GAME_KEY,
  DEFAULT_PLAYER_LEVEL,
} from "@/app/constants/storage";
import PlayerLevelCard from "@/app/components/ui/PlayerLevelCard";
import TitleSection from "@/app/components/ui/TitleSection";
import RulesCard from "@/app/components/ui/RulesCard";
import WarBondsCard from "@/app/components/ui/WarBondsCard";
import PinSlotTypesCard from "@/app/components/ui/PinSlotTypesCard";
import DeployButton from "@/app/components/ui/DeployButton";
import SlotMachineResults from "@/app/components/ui/SlotMachineResults";
import { useSlotMachine } from "@/app/hooks/useSlotMachine";
import { pickStratagems } from "@/app/services/randomizer";
import { useStratagemSettings } from "@/app/hooks/useStratagemSettings";

const { Text } = Typography;

// ── Component ─────────────────────────────────────────────────────────────────

export default function StratagemRandomizer() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  const allWarbonds = warbondsData.warbonds;
  const allStratagems = stratagemsData.stratagems as Stratagem[];

  const {
    selected,
    setSelected,
    counts,
    setCounts,
    rules,
    setRules,
    level,
    setLevel,
  } = useStratagemSettings();

  const [results, setResults] = useState<Stratagem[]>([]);
  const [rolled, setRolled] = useState(false);

  // ── Slot machine ──────────────────────────────────────────────────────────
  const [spinning, setSpinning] = useState(false);
  /** Icon shown in each slot while spinning; null once locked */
  const [displaySlots, setDisplaySlots] = useState<(Stratagem | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [slotLocked, setSlotLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [slotJustLocked, setSlotJustLocked] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const lockedRef = useRef<boolean[]>([false, false, false, false]);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use defaults while waiting for hydration
  const activeSelected = selected ?? new Set(ALL_KEYS);
  const activeCounts = counts ?? DEFAULT_COUNTS;
  const activeRules = rules ?? new Set(DEFAULT_RULES);
  const activeLevel = level ?? DEFAULT_PLAYER_LEVEL;

  const totalConfigured = CONFIGURED_CATEGORIES.reduce(
    (sum, cat) => sum + (activeCounts[cat] ?? 0),
    0,
  );
  const configOverLimit = totalConfigured > 4;

  // ── Checkbox helpers ──────────────────────────────────────────────────────

  const toggle = (key: string) =>
    setSelected((prev) => {
      const base = prev ?? new Set(ALL_KEYS);
      const next = new Set(base);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const selectAll = () => setSelected(new Set(ALL_KEYS));
  const deselectAll = () => setSelected(new Set());

  const toggleRule = (key: (typeof RULES)[number]["key"]) =>
    setRules((prev) => {
      const base = prev ?? new Set(DEFAULT_RULES);
      const next = new Set(base);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // ── Randomise ─────────────────────────────────────────────────────────────

  const randomize = () => {
    const pool = allStratagems.filter((s) => {
      if (s.warbond === null) return activeSelected.has(BASE_GAME_KEY);
      const warbond = allWarbonds.find((w) => w.name === s.warbond);
      return warbond ? activeSelected.has(warbond.id) : false;
    });

    const picked = pickStratagems({
      pool,
      counts: activeCounts,
      rules: activeRules,
      playerLevel: activeLevel,
    });

    // ── Slot machine animation ─────────────────────────────────────────────
    setResults(picked);
    setRolled(true);

    if (picked.length === 0) return;

    const slotCount = picked.length;

    // Reset slots to exactly slotCount entries
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    lockedRef.current = Array(slotCount).fill(false);
    setSlotLocked(Array(slotCount).fill(false));
    setSlotJustLocked(Array(slotCount).fill(false));
    setDisplaySlots(Array(slotCount).fill(null));
    setSpinning(true);

    // Cycle random icons at 80 ms on every unlocked slot
    spinIntervalRef.current = setInterval(() => {
      setDisplaySlots(
        lockedRef.current.map((locked) =>
          locked
            ? null
            : allStratagems[Math.floor(Math.random() * allStratagems.length)],
        ) as (Stratagem | null)[],
      );
    }, 80);

    // Lock slots one by one, staggered — only up to slotCount
    const lockDelays = [1000, 1500, 2000, 2500].slice(0, slotCount);
    lockDelays.forEach((delay, i) => {
      setTimeout(() => {
        lockedRef.current[i] = true;
        setSlotLocked((prev) => {
          const n = [...prev];
          n[i] = true;
          return n;
        });
        setSlotJustLocked((prev) => {
          const n = [...prev];
          n[i] = true;
          return n;
        });
        // Remove flash after 400 ms
        setTimeout(
          () =>
            setSlotJustLocked((prev) => {
              const n = [...prev];
              n[i] = false;
              return n;
            }),
          400,
        );
      }, delay);
    });

    // Stop interval after the last slot locks
    const lastLock = lockDelays[lockDelays.length - 1];
    setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
      setSpinning(false);
    }, lastLock + 200);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm,
        token: {
          colorPrimary: HD_YELLOW,
          colorBgContainer: HD_CARD_BG,
          colorBgElevated: "#1f1e18",
          colorBorder: HD_BORDER,
          colorText: HD_TEXT,
          colorTextSecondary: "#9e9880",
          borderRadius: 2,
          fontFamily: "var(--font-geist-sans), sans-serif",
        },
      }}
    >
      <div
        style={{
          padding: isMobile ? "16px 12px" : "32px 24px",
          maxWidth: 960,
          margin: "0 auto",
          background: HD_BG,
          minHeight: "100vh",
        }}
      >
        <TitleSection />

        <PlayerLevelCard level={activeLevel} onChange={(v) => setLevel(v)} />

        <WarBondsCard
          selected={activeSelected}
          onToggle={toggle}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
        />

        <RulesCard activeRules={activeRules} onToggle={toggleRule} />

        <PinSlotTypesCard
          counts={activeCounts}
          onSetCount={(cat, value) =>
            setCounts((prev) => ({ ...(prev ?? DEFAULT_COUNTS), [cat]: value }))
          }
          onReset={() => setCounts({ ...DEFAULT_COUNTS })}
        />

        <DeployButton
          spinning={spinning}
          rolled={rolled}
          disabled={spinning || activeSelected.size === 0 || configOverLimit}
          onClick={randomize}
        />

        <SlotMachineResults
          rolled={rolled}
          spinning={spinning}
          results={results}
          displaySlots={displaySlots}
          slotLocked={slotLocked}
          slotJustLocked={slotJustLocked}
        />
      </div>
    </ConfigProvider>
  );
}
