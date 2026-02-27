import { Col, Divider, Grid, Row, Tag, Typography } from "antd";

import type { Stratagem } from "@/app/types/stratagem";
import {
  HD_BORDER,
  HD_CARD_BG,
  HD_TEXT,
  HD_YELLOW,
} from "@/app/constants/theme";
import { CATEGORY_COLOR } from "@/app/constants/categories";
import { DIRECTION_ICON } from "@/app/constants/icons";

const { Text } = Typography;

interface Props {
  rolled: boolean;
  spinning: boolean;
  results: Stratagem[];
  displaySlots: (Stratagem | null)[];
  slotLocked: boolean[];
  slotJustLocked: boolean[];
}

export default function SlotMachineResults({
  rolled,
  spinning,
  results,
  displaySlots,
  slotLocked,
  slotJustLocked,
}: Props) {
  const isMobile = !Grid.useBreakpoint().sm;

  if (!rolled) return null;

  return (
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
            const stratagem: Stratagem | null = locked
              ? (results[i] ?? null)
              : displaySlots[i];

            return (
              <Col key={i} xs={12} sm={6} style={{ display: "flex" }}>
                <div
                  style={{
                    border: `2px solid ${
                      justLocked ? "#ffffff" : locked ? HD_YELLOW : HD_BORDER
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
                      filter: locked ? "none" : "grayscale(1) brightness(0.35)",
                      transition: "filter 0.2s",
                    }}
                  >
                    {stratagem ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icons/${stratagem.id}.svg`}
                        alt=""
                        width={isMobile ? 56 : 80}
                        height={isMobile ? 56 : 80}
                        style={{ objectFit: "contain", display: "block" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
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
                    {locked && stratagem
                      ? stratagem.name
                      : "\u2014 \u2014 \u2014"}
                  </Text>

                  {/* Details: revealed on lock */}
                  {locked && stratagem && (
                    <>
                      <Tag
                        color={CATEGORY_COLOR[stratagem.category] ?? "default"}
                        style={{ margin: 0 }}
                      >
                        {stratagem.category.replace(/_/g, " ")}
                      </Tag>

                      {/* Arrow code */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                          justifyContent: "center",
                          alignContent: "center",
                        }}
                      >
                        {stratagem.code.map((dir, j) => (
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
                        {stratagem.warbond ?? "Base Game"}
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
  );
}
