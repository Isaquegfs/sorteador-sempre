import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { TestModeProvider } from "./contexts/TestModeContext";

createRoot(document.getElementById("root")!).render(
  <TestModeProvider>
    <App />
  </TestModeProvider>
);
