import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Card } from "../../domain/card";
import { MathContent } from "../../components/MathContent";
import { AssetPreview } from "../../components/AssetPreview";

export function ReviewCardDialog({ card, origin, opener, onClose }: {
  card: Card; origin: DOMRect; opener: HTMLElement | null; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = opener;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    const end = dialog.getBoundingClientRect();
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches && end.width && end.height) {
      dialog.animate?.([
        { transform: `translate(${origin.x - end.x}px, ${origin.y - end.y}px) scale(${origin.width / end.width}, ${origin.height / end.height})`, opacity: .5 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, [origin, opener]);
  return createPortal(<dialog ref={ref} className="review-card-dialog" aria-label="复习卡详情"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header><strong>复习卡</strong><button type="button" autoFocus onClick={onClose} aria-label="关闭详情">关闭</button></header>
    <div className="review-card-dialog-content">
      <section><h2>题目</h2><MathContent>{card.question || "图片题目"}</MathContent>
        {card.assets.map((asset) => <AssetPreview key={asset.id} asset={asset} alt="题目图片" />)}</section>
      <section><h2>答案</h2><MathContent>{card.correctAnswer || "暂无答案"}</MathContent></section>
      {card.solution && <section><h2>解法</h2><MathContent>{card.solution}</MathContent></section>}
    </div>
  </dialog>, document.body);
}
