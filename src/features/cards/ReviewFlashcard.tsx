import { useId, useState } from "react";
import { AssetPreview } from "../../components/AssetPreview";
import { MathContent } from "../../components/MathContent";
import type { Card } from "../../domain/card";

export function ReviewFlashcard({ card }: { card: Card }) {
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  return <div className={`review-flashcard${flipped ? " flipped" : ""}`}>
    <div className="review-flashcard-body">
      <section id={`${id}-front`} className="review-flashcard-face" aria-hidden={flipped} inert={flipped}>
        <span className="review-face-label">题目</span>
        <MathContent>{card.question || "图片题目"}</MathContent>
        {card.assets.map((asset) => <AssetPreview key={asset.id} asset={asset} alt="题目图片" />)}
      </section>
      <section id={`${id}-back`} className="review-flashcard-face review-flashcard-back" aria-hidden={!flipped} inert={!flipped}>
        <span className="review-face-label">答案</span>
        <MathContent>{card.correctAnswer || "暂无答案"}</MathContent>
        {card.solution && <div className="review-flashcard-solution"><MathContent>{card.solution}</MathContent></div>}
      </section>
    </div>
    <button type="button" className="review-flashcard-toggle" aria-label={flipped ? "翻回题目" : "翻面查看答案"}
      aria-describedby={`${id}-${flipped ? "back" : "front"}`} onClick={() => setFlipped((value) => !value)} />
  </div>;
}
