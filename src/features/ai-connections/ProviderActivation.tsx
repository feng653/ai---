import type { AiProviderSummary } from "../../domain/ai";

export function ProviderActivation({ summary, busy, onSelect }: {
  summary?: AiProviderSummary;
  busy: boolean;
  onSelect: () => void;
}) {
  if (!summary?.configured) return null;
  return <button type="button" className="button provider-activation"
    disabled={busy || summary.active} onClick={onSelect}>
    {summary.active ? "当前使用" : "设为当前"}
  </button>;
}
