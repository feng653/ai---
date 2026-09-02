import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";

const CardsPage = lazy(() => import("./features/cards/CardsPage")
  .then((module) => ({ default: module.CardsPage })));
const CardDetailPage = lazy(() => import("./features/cards/CardDetailPage")
  .then((module) => ({ default: module.CardDetailPage })));
const CardEditorPage = lazy(() => import("./features/cards/CardEditorPage")
  .then((module) => ({ default: module.CardEditorPage })));

function LoadingPage() {
  return <div className="page-content"><div className="empty-state"><span className="loading-spinner" /></div></div>;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<CardsPage />} />
          <Route path="cards/new" element={<CardEditorPage />} />
          <Route path="cards/:id" element={<CardDetailPage />} />
          <Route path="cards/:id/edit" element={<CardEditorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
