import { Col, Collapse, Grid, Row, Typography } from "antd";

import { BACKPACK_MODES, type BackpackMode } from "@/app/types/stratagem";
import { HD_BORDER, HD_TEXT, HD_YELLOW } from "@/app/constants/theme";

const { Text } = Typography;

interface Props {
  activeMode: BackpackMode;
  onSelect: (mode: BackpackMode) => void;
}

export default function BackpacksCard({ activeMode, onSelect }: Props) {
  const isMobile = !Grid.useBreakpoint().sm;

  return (
    <Collapse
      defaultActiveKey={["backpacks"]}
      style={{ marginBottom: 24, borderColor: HD_BORDER }}
      items={[
        {
          key: "backpacks",
          label: "Backpacks",
          children: (
            <Row gutter={[16, 12]}>
              {BACKPACK_MODES.map((mode) => {
                const isActive = activeMode === mode.key;
                return (
                  <Col key={mode.key} xs={12} sm={6}>
                    <div
                      onClick={() => onSelect(mode.key)}
                      style={{
                        cursor: isActive ? "default" : "pointer",
                        padding: isMobile ? "10px 8px" : "14px",
                        background: isActive ? "#1a1a0e" : "transparent",
                        border: `1px solid ${isActive ? HD_YELLOW : HD_BORDER}`,
                        borderRadius: 2,
                        textAlign: "center",
                        transition: "border-color 0.2s",
                        height: "100%",
                        minHeight: 80,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        strong
                        style={{
                          fontSize: isMobile ? 11 : 13,
                          color: isActive ? HD_YELLOW : HD_TEXT,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        {mode.label}
                      </Text>
                      <Text
                        type="secondary"
                        style={{ fontSize: isMobile ? 10 : 11 }}
                      >
                        {mode.description}
                      </Text>
                    </div>
                  </Col>
                );
              })}
            </Row>
          ),
        },
      ]}
    />
  );
}
