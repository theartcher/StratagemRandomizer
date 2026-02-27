import { Button, Card, Col, Grid, Row, Space, Tag, Typography } from "antd";

import {
  CONFIGURED_CATEGORIES,
  type CategoryCounts,
  type ConfiguredCategory,
} from "@/app/types/stratagem";
import { HD_BORDER, HD_TEXT, HD_YELLOW } from "@/app/constants/theme";
import { CATEGORY_LABELS } from "@/app/constants/categories";

const { Text } = Typography;

interface Props {
  counts: CategoryCounts;
  /** Pass null to unpin (Any amount); pass a number to pin to that count. */
  onSetCount: (cat: ConfiguredCategory, value: number | null) => void;
  onReset: () => void;
}

export default function PinSlotTypesCard({
  counts,
  onSetCount,
  onReset,
}: Props) {
  const isMobile = !Grid.useBreakpoint().sm;

  const totalConfigured = CONFIGURED_CATEGORIES.reduce(
    (sum, cat) => sum + (counts[cat] ?? 0),
    0,
  );
  const configOverLimit = totalConfigured > 4;

  return (
    <Card
      title={
        <Space size={4} orientation="vertical" style={{ gap: 0 }}>
          <span>Pin Slot Types</span>
          {!isMobile && (
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
              Lock how many of each type you want
            </Text>
          )}
        </Space>
      }
      extra={
        <Space size={8}>
          {totalConfigured > 0 && (
            <Button size="small" onClick={onReset}>
              Reset
            </Button>
          )}
          {configOverLimit ? (
            <Text type="danger" style={{ fontSize: 12 }}>
              Total exceeds 4
            </Text>
          ) : totalConfigured > 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {totalConfigured} / 4 pinned &middot; {4 - totalConfigured} random
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
          const enabled = counts[cat] !== null;
          const current = counts[cat] ?? null;
          // Slots already spoken for by other categories
          const otherTotal = totalConfigured - (enabled ? current! : 0);
          // Column is locked when not pinned but all 4 slots are taken
          const lockedOut = !enabled && otherTotal >= 4;

          return (
            <Col key={cat} xs={12} sm={8}>
              <Space orientation="vertical" size={4} style={{ width: "100%" }}>
                {/* Category label */}
                <Text
                  strong
                  style={{
                    fontSize: isMobile ? 10 : 12,
                    display: "block",
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: enabled ? HD_YELLOW : lockedOut ? "#555" : HD_TEXT,
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
                  onClick={() => onSetCount(cat, null)}
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
                  type={enabled && current === 0 ? "primary" : "default"}
                  onClick={() => onSetCount(cat, 0)}
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
                      type={enabled && current === n ? "primary" : "default"}
                      disabled={wouldExceed}
                      onClick={() => onSetCount(cat, n)}
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
  );
}
