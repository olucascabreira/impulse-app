import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Calendar, TrendingUp, TrendingDown, DollarSign, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useTransactions } from '@/hooks/use-transactions';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { useChartAccounts } from '@/hooks/use-chart-accounts';
import { useContacts } from '@/hooks/use-contacts';
import { useCompanies } from '@/hooks/use-companies';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { format, parse, setMonth, setYear, startOfMonth, endOfMonth, isSameMonth, parseISO } from 'date-fns';
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
  const [monthFilter, setMonthFilter] = useState<string>('all'); // Added month filter state
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);

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
      
      // Month filter logic
      let matchesMonth = true;
      if (monthFilter !== 'all' && transaction.due_date) {
        const transactionDate = parseISO(transaction.due_date);
        const [year, month] = monthFilter.split('-');
        const filterDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        matchesMonth = isSameMonth(transactionDate, filterDate);
      }
      
      return matchesSearch && matchesType && matchesStatus && matchesMonth;
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
  }, [transactions, searchTerm, typeFilter, statusFilter, monthFilter]);

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
                {formatCurrency(totalRevenue)}
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
                {formatCurrency(totalExpense)}
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
              <span className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(balance)}
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
            
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {transactions
                  .filter(t => t.due_date) // Only transactions with due dates
                  .map(t => {
                    const date = parseISO(t.due_date!);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
                    return `${year}-${month}`;
                  })
                  .filter((value, index, arr) => arr.indexOf(value) === index) // Remove duplicates
                  .sort() // Sort chronologically
                  .map(monthYear => {
                    const [year, month] = monthYear.split('-');
                    const monthNumber = parseInt(month) - 1;
                    const monthName = format(new Date(parseInt(year), monthNumber, 1), 'MMMM yyyy', { locale: ptBR });
                    return (
                      <SelectItem key={monthYear} value={monthYear}>
                        {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {/* Capitalize month */}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transações</CardTitle>
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
          {filteredTransactions.length === 0 ? (
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
                    {columnVisibility.type && <TableHead>Tipo</TableHead>}
                    {columnVisibility.description && <TableHead>Descrição</TableHead>}
                    {columnVisibility.contact && <TableHead>Contato</TableHead>}
                    {columnVisibility.account && <TableHead>Conta</TableHead>}
                    {columnVisibility.payment_method && <TableHead>Método Pgto</TableHead>}
                    {columnVisibility.value && <TableHead>Valor</TableHead>}
                    {columnVisibility.due_date && <TableHead>Vencimento</TableHead>}
                    {columnVisibility.status && <TableHead>Status</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
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