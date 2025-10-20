import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Participantes from "./pages/admin/Participantes";
import BaseOficial from "./pages/admin/BaseOficial";
import Sorteio from "./pages/admin/Sorteio";
import Usuarios from "./pages/admin/Usuarios";
import Configuracoes from "./pages/admin/Configuracoes";
import Sobre from "./pages/admin/Sobre";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="participantes" element={<Participantes />} />
              <Route path="base-oficial" element={<BaseOficial />} />
              <Route path="sorteio" element={<Sorteio />} />
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="sobre" element={<Sobre />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
