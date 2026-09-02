import { BookOpenCheck, CirclePlus, Search, Sparkles } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AgentWindow } from "../features/agent-demo/AgentWindow";

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAiSettings = location.pathname === "/settings/ai";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("/")}>
          <span className="brand-mark"><BookOpenCheck size={21} /></span>
          <span><strong>知拾</strong><small>个人错题卡片</small></span>
        </button>
        <p className="nav-label">错题库</p>
        <nav className="side-nav">
          <NavLink to="/" end><BookOpenCheck size={18} />我的错题</NavLink>
          <NavLink to="/cards/new"><CirclePlus size={18} />新增错题</NavLink>
          <NavLink to="/settings/ai"><Sparkles size={18} />AI 接入</NavLink>
        </nav>
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
