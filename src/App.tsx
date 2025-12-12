import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
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
          {/* Redirect all sidebar routes to dashboard for now */}
          <Route path="/monitor" element={<Navigate to="/" replace />} />
          <Route path="/alerts" element={<Navigate to="/" replace />} />
          <Route path="/ids" element={<Navigate to="/" replace />} />
          <Route path="/flows" element={<Navigate to="/" replace />} />
          <Route path="/map" element={<Navigate to="/" replace />} />
          <Route path="/soc" element={<Navigate to="/" replace />} />
          <Route path="/terminal" element={<Navigate to="/" replace />} />
          <Route path="/agents" element={<Navigate to="/" replace />} />
          <Route path="/logs" element={<Navigate to="/" replace />} />
          <Route path="/settings" element={<Navigate to="/" replace />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
