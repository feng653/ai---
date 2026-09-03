import type { CardAsset, CardInput } from "../../domain/card";
import type { CardFormValues } from "./CardEditorFields";

export const scalarKeys: (keyof CardFormValues)[] = [
  "subject", "question", "userAnswer", "correctAnswer", "supplementalNote",
  "solution", "errorLocation", "errorReason", "errorType",
];

export function formValues(input: CardInput): CardFormValues {
  return Object.fromEntries(scalarKeys.map((key) => [key, input[key]])) as CardFormValues;
}

export function storableAssets(assets: CardAsset[]): CardAsset[] {
  return assets.map((asset) => asset.previewUrl?.startsWith("blob:")
    ? { ...asset, previewUrl: undefined } : asset);
}

export function comparableInput(input: CardInput): CardInput {
  return { ...input, assets: storableAssets(input.assets) };
}
