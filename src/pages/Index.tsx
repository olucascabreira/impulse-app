import { useState, useEffect } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalReceitas: number;
  totalDespesas: number;
  saldoAtual: number;
  contasPendentes: number;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalReceitas: 0,
    totalDespesas: 0,
    saldoAtual: 0,
    contasPendentes: 0
  });
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // For now, we'll use mock data since the user might not have companies/transactions yet
      setStats({
        totalReceitas: 25430.50,
        totalDespesas: 18230.25,
        saldoAtual: 7200.25,
        contasPendentes: 12
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo, {profile?.nome}! Aqui está o resumo da sua situação financeira.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Saldo Atual"
          value={`R$ ${stats.saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          trend={{ value: "12% do mês passado", isPositive: true }}
        />
        
        <StatCard
          title="Receitas do Mês"
          value={`R$ ${stats.totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend={{ value: "8% do mês passado", isPositive: true }}
        />
        
        <StatCard
          title="Despesas do Mês"
          value={`R$ ${stats.totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          trend={{ value: "3% do mês passado", isPositive: false }}
        />
        
        <StatCard
          title="Contas Pendentes"
          value={stats.contasPendentes.toString()}
          icon={AlertTriangle}
          trend={{ value: "5 vencem esta semana", isPositive: false }}
        />
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <button className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <span>Novo Lançamento</span>
                <TrendingUp className="h-4 w-4" />
              </button>
              <button className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <span>Registrar Pagamento</span>
                <Wallet className="h-4 w-4" />
              </button>
              <button className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <span>Ver Relatórios</span>
                <Calendar className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mock recent transactions */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Venda de Serviços</p>
                  <p className="text-sm text-muted-foreground">Cliente XYZ Ltda</p>
                </div>
                <span className="text-success font-semibold">+R$ 2.500,00</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Aluguel Escritório</p>
                  <p className="text-sm text-muted-foreground">Imobiliária ABC</p>
                </div>
                <span className="text-destructive font-semibold">-R$ 1.200,00</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium">Fornecedor de Materiais</p>
                  <p className="text-sm text-muted-foreground">Materiais Tech Ltda</p>
                </div>
                <span className="text-destructive font-semibold">-R$ 850,00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
