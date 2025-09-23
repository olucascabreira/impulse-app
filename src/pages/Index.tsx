import { useState, useEffect } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { FinancialSummary } from "@/components/dashboard/FinancialSummary";
import { useCompanies } from "@/hooks/use-companies";
import { useTransactions } from "@/hooks/use-transactions";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";

const Index = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const { currentCompany } = useCompanies();
  
  // Fetch all transactions for the company (without date filtering)
  const { transactions: allTransactions } = useTransactions(currentCompany?.id);
  
  const { bankAccounts } = useBankAccounts(currentCompany?.id);

  // Initialize with all accounts selected
  useEffect(() => {
    setSelectedAccountIds(bankAccounts.map(account => account.id));
  }, [bankAccounts]);

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId) 
        : [...prev, accountId]
    );
  };

  // Toggle all accounts
  const toggleAllAccounts = () => {
    setSelectedAccountIds(
      selectedAccountIds.length === bankAccounts.length ? [] : bankAccounts.map(account => account.id)
    );
  };

  // Calculate statistics for the selected month using due_date
  const stats = useMemo(() => {
    // Filter transactions for the selected month and year using due_date
    const monthlyTransactions = allTransactions.filter(t => {
      if (!t.due_date) return false; // Skip if no due_date
      const transactionDate = new Date(t.due_date);
      return (
        transactionDate.getMonth() === selectedDate.getMonth() &&
        transactionDate.getFullYear() === selectedDate.getFullYear()
      );
    });

    // For receitas (incomes), we consider 'pago' as realized
    const monthlyRevenue = monthlyTransactions
      .filter(t => t.transaction_type === 'entrada' && t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);

    // For despesas (expenses), we consider 'pago' as realized
    const monthlyExpenses = monthlyTransactions
      .filter(t => t.transaction_type === 'saida' && t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate total cash balance based on selected accounts
    const selectedAccounts = bankAccounts.filter(account => 
      selectedAccountIds.length === 0 || selectedAccountIds.includes(account.id)
    );
    
    const totalCashBalance = selectedAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);

    return {
      monthlyRevenue,
      monthlyExpenses,
      totalCashBalance,
    };
  }, [allTransactions, bankAccounts, selectedDate, selectedAccountIds]);

  // Prepare cash flow data for the chart (last 6 months from selected date) using due_date
  const cashFlowData = useMemo(() => {
    // Group transactions by month for the last 6 months using due_date
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - i, 1);
      
      // Filter transactions for the specific month using due_date
      const monthTransactions = allTransactions.filter(t => {
        if (!t.due_date) return false; // Skip if no due_date
        const transactionDate = new Date(t.due_date);
        return (
          transactionDate.getFullYear() === date.getFullYear() &&
          transactionDate.getMonth() === date.getMonth()
        );
      });
      
      // For receitas (incomes), we consider 'pago' as realized
      const revenue = monthTransactions
        .filter(t => t.transaction_type === 'entrada' && t.status === 'pago')
        .reduce((sum, t) => sum + t.amount, 0);
        
      // For despesas (expenses), we consider 'pago' as realized
      const expenses = monthTransactions
        .filter(t => t.transaction_type === 'saida' && t.status === 'pago')
        .reduce((sum, t) => sum + t.amount, 0);
        
      // Calculate profit (revenue - expenses)
      const profit = revenue - expenses;
        
      // For transfers, we don't count them in revenue or expenses as they're internal movements
      const transfers = monthTransactions
        .filter(t => t.transaction_type === 'transferencia' && t.status === 'transferido')
        .length;
        
      data.push({
        name: date.toLocaleDateString('pt-BR', { month: 'short' }),
        Receitas: parseFloat(revenue.toFixed(2)),
        Despesas: parseFloat(expenses.toFixed(2)),
        Lucro: parseFloat(profit.toFixed(2)),
        Transferências: transfers
      });
    }
    
    return data;
  }, [allTransactions, selectedDate]);

  // Calculate total balance across all accounts (this doesn't change based on date)
  const totalBalance = useMemo(() => {
    const selectedAccounts = bankAccounts.filter(account => 
      selectedAccountIds.length === 0 || selectedAccountIds.includes(account.id)
    );
    
    return selectedAccounts.reduce((sum, account) => sum + account.current_balance, 0);
  }, [bankAccounts, selectedAccountIds]);

  // Filter recent transactions for the selected month using due_date
  const recentTransactions = useMemo(() => {
    const monthlyTransactions = allTransactions.filter(t => {
      if (!t.due_date) return false; // Skip if no due_date
      const transactionDate = new Date(t.due_date);
      return (
        transactionDate.getMonth() === selectedDate.getMonth() &&
        transactionDate.getFullYear() === selectedDate.getFullYear()
      );
    });
    
    return monthlyTransactions.slice(0, 3);
  }, [allTransactions, selectedDate]);

  // Format currency for chart tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Check if all accounts are selected
  const allAccountsSelected = selectedAccountIds.length === bankAccounts.length;
  const someAccountsSelected = selectedAccountIds.length > 0 && selectedAccountIds.length < bankAccounts.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            {currentCompany ? `Visão geral de ${currentCompany.name}` : 'Visão geral do seu sistema financeiro'}
          </p>
        </div>
        <div className="flex items-center">
          <MonthSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
        </div>
      </div>

      {/* Financial Summary Section */}
      <FinancialSummary transactions={allTransactions} selectedDate={selectedDate} />

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo em Caixa
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-bold text-foreground">
                  R$ {stats.totalCashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs mt-1 text-success">
                  ↗ 8.1% vs mês anterior
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px]">
                  <DropdownMenuLabel>Selecionar Contas</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={allAccountsSelected}
                    onCheckedChange={toggleAllAccounts}
                    className="cursor-pointer"
                  >
                    Todas as contas
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {bankAccounts.map(account => (
                    <DropdownMenuCheckboxItem
                      key={account.id}
                      checked={selectedAccountIds.includes(account.id)}
                      onCheckedChange={() => toggleAccount(account.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {account.bank_name || 'Conta Bancária'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {account.account_number 
                            ? `****${account.account_number.slice(-4)}` 
                            : 'Número não informado'}
                        </span>
                      </div>
                      <span className="ml-auto font-medium">
                        R$ {account.current_balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e outras visualizações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cashFlowData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis 
                  tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
                <Tooltip 
                  formatter={(value) => [formatCurrency(Number(value)), 'Valor']}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Legend />
                <Bar dataKey="Receitas" fill="#10b981" name="Receitas" />
                <Bar dataKey="Despesas" fill="#ef4444" name="Despesas" />
                <Bar dataKey="Lucro" fill="#3b82f6" name="Lucro" />
              </BarChart>
            </ResponsiveContainer>
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
                      {transaction.status === 'pago' || transaction.status === 'transferido' ? ' Realizado' : ' Pendente'}
                    </p>
                  </div>
                  <span className={`font-medium ${
                    transaction.transaction_type === 'entrada' 
                      ? 'text-emerald-600' 
                      : transaction.transaction_type === 'transferencia'
                        ? 'text-blue-600'
                        : 'text-red-600'
                  }`}>
                    {transaction.transaction_type === 'entrada' ? '+' : 
                     transaction.transaction_type === 'transferencia' ? '⇄' : '-'}
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
