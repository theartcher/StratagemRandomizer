import { Grid, Typography } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

import { HD_YELLOW } from "@/app/constants/theme";

const { Title } = Typography;

export default function TitleSection() {
  const isMobile = !Grid.useBreakpoint().sm;

  return (
    <>
      {/* Yellow tactical top-bar */}
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
    </>
  );
}
