import { Button, Checkbox, Col, Collapse, Row, Space, Typography } from "antd";

import warbondsData from "@/data/warbonds.json";
import { HD_BORDER } from "@/app/constants/theme";
import { BASE_GAME_KEY } from "@/app/constants/storage";

const { Text } = Typography;

interface Props {
  selected: Set<string>;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  defaultCollapsed?: boolean;
}

export default function WarBondsCard({
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
  defaultCollapsed = false,
}: Props) {
  const allWarbonds = warbondsData.warbonds;
  const totalCount = allWarbonds.length + 1; // +1 for base game
  const enabledCount = selected.size;

  return (
    <Collapse
      defaultActiveKey={defaultCollapsed ? [] : ["warbonds"]}
      style={{ marginBottom: 24, borderColor: HD_BORDER }}
      items={[
        {
          key: "warbonds",
          label: (
            <Space size={8}>
              <span>Warbonds</span>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                {enabledCount}/{totalCount} enabled
              </Text>
            </Space>
          ),
          extra: (
            <Space onClick={(e) => e.stopPropagation()}>
              <Button onClick={onSelectAll}>All</Button>
              <Button onClick={onDeselectAll}>None</Button>
            </Space>
          ),
          children: (
            <Row gutter={[8, 12]}>
              {/* Base-game stratagems (warbond: null) */}
              <Col xs={24} sm={12} md={8}>
                <Checkbox
                  checked={selected.has(BASE_GAME_KEY)}
                  onChange={() => onToggle(BASE_GAME_KEY)}
                >
                  Base Game
                </Checkbox>
              </Col>

              {allWarbonds.map((warbond) => (
                <Col key={warbond.id} xs={24} sm={12} md={8}>
                  <Checkbox
                    checked={selected.has(warbond.id)}
                    onChange={() => onToggle(warbond.id)}
                  >
                    {warbond.name}
                  </Checkbox>
                </Col>
              ))}
            </Row>
          ),
        },
      ]}
    />
  );
}
