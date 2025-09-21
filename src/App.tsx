import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AppLayout } from "./components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CashFlow from "./pages/CashFlow";
import Transactions from "./pages/Transactions";
import Companies from "./pages/Companies";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<AppLayout><Index /></AppLayout>} />
            <Route path="/empresas" element={<AppLayout><Companies /></AppLayout>} />
            <Route path="/fluxo-caixa" element={<AppLayout><CashFlow /></AppLayout>} />
            <Route path="/contas-bancarias" element={<AppLayout><div>Contas Bancárias - Em desenvolvimento</div></AppLayout>} />
            <Route path="/lancamentos" element={<AppLayout><Transactions /></AppLayout>} />
            <Route path="/contas-pagar" element={<AppLayout><div>Contas a Pagar - Em desenvolvimento</div></AppLayout>} />
            <Route path="/contas-receber" element={<AppLayout><div>Contas a Receber - Em desenvolvimento</div></AppLayout>} />
            <Route path="/contatos" element={<AppLayout><div>Contatos - Em desenvolvimento</div></AppLayout>} />
            <Route path="/plano-contas" element={<AppLayout><div>Plano de Contas - Em desenvolvimento</div></AppLayout>} />
            <Route path="/relatorios" element={<AppLayout><div>Relatórios - Em desenvolvimento</div></AppLayout>} />
            <Route path="/configuracoes" element={<AppLayout><div>Configurações - Em desenvolvimento</div></AppLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
