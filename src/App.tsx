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
import BankAccounts from "./pages/BankAccounts";
import ChartAccounts from "./pages/ChartAccounts";
import Reports from "./pages/Reports";
import Contacts from "./pages/Contacts";
import AccountsPayable from "./pages/AccountsPayable";
import AccountsReceivable from "./pages/AccountsReceivable";
import Settings from "./pages/Settings";
import RecurringTransactions from "./pages/RecurringTransactions";

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
            <Route path="/contas-bancarias" element={<AppLayout><BankAccounts /></AppLayout>} />
            <Route path="/lancamentos" element={<AppLayout><Transactions /></AppLayout>} />
            <Route path="/contas-pagar" element={<AppLayout><AccountsPayable /></AppLayout>} />
            <Route path="/contas-receber" element={<AppLayout><AccountsReceivable /></AppLayout>} />
            <Route path="/contatos" element={<AppLayout><Contacts /></AppLayout>} />
            <Route path="/plano-contas" element={<AppLayout><ChartAccounts /></AppLayout>} />
            <Route path="/relatorios" element={<AppLayout><Reports /></AppLayout>} />
            <Route path="/configuracoes" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="/transacoes-recorrentes" element={<AppLayout><RecurringTransactions /></AppLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
