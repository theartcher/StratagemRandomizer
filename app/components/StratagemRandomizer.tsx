"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Row,
  Space,
  Tag,
  Typography,
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const BASE_GAME_KEY = "__base_game__";

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
  const allWarbonds = warbondsData.warbonds;
  const allStratagems = stratagemsData.stratagems as Stratagem[];

  const allKeys = [BASE_GAME_KEY, ...allWarbonds.map((w) => w.id)];

  const [selected, setSelected] = useState<Set<string>>(new Set(allKeys));
  const [results, setResults] = useState<Stratagem[]>([]);
  const [rolled, setRolled] = useState(false);

  // ── Checkbox helpers ──────────────────────────────────────────────────────

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const selectAll = () => setSelected(new Set(allKeys));
  const deselectAll = () => setSelected(new Set());

  // ── Randomise ─────────────────────────────────────────────────────────────

  const randomize = () => {
    const pool = allStratagems.filter((s) => {
      if (s.warbond === null) return selected.has(BASE_GAME_KEY);
      const warbond = allWarbonds.find((w) => w.name === s.warbond);
      return warbond ? selected.has(warbond.id) : false;
    });

    setResults(shuffle(pool).slice(0, 4));
    setRolled(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
      <Title style={{ textAlign: "center", marginBottom: 32 }}>
        <ThunderboltOutlined style={{ marginRight: 10 }} />
        Stratagem Randomizer
      </Title>

      {/* Warbond selection */}
      <Card
        title="Warbonds"
        style={{ marginBottom: 24 }}
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
              checked={selected.has(BASE_GAME_KEY)}
              onChange={() => toggle(BASE_GAME_KEY)}
            >
              Base Game
            </Checkbox>
          </Col>

          {allWarbonds.map((w) => (
            <Col key={w.id} xs={24} sm={12} md={8}>
              <Checkbox
                checked={selected.has(w.id)}
                onChange={() => toggle(w.id)}
              >
                {w.name}
              </Checkbox>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Trigger */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Button
          type="primary"
          size="large"
          icon={<ThunderboltOutlined />}
          onClick={randomize}
          disabled={selected.size === 0}
        >
          Randomize!
        </Button>
      </div>

      {/* Results */}
      {rolled && (
        <>
          <Divider>
            <Text strong>Your Stratagems</Text>
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
                            padding: "4px 6px",
                            background: "#f5f5f5",
                            borderRadius: 4,
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          {DIRECTION_ICON[dir] ?? dir}
                        </span>
                      ))}
                    </Space>

                    {/* Warbond badge */}
                    {s.warbond ? (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {s.warbond}
                        </Text>
                      </div>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Base Game
                        </Text>
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}
    </div>
  );
}
