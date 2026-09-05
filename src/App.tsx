import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";

const CardsPage = lazy(() => import("./features/cards/CardsPage")
  .then((module) => ({ default: module.CardsPage })));
const CardDetailPage = lazy(() => import("./features/cards/CardDetailPage")
  .then((module) => ({ default: module.CardDetailPage })));
const CardEditorPage = lazy(() => import("./features/cards/CardEditorPage")
  .then((module) => ({ default: module.CardEditorPage })));
const AiConnectionsPage = lazy(() => import("./features/ai-connections/AiConnectionsPage")
  .then((module) => ({ default: module.AiConnectionsPage })));

function EditorRoute() {
  const location = useLocation();
  return <CardEditorPage key={location.pathname} />;
}

function LoadingPage() {
  return <div className="page-content"><div className="empty-state"><span className="loading-spinner" /></div></div>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<CardsPage />} />
          <Route path="cards/new" element={<EditorRoute />} />
          <Route path="cards/:id" element={<CardDetailPage />} />
          <Route path="cards/:id/edit" element={<EditorRoute />} />
          <Route path="settings/ai" element={<AiConnectionsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
