import { Check, Crop, LoaderCircle, RotateCcw, RotateCw, Undo2, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  FULL_CROP,
  cropFromPoints,
  drawRotated,
  exportEditedImage,
  previewDimensions,
  validCrop,
  type CropRect,
  type QuarterTurn,
} from "./imageEdit";

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => Promise<void>;
};

function pointerPosition(event: ReactPointerEvent<HTMLDivElement>) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) / bounds.width,
    y: (event.clientY - bounds.top) / bounds.height,
  };
}

export function ImageEditorDialog({ file, onCancel, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [turns, setTurns] = useState<QuarterTurn>(0);
  const [crop, setCrop] = useState<CropRect>(FULL_CROP);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.onerror = () => setError("图片无法读取，请重新选择");
    nextImage.src = url;
    setImage(null);
    setTurns(0);
    setCrop(FULL_CROP);
    setError("");
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [busy, onCancel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const size = previewDimensions(image.naturalWidth, image.naturalHeight, turns);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) { setError("当前环境不支持图片编辑"); return; }
    context.clearRect(0, 0, size.width, size.height);
    drawRotated(context, image, turns, size.width, size.height);
  }, [image, turns]);

  const rotate = (change: -1 | 1) => {
    setTurns((current) => ((current + change + 4) % 4) as QuarterTurn);
    setCrop(FULL_CROP);
  };

  const startSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!image || busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    dragStart.current = point;
    setCrop({ ...point, width: 0, height: 0 });
    setDragging(true);
  };

  const moveSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStart.current) return;
    setCrop(cropFromPoints(dragStart.current, pointerPosition(event)));
  };

  const finishSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const nextCrop = cropFromPoints(dragStart.current, pointerPosition(event));
    setCrop(validCrop(nextCrop));
    dragStart.current = null;
    setDragging(false);
  };

  const confirm = async () => {
    if (!image || busy) return;
    setBusy(true);
    setError("");
    try {
      const edited = await exportEditedImage(file, image, turns, crop);
      await onConfirm(edited);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "图片处理失败");
      setBusy(false);
    }
  };

  return (
    <div className="image-editor-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section className="image-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="image-editor-title">
        <header>
          <div><h2 id="image-editor-title">调整题目图片</h2><p>在图片上拖拽框选保留区域，也可以旋转方向。</p></div>
          <button type="button" aria-label="关闭图片编辑" onClick={onCancel} disabled={busy}><X size={19} /></button>
        </header>

        <div className="image-editor-toolbar" aria-label="图片编辑工具">
          <button type="button" onClick={() => rotate(-1)} disabled={!image || busy}><RotateCcw size={17} />向左旋转</button>
          <button type="button" onClick={() => rotate(1)} disabled={!image || busy}><RotateCw size={17} />向右旋转</button>
          <button type="button" onClick={() => { setTurns(0); setCrop(FULL_CROP); }} disabled={!image || busy}><Undo2 size={17} />重置</button>
          <span><Crop size={15} />拖拽图片进行框选</span>
        </div>

        <div className="image-editor-stage">
          {!image && !error && <div className="image-editor-loading"><LoaderCircle className="spin" />正在读取图片…</div>}
          <div
            className="image-editor-canvas-wrap"
            hidden={!image}
            onPointerDown={startSelection}
            onPointerMove={moveSelection}
            onPointerUp={finishSelection}
            onPointerCancel={() => {
              setCrop((current) => validCrop(current));
              dragStart.current = null;
              setDragging(false);
            }}
          >
            <canvas ref={canvasRef} />
            <div className="crop-selection" style={{
              left: `${crop.x * 100}%`, top: `${crop.y * 100}%`,
              width: `${crop.width * 100}%`, height: `${crop.height * 100}%`,
            }}><i /><i /><i /><i /></div>
          </div>
        </div>

        {error && <div className="image-editor-error" role="alert">{error}</div>}
        <footer>
          <small>输出上限为 1600 万像素，超大图片会等比缩小。</small>
          <button className="button" type="button" onClick={onCancel} disabled={busy}>取消</button>
          <button className="button primary" type="button" onClick={confirm} disabled={!image || busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}确认使用
          </button>
        </footer>
      </section>
    </div>
  );
}
