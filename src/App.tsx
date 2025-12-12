import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import AlertsPage from "./pages/AlertsPage";
import FlowsPage from "./pages/FlowsPage";
import AgentsPage from "./pages/AgentsPage";
import TerminalPage from "./pages/TerminalPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/monitor" element={<Navigate to="/" replace />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/ids" element={<AlertsPage />} />
          <Route path="/flows" element={<FlowsPage />} />
          <Route path="/map" element={<Navigate to="/" replace />} />
          <Route path="/soc" element={<Navigate to="/alerts" replace />} />
          <Route path="/terminal" element={<TerminalPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;