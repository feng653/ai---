import { useState } from "react";
import { canSaveCard, type Card, type CardInput } from "../../domain/card";
import type { SaveCardRequest } from "../../services/cardService";
import { cardService } from "../../services/cardService";
import { errorMessage } from "../../services/errorMessage";
import { aiOrganizeRuns } from "./aiOrganizeRun";
import { storableAssets } from "./cardEditorModel";

type Options = {
  input: CardInput;
  draftKey: string;
  aiRunKey: string;
  saveCard: (request: SaveCardRequest) => Promise<Card>;
  onError: (message: string) => void;
  onLeave: () => void;
};

export function useNewCardLeave(options: Options) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const canSave = canSaveCard(options.input);

  const finish = () => {
    localStorage.removeItem(options.draftKey);
    setOpen(false);
    options.onLeave();
  };

  const discard = async () => {
    setSaving(true);
    aiOrganizeRuns.discard(options.aiRunKey);
    await Promise.allSettled(options.input.assets.map((asset) => cardService.deleteAsset(asset.id)));
    setSaving(false);
    finish();
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    options.onError("");
    try {
      const saved = await options.saveCard({
        input: { ...options.input, assets: storableAssets(options.input.assets) },
        forceDraft: true,
      });
      aiOrganizeRuns.move(options.aiRunKey, `card-editor:${saved.id}`);
      finish();
    } catch (reason) {
      options.onError(errorMessage(reason, "草稿保存失败，请重试"));
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return {
    open, saving, canSave,
    request: () => setOpen(true),
    cancel: () => setOpen(false),
    discard,
    save,
  };
}
