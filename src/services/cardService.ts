import { BrowserCardService } from "./browserCardService";
import type { CardService } from "./cardService.types";
import { TauriCardService } from "./tauriCardService";

export type { CardService, PracticeCardDraft, SaveCardRequest } from "./cardService.types";
export { BrowserCardService } from "./browserCardService";
export { TauriCardService } from "./tauriCardService";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

export const cardService: CardService = isTauriRuntime()
  ? new TauriCardService()
  : new BrowserCardService();
