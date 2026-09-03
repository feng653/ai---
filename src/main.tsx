import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "katex/dist/katex.min.css";
import "./styles/global.css";
import "./styles/image-editor.css";
import "./styles/agent-demo.css";
import "./styles/agent-harness.css";
import "./styles/ai-connections.css";
import "./styles/knowledge-tree.css";
import "./styles/learning-content.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
