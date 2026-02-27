import { Button, Card, Checkbox, Col, Row, Space } from "antd";

import warbondsData from "@/data/warbonds.json";
import { HD_BORDER } from "@/app/constants/theme";
import { BASE_GAME_KEY } from "@/app/constants/storage";

interface Props {
  selected: Set<string>;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function WarBondsCard({
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: Props) {
  const allWarbonds = warbondsData.warbonds;

  return (
    <Card
      title="Warbonds"
      style={{ marginBottom: 24, borderColor: HD_BORDER }}
      extra={
        <Space>
          <Button onClick={onSelectAll}>All</Button>
          <Button onClick={onDeselectAll}>None</Button>
        </Space>
      }
    >
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
    </Card>
  );
}
