import { ChevronDown, ShieldCheck, Wrench } from "lucide-react";
import type { AgentMode, AgentReasoningEffort, AgentToolManifest } from "../../domain/agent";

type Props = {
  mode: AgentMode;
  reasoning: AgentReasoningEffort;
  tools: AgentToolManifest[];
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
    <div className="harness-policy">
      <ShieldCheck size={14} />
      <span>读取自动执行，创建、修改和删除必须经你批准</span>
    </div>
    <div className="harness-options">
      <div className="harness-modes" aria-label="运行模式">
        <button className={props.mode === "auto" ? "active" : ""} disabled={props.busy}
          onClick={() => props.onModeChange("auto")}>自动</button>
        <button className={props.mode === "chat_only" ? "active" : ""} disabled={props.busy}
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
    <details className="harness-tools">
      <summary><Wrench size={13} />可用工具 <span>{props.tools.length}</span><ChevronDown size={13} /></summary>
      <div>{props.tools.map((tool) => <article key={tool.name}>
        <code>{tool.name}</code><small>{tool.description}</small>
        <em className={tool.sideEffect ? "write" : "read"}>{tool.sideEffect ? "需批准" : "只读"}</em>
      </article>)}</div>
    </details>
  </div>;
}
