import { invoke } from "@tauri-apps/api/core";

export type CodexModels = {
  models: Array<{ model: string; displayName: string; isDefault: boolean }>;
  selected: string | null;
};
export const codexModelService = {
  list: () => invoke<CodexModels>("list_codex_models"),
  save: (model: string) => invoke<void>("save_codex_model", { model }),
};
