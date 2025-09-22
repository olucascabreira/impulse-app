import { useState, useMemo } from 'react';
import { useTransactions } from '@/hooks/use-transactions';
import { useChartAccounts } from '@/hooks/use-chart-accounts';
import { useCompanies } from '@/hooks/use-companies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, Calendar, TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Reports() {
  const { currentCompany } = useCompanies();
  const { transactions } = useTransactions(currentCompany?.id);
  const { chartAccounts } = useChartAccounts(currentCompany?.id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(t => t.status === 'pago');
    
    if (startDate && endDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.payment_date || t.due_date);
        return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
      });
    }
    
    return filtered;
  }, [transactions, startDate, endDate]);

  const dreData = useMemo(() => {
    const revenues = filteredTransactions.filter(t => t.transaction_type === 'entrada');
    const expenses = filteredTransactions.filter(t => t.transaction_type === 'saida');
    
    const totalRevenues = revenues.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    
    const revenuesByAccount = revenues.reduce((acc, t) => {
      const accountId = t.chart_account_id;
      if (accountId) {
        const account = chartAccounts.find(a => a.id === accountId);
        if (account) {
          acc[account.nome] = (acc[account.nome] || 0) + Number(t.amount);
        }
      }
      return acc;
    }, {} as Record<string, number>);
    
    const expensesByAccount = expenses.reduce((acc, t) => {
      const accountId = t.chart_account_id;
      if (accountId) {
        const account = chartAccounts.find(a => a.id === accountId);
        if (account) {
          acc[account.nome] = (acc[account.nome] || 0) + Number(t.amount);
        }
      }
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalRevenues,
      totalExpenses,
      netResult: totalRevenues - totalExpenses,
      revenuesByAccount,
      expensesByAccount,
    };
  }, [filteredTransactions, chartAccounts]);

  const balanceteData = useMemo(() => {
    const accountBalances = {} as Record<string, { debit: number; credit: number; name: string; code?: string }>;
    
    filteredTransactions.forEach(transaction => {
      const accountId = transaction.chart_account_id;
      if (accountId) {
        const account = chartAccounts.find(a => a.id === accountId);
        if (account) {
          if (!accountBalances[accountId]) {
            accountBalances[accountId] = {
              debit: 0,
              credit: 0,
              name: account.nome,
              code: account.codigo,
            };
          }
          
          const amount = Number(transaction.amount);
          if (transaction.transaction_type === 'entrada') {
            if (account.tipo === 'receita') {
              accountBalances[accountId].credit += amount;
            } else {
              accountBalances[accountId].debit += amount;
            }
          } else {
            if (account.tipo === 'despesa') {
              accountBalances[accountId].debit += amount;
            } else {
              accountBalances[accountId].credit += amount;
            }
          }
        }
      }
    });
    
    return Object.entries(accountBalances).map(([id, data]) => ({
      id,
      ...data,
      balance: data.debit - data.credit,
    }));
  }, [filteredTransactions, chartAccounts]);

  const exportToExcel = (data: any[], filename: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportDRE = () => {
    const dreExportData = [
      { Descrição: 'RECEITAS', Valor: '' },
      ...Object.entries(dreData.revenuesByAccount).map(([account, value]) => ({
        Descrição: `  ${account}`,
        Valor: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      })),
      { Descrição: 'Total de Receitas', Valor: dreData.totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
      { Descrição: '', Valor: '' },
      { Descrição: 'DESPESAS', Valor: '' },
      ...Object.entries(dreData.expensesByAccount).map(([account, value]) => ({
        Descrição: `  ${account}`,
        Valor: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      })),
      { Descrição: 'Total de Despesas', Valor: dreData.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
      { Descrição: '', Valor: '' },
      { Descrição: 'RESULTADO LÍQUIDO', Valor: dreData.netResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    ];
    
    exportToExcel(dreExportData, `DRE_${format(new Date(), 'yyyy-MM-dd')}`, 'DRE');
  };

  const exportBalancete = () => {
    const balanceteExportData = balanceteData.map(item => ({
      Código: item.code || '',
      Conta: item.name,
      Débito: item.debit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      Crédito: item.credit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      Saldo: item.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    }));
    
    exportToExcel(balanceteExportData, `Balancete_${format(new Date(), 'yyyy-MM-dd')}`, 'Balancete');
  };

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para visualizar os relatórios.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Análise contábil e financeira de {currentCompany.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="period">Período Pré-definido</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="quarter">Este Trimestre</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="custom">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dre" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dre" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            DRE
          </TabsTrigger>
          <TabsTrigger value="balancete" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Balancete
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dre">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Demonstração do Resultado do Exercício (DRE)</CardTitle>
              <Button onClick={exportDRE} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">RECEITAS</h3>
                  <div className="space-y-2">
                    {Object.entries(dreData.revenuesByAccount).map(([account, value]) => (
                      <div key={account} className="flex justify-between">
                        <span className="ml-4">{account}</span>
                        <span className="font-medium text-green-600">
                          {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total de Receitas</span>
                      <span className="text-green-600">
                        {dreData.totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">DESPESAS</h3>
                  <div className="space-y-2">
                    {Object.entries(dreData.expensesByAccount).map(([account, value]) => (
                      <div key={account} className="flex justify-between">
                        <span className="ml-4">{account}</span>
                        <span className="font-medium text-red-600">
                          {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total de Despesas</span>
                      <span className="text-red-600">
                        {dreData.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>RESULTADO LÍQUIDO</span>
                    <span className={dreData.netResult >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {dreData.netResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balancete">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Balancete de Verificação</CardTitle>
              <Button onClick={exportBalancete} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceteData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">
                        {item.debit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.credit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receitas Totais</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dreData.totalRevenues.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dreData.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resultado Líquido</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dreData.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dreData.netResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dreData.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dreData.totalRevenues > 0 ? ((dreData.netResult / dreData.totalRevenues) * 100).toFixed(1) : '0.0'}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}