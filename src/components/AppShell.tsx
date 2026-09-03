import { BookOpenCheck, CirclePlus, PanelLeftClose, PanelLeftOpen, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AgentWindow } from "../features/agent-demo/AgentWindow";

const SIDEBAR_STORAGE_KEY = "zhishi:sidebar-collapsed";

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAiSettings = location.pathname === "/settings/ai";
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true",
  );

  function toggleSidebar() {
    setIsSidebarCollapsed((collapsed) => {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!collapsed));
      return !collapsed;
    });
  }

  return (
    <div className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("/")} title={isSidebarCollapsed ? "知拾首页" : undefined}>
          <span className="brand-mark"><BookOpenCheck size={21} /></span>
          <span className="brand-copy"><strong>知拾</strong><small>个人错题卡片</small></span>
        </button>
        <p className="nav-label">错题库</p>
        <nav className="side-nav">
          <NavLink to="/" end title="我的错题"><BookOpenCheck size={18} /><span>我的错题</span></NavLink>
          <NavLink to="/cards/new" title="新增错题"><CirclePlus size={18} /><span>新增错题</span></NavLink>
          <NavLink to="/settings/ai" title="AI 接入"><Sparkles size={18} /><span>AI 接入</span></NavLink>
        </nav>
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          title={isSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span>{isSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}</span>
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => navigate("/")}>
            <span className="brand-mark"><BookOpenCheck size={18} /></span>知拾
          </button>
          <div className="breadcrumb">
            {location.pathname === "/" ? <><Search size={16} />错题库</> : isAiSettings ? "设置 / AI 接入" : "整理错题"}
          </div>
          <div className="top-actions">
            <button
              className={`ai-status ${isAiSettings ? "connected" : ""}`}
              onClick={() => navigate("/settings/ai")}
              title="管理 AI 服务"
            >
              <span className="status-dot" />
              <Sparkles size={15} />
              AI 接入
            </button>
            <button className="button primary" onClick={() => navigate("/cards/new")}>
              <CirclePlus size={17} />新增错题
            </button>
          </div>
        </header>
        <Outlet />
      </main>
      <AgentWindow />
    </div>
  );
}
