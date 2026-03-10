import { Collapse, Grid, Typography } from "antd";

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
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {BACKPACK_MODES.map((mode) => {
                const isActive = activeMode === mode.key;
                return (
                  <div
                    key={mode.key}
                    onClick={() => onSelect(mode.key)}
                    style={{
                      cursor: isActive ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? 10 : 14,
                      padding: isMobile ? "10px 12px" : "12px 16px",
                      background: isActive
                        ? "linear-gradient(90deg, #1a1a0e 0%, transparent 100%)"
                        : "transparent",
                      borderLeft: `3px solid ${isActive ? HD_YELLOW : "transparent"}`,
                      borderRadius: 0,
                      transition: "all 0.15s ease",
                      ...(isActive
                        ? {
                            boxShadow: `inset 4px 0 12px -4px ${HD_YELLOW}33`,
                          }
                        : {}),
                    }}
                  >
                    {/* Radio dot */}
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        minWidth: 16,
                        borderRadius: "50%",
                        border: `2px solid ${isActive ? HD_YELLOW : "#555"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      {isActive && (
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: HD_YELLOW,
                          }}
                        />
                      )}
                    </div>

                    {/* Label + description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        strong
                        style={{
                          fontSize: isMobile ? 12 : 13,
                          color: isActive ? HD_YELLOW : HD_TEXT,
                          display: "block",
                          lineHeight: 1.3,
                        }}
                      >
                        {mode.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: isMobile ? 10 : 11,
                          color: isActive ? "#9e9880" : "#666",
                          lineHeight: 1.2,
                        }}
                      >
                        {mode.description}
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>
          ),
        },
      ]}
    />
  );
}
