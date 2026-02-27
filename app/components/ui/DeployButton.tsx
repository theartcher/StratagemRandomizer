import { Button, Grid } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";

interface Props {
  spinning: boolean;
  rolled: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function DeployButton({
  spinning,
  rolled,
  disabled,
  onClick,
}: Props) {
  const isMobile = !Grid.useBreakpoint().sm;

  return (
    <div style={{ textAlign: "center", marginBottom: rolled ? 24 : 32 }}>
      <Button
        type="primary"
        size="large"
        icon={<ThunderboltOutlined />}
        onClick={onClick}
        disabled={disabled}
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
  );
}
