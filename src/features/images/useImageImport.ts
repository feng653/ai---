import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { CardAsset } from "../../domain/card";
import { cardService } from "../../services/cardService";
import { errorMessage } from "../../services/errorMessage";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 15 * 1024 * 1024;

export function useImageImport(
  setAssets: Dispatch<SetStateAction<CardAsset[]>>,
  setErrorMessage: Dispatch<SetStateAction<string>>,
) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const selectImage = (file?: File) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) { setErrorMessage("请拖入 PNG、JPG 或 WebP 图片"); return; }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage("仅支持 PNG、JPG 或 WebP 图片"); return;
    }
    if (file.size > MAX_BYTES) { setErrorMessage("图片不能超过 15MB"); return; }
    setErrorMessage("");
    setPendingImage(file);
  };

  const importEditedImage = async (file: File) => {
    setErrorMessage("");
    try {
      const asset = await cardService.importAsset(file);
      setAssets((items) => [...items, asset]);
      setPendingImage(null);
    } catch (reason) {
      const message = errorMessage(reason, "图片导入失败");
      setErrorMessage(message);
      throw new Error(message);
    }
  };

  return {
    fileInput,
    pendingImage,
    selectImage,
    importEditedImage,
    cancelImageEdit: () => setPendingImage(null),
  };
}
