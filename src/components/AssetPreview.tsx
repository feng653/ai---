import { Image } from "lucide-react";
import { useEffect, useState } from "react";
import type { CardAsset } from "../domain/card";
import { cardService } from "../services/cardService";

type Props = {
  asset: CardAsset;
  alt: string;
  fallback?: "compact" | "full";
};

export function AssetPreview({ asset, alt, fallback = "full" }: Props) {
  const [url, setUrl] = useState<string | null>(asset.previewUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let generatedUrl: string | null = asset.previewUrl?.startsWith("blob:")
      ? asset.previewUrl
      : null;
    if (!asset.previewUrl) {
      void cardService.getAssetPreview(asset).then((nextUrl) => {
        if (!active) {
          if (nextUrl?.startsWith("blob:")) URL.revokeObjectURL(nextUrl);
          return;
        }
        generatedUrl = nextUrl;
        setUrl(nextUrl);
      }).catch(() => active && setFailed(true));
    }
    return () => {
      active = false;
      if (generatedUrl?.startsWith("blob:")) URL.revokeObjectURL(generatedUrl);
    };
  }, [asset]);

  if (url && !failed) return <img src={url} alt={alt} onError={() => setFailed(true)} />;
  return (
    <div className={fallback === "full" ? "asset-placeholder" : undefined}>
      <Image size={fallback === "full" ? 20 : 24} />
      {failed ? "图片读取失败" : asset.relativePath}
    </div>
  );
}
