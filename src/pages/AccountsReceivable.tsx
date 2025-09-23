import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Calendar, CheckCircle, X, Filter, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTransactions } from '@/hooks/use-transactions';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { useChartAccounts } from '@/hooks/use-chart-accounts';
import { useContacts } from '@/hooks/use-contacts';
import { useCompanies } from '@/hooks/use-companies';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionEditForm } from '@/components/transactions/TransactionEditForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [viewingTransaction, setViewingTransaction] = useState<any>(null);

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
      
      return matchesSearch && matchesStatus;
    });
  }, [accountsReceivableTransactions, searchTerm, statusFilter]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pendente: { label: 'Pendente', variant: 'secondary' as const },
      recebido: { label: 'Recebido', variant: 'default' as const },
      pago: { label: 'Pago', variant: 'default' as const },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const }
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
        description: "Conta marcada como recebida.",
      });
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
          <p className="text-muted-foreground">Gerencie suas receitas e contas a receber</p>
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
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pendente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(
                    accountsReceivableTransactions
                      .filter(t => t.status === 'pendente')
                      .reduce((sum, t) => sum + Number(t.amount), 0)
                  )}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    accountsReceivableTransactions
                      .filter(t => t.status === 'recebido' || t.status === 'pago')
                      .reduce((sum, t) => sum + Number(t.amount), 0)
                  )}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Coins className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Contas</p>
                <p className="text-2xl font-bold">
                  {accountsReceivableTransactions.length}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Filter className="h-6 w-6 text-blue-600" />
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
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas a Receber ({filteredTransactions.length})</CardTitle>
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
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{transaction.description}</TableCell>
                      <TableCell>{transaction.contacts?.name || '-'}</TableCell>
                      <TableCell>{transaction.chart_accounts?.nome || '-'}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(Number(transaction.amount))}
                        </span>
                      </TableCell>
                      <TableCell>
                        {transaction.due_date ? format(new Date(transaction.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
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
                          {(transaction.status === 'pendente') && (
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
                                  Tem certeza que deseja excluir esta conta a receber? Esta ação não pode ser desfeita.
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
            <DialogTitle>Detalhes da Conta a Receber</DialogTitle>
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
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="font-medium">{viewingTransaction.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor</label>
                  <p className="font-medium text-lg text-green-600">
                    {formatCurrency(Number(viewingTransaction.amount))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Vencimento</label>
                  <p className="font-medium">
                    {viewingTransaction.due_date ? format(new Date(viewingTransaction.due_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                  </p>
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