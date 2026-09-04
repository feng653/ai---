import { LoaderCircle, Sparkles } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { AiProposal, ProposalKey } from "../../domain/ai";
import type { KnowledgePoint } from "../../domain/card";
import type { AiProgress } from "../../services/aiService";
import { MathContent } from "../../components/MathContent";
import { AiRequirementsField } from "./AiRequirementsField";

const labels: Record<ProposalKey, string> = {
  question: "题目", userAnswer: "我的答案", correctAnswer: "正确答案",
  solution: "正确解法", errorLocation: "第一处错误", errorReason: "错误原因",
  errorType: "错误类型", knowledgePoints: "知识点",
};

function proposalText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item: KnowledgePoint) =>
      `${item.subject} › ${item.chapter || "未分类章节"} › ${item.name}`).join("\n");
  }
  return String(value ?? "");
}

function ProposalValue({ field, value }: { field: ProposalKey; value: unknown }) {
  const text = proposalText(value);
  if (field === "knowledgePoints" || field === "errorType") return <small>{text}</small>;
  return <MathContent className="proposal-value">{text}</MathContent>;
}

type Props = {
  progress: AiProgress | null;
  proposal: AiProposal | null;
  runError: string | null;
  acceptedFields: ProposalKey[];
  connected: boolean;
  connecting: boolean;
  additionalRequirements: string;
  setAdditionalRequirements: (value: string) => void;
  setAcceptedFields: Dispatch<SetStateAction<ProposalKey[]>>;
  isFieldConflict: (key: ProposalKey) => boolean;
  organize: () => Promise<void>;
  applyProposal: () => void;
  dismissRun: () => void;
};

export function AiReviewPanel(props: Props) {
  const { progress, proposal, runError, acceptedFields, connected, connecting,
    additionalRequirements, setAdditionalRequirements, setAcceptedFields,
    isFieldConflict, organize, applyProposal, dismissRun } = props;
  return (
    <aside className="ai-review-panel">
      <div className="ai-panel-heading"><span><Sparkles size={18} /></span><div><h2>AI 整理</h2><p>建议不会自动覆盖你的内容</p></div></div>
      {!proposal && <AiRequirementsField id="mistake-card-ai-requirements"
        value={additionalRequirements} onChange={setAdditionalRequirements}
        disabled={Boolean(progress) || connecting} />}
      {progress ? (
        <div className="ai-progress" role="status" aria-live="polite" aria-atomic="true"><LoaderCircle className="spin" size={22} /><strong>{progress.message}</strong><small>可以离开本页，返回后仍可查看进度和结果</small></div>
      ) : proposal ? (
        <div className="proposal-review">
          <div className="success-note" role="status">已生成整理建议，请逐项确认。</div>
          {proposal.warnings.map((warning) => <p className="proposal-warning" key={warning}>{warning}</p>)}
          {(Object.keys(proposal.fields) as ProposalKey[]).map((key) => {
            const suggestion = proposal.fields[key];
            if (!suggestion || suggestion.value === null) return null;
            const conflict = isFieldConflict(key);
            return (
              <label className={`proposal-field ${conflict ? "conflict" : ""}`} key={key}>
                <input
                  type="checkbox"
                  checked={acceptedFields.includes(key)}
                  onChange={(event) => setAcceptedFields((items) =>
                    event.target.checked ? [...items, key] : items.filter((item) => item !== key))}
                />
                <span>
                  <strong>{labels[key]}{conflict && <em>编辑后有变化</em>}</strong>
                  <ProposalValue field={key} value={suggestion.value} />
                  {suggestion.uncertain && <i>{suggestion.uncertainReason || "AI 对此项不确定"}</i>}
                </span>
              </label>
            );
          })}
          <div className="proposal-actions">
            <button type="button" className="button ghost" onClick={dismissRun}>拒绝全部</button>
            <button type="button" className="button primary" disabled={!acceptedFields.length} onClick={applyProposal}>接受所选</button>
          </div>
        </div>
      ) : runError ? (
        <div className="ai-idle">
          <div className="inline-error" role="alert">上次 AI 整理未完成：{runError}</div>
          <div className="proposal-actions">
            <button type="button" className="button ghost" onClick={dismissRun}>忽略</button>
            <button type="button" className="button primary" onClick={organize} disabled={connecting}>重新整理</button>
          </div>
        </div>
      ) : (
        <div className="ai-idle">
          <p>识别题目、分析答案、诊断错因并推荐知识点。生成后由你确认。</p>
          <button className="button primary wide" type="button" onClick={organize} disabled={connecting}>
            <Sparkles size={17} />AI 整理
          </button>
          <small>未连接 AI 不影响手动编辑和保存。</small>
        </div>
      )}
    </aside>
  );
}
