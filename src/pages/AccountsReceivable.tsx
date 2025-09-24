import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Calendar, CheckCircle, X, Filter, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useTransactions } from '@/hooks/use-transactions';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { useChartAccounts } from '@/hooks/use-chart-accounts';
import { useContacts } from '@/hooks/use-contacts';
import { useCompanies } from '@/hooks/use-companies';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionEditForm } from '@/components/transactions/TransactionEditForm';
import { format, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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

export default function AccountsReceivable() {
  const { companies } = useCompanies();
  const currentCompany = companies[0];
  
  const { 
    transactions, 
    loading: loadingTransactions, 
    deleteTransaction, 
    markAsPaid 
  } = useTransactions(currentCompany?.id);
  
  const { bankAccounts } = useBankAccounts(currentCompany?.id);
  const { chartAccounts } = useChartAccounts(currentCompany?.id);
  const { contacts } = useContacts(currentCompany?.id);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [viewingTransaction, setViewingTransaction] = useState<any>(null);

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({
    date: true,
    description: true,
    contact: true,
    account: true,
    payment_method: true,
    value: true,
    due_date: true,
    status: true,
    actions: true,
  });

  // Filter transactions to show only "entrada" (incoming) transactions
  const accountsReceivableTransactions = useMemo(() => {
    return transactions.filter(transaction => 
      transaction.transaction_type === 'entrada'
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return accountsReceivableTransactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          transaction.contacts?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
      
      // Month filter logic
      let matchesMonth = true;
      if (monthFilter !== 'all' && transaction.due_date) {
        const transactionDate = parseISO(transaction.due_date);
        const [year, month] = monthFilter.split('-');
        const filterDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        matchesMonth = isSameMonth(transactionDate, filterDate);
      }
      
      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [accountsReceivableTransactions, searchTerm, statusFilter, monthFilter]);

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
      cancelado: { label: 'Cancelado', variant: 'destructive' as const },
      atrasado: { label: 'Atrasado', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config?.variant || 'secondary'}>{config?.label || status}</Badge>;
  };

  const handleDelete = async (id: string) => {
    const result = await deleteTransaction(id);
    if (!result.error) {
      toast({
        title: "Conta deletada",
        description: "A conta a receber foi removida com sucesso.",
      });
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    const result = await markAsPaid(id);
    if (!result.error) {
      toast({
        title: "Status atualizado",
        description: "Conta marcada como paga.",
      });
    }
  };

  // Function to format due date
  const formatDueDate = (dueDate: string | undefined) => {
    if (!dueDate) return '-';
    const date = new Date(dueDate);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  // Function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'text-green-600';
      case 'atrasado':
        return 'text-red-600';
      case 'pendente':
        return 'text-orange-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loadingTransactions) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
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
          <h1 className="text-2xl font-bold">Contas a Receber</h1>
          <p className="text-muted-foreground mt-2">
            {currentCompany ? `Contas a receber de ${currentCompany.name}` : 'Contas a receber'}
          </p>
        </div>
        
        <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Conta a Receber</DialogTitle>
            </DialogHeader>
            <TransactionForm
              companyId={currentCompany?.id}
              bankAccounts={bankAccounts}
              chartAccounts={chartAccounts}
              contacts={contacts}
              defaultType="entrada"
              onSuccess={() => setIsAddingTransaction(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    accountsReceivableTransactions.reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <X className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    accountsReceivableTransactions
                      .filter(t => t.status === 'pendente' || t.status === 'atrasado')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebidas</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    accountsReceivableTransactions
                      .filter(t => t.status === 'pago')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
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
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {accountsReceivableTransactions
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
          <CardTitle>Lista de Contas a Receber ({filteredTransactions.length})</CardTitle>
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
                      id="date"
                      checked={columnVisibility.date}
                      onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, date: Boolean(checked)}))}
                    />
                    <label htmlFor="date" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Data
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
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma conta encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {accountsReceivableTransactions.length === 0 
                  ? "Comece adicionando sua primeira conta a receber."
                  : "Tente ajustar os filtros para ver mais resultados."
                }
              </p>
              <Button onClick={() => setIsAddingTransaction(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Conta
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columnVisibility.date && <TableHead>Data</TableHead>}
                    {columnVisibility.description && <TableHead>Descrição</TableHead>}
                    {columnVisibility.contact && <TableHead>Contato</TableHead>}
                    {columnVisibility.account && <TableHead>Conta</TableHead>}
                    {columnVisibility.payment_method && <TableHead>Método Pgto</TableHead>}
                    {columnVisibility.value && <TableHead>Valor</TableHead>}
                    {columnVisibility.due_date && <TableHead>Vencimento</TableHead>}
                    {columnVisibility.status && <TableHead>Status</TableHead>}
                    {columnVisibility.actions && <TableHead className="w-[120px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      {columnVisibility.date && (
                        <TableCell>
                          {format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: ptBR })}
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
                          <span className={`font-medium ${getStatusColor(transaction.status)}`}>
                            {formatCurrency(Number(transaction.amount))}
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
                      {columnVisibility.actions && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingTransaction(transaction)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTransaction(transaction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {transaction.status === 'pendente' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsPaid(transaction.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(transaction.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Conta a Receber</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <TransactionEditForm
              transaction={editingTransaction}
              bankAccounts={bankAccounts}
              chartAccounts={chartAccounts}
              contacts={contacts}
              onSuccess={() => setEditingTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewingTransaction} onOpenChange={() => setViewingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Conta</DialogTitle>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(viewingTransaction.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Vencimento</label>
                  <p className="font-medium">{formatDueDate(viewingTransaction.due_date)}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="font-medium">{viewingTransaction.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor</label>
                  <p className={`font-medium text-lg ${getStatusColor(viewingTransaction.status)}`}>
                    {formatCurrency(Number(viewingTransaction.amount))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Método de Pagamento</label>
                  <p className="font-medium">{formatPaymentMethod(viewingTransaction.payment_method)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contato</label>
                  <p className="font-medium">{viewingTransaction.contacts?.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Conta</label>
                  <p className="font-medium">{viewingTransaction.chart_accounts?.nome || '-'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Vencimento</label>
                <p className="font-medium">
                  {viewingTransaction.due_date ? format(new Date(viewingTransaction.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                <p className="font-medium">
                  {format(new Date(viewingTransaction.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}