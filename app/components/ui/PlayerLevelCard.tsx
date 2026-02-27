import { Card, Grid, Slider, Typography } from "antd";

import { HD_BORDER, HD_YELLOW } from "@/app/constants/theme";
import { MAX_PLAYER_LEVEL } from "@/app/constants/storage";

const { Text } = Typography;

interface Props {
  level: number;
  onChange: (level: number) => void;
}

export default function PlayerLevelCard({ level, onChange }: Props) {
  const isMobile = !Grid.useBreakpoint().sm;
  const atMax = level >= MAX_PLAYER_LEVEL;

  return (
    <Card
      title="Player Level"
      style={{ marginBottom: 24, borderColor: HD_BORDER }}
      extra={
        <Text
          strong
          style={{ color: HD_YELLOW, fontSize: 15, letterSpacing: "0.06em" }}
        >
          {atMax ? `${MAX_PLAYER_LEVEL}+` : `${level}`}
        </Text>
      }
    >
      <div style={{ padding: isMobile ? "0 8px" : "0 16px" }}>
        <Slider
          min={1}
          max={MAX_PLAYER_LEVEL}
          value={level}
          onChange={onChange}
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
      {!atMax && (
        <Text
          type="secondary"
          style={{ fontSize: 11, marginTop: 8, display: "block" }}
        >
          Stratagems with an unlock level above {level} are excluded from the
          pool.
        </Text>
      )}
    </Card>
  );
}
