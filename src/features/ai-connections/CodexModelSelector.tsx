import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { codexModelService } from "../../services/codexModelService";
import { errorMessage } from "../../services/errorMessage";

export function CodexModelSelector({ current, disabled }: { current?: string; disabled?: boolean }) {
  const client = useQueryClient();
  const [choice, setChoice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const catalog = useQuery({ queryKey: ["codex-models"], queryFn: codexModelService.list,
    enabled: !disabled, retry: false, staleTime: 0 });
  const save = useMutation({ mutationFn: codexModelService.save, onSuccess: async (_, model) => {
    client.setQueryData(["codex-models"], (old: typeof catalog.data) => old ? { ...old, selected: model } : old);
    setSaved(true);
    await client.invalidateQueries({ queryKey: ["ai-providers"] });
  } });
  const selected = choice ?? catalog.data?.selected ?? current ?? "";
  const models = catalog.data?.models ?? [];
  const available = models.some((model) => model.model === selected);
  const busy = disabled || catalog.isFetching || save.isPending;
  return <div className="codex-model-selector">
    <label className="field">模型<select value={selected} disabled={busy || catalog.isError}
      onChange={(event) => { setChoice(event.target.value); setSaved(false); save.reset(); }}>
      {!selected && <option value="">选择模型</option>}
      {selected && !available && <option value={selected}>{selected}（不可用）</option>}
      {models.map((model) => <option key={model.model} value={model.model}>{model.displayName}{model.isDefault ? "（默认）" : ""}</option>)}
    </select></label>
    <div className="connection-actions">
      <button type="button" className="button" disabled={busy} onClick={() => void catalog.refetch()}>刷新模型</button>
      <button type="button" className="button primary" disabled={busy || !available || catalog.isError}
        onClick={() => { setSaved(false); save.mutate(selected); }}>{save.isPending ? "保存中…" : "保存模型"}</button>
    </div>
    {catalog.isFetching && <p role="status">加载模型中…</p>}
    {saved && <p role="status">模型已保存</p>}
    {(catalog.error || save.error) && <p role="alert">{errorMessage(catalog.error || save.error, "模型设置失败")}</p>}
  </div>;
}
