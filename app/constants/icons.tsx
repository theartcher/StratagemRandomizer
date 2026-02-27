import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
} from "@ant-design/icons";

// Maps direction strings from stratagem codes to their arrow icon components.
export const DIRECTION_ICON: Record<string, React.ReactNode> = {
  up: <ArrowUpOutlined />,
  down: <ArrowDownOutlined />,
  left: <ArrowLeftOutlined />,
  right: <ArrowRightOutlined />,
};
