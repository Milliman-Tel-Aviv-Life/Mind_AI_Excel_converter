import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import WorkbookScreen from "./screens/WorkbookScreen";
import FindingsScreen from "./screens/FindingsScreen";
import PrepScreen from "./screens/PrepScreen";
import AssistantScreen from "./screens/AssistantScreen";
import RecalculateScreen from "./screens/RecalculateScreen";
import ReportsScreen from "./screens/ReportsScreen";
import HistoryScreen from "./screens/HistoryScreen";
import MindScreen from "./screens/MindScreen";
import FixPanel from "./components/FixPanel";

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-[#F9FAFB]">
        <FixPanel />
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto flex flex-col">
            <Routes>
              <Route path="/" element={<WorkbookScreen />} />
              <Route path="/findings" element={<FindingsScreen />} />
              <Route path="/prep" element={<PrepScreen />} />
              <Route path="/assistant" element={<AssistantScreen />} />
              <Route path="/recalculate" element={<RecalculateScreen />} />
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
              <Route path="/mind" element={<MindScreen />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
