"use client";

import { useRef, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  ConfigProvider,
  Divider,
  Grid,
  Row,
  Slider,
  Space,
  Switch,
  Tag,
  Typography,
  theme as antdTheme,
} from "antd";
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
import {
  CATEGORY_COLOR,
  CATEGORY_LABELS,
  DEFAULT_COUNTS,
} from "@/app/constants/categories";
import { DEFAULT_RULES } from "@/app/constants/rules";
import {
  ALL_KEYS,
  BASE_GAME_KEY,
  DEFAULT_PLAYER_LEVEL,
  MAX_PLAYER_LEVEL,
} from "@/app/constants/storage";
import { DIRECTION_ICON } from "@/app/constants/icons";
import { pickStratagems } from "@/app/services/randomizer";
import { useStratagemSettings } from "@/app/hooks/useStratagemSettings";

const { Title, Text } = Typography;

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

  const setCount = (
    cat: (typeof CONFIGURED_CATEGORIES)[number],
    value: number,
  ) => setCounts((prev) => ({ ...(prev ?? DEFAULT_COUNTS), [cat]: value }));

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

        {/* ── Player level ──────────────────────────────────────────────── */}
        <Card
          title="Player Level"
          style={{ marginBottom: 24, borderColor: HD_BORDER }}
          extra={
            <Text
              strong
              style={{
                color: HD_YELLOW,
                fontSize: 15,
                letterSpacing: "0.06em",
              }}
            >
              {activeLevel >= MAX_PLAYER_LEVEL
                ? `${MAX_PLAYER_LEVEL}+`
                : `${activeLevel}`}
            </Text>
          }
        >
          <div style={{ padding: isMobile ? "0 8px" : "0 16px" }}>
            <Slider
              min={1}
              max={MAX_PLAYER_LEVEL}
              value={activeLevel}
              onChange={(v) => setLevel(v)}
              marks={{
                1: "1",
                5: "5",
                10: "10",
                15: "15",
                20: "20",
                25: "25+",
              }}
              tooltip={{
                formatter: (v) =>
                  v !== undefined && v >= MAX_PLAYER_LEVEL
                    ? `${v}+ (all unlocked)`
                    : `${v}`,
              }}
            />
          </div>
          {activeLevel < MAX_PLAYER_LEVEL && (
            <Text
              type="secondary"
              style={{ fontSize: 11, marginTop: 8, display: "block" }}
            >
              Stratagems with an unlock level above {activeLevel} are excluded
              from the pool.
            </Text>
          )}
        </Card>

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
            <Space size={4} orientation="vertical" style={{ gap: 0 }}>
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
                    orientation="vertical"
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

                    {/* 0 = exclude this category entirely */}
                    <Button
                      key={0}
                      type={enabled && current === 0 ? "primary" : "default"}
                      onClick={() => setCount(cat, 0)}
                      style={{
                        width: "100%",
                        height: isMobile ? 36 : 44,
                        fontSize: isMobile ? 16 : 20,
                        fontWeight: 800,
                      }}
                    >
                      0
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

        {/* ── Slot Machine ─────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: rolled ? 24 : 32 }}>
          <Button
            type="primary"
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={randomize}
            disabled={spinning || activeSelected.size === 0 || configOverLimit}
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
            {spinning
              ? "Deploying..."
              : rolled
                ? "Re-deploy"
                : "Deploy Stratagems!"}
          </Button>
        </div>

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

            {!spinning && results.length === 0 ? (
              <Text type="secondary">
                No stratagems available for the selected warbonds.
              </Text>
            ) : (
              <Row
                gutter={[12, 12]}
                align="stretch"
                style={{ alignItems: "stretch" }}
              >
                {Array.from({ length: results.length }, (_, i) => {
                  const locked = slotLocked[i] ?? false;
                  const justLocked = slotJustLocked[i] ?? false;
                  // locked slots show the final result; spinning slots show the cycling icon
                  const s: Stratagem | null = locked
                    ? (results[i] ?? null)
                    : displaySlots[i];
                  return (
                    <Col key={i} xs={12} sm={6} style={{ display: "flex" }}>
                      <div
                        style={{
                          border: `2px solid ${
                            justLocked
                              ? "#ffffff"
                              : locked
                                ? HD_YELLOW
                                : HD_BORDER
                          }`,
                          borderRadius: 4,
                          background: justLocked ? "#1f1c00" : HD_CARD_BG,
                          transition: "border-color 0.25s, background 0.3s",
                          padding: isMobile ? "10px 6px" : "16px 12px",
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          overflow: "hidden",
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: isMobile ? 56 : 80,
                            height: isMobile ? 56 : 80,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            filter: locked
                              ? "none"
                              : "grayscale(1) brightness(0.35)",
                            transition: "filter 0.2s",
                          }}
                        >
                          {s ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/${s.id}.svg`}
                              alt=""
                              width={isMobile ? 56 : 80}
                              height={isMobile ? 56 : 80}
                              style={{ objectFit: "contain", display: "block" }}
                              onError={(e) => {
                                (
                                  e.currentTarget as HTMLImageElement
                                ).style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: isMobile ? 56 : 80,
                                height: isMobile ? 56 : 80,
                                border: `1px solid ${HD_BORDER}`,
                                borderRadius: 2,
                              }}
                            />
                          )}
                        </div>

                        {/* Name — fixed 2-line height so all cards stay the same */}
                        <Text
                          strong
                          style={{
                            color: locked ? HD_TEXT : "#3a3a3a",
                            textAlign: "center",
                            fontSize: isMobile ? 11 : 13,
                            lineHeight: 1.3,
                            height: isMobile ? 29 : 34,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            width: "100%",
                            transition: "color 0.2s",
                          }}
                        >
                          {locked && s ? s.name : "\u2014 \u2014 \u2014"}
                        </Text>

                        {/* Details: revealed on lock */}
                        {locked && s && (
                          <>
                            <Tag
                              color={CATEGORY_COLOR[s.category] ?? "default"}
                              style={{ margin: 0 }}
                            >
                              {s.category.replace(/_/g, " ")}
                            </Tag>
                            {/* Arrows */}
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 4,
                                justifyContent: "center",
                                alignContent: "center",
                              }}
                            >
                              {s.code.map((dir, j) => (
                                <span
                                  key={j}
                                  style={{
                                    fontSize: isMobile ? 13 : 18,
                                    lineHeight: 1,
                                    padding: isMobile ? "3px 5px" : "4px 8px",
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
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {s.warbond ?? "Base Game"}
                            </Text>
                          </>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}
          </>
        )}
      </div>
    </ConfigProvider>
  );
}
