export type CropRect = { x: number; y: number; width: number; height: number };
export type QuarterTurn = 0 | 1 | 2 | 3;

export const FULL_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function cropFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
): CropRect {
  const left = clamp(Math.min(start.x, end.x));
  const top = clamp(Math.min(start.y, end.y));
  const right = clamp(Math.max(start.x, end.x));
  const bottom = clamp(Math.max(start.y, end.y));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function validCrop(crop: CropRect): CropRect {
  return crop.width >= 0.02 && crop.height >= 0.02 ? crop : FULL_CROP;
}

export function orientedDimensions(width: number, height: number, turns: QuarterTurn) {
  return turns % 2 === 0 ? { width, height } : { width: height, height: width };
}

export function previewDimensions(
  width: number,
  height: number,
  turns: QuarterTurn,
  maxWidth = 960,
  maxHeight = 560,
) {
  const oriented = orientedDimensions(width, height, turns);
  const scale = Math.min(1, maxWidth / oriented.width, maxHeight / oriented.height);
  return {
    width: Math.max(1, Math.round(oriented.width * scale)),
    height: Math.max(1, Math.round(oriented.height * scale)),
  };
}

export function drawRotated(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  turns: QuarterTurn,
  width: number,
  height: number,
) {
  context.save();
  if (turns === 1) {
    context.translate(width, 0);
    context.rotate(Math.PI / 2);
    context.drawImage(image, 0, 0, height, width);
  } else if (turns === 2) {
    context.translate(width, height);
    context.rotate(Math.PI);
    context.drawImage(image, 0, 0, width, height);
  } else if (turns === 3) {
    context.translate(0, height);
    context.rotate(-Math.PI / 2);
    context.drawImage(image, 0, 0, height, width);
  } else {
    context.drawImage(image, 0, 0, width, height);
  }
  context.restore();
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("图片导出失败")),
      mimeType,
      mimeType === "image/png" ? undefined : 0.92,
    );
  });
}

export async function exportEditedImage(
  source: File,
  image: HTMLImageElement,
  turns: QuarterTurn,
  requestedCrop: CropRect,
): Promise<File> {
  const crop = validCrop(requestedCrop);
  const dimensions = orientedDimensions(image.naturalWidth, image.naturalHeight, turns);
  const scale = Math.min(
    1,
    6000 / dimensions.width,
    6000 / dimensions.height,
    Math.sqrt(16_000_000 / (dimensions.width * dimensions.height)),
  );
  const oriented = document.createElement("canvas");
  oriented.width = Math.max(1, Math.round(dimensions.width * scale));
  oriented.height = Math.max(1, Math.round(dimensions.height * scale));
  const orientedContext = oriented.getContext("2d");
  if (!orientedContext) throw new Error("当前环境不支持图片编辑");
  drawRotated(orientedContext, image, turns, oriented.width, oriented.height);

  const sx = Math.round(crop.x * oriented.width);
  const sy = Math.round(crop.y * oriented.height);
  const sw = Math.max(1, Math.round(crop.width * oriented.width));
  const sh = Math.max(1, Math.round(crop.height * oriented.height));
  const output = document.createElement("canvas");
  output.width = Math.min(sw, oriented.width - sx);
  output.height = Math.min(sh, oriented.height - sy);
  const outputContext = output.getContext("2d");
  if (!outputContext) throw new Error("当前环境不支持图片编辑");
  outputContext.drawImage(oriented, sx, sy, output.width, output.height, 0, 0, output.width, output.height);

  const mimeType = ["image/png", "image/jpeg", "image/webp"].includes(source.type)
    ? source.type
    : "image/png";
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  const baseName = source.name.replace(/\.[^.]+$/, "") || "image";
  const blob = await canvasBlob(output, mimeType);
  return new File([blob], `${baseName}-edited.${extension}`, { type: mimeType });
}
