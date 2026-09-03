import {
  ArrowLeft, Check, ChevronRight, ExternalLink, Eye, EyeOff, Globe2,
  KeyRound, LoaderCircle, LockKeyhole, Plus, ShieldCheck, Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { AiProviderSummary, ApiProviderInput, CustomAiProviderId } from "../../domain/ai";
import {
  useAiProviders, useDisconnectAiProvider, useLoginCodex, useSaveApiProvider,
  useSelectAiProvider, useTestApiProvider,
} from "../../hooks/useAi";
import { errorMessage } from "../../services/errorMessage";
import { customProvider, fixedProviders, type ProviderId, type ProviderKind } from "./providerCatalog";

function ProviderMark({ kind, initials, logo }: { kind: ProviderKind; initials: string; logo?: string }) {
  return <span className={`provider-mark ${kind}`}>{logo ? <img src={logo} alt="" /> : initials}</span>;
}

function ProviderList({
  selected, summaries, draftId, onSelect, onAdd,
}: { selected: ProviderId; summaries: AiProviderSummary[]; draftId?: CustomAiProviderId;
  onSelect: (id: ProviderId) => void; onAdd: () => void }) {
  const custom = summaries
    .filter((summary) => summary.id !== "codex" && summary.id !== "deepseek")
    .map((summary) => customProvider(summary.id, summary.name));
  const draft = draftId && !custom.some((provider) => provider.id === draftId)
    ? [customProvider(draftId, "新建自定义 API")] : [];
  const providers = [...fixedProviders, ...custom, ...draft];
  return <aside className="provider-list" aria-label="AI 服务商">
    <div className="provider-list-heading"><span>服务商</span><small>{providers.length} 个可用</small></div>
    {providers.map((provider) => {
      const summary = summaries.find((item) => item.id === provider.id);
      const badge = summary?.active && summary.configured ? "当前使用" : summary?.configured ? "已配置" : provider.badge;
      return <button type="button" key={provider.id}
        className={`provider-item${selected === provider.id ? " active" : ""}`}
        onClick={() => onSelect(provider.id)}>
        <ProviderMark kind={provider.kind} initials={provider.initials} logo={provider.logo} />
        <span><strong>{provider.name}</strong><small>{summary?.message ?? provider.summary}</small></span>
        <span className={`provider-badge ${summary?.active ? "green" : provider.accent}`}>{badge}</span>
        <ChevronRight size={16} />
      </button>;
    })}
    <button type="button" className="add-provider-button" onClick={onAdd}>
      <Plus size={16} />新增自定义 API
    </button>
  </aside>;
}

function CodexPanel({ summary }: { summary?: AiProviderSummary }) {
  const login = useLoginCodex();
  const select = useSelectAiProvider();
  const disconnect = useDisconnectAiProvider();
  const [notice, setNotice] = useState("");
  const runLogin = async () => {
    setNotice("");
    try { await login.mutateAsync(undefined); setNotice("Codex 登录成功，已设为当前服务。"); }
    catch (error) { setNotice(errorMessage(error, "Codex 登录失败")); }
  };
  const remove = async () => {
    if (!window.confirm("确定退出知拾专用的 Codex 登录吗？")) return;
    try { await disconnect.mutateAsync("codex"); setNotice("已退出 Codex 登录。"); }
    catch (error) { setNotice(errorMessage(error, "退出登录失败")); }
  };
  return <section className="connection-panel" aria-labelledby="codex-title">
    <div className="connection-heading"><ProviderMark kind="codex" initials="C" logo="/brands/codex.png" />
      <div><span className={`connection-state${summary?.configured ? " ready" : ""}`}><i />
        {summary?.active && summary.configured ? "当前使用" : summary?.configured ? "已登录" : "尚未连接"}</span>
        <h2 id="codex-title">连接 Codex</h2><p>使用浏览器完成登录，知拾不会读取或复用本机 Codex 凭据。</p></div></div>
    <div className="login-flow">
      <div><span>1</span><strong>打开登录页面</strong><small>由 Codex 启动官方授权页</small></div><i />
      <div><span>2</span><strong>完成账号授权</strong><small>登录信息仅在官方网页填写</small></div><i />
      <div><span>3</span><strong>返回知拾</strong><small>授权结果保存到知拾专用目录</small></div>
    </div>
    <div className="privacy-callout"><ShieldCheck size={19} /><div><strong>独立的凭据边界</strong>
      <p>不读取本机 Codex 配置和登录缓存；退出时只清理知拾专用登录。</p></div></div>
    {notice && <div className="connection-notice" role="status">{notice}</div>}
    <div className="connection-actions">
      {summary?.configured && <button type="button" className="button danger" disabled={disconnect.isPending} onClick={remove}>退出登录</button>}
      {summary?.configured && !summary.active && <button type="button" className="button" disabled={select.isPending}
        onClick={() => select.mutate("codex")}>设为当前</button>}
      <button type="button" className="button primary connect-button" disabled={login.isPending} onClick={runLogin}>
        {login.isPending ? <LoaderCircle className="spin" size={17} /> : <Globe2 size={17} />}
        {login.isPending ? "等待浏览器授权…" : summary?.configured ? "重新登录" : "通过浏览器登录"}
        {!login.isPending && <ExternalLink size={14} />}
      </button>
    </div>
  </section>;
}

type ApiPanelProps = {
  id: Exclude<ProviderId, "codex">;
  summary?: AiProviderSummary;
  onRemoved: () => void;
};

function ApiProviderPanel({ id, summary, onRemoved }: ApiPanelProps) {
  const isCustom = id !== "deepseek";
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState(summary?.name ?? (isCustom ? "自定义 API" : "DeepSeek API"));
  const [baseUrl, setBaseUrl] = useState(summary?.baseUrl ?? (isCustom ? "https://api.example.com/v1" : "https://api.deepseek.com"));
  const [model, setModel] = useState(summary?.model ?? (isCustom ? "model-name" : "deepseek-v4-flash"));
  const [apiKey, setApiKey] = useState("");
  const [notice, setNotice] = useState("");
  const save = useSaveApiProvider();
  const test = useTestApiProvider();
  const select = useSelectAiProvider();
  const disconnect = useDisconnectAiProvider();
  const input: ApiProviderInput = { id, name, baseUrl, model, apiKey };
  const run = async (action: "test" | "save") => {
    setNotice("");
    try {
      if (action === "test") { await test.mutateAsync(input); setNotice("连接测试成功。"); }
      else { await save.mutateAsync(input); setApiKey(""); setNotice("配置已安全保存，并设为当前服务。"); }
    } catch (error) { setNotice(errorMessage(error, action === "test" ? "连接测试失败" : "保存失败")); }
  };
  const remove = async () => {
    if (!window.confirm("确定删除该服务配置和 API Key 吗？")) return;
    try { await disconnect.mutateAsync(id); onRemoved(); }
    catch (error) { setNotice(errorMessage(error, "删除配置失败")); }
  };
  const busy = save.isPending || test.isPending || disconnect.isPending;
  return <section className="connection-panel" aria-labelledby={`${id}-title`}>
    <div className="connection-heading"><ProviderMark kind={isCustom ? "custom" : "deepseek"} initials={isCustom ? "A" : "D"}
      logo={isCustom ? undefined : "/brands/deepseek.png"} />
      <div><span className={`connection-state${summary?.configured ? " ready" : ""}`}><i />
        {summary?.active && summary.configured ? "当前使用" : summary?.configured ? "已配置" : "尚未配置"}</span>
        <h2 id={`${id}-title`}>{isCustom ? "配置自定义 API" : "配置 DeepSeek API"}</h2>
        <p>{isCustom ? "填写兼容 OpenAI Chat Completions 格式的模型服务。" : "通过 DeepSeek 官方 OpenAI 兼容接口调用模型。"}</p></div></div>
    <div className="credential-warning"><LockKeyhole size={17} />API Key 保存在系统凭据库中，页面不会回显。</div>
    <div className="connection-form">
      {isCustom && <label><span>服务名称</span><input value={name} onChange={(event) => setName(event.target.value)} aria-label="服务名称" /></label>}
      <label><span>API Key <b>{summary?.configured ? "留空则保留原 Key" : "必填"}</b></span><div className="secret-input"><KeyRound size={16} />
        <input type={visible ? "text" : "password"} value={apiKey} onChange={(event) => setApiKey(event.target.value)}
          placeholder={summary?.configured ? "已安全保存" : "输入 API Key"} aria-label="API Key" autoComplete="off" />
        <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "隐藏 API Key" : "显示 API Key"}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
      <label><span>Base URL</span><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} aria-label="Base URL" /></label>
      <label><span>模型名称</span>{isCustom
        ? <input value={model} onChange={(event) => setModel(event.target.value)} aria-label="模型名称" />
        : <select value={model} onChange={(event) => setModel(event.target.value)} aria-label="模型名称">
          <option value="deepseek-v4-flash">deepseek-v4-flash</option><option value="deepseek-v4-pro">deepseek-v4-pro</option>
          <option value="deepseek-v4-flash-vision-exp">deepseek-v4-flash-vision-exp</option></select>}</label>
    </div>
    {notice && <div className="connection-notice" role="status">{notice.startsWith("连接测试成功") || notice.startsWith("配置已")
      ? <Check size={15} /> : <Sparkles size={15} />}{notice}</div>}
    <div className="form-actions">
      {summary?.configured && <button type="button" className="button danger" disabled={busy} onClick={remove}>删除配置</button>}
      {summary?.configured && !summary.active && <button type="button" className="button" disabled={busy || select.isPending}
        onClick={() => select.mutate(id)}>设为当前</button>}
      <button type="button" className="button" disabled={busy} onClick={() => run("test")}>测试连接</button>
      <button type="button" className="button primary" disabled={busy} onClick={() => run("save")}>保存配置</button>
    </div>
  </section>;
}

export function AiConnectionsPage() {
  const [selected, setSelected] = useState<ProviderId>("codex");
  const [draftId, setDraftId] = useState<CustomAiProviderId>();
  const query = useAiProviders();
  const summaries = query.data ?? [];
  const summary = summaries.find((item) => item.id === selected);
  return <div className="connections-page">
    <header className="connections-header"><button type="button" className="back-link" onClick={() => history.back()}><ArrowLeft size={16} />返回</button>
      <div><span className="eyebrow">AI CONNECTIONS</span><h1>AI 接入</h1></div>
      <span className="connection-count"><b>{summaries.filter((item) => item.configured).length}</b> 个服务可用</span></header>
    {query.error && <div className="inline-error">{errorMessage(query.error, "AI 配置读取失败")}</div>}
    <div className="connections-layout"><ProviderList selected={selected} summaries={summaries} draftId={draftId}
      onSelect={setSelected} onAdd={() => {
        const id = `custom:${crypto.randomUUID()}` as CustomAiProviderId;
        setDraftId(id); setSelected(id);
      }} />
      {selected === "codex" ? <CodexPanel summary={summary} />
        : <ApiProviderPanel key={`${selected}-${summary?.baseUrl}-${summary?.model}`} id={selected} summary={summary}
          onRemoved={() => { if (selected === draftId) setDraftId(undefined); setSelected("codex"); }} />}</div>
  </div>;
}
