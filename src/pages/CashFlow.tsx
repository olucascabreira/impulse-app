import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Calendar, TrendingUp, TrendingDown, DollarSign, Settings, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useTransactions } from '@/hooks/use-transactions';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { useChartAccounts } from '@/hooks/use-chart-accounts';
import { useContacts } from '@/hooks/use-contacts';
import { useCompanies } from '@/hooks/use-companies';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { format, parse, setMonth, setYear, startOfMonth, endOfMonth, isSameMonth, parseISO, subMonths, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Helper function to format payment method
const formatPaymentMethod = (method: string | undefined) => {
  if (!method) return '-';
  
  const paymentMethodMap: Record<string, string> = {
    'dinheiro': 'Dinheiro',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'pix': 'PIX',
    'transferencia_bancaria': 'Transferência Bancária',
    'cheque': 'Cheque',
    'boleto': 'Boleto',
    'outro': 'Outro'
  };
  
  return paymentMethodMap[method] || method;
};

export default function CashFlow() {
  const { companies } = useCompanies();
  const currentCompany = companies[0]; // Assuming first company for now
  
  const { transactions, loading: loadingTransactions } = useTransactions(currentCompany?.id);
  const { bankAccounts } = useBankAccounts(currentCompany?.id);
  const { chartAccounts } = useChartAccounts(currentCompany?.id);
  const { contacts } = useContacts(currentCompany?.id);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    type: true,
    description: true,
    contact: true,
    account: true,
    payment_method: true,
    value: true,
    due_date: true,
    status: true,
  });

  // Calculate totals and filtered transactions
  const { filteredTransactions, totalRevenue, totalExpense, balance } = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transaction.contacts?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || transaction.transaction_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
      
      return matchesSearch && matchesType && matchesStatus;
    });

    const revenue = filtered
      .filter(t => t.transaction_type === 'entrada' && t.status !== 'cancelado')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = filtered
      .filter(t => t.transaction_type === 'saida' && t.status !== 'cancelado')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      filteredTransactions: filtered,
      totalRevenue: revenue,
      totalExpense: expense,
      balance: revenue - expense
    };
  }, [transactions, searchTerm, typeFilter, statusFilter]);

  // State for date range picker in header (defaults to current month)
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Filter transactions based on date range
  const filteredByDateRange = useMemo(() => {
    if (!dateRange.from && !dateRange.to) {
      return filteredTransactions;
    }

    return filteredTransactions.filter(transaction => {
      // Exclude transactions without due_date when date filter is active
      if (!transaction.due_date) return false;

      const transactionDate = parseISO(transaction.due_date);
      const fromDate = dateRange.from ? new Date(dateRange.from) : new Date(0); // Beginning of time
      const toDate = dateRange.to ? new Date(dateRange.to) : new Date(8640000000000000); // End of time

      return transactionDate >= fromDate && transactionDate <= toDate;
    });
  }, [filteredTransactions, dateRange]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredByDateRange];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'type':
          aValue = a.transaction_type;
          bValue = b.transaction_type;
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'contact':
          aValue = a.contacts?.name?.toLowerCase() || '';
          bValue = b.contacts?.name?.toLowerCase() || '';
          break;
        case 'account':
          aValue = a.chart_accounts?.nome?.toLowerCase() || '';
          bValue = b.chart_accounts?.nome?.toLowerCase() || '';
          break;
        case 'payment_method':
          aValue = a.payment_method || '';
          bValue = b.payment_method || '';
          break;
        case 'value':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredByDateRange, sortColumn, sortDirection]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Calculate totals based on date range filter
  const { totalRevenueByDateRange, totalExpenseByDateRange, balanceByDateRange } = useMemo(() => {
    const revenue = filteredByDateRange
      .filter(t => t.transaction_type === 'entrada' && t.status !== 'cancelado')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = filteredByDateRange
      .filter(t => t.transaction_type === 'saida' && t.status !== 'cancelado')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalRevenueByDateRange: revenue,
      totalExpenseByDateRange: expense,
      balanceByDateRange: revenue - expense
    };
  }, [filteredByDateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const },
      pago: { label: 'Pago', variant: 'default' as const },
      recebido: { label: 'Recebido', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config?.variant || 'secondary'}>{config?.label || status}</Badge>;
  };

  const getTransactionIcon = (type: string) => {
    return type === 'entrada' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  if (loadingTransactions) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Gerencie suas transações financeiras</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Calendar Button in Header */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                {dateRange.from && dateRange.to
                  ? isSameMonth(dateRange.from, dateRange.to)
                    ? format(dateRange.from, "MMMM yyyy", { locale: ptBR })
                    : `${format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yy", { locale: ptBR })}`
                  : "Selecionar período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 border-b">
                <p className="text-sm font-medium mb-2">Atalhos rápidos</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: startOfMonth(new Date()),
                      to: endOfMonth(new Date())
                    })}
                  >
                    Este mês
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lastMonth = subMonths(new Date(), 1);
                      setDateRange({
                        from: startOfMonth(lastMonth),
                        to: endOfMonth(lastMonth)
                      });
                    }}
                  >
                    Mês passado
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: startOfMonth(subMonths(new Date(), 2)),
                      to: endOfMonth(new Date())
                    })}
                  >
                    Últimos 3 meses
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateRange({
                      from: startOfYear(new Date()),
                      to: endOfYear(new Date())
                    })}
                  >
                    Este ano
                  </Button>
                </div>
              </div>
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  } else if (range?.from) {
                    // If only start date is selected, set end to end of that month
                    setDateRange({ from: range.from, to: endOfMonth(range.from) });
                  } else {
                    // Reset to current month if cleared
                    setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
                  }
                }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          
          <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Transação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Transação</DialogTitle>
              </DialogHeader>
              <TransactionForm
                companyId={currentCompany?.id}
                bankAccounts={bankAccounts}
                chartAccounts={chartAccounts}
                contacts={contacts}
                onSuccess={() => setIsAddingTransaction(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Total de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(totalRevenueByDateRange)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Total de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenseByDateRange)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span className={`text-2xl font-bold ${balanceByDateRange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balanceByDateRange)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição ou contato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            
            
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transações ({filteredByDateRange.length})</CardTitle>
          {/* Column Configuration Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="end">
              <div className="space-y-3">
                <h3 className="font-medium">Configuração de Colunas</h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="type"
                      checked={columnVisibility.type}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, type: Boolean(checked)}))}
                    />
                    <label htmlFor="type" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Tipo
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="description"
                      checked={columnVisibility.description}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, description: Boolean(checked)}))}
                    />
                    <label htmlFor="description" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Descrição
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="contact"
                      checked={columnVisibility.contact}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, contact: Boolean(checked)}))}
                    />
                    <label htmlFor="contact" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Contato
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="account"
                      checked={columnVisibility.account}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, account: Boolean(checked)}))}
                    />
                    <label htmlFor="account" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Conta
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="payment_method"
                      checked={columnVisibility.payment_method}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, payment_method: Boolean(checked)}))}
                    />
                    <label htmlFor="payment_method" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Método Pgto
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="value"
                      checked={columnVisibility.value}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, value: Boolean(checked)}))}
                    />
                    <label htmlFor="value" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Valor
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="due_date"
                      checked={columnVisibility.due_date}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, due_date: Boolean(checked)}))}
                    />
                    <label htmlFor="due_date" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Vencimento
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="status"
                      checked={columnVisibility.status}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, status: Boolean(checked)}))}
                    />
                    <label htmlFor="status" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Status
                    </label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          {filteredByDateRange.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <DollarSign className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {transactions.length === 0 
                  ? "Comece adicionando sua primeira transação."
                  : "Tente ajustar os filtros para ver mais resultados."
                }
              </p>
              <Button onClick={() => setIsAddingTransaction(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Transação
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columnVisibility.type && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('type')} className="h-8 px-2">
                          Tipo
                          {getSortIcon('type')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.description && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('description')} className="h-8 px-2">
                          Descrição
                          {getSortIcon('description')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.contact && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('contact')} className="h-8 px-2">
                          Contato
                          {getSortIcon('contact')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.account && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('account')} className="h-8 px-2">
                          Conta
                          {getSortIcon('account')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.payment_method && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('payment_method')} className="h-8 px-2">
                          Método Pgto
                          {getSortIcon('payment_method')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.value && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('value')} className="h-8 px-2">
                          Valor
                          {getSortIcon('value')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.due_date && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('due_date')} className="h-8 px-2">
                          Vencimento
                          {getSortIcon('due_date')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.status && (
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort('status')} className="h-8 px-2">
                          Status
                          {getSortIcon('status')}
                        </Button>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      {columnVisibility.type && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transaction_type)}
                            <span className="capitalize">{transaction.transaction_type}</span>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.description && (
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                      )}
                      {columnVisibility.contact && (
                        <TableCell>{transaction.contacts?.name || '-'}</TableCell>
                      )}
                      {columnVisibility.account && (
                        <TableCell>{transaction.chart_accounts?.nome || '-'}</TableCell>
                      )}
                      {columnVisibility.payment_method && (
                        <TableCell>{formatPaymentMethod(transaction.payment_method)}</TableCell>
                      )}
                      {columnVisibility.value && (
                        <TableCell>
                          <span className={transaction.transaction_type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.transaction_type === 'entrada' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                          </span>
                        </TableCell>
                      )}
                      {columnVisibility.due_date && (
                        <TableCell>
                          {transaction.due_date ? format(new Date(transaction.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                        </TableCell>
                      )}
                      {columnVisibility.status && (
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}