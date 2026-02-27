import { Card, Col, Row, Space, Switch, Typography } from "antd";

import { RULES, type RuleKey } from "@/app/types/stratagem";
import { HD_BORDER, HD_TEXT, HD_YELLOW } from "@/app/constants/theme";

const { Text } = Typography;

interface Props {
  activeRules: Set<RuleKey>;
  onToggle: (key: RuleKey) => void;
}

export default function RulesCard({ activeRules, onToggle }: Props) {
  return (
    <Card title="Rules" style={{ marginBottom: 24, borderColor: HD_BORDER }}>
      <Row gutter={[16, 12]}>
        {RULES.map((rule) => (
          <Col key={rule.key} xs={24} sm={12}>
            <Space
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "#1a1a0e",
                border: `1px solid ${
                  activeRules.has(rule.key) ? HD_YELLOW : HD_BORDER
                }`,
                borderRadius: 2,
              }}
            >
              <Space orientation="vertical" size={2}>
                <Text
                  strong
                  style={{
                    fontSize: 13,
                    color: activeRules.has(rule.key) ? HD_YELLOW : HD_TEXT,
                  }}
                >
                  {rule.label}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {rule.description}
                </Text>
              </Space>
              <Switch
                checked={activeRules.has(rule.key)}
                onChange={() => onToggle(rule.key)}
              />
            </Space>
          </Col>
        ))}
      </Row>
    </Card>
  );
}
