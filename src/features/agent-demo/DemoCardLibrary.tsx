import { CheckCircle2, Library, PencilLine } from "lucide-react";
import { MathContent } from "../../components/MathContent";
import type { DemoCard } from "./types";

export function DemoCardLibrary({ cards }: { cards: DemoCard[] }) {
  return (
    <aside className="demo-card-library">
      <header><Library size={17} /><div><strong>Demo 卡片库</strong><small>仅保存在本页面内存中</small></div><span>{cards.length}</span></header>
      <div className="demo-card-list">
        {cards.map((card) => <article key={card.id}>
          <div><span>{card.subject}</span><em className={card.status}>{card.status === "organized" ? "已整理" : "草稿"}</em></div>
          <MathContent className="demo-card-question">{card.question}</MathContent>
          {card.errorReason && <MathContent className="demo-card-reason">{card.errorReason}</MathContent>}
          <footer>{card.status === "organized" ? <CheckCircle2 size={13} /> : <PencilLine size={13} />}{card.status === "organized" ? "Agent 已整理" : "等待 Agent"}</footer>
        </article>)}
      </div>
    </aside>
  );
}
