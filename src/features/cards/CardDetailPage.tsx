import { ArrowLeft, Edit3, Image, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AssetPreview } from "../../components/AssetPreview";
import { MathContent } from "../../components/MathContent";
import { useCard, useCards, useDeleteCard } from "../../hooks/useCards";
import { errorMessage } from "../../services/errorMessage";

export function CardDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const card = useCard(id);
  const sourceCards = useCards({ kind: "mistake" });
  const remove = useDeleteCard();
  const [actionError, setActionError] = useState("");

  if (card.isLoading) return <div className="page-content"><div className="empty-state"><span className="loading-spinner" /></div></div>;
  if (!card.data) return <div className="page-content"><div className="empty-state"><h3>找不到这张错题</h3><button className="button" onClick={() => navigate("/")}>返回错题库</button></div></div>;

  const item = card.data;
  const handleDelete = async () => {
    if (!window.confirm("删除后无法恢复，确认删除这张错题吗？")) return;
    setActionError("");
    try { await remove.mutateAsync(item.id); navigate("/"); }
    catch (error) { setActionError(errorMessage(error, "删除失败，请重试")); }
  };

  return (
    <div className="page-content detail-page">
      <div className="detail-toolbar">
        <button className="button ghost" onClick={() => navigate("/")}><ArrowLeft size={17} />返回</button>
        <div className="toolbar-actions">
          <button className="button danger ghost" onClick={handleDelete} disabled={remove.isPending}><Trash2 size={16} />删除</button>
          <button className="button" onClick={() => navigate(`/cards/${item.id}/edit?ai=1`)}><Sparkles size={16} />AI 重新整理</button>
          <button className="button primary" onClick={() => navigate(`/cards/${item.id}/edit`)}><Edit3 size={16} />编辑卡片</button>
        </div>
      </div>

      <section className="detail-heading">
        <div>
          {item.kind === "practice" && <span className="practice-kind">习题卡</span>}
          <span className={`card-status ${item.status}`}>{item.status === "organized" ? "已整理" : "待完善"}</span>
          <span>{item.subject || "未分类"}</span>
        </div>
        <MathContent className="detail-question">{item.question || "仅保存了原始图片"}</MathContent>
        <small>最近修改：{new Date(item.updatedAt).toLocaleString("zh-CN")}</small>
      </section>
      {actionError && <p className="inline-error" role="alert">{actionError}</p>}

      {item.kind === "practice" && <section className="detail-block practice-origin">
        <h3>来源错题与版本</h3><div>{(item.sourceRevisions ?? []).map((source) => {
          const origin = sourceCards.data?.find((candidate) => candidate.id === source.cardId);
          return <button type="button" key={source.cardId} disabled={!origin}
            onClick={() => origin && navigate(`/cards/${origin.id}`)}><span>{origin?.question || "来源卡片已删除"}</span>
            <small>revision {source.revision}</small></button>;
        })}</div>
      </section>}

      {item.assets.length > 0 && (
        <section className="detail-block">
          <h3><Image size={16} />原始图片</h3>
          <div className="asset-grid">
            {item.assets.map((asset) => <AssetPreview key={asset.id} asset={asset} alt="原始题目" />)}
          </div>
        </section>
      )}

      <section className="answer-comparison detail-block">
        <h3>作答对照</h3>
        <div>
          <article className="answer wrong"><small>我的答案</small><MathContent>{item.userAnswer || "未填写"}</MathContent></article>
          <article className="answer correct"><small>正确答案</small><MathContent>{item.correctAnswer || "待补充"}</MathContent></article>
        </div>
      </section>

      <section className="detail-block">
        <h3>正确解法</h3>
        <MathContent>{item.solution || "还没有填写正确解法。"}</MathContent>
      </section>

      <section className="detail-block diagnosis-block">
        <h3>错因诊断</h3>
        <dl>
          <div><dt>第一处错误 · {item.errorType || "未分类"}</dt><dd><MathContent>{item.errorLocation || "暂未定位错误位置"}</MathContent></dd></div>
          <div><dt>为什么会错</dt><dd><MathContent>{item.errorReason || "尚未进行诊断，可手动填写或使用 AI 整理。"}</MathContent></dd></div>
        </dl>
      </section>

      {item.supplementalNote && <section className="detail-block"><h3>补充说明</h3><MathContent>{item.supplementalNote}</MathContent></section>}

      <section className="detail-block">
        <h3>关联知识点</h3>
        <div className="knowledge-paths">
          {item.knowledgePoints.length ? item.knowledgePoints.map((point) => (
            <span key={`${point.subject}-${point.chapter}-${point.name}`}>{point.subject} <b>›</b> {point.chapter || "未分类章节"} <b>›</b> {point.name}</span>
          )) : <p>未关联知识点</p>}
        </div>
      </section>
    </div>
  );
}
