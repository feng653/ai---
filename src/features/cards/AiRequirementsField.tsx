type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helper?: string;
  placeholder?: string;
};

export const AI_REQUIREMENTS_MAX_LENGTH = 500;

export function AiRequirementsField({
  id, value, onChange, disabled = false,
  helper = "AI 会在不改变卡片范围和可靠性规则的前提下参考这些要求。",
  placeholder = "例如：步骤更简洁，重点说明我容易混淆的地方",
}: Props) {
  const helperId = `${id}-helper`;
  return <label className="ai-requirements-field" htmlFor={id}>
    <span><strong>附加要求</strong><small>可选</small></span>
    <textarea id={id} value={value} disabled={disabled} rows={3}
      maxLength={AI_REQUIREMENTS_MAX_LENGTH} aria-describedby={helperId}
      placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    <span id={helperId} className="ai-requirements-helper">
      <small>{helper}</small><small>{value.length}/{AI_REQUIREMENTS_MAX_LENGTH}</small>
    </span>
  </label>;
}
