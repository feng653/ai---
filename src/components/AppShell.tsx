import { BookOpenCheck, CirclePlus, Search, Sparkles } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAiStatus, useConnectAi } from "../hooks/useAi";
import { errorMessage } from "../services/errorMessage";
import { AgentWindow } from "../features/agent-demo/AgentWindow";

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const aiStatus = useAiStatus();
  const connect = useConnectAi();
  const connected = aiStatus.data?.state === "connected";

  const handleAi = async () => {
    if (connected) return;
    try {
      await connect.mutateAsync();
    } catch (error) {
      window.alert(errorMessage(error, "AI 连接失败"));
    }
  };

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
        </nav>
        <div className="local-note">
          <span>本地优先</span>
          <small>无需产品账号，手动功能离线可用</small>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => navigate("/")}>
            <span className="brand-mark"><BookOpenCheck size={18} /></span>知拾
          </button>
          <div className="breadcrumb">
            {location.pathname === "/" ? <><Search size={16} />错题库</> : "整理错题"}
          </div>
          <div className="top-actions">
            <button
              className={`ai-status ${connected ? "connected" : ""}`}
              onClick={handleAi}
              disabled={connect.isPending}
              title={aiStatus.data?.message}
            >
              <span className="status-dot" />
              <Sparkles size={15} />
              {connect.isPending ? "正在连接…" : connected ? "AI 已连接" : "AI 未连接"}
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
