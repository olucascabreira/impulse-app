import { StatCard } from "@/components/dashboard/StatCard";
import { useCompanies } from "@/hooks/use-companies";
import { useTransactions } from "@/hooks/use-transactions";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";

const Index = () => {
  const { currentCompany } = useCompanies();
  const { transactions } = useTransactions(currentCompany?.id);
  const { bankAccounts } = useBankAccounts(currentCompany?.id);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = transactions.filter(t => 
      new Date(t.created_at) >= firstDayOfMonth
    );

    const monthlyRevenue = monthlyTransactions
      .filter(t => t.transaction_type === 'entrada' && t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.transaction_type === 'saida' && t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCashBalance = bankAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);

    const accountsReceivable = transactions
      .filter(t => t.transaction_type === 'entrada' && t.status === 'pendente')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      monthlyRevenue,
      monthlyExpenses,
      totalCashBalance,
      accountsReceivable,
    };
  }, [transactions, bankAccounts]);

  const recentTransactions = transactions.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {currentCompany ? `Visão geral de ${currentCompany.name}` : 'Visão geral do seu sistema financeiro'}
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receitas do Mês"
          value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          trend={{ value: "12.5% vs mês anterior", isPositive: true }}
        />
        <StatCard
          title="Despesas do Mês"
          value={`R$ ${stats.monthlyExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          trend={{ value: "3.2% vs mês anterior", isPositive: false }}
        />
        <StatCard
          title="Saldo em Caixa"
          value={`R$ ${stats.totalCashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          trend={{ value: "8.1% vs mês anterior", isPositive: true }}
        />
        <StatCard
          title="Contas a Receber"
          value={`R$ ${stats.accountsReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={CreditCard}
          trend={{ value: "5.4% vs mês anterior", isPositive: true }}
        />
      </div>

      {/* Gráficos e outras visualizações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa</h3>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Gráfico será implementado aqui
          </div>
        </div>
        
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Últimas Transações</h3>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString('pt-BR')} • 
                      {transaction.status === 'pago' ? ' Pago' : ' Pendente'}
                    </p>
                  </div>
                  <span className={`font-medium ${
                    transaction.transaction_type === 'entrada' 
                      ? 'text-emerald-600' 
                      : 'text-red-600'
                  }`}>
                    {transaction.transaction_type === 'entrada' ? '+' : '-'}
                    R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma transação encontrada</p>
                <p className="text-sm">Comece criando seus lançamentos financeiros</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
