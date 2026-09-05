import type { AgentMode, AgentReasoningEffort } from "../../domain/agent";

type Props = {
  mode: AgentMode;
  reasoning: AgentReasoningEffort;
  busy: boolean;
  onModeChange: (mode: AgentMode) => void;
  onReasoningChange: (effort: AgentReasoningEffort) => void;
};

const effortNames: Record<AgentReasoningEffort, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export function AgentControls(props: Props) {
  return <div className="harness-controls">
    <div className="harness-options">
      <div className="harness-modes" aria-label="运行模式">
        <button type="button" aria-pressed={props.mode === "auto"} className={props.mode === "auto" ? "active" : ""} disabled={props.busy}
          onClick={() => props.onModeChange("auto")}>自动</button>
        <button type="button" aria-pressed={props.mode === "chat_only"} className={props.mode === "chat_only" ? "active" : ""} disabled={props.busy}
          onClick={() => props.onModeChange("chat_only")}>仅聊天</button>
      </div>
      <label>思考强度
        <select value={props.reasoning} disabled={props.busy}
          onChange={(event) => props.onReasoningChange(event.target.value as AgentReasoningEffort)}>
          {Object.entries(effortNames).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
  </div>;
}
