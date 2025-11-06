import { useState, useMemo, useEffect } from 'react';
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
import { format, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Reports() {
  const { currentCompany } = useCompanies();
  const { transactions } = useTransactions(currentCompany?.id);
  const { chartAccounts } = useChartAccounts(currentCompany?.id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedPeriod, setSelectedPeriod] = useState('year');

  // Atualizar datas quando o ano mudar
  useEffect(() => {
    if (selectedPeriod === 'year' && selectedYear) {
      const year = parseInt(selectedYear);
      const start = startOfYear(new Date(year, 0, 1));
      const end = endOfYear(new Date(year, 0, 1));
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(end, 'yyyy-MM-dd'));
    }
  }, [selectedYear, selectedPeriod]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    // Incluir transações pagas E recebidas (receitas são marcadas como 'recebido')
    let filtered = transactions.filter(t => t.status === 'pago' || t.status === 'recebido');

    if (startDate && endDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.payment_date || t.due_date);
        return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
      });
    }

    return filtered;
  }, [transactions, startDate, endDate]);

  const dreData = useMemo(() => {
    if (!chartAccounts) {
      return {
        receitaBruta: 0,
        receitaLiquida: 0,
        custosTotal: 0,
        resultadoBruto: 0,
        despesasVendas: 0,
        despesasAdministrativas: 0,
        despesasFinanceiras: 0,
        outrasDespesas: 0,
        despesasOperacionais: 0,
        resultadoOperacional: 0,
        resultadoLiquido: 0,
        revenuesByAccount: {},
        expensesByCategory: {},
        margemBruta: 0,
        margemOperacional: 0,
        margemLiquida: 0,
      };
    }

    const revenues = filteredTransactions.filter(t => t.transaction_type === 'entrada');
    const expenses = filteredTransactions.filter(t => t.transaction_type === 'saida');

    // Agrupar receitas por conta contábil
    const revenuesByAccount = revenues.reduce((acc, t) => {
      const accountId = t.chart_account_id;
      if (accountId) {
        const account = chartAccounts.find(a => a.id === accountId);
        if (account) {
          const key = account.codigo ? `${account.codigo} - ${account.nome}` : account.nome;
          acc[key] = (acc[key] || 0) + Number(t.amount);
        }
      }
      return acc;
    }, {} as Record<string, number>);

    // Categorizar despesas por tipo
    const categorizeExpense = (accountName: string) => {
      const name = accountName.toLowerCase();
      if (name.includes('custo') || name.includes('cmv') || name.includes('csv')) {
        return 'custos';
      } else if (name.includes('venda') || name.includes('comercial') || name.includes('marketing')) {
        return 'vendas';
      } else if (name.includes('administrativa') || name.includes('administra')) {
        return 'administrativas';
      } else if (name.includes('financeira') || name.includes('juros') || name.includes('tarifa')) {
        return 'financeiras';
      } else {
        return 'outras';
      }
    };

    const expensesByCategory = expenses.reduce((acc, t) => {
      const accountId = t.chart_account_id;
      if (accountId) {
        const account = chartAccounts.find(a => a.id === accountId);
        if (account) {
          const category = categorizeExpense(account.nome);
          const key = account.codigo ? `${account.codigo} - ${account.nome}` : account.nome;

          if (!acc[category]) {
            acc[category] = {};
          }
          acc[category][key] = (acc[category][key] || 0) + Number(t.amount);
        }
      }
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Calcular totais
    const receitaBruta = Object.values(revenuesByAccount).reduce((sum, v) => sum + v, 0);
    const custosTotal = Object.values(expensesByCategory.custos || {}).reduce((sum, v) => sum + v, 0);
    const despesasVendas = Object.values(expensesByCategory.vendas || {}).reduce((sum, v) => sum + v, 0);
    const despesasAdministrativas = Object.values(expensesByCategory.administrativas || {}).reduce((sum, v) => sum + v, 0);
    const despesasFinanceiras = Object.values(expensesByCategory.financeiras || {}).reduce((sum, v) => sum + v, 0);
    const outrasDespesas = Object.values(expensesByCategory.outras || {}).reduce((sum, v) => sum + v, 0);

    const receitaLiquida = receitaBruta; // Simplificado - em um sistema real, subtrairia deduções
    const resultadoBruto = receitaLiquida - custosTotal;
    const despesasOperacionais = despesasVendas + despesasAdministrativas + despesasFinanceiras + outrasDespesas;
    const resultadoOperacional = resultadoBruto - despesasOperacionais;
    const resultadoLiquido = resultadoOperacional;

    return {
      receitaBruta,
      receitaLiquida,
      custosTotal,
      resultadoBruto,
      despesasVendas,
      despesasAdministrativas,
      despesasFinanceiras,
      outrasDespesas,
      despesasOperacionais,
      resultadoOperacional,
      resultadoLiquido,
      revenuesByAccount,
      expensesByCategory,
      margemBruta: receitaLiquida > 0 ? (resultadoBruto / receitaLiquida) * 100 : 0,
      margemOperacional: receitaLiquida > 0 ? (resultadoOperacional / receitaLiquida) * 100 : 0,
      margemLiquida: receitaLiquida > 0 ? (resultadoLiquido / receitaLiquida) * 100 : 0,
    };
  }, [filteredTransactions, chartAccounts]);

  const balanceteData = useMemo(() => {
    if (!chartAccounts) return [];

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
      { Descrição: `DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO - ${selectedYear}`, Valor: '', Percentual: '' },
      { Descrição: '', Valor: '', Percentual: '' },
      { Descrição: 'RECEITA BRUTA DE VENDAS', Valor: '', Percentual: '' },
      ...Object.entries(dreData.revenuesByAccount).map(([account, value]) => ({
        Descrição: `  ${account}`,
        Valor: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Percentual: `${((value / dreData.receitaBruta) * 100).toFixed(2)}%`,
      })),
      { Descrição: '(=) RECEITA LÍQUIDA', Valor: dreData.receitaLiquida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), Percentual: '100.00%' },
      { Descrição: '', Valor: '', Percentual: '' },
      { Descrição: '(-) CUSTOS DAS VENDAS', Valor: '', Percentual: '' },
      ...Object.entries(dreData.expensesByCategory.custos || {}).map(([account, value]) => ({
        Descrição: `  ${account}`,
        Valor: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Percentual: `${((value / dreData.receitaLiquida) * 100).toFixed(2)}%`,
      })),
      { Descrição: '(=) RESULTADO BRUTO', Valor: dreData.resultadoBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), Percentual: `${dreData.margemBruta.toFixed(2)}%` },
      { Descrição: '', Valor: '', Percentual: '' },
      { Descrição: '(-) DESPESAS OPERACIONAIS', Valor: '', Percentual: '' },
      { Descrição: 'Despesas com Vendas', Valor: '', Percentual: '' },
      ...Object.entries(dreData.expensesByCategory.vendas || {}).map(([account, value]) => ({
        Descrição: `  ${account}`,
        Valor: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Percentual: `${((value / dreData.receitaLiquida) * 100).toFixed(2)}%`,
      })),
      { Descrição: 'Despesas Administrativas', Valor: '', Percentual: '' },
      ...Object.entries(dreData.expensesByCategory.administrativas || {}).map(([account, value]) => ({
        Descrição: `  ${account}`,
        Valor: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Percentual: `${((value / dreData.receitaLiquida) * 100).toFixed(2)}%`,
      })),
      { Descrição: 'Despesas Financeiras', Valor: '', Percentual: '' },
      ...Object.entries(dreData.expensesByCategory.financeiras || {}).map(([account, value]) => ({
        Descrição: `  ${account}`,
        Valor: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Percentual: `${((value / dreData.receitaLiquida) * 100).toFixed(2)}%`,
      })),
      { Descrição: 'Outras Despesas', Valor: '', Percentual: '' },
      ...Object.entries(dreData.expensesByCategory.outras || {}).map(([account, value]) => ({
        Descrição: `  ${account}`,
        Valor: value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        Percentual: `${((value / dreData.receitaLiquida) * 100).toFixed(2)}%`,
      })),
      { Descrição: '(=) RESULTADO OPERACIONAL', Valor: dreData.resultadoOperacional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), Percentual: `${dreData.margemOperacional.toFixed(2)}%` },
      { Descrição: '', Valor: '', Percentual: '' },
      { Descrição: '(=) RESULTADO LÍQUIDO DO EXERCÍCIO', Valor: dreData.resultadoLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), Percentual: `${dreData.margemLiquida.toFixed(2)}%` },
    ];

    exportToExcel(dreExportData, `DRE_${selectedYear}_${format(new Date(), 'yyyy-MM-dd')}`, 'DRE');
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="year">Ano do Exercício</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedPeriod('custom');
                }}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedPeriod('custom');
                }}
              />
            </div>
            <div>
              <Label htmlFor="period">Período Pré-definido</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year">Ano Completo</SelectItem>
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
              <div>
                <CardTitle>Demonstração do Resultado do Exercício (DRE)</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Exercício: {selectedYear} | Período: {startDate && format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR })} a {endDate && format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              <Button onClick={exportDRE} variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%]">Descrição</TableHead>
                    <TableHead className="text-right w-[25%]">Valor (R$)</TableHead>
                    <TableHead className="text-right w-[15%]">AV (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* RECEITA BRUTA */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">RECEITA BRUTA DE VENDAS</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {Object.entries(dreData.revenuesByAccount).map(([account, value]) => (
                    <TableRow key={account}>
                      <TableCell className="pl-8">{account}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {((value / dreData.receitaBruta) * 100).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>(=) RECEITA LÍQUIDA</TableCell>
                    <TableCell className="text-right text-green-600">
                      {dreData.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">100.00%</TableCell>
                  </TableRow>

                  {/* CUSTOS */}
                  {Object.keys(dreData.expensesByCategory.custos || {}).length > 0 && (
                    <>
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-bold">(-) CUSTOS DAS VENDAS</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {Object.entries(dreData.expensesByCategory.custos || {}).map(([account, value]) => (
                        <TableRow key={account}>
                          <TableCell className="pl-8">{account}</TableCell>
                          <TableCell className="text-right text-red-600">
                            ({value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((value / dreData.receitaLiquida) * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                  <TableRow className="font-bold border-t-2">
                    <TableCell>(=) RESULTADO BRUTO</TableCell>
                    <TableCell className={`text-right ${dreData.resultadoBruto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dreData.resultadoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {dreData.margemBruta.toFixed(2)}%
                    </TableCell>
                  </TableRow>

                  {/* DESPESAS OPERACIONAIS */}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">(-) DESPESAS OPERACIONAIS</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Despesas com Vendas */}
                  {Object.keys(dreData.expensesByCategory.vendas || {}).length > 0 && (
                    <>
                      <TableRow className="bg-muted/30">
                        <TableCell className="pl-4 font-semibold">Despesas com Vendas</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {Object.entries(dreData.expensesByCategory.vendas || {}).map(([account, value]) => (
                        <TableRow key={account}>
                          <TableCell className="pl-8">{account}</TableCell>
                          <TableCell className="text-right text-red-600">
                            ({value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((value / dreData.receitaLiquida) * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* Despesas Administrativas */}
                  {Object.keys(dreData.expensesByCategory.administrativas || {}).length > 0 && (
                    <>
                      <TableRow className="bg-muted/30">
                        <TableCell className="pl-4 font-semibold">Despesas Administrativas</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {Object.entries(dreData.expensesByCategory.administrativas || {}).map(([account, value]) => (
                        <TableRow key={account}>
                          <TableCell className="pl-8">{account}</TableCell>
                          <TableCell className="text-right text-red-600">
                            ({value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((value / dreData.receitaLiquida) * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* Despesas Financeiras */}
                  {Object.keys(dreData.expensesByCategory.financeiras || {}).length > 0 && (
                    <>
                      <TableRow className="bg-muted/30">
                        <TableCell className="pl-4 font-semibold">Despesas Financeiras</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {Object.entries(dreData.expensesByCategory.financeiras || {}).map(([account, value]) => (
                        <TableRow key={account}>
                          <TableCell className="pl-8">{account}</TableCell>
                          <TableCell className="text-right text-red-600">
                            ({value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((value / dreData.receitaLiquida) * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* Outras Despesas */}
                  {Object.keys(dreData.expensesByCategory.outras || {}).length > 0 && (
                    <>
                      <TableRow className="bg-muted/30">
                        <TableCell className="pl-4 font-semibold">Outras Despesas Operacionais</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                      {Object.entries(dreData.expensesByCategory.outras || {}).map(([account, value]) => (
                        <TableRow key={account}>
                          <TableCell className="pl-8">{account}</TableCell>
                          <TableCell className="text-right text-red-600">
                            ({value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {((value / dreData.receitaLiquida) * 100).toFixed(2)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}

                  <TableRow className="font-bold border-t-2">
                    <TableCell>(=) RESULTADO OPERACIONAL</TableCell>
                    <TableCell className={`text-right ${dreData.resultadoOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dreData.resultadoOperacional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {dreData.margemOperacional.toFixed(2)}%
                    </TableCell>
                  </TableRow>

                  {/* RESULTADO LÍQUIDO */}
                  <TableRow className="font-bold border-t-4 bg-muted/50 text-lg">
                    <TableCell>(=) RESULTADO LÍQUIDO DO EXERCÍCIO</TableCell>
                    <TableCell className={`text-right ${dreData.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {dreData.resultadoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {dreData.margemLiquida.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Indicadores Adicionais */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Margem Bruta</p>
                  <p className={`text-2xl font-bold ${dreData.margemBruta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dreData.margemBruta.toFixed(2)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Margem Operacional</p>
                  <p className={`text-2xl font-bold ${dreData.margemOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dreData.margemOperacional.toFixed(2)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Margem Líquida</p>
                  <p className={`text-2xl font-bold ${dreData.margemLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {dreData.margemLiquida.toFixed(2)}%
                  </p>
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
                <CardTitle className="text-sm font-medium">Receita Líquida</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dreData.receitaLiquida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Operacionais</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {(dreData.despesasOperacionais + dreData.custosTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resultado Líquido</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dreData.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dreData.resultadoLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margem Líquida</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dreData.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dreData.margemLiquida.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}