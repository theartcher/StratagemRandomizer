"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  Divider,
  Grid,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  theme as antdTheme,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

import warbondsData from "@/data/warbonds.json";
import stratagemsData from "@/data/stratagems.json";

const { Title, Text } = Typography;

// ── Types ────────────────────────────────────────────────────────────────────

interface Stratagem {
  id: string;
  name: string;
  code: string[];
  category: string;
  warbond: string | null;
}

/** null = unconstrained (pick freely); number = exact count required */
type CategoryCounts = Record<ConfiguredCategory, number | null>;

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_GAME_KEY = "__base_game__";
const STORAGE_KEY_WARBONDS = "stratagem-randomizer-warbonds";
const STORAGE_KEY_COUNTS = "stratagem-randomizer-counts";
const STORAGE_KEY_RULES = "stratagem-randomizer-rules";

const ALL_KEYS = [BASE_GAME_KEY, ...warbondsData.warbonds.map((w) => w.id)];

const DEFAULT_COUNTS: CategoryCounts = {
  orbital: null,
  eagle: null,
  sentry: null,
  vehicle: null,
  emplacement: null,
};

const CONFIGURED_CATEGORIES = [
  "orbital",
  "eagle",
  "sentry",
  "vehicle",
  "emplacement",
] as const;
type ConfiguredCategory = (typeof CONFIGURED_CATEGORIES)[number];

const CATEGORY_LABELS: Record<ConfiguredCategory, string> = {
  orbital: "Orbitals",
  eagle: "Eagles",
  sentry: "Sentries",
  vehicle: "Vehicles",
  emplacement: "Mines & Emplacements",
};

// ── Rules ─────────────────────────────────────────────────────────────────────

const RULES = [
  {
    key: "no_double_support",
    label: "Singular support weapon",
    description:
      "Support weapons share a slot, so you can only have one of them.",
    category: "support_weapon",
    max: 1,
  },
  {
    key: "no_double_backpack",
    label: "Singular backpack",
    description: "You've only got one back to carry with.",
    category: "backpack",
    max: 1,
  },
] as const;

type RuleKey = (typeof RULES)[number]["key"];

const DEFAULT_RULES: RuleKey[] = ["no_double_support", "no_double_backpack"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw) as T;
  } catch {
    // ignore malformed data
  }
  return fallback;
}

const DIRECTION_ICON: Record<string, React.ReactNode> = {
  up: <ArrowUpOutlined />,
  down: <ArrowDownOutlined />,
  left: <ArrowLeftOutlined />,
  right: <ArrowRightOutlined />,
};

const CATEGORY_COLOR: Record<string, string> = {
  support_weapon: "blue",
  backpack: "green",
  eagle: "gold",
  orbital: "purple",
  sentry: "cyan",
  emplacement: "orange",
  vehicle: "volcano",
};

// Helldivers theme tokens
const HD_YELLOW = "#ffd200";
const HD_BG = "#0d0d0d";
const HD_CARD_BG = "#161616";
const HD_BORDER = "#2e2b22";
const HD_TEXT = "#e8dfc8";

/** Fisher-Yates shuffle — returns a new array */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StratagemRandomizer() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;

  const allWarbonds = warbondsData.warbonds;
  const allStratagems = stratagemsData.stratagems as Stratagem[];

  // null = not yet hydrated from localStorage (avoids SSR/client mismatch)
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [counts, setCounts] = useState<CategoryCounts | null>(null);
  const [rules, setRules] = useState<Set<RuleKey> | null>(null);
  const [results, setResults] = useState<Stratagem[]>([]);
  const [rolled, setRolled] = useState(false);

  // Load from localStorage after first client render
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
  }, []);

  // Persist warbond selection
  useEffect(() => {
    if (selected === null) return;
    localStorage.setItem(STORAGE_KEY_WARBONDS, JSON.stringify([...selected]));
  }, [selected]);

  // Persist counts
  useEffect(() => {
    if (counts === null) return;
    localStorage.setItem(STORAGE_KEY_COUNTS, JSON.stringify(counts));
  }, [counts]);

  // Persist rules
  useEffect(() => {
    if (rules === null) return;
    localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify([...rules]));
  }, [rules]);

  // Use defaults while waiting for hydration
  const activeSelected = selected ?? new Set(ALL_KEYS);
  const activeCounts = counts ?? DEFAULT_COUNTS;
  const activeRules = rules ?? new Set(DEFAULT_RULES);

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

  const setCount = (cat: ConfiguredCategory, value: number) =>
    setCounts((prev) => ({ ...(prev ?? DEFAULT_COUNTS), [cat]: value }));

  const toggleRule = (key: RuleKey) =>
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

    const picked: Stratagem[] = [];
    const usedIds = new Set<string>();

    // 1. Pick exactly the configured count from each named category
    for (const cat of CONFIGURED_CATEGORIES) {
      const count = activeCounts[cat];
      if (count === null) continue; // unconstrained — handled in fill pass
      const catPool = shuffle(
        pool.filter((s) => s.category === cat && !usedIds.has(s.id)),
      );
      for (const s of catPool.slice(0, count)) {
        picked.push(s);
        usedIds.add(s.id);
      }
    }

    // 2. Fill remaining slots
    const remaining = 4 - picked.length;
    if (remaining > 0) {
      const pickedPerCategory = new Map<string, number>();
      for (const s of picked) {
        pickedPerCategory.set(
          s.category,
          (pickedPerCategory.get(s.category) ?? 0) + 1,
        );
      }

      // Effective max per category during the fill pass
      const getEffectiveMax = (category: string): number => {
        // Pinned categories: respect their exact count as a ceiling
        if ((CONFIGURED_CATEGORIES as readonly string[]).includes(category)) {
          const pinnedMax = activeCounts[category as ConfiguredCategory];
          if (pinnedMax !== null) return pinnedMax;
        }
        // Apply active rules
        const rule = RULES.find((r) => r.category === category);
        if (rule && activeRules.has(rule.key)) return rule.max;
        return Infinity;
      };

      // Pick one-by-one so pickedPerCategory stays accurate after each pick
      const candidates = shuffle(pool.filter((s) => !usedIds.has(s.id)));
      for (const s of candidates) {
        if (picked.length >= 4) break;
        const max = getEffectiveMax(s.category);
        const current = pickedPerCategory.get(s.category) ?? 0;
        if (current >= max) continue;
        picked.push(s);
        usedIds.add(s.id);
        pickedPerCategory.set(s.category, current + 1);
      }
    }

    setResults(picked);
    setRolled(true);
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
        {/* yellow tactical top-bar */}
        <div
          style={{
            height: 4,
            background: `linear-gradient(90deg, ${HD_YELLOW} 0%, #b38f00 100%)`,
            marginBottom: isMobile ? 20 : 32,
            borderRadius: 0,
          }}
        />
        <Title
          style={{
            textAlign: "center",
            marginBottom: isMobile ? 20 : 32,
            color: HD_YELLOW,
            letterSpacing: isMobile ? "0.06em" : "0.12em",
            textTransform: "uppercase",
            fontWeight: 800,
            fontSize: isMobile ? 22 : undefined,
            textShadow: `0 0 24px rgba(255,210,0,0.25)`,
          }}
        >
          <ThunderboltOutlined style={{ marginRight: 10 }} />
          Stratagem Randomizer
        </Title>

        {/* ── Warbond selection ─────────────────────────────────────────── */}
        <Card
          title="Warbonds"
          style={{ marginBottom: 24, borderColor: HD_BORDER }}
          extra={
            <Space>
              <Button size="small" onClick={selectAll}>
                All
              </Button>
              <Button size="small" onClick={deselectAll}>
                None
              </Button>
            </Space>
          }
        >
          <Row gutter={[8, 12]}>
            {/* Base-game stratagems (warbond: null) */}
            <Col xs={24} sm={12} md={8}>
              <Checkbox
                checked={activeSelected.has(BASE_GAME_KEY)}
                onChange={() => toggle(BASE_GAME_KEY)}
              >
                Base Game
              </Checkbox>
            </Col>

            {allWarbonds.map((w) => (
              <Col key={w.id} xs={24} sm={12} md={8}>
                <Checkbox
                  checked={activeSelected.has(w.id)}
                  onChange={() => toggle(w.id)}
                >
                  {w.name}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </Card>

        {/* ── Rules ───────────────────────────────────────────────────── */}
        <Card
          title="Rules"
          style={{ marginBottom: 24, borderColor: HD_BORDER }}
        >
          <Row gutter={[16, 12]}>
            {RULES.map((rule) => (
              <Col key={rule.key} xs={24} sm={12}>
                <Space
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#1a1a0e",
                    border: `1px solid ${
                      activeRules.has(rule.key) ? HD_YELLOW : HD_BORDER
                    }`,
                    borderRadius: 2,
                  }}
                >
                  <Space orientation="vertical" size={2}>
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: activeRules.has(rule.key) ? HD_YELLOW : HD_TEXT,
                      }}
                    >
                      {rule.label}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {rule.description}
                    </Text>
                  </Space>
                  <Switch
                    checked={activeRules.has(rule.key)}
                    onChange={() => toggleRule(rule.key)}
                  />
                </Space>
              </Col>
            ))}
          </Row>
        </Card>

        {/* ── Stratagem slot counts ─────────────────────────────────────── */}
        <Card
          title={
            <Space size={4} direction="vertical" style={{ gap: 0 }}>
              <span>Pin Slot Types</span>
              {!isMobile && (
                <Text
                  type="secondary"
                  style={{ fontSize: 11, fontWeight: 400 }}
                >
                  Lock how many of each type you want
                </Text>
              )}
            </Space>
          }
          extra={
            <Space size={8}>
              {totalConfigured > 0 && (
                <Button
                  size="small"
                  onClick={() => setCounts({ ...DEFAULT_COUNTS })}
                >
                  Reset
                </Button>
              )}
              {configOverLimit ? (
                <Text type="danger" style={{ fontSize: 12 }}>
                  Total exceeds 4
                </Text>
              ) : totalConfigured > 0 ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {totalConfigured} / 4 pinned &middot; {4 - totalConfigured}{" "}
                  random
                </Text>
              ) : (
                <Tag color="default" style={{ margin: 0 }}>
                  Optional
                </Tag>
              )}
            </Space>
          }
          style={{ marginBottom: 24, borderColor: HD_BORDER }}
        >
          <Row gutter={[16, 16]}>
            {CONFIGURED_CATEGORIES.map((cat) => {
              const enabled = activeCounts[cat] !== null;
              const current = activeCounts[cat] ?? null;
              // Slots already spoken for by other categories
              const otherTotal = totalConfigured - (enabled ? current! : 0);
              // Column is locked when not pinned but all 4 slots are taken
              const lockedOut = !enabled && otherTotal >= 4;
              return (
                <Col key={cat} xs={12} sm={8}>
                  <Space
                    direction="vertical"
                    size={4}
                    style={{ width: "100%" }}
                  >
                    {/* Category label */}
                    <Text
                      strong
                      style={{
                        fontSize: isMobile ? 10 : 12,
                        display: "block",
                        textAlign: "center",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: enabled
                          ? HD_YELLOW
                          : lockedOut
                            ? "#555"
                            : HD_TEXT,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </Text>

                    {/* Any amount — active when not pinned and slots are available */}
                    <Button
                      type={!enabled && !lockedOut ? "primary" : "default"}
                      disabled={lockedOut}
                      onClick={() =>
                        setCounts((prev) => ({
                          ...(prev ?? DEFAULT_COUNTS),
                          [cat]: null,
                        }))
                      }
                      style={{
                        width: "100%",
                        height: isMobile ? 36 : 44,
                        fontSize: isMobile ? 10 : 13,
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        padding: "0 4px",
                        opacity: lockedOut ? 0.25 : 1,
                      }}
                    >
                      {isMobile ? "Any" : "Any amount"}
                    </Button>

                    {[1, 2, 3, 4].map((n) => {
                      const wouldExceed = otherTotal + n > 4;
                      return (
                        <Button
                          key={n}
                          type={
                            enabled && current === n ? "primary" : "default"
                          }
                          disabled={wouldExceed}
                          onClick={() => setCount(cat, n)}
                          style={{
                            width: "100%",
                            height: isMobile ? 36 : 44,
                            fontSize: isMobile ? 16 : 20,
                            fontWeight: 800,
                            opacity: wouldExceed ? 0.25 : 1,
                          }}
                        >
                          {n}
                        </Button>
                      );
                    })}
                  </Space>
                </Col>
              );
            })}
          </Row>
        </Card>

        {/* ── Trigger ──────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={randomize}
            disabled={activeSelected.size === 0 || configOverLimit}
            style={{
              height: 52,
              width: isMobile ? "100%" : undefined,
              paddingInline: isMobile ? 0 : 48,
              fontSize: isMobile ? 14 : 16,
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Randomize my stratagems!
          </Button>
        </div>

        {/* Results */}
        {rolled && (
          <>
            <Divider style={{ borderColor: HD_BORDER }}>
              <Text
                strong
                style={{
                  color: HD_YELLOW,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Your Stratagems
              </Text>
            </Divider>

            {results.length === 0 ? (
              <Text type="secondary">
                No stratagems available for the selected warbonds.
              </Text>
            ) : (
              <Row gutter={[16, 16]}>
                {results.map((s) => (
                  <Col key={s.id} xs={24} sm={12}>
                    <Card
                      title={s.name}
                      size="small"
                      style={{ borderColor: HD_BORDER }}
                      extra={
                        <Tag color={CATEGORY_COLOR[s.category] ?? "default"}>
                          {s.category.replace(/_/g, " ")}
                        </Tag>
                      }
                    >
                      {/* Directional code */}
                      <Space size={6} wrap>
                        {s.code.map((dir, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 20,
                              lineHeight: 1,
                              padding: "4px 8px",
                              background: "#1a1a0e",
                              border: `1px solid ${HD_BORDER}`,
                              color: HD_YELLOW,
                              borderRadius: 2,
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            {DIRECTION_ICON[dir] ?? dir}
                          </span>
                        ))}
                      </Space>

                      {/* Warbond badge */}
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {s.warbond ?? "Base Game"}
                        </Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </>
        )}
      </div>
    </ConfigProvider>
  );
}
