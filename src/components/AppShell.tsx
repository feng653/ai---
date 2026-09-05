import {
  BookOpenCheck, CirclePlus, PanelLeftClose, PlugZap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AgentWorkspace } from "../features/agent/AgentWorkspace";
import { KnowledgeTreeFilter } from "../features/cards/KnowledgeTreeFilter";
import { KnowledgeWorkspaceContext, type LibraryView } from "../features/cards/KnowledgeWorkspaceContext";
import type { KnowledgeSelection } from "../features/cards/knowledgeTree";
import { useEditorDraftPath } from "../features/cards/editorDraftStore";
import { useCards } from "../hooks/useCards";

const SIDEBAR_STORAGE_KEY = "zhishi:sidebar-collapsed";
const isTauri = () => Boolean(window.__TAURI_INTERNALS__);

function pageContext(pathname: string) {
  if (pathname === "/") return { eyebrow: "学习工作台", title: "错题库" };
  if (pathname === "/settings/ai") return { eyebrow: "设置", title: "AI 接入" };
  if (pathname.endsWith("/edit") || pathname === "/cards/new") return { eyebrow: "卡片编辑器", title: "整理一道错题" };
  return { eyebrow: "错题详情", title: "查看学习记录" };
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const context = pageContext(location.pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [location.pathname]);
  const [selection, setSelection] = useState<KnowledgeSelection | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<LibraryView>("cards");
  const allCards = useCards({ kind: "mistake" });
  const mistakeIds = useMemo(() => new Set((allCards.data ?? []).map((card) => card.id)), [allCards.data]);
  const draftPath = useEditorDraftPath(mistakeIds);
  const captureLabel = draftPath ? "继续编辑" : "添加错题";
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
  );
  const workspace = useMemo(() => ({ selection, setSelection, query, setQuery, view, setView }), [selection, query, view]);

  function toggleSidebar() {
    setIsSidebarCollapsed((collapsed) => {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!collapsed));
      return !collapsed;
    });
  }
  function handleBrandClick() {
    if (isSidebarCollapsed) { toggleSidebar(); return; }
    navigate("/");
  }

  return <KnowledgeWorkspaceContext.Provider value={workspace}>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}${mobileOpen ? " mobile-sidebar-open" : ""}`}>
      <aside className="sidebar" id="app-sidebar">
        <div className="sidebar-header"><button className="brand" onClick={handleBrandClick}
          aria-label={isSidebarCollapsed ? "展开侧边栏" : "知拾首页"}
          title={isSidebarCollapsed ? "展开侧边栏" : "知拾首页"}>
          <span className="brand-mark"><BookOpenCheck size={22} /></span>
          <span className="brand-copy"><strong>知拾</strong></span>
        </button></div>
        <nav className="side-nav" aria-label="主导航">
          <NavLink to="/" end title="错题库"><BookOpenCheck /><span>错题库</span></NavLink>
          <NavLink to={draftPath || "/cards/new"} title={captureLabel}><CirclePlus /><span>{captureLabel}</span></NavLink>
          <NavLink to="/settings/ai" title="AI 接入"><PlugZap /><span>AI 接入</span></NavLink>
        </nav>
        <KnowledgeTreeFilter cards={allCards.data ?? []}
          hidden={location.pathname !== "/" || isSidebarCollapsed}
          selection={selection} onChange={setSelection} />
        <div className="sidebar-footer">
          {!isSidebarCollapsed && <button className="sidebar-toggle" onClick={toggleSidebar}
            aria-label="收起侧边栏" title="收起侧边栏"><PanelLeftClose /><span>收起侧边栏</span></button>}
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" aria-label="关闭导航" onClick={() => setMobileOpen(false)} />}
      <section className="main-area">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => setMobileOpen((open) => !open)} aria-label="切换导航" aria-expanded={mobileOpen} aria-controls="app-sidebar">
            <span className="brand-mark"><BookOpenCheck /></span></button>
          <div className="page-context"><strong>{context.title}</strong></div>
          <span className="runtime-badge"><i />{isTauri() ? "桌面运行" : "模拟"}</span>
          <button className="button quiet top-action" onClick={() => navigate(draftPath || "/cards/new")}>
            <CirclePlus /><span>{captureLabel}</span></button>
        </header>
        <main id="main-content"><Outlet /></main>
      </section>
      <AgentWorkspace />
    </div>
  </KnowledgeWorkspaceContext.Provider>;
}
