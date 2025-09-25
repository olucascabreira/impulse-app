import { useState, useMemo } from 'react';
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions';
import { useCompanies } from '@/hooks/use-companies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RecurringTransactionForm } from '@/components/recurring-transactions/RecurringTransactionForm';
import { RecurringTransactionEditForm } from '@/components/recurring-transactions/RecurringTransactionEditForm';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPaymentMethod } from '@/utils/financial';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Edit, Eye, Trash2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { processRecurringTransactions } from '@/services/recurring-transaction-generator';

export default function RecurringTransactions() {
  const { currentCompany } = useCompanies();
  const { 
    recurringTransactions, 
    loading: loadingRecurringTransactions, 
    deleteRecurringTransaction 
  } = useRecurringTransactions(currentCompany?.id);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [viewingTransaction, setViewingTransaction] = useState<any>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<string | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = useMemo(() => {
    return recurringTransactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (transaction.contacts?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [recurringTransactions, searchTerm]);

  const handleDelete = async (id: string) => {
    const result = await deleteRecurringTransaction(id);
    
    if (result.error) {
      toast({
        title: "Erro ao deletar transação recorrente",
        description: result.error.message || "Ocorreu um erro ao deletar a transação recorrente",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Transação recorrente deletada!",
        description: "A transação recorrente foi removida com sucesso.",
      });
    }
    
    setDeletingTransaction(null);
  };

  if (loadingRecurringTransactions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-muted-foreground">Carregando transações recorrentes...</p>
        </div>
      </div>
    );
  }

  const handleGenerateRecurring = async () => {
    try {
      const result = await processRecurringTransactions();
      
      if (result.success) {
        toast({
          title: "Transações geradas com sucesso!",
          description: `Foram geradas ${result.generated} transações a partir de modelos recorrentes.`,
        });
      } else {
        throw result.error;
      }
    } catch (error: any) {
      console.error('Error generating recurring transactions:', error);
      toast({
        title: "Erro ao gerar transações recorrentes",
        description: error?.message || "Ocorreu um erro ao gerar as transações recorrentes",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transações Recorrentes</h1>
          <p className="text-muted-foreground">
            Gerencie suas transações recorrentes
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleGenerateRecurring}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Gerar Transações
          </Button>
          <Dialog open={isAddingTransaction} onOpenChange={setIsAddingTransaction}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nova Transação Recorrente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Transação Recorrente</DialogTitle>
              </DialogHeader>
              {currentCompany && (
                <RecurringTransactionForm
                  companyId={currentCompany.id}
                  onSuccess={() => setIsAddingTransaction(false)}
                  onCancel={() => setIsAddingTransaction(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and filter controls */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar transações recorrentes..."
              className="w-full p-2 border rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{recurringTransactions.length}</div>
            <p className="text-sm text-muted-foreground">Total de Transações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {formatCurrency(
                recurringTransactions
                  .filter(t => t.transaction_type === 'entrada')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </div>
            <p className="text-sm text-muted-foreground">Receitas Mensais</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {formatCurrency(
                recurringTransactions
                  .filter(t => t.transaction_type === 'saida')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </div>
            <p className="text-sm text-muted-foreground">Despesas Mensais</p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Transações Recorrentes ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                {recurringTransactions.length === 0 
                  ? "Nenhuma transação recorrente encontrada." 
                  : "Nenhuma transação recorrente corresponde ao filtro."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Tipo</th>
                    <th className="text-left py-3 px-4">Descrição</th>
                    <th className="text-left py-3 px-4">Contato</th>
                    <th className="text-left py-3 px-4">Conta</th>
                    <th className="text-left py-3 px-4">Valor</th>
                    <th className="text-left py-3 px-4">Frequência</th>
                    <th className="text-left py-3 px-4">Data Início</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            transaction.transaction_type === 'entrada' ? 'default' : 
                            transaction.transaction_type === 'transferencia' ? 'outline' : 'secondary'
                          }
                        >
                          {transaction.transaction_type === 'entrada' ? 'Entrada' : 
                           transaction.transaction_type === 'transferencia' ? 'Transferência' : 'Saída'}
                        </Badge>
                      </td>
                      <td className="font-medium py-3 px-4">{transaction.description}</td>
                      <td className="py-3 px-4">{transaction.contacts?.name || '-'}</td>
                      <td className="py-3 px-4">{transaction.chart_accounts?.nome || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={
                          transaction.transaction_type === 'entrada' ? 'text-green-600 font-medium' : 
                          transaction.transaction_type === 'transferencia' ? 'text-blue-600 font-medium' : 'text-red-600 font-medium'
                        }>
                          {formatCurrency(Number(transaction.amount))}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span>{transaction.frequency}</span>
                          {transaction.interval > 1 && (
                            <span> a cada {transaction.interval}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {transaction.start_date ? format(new Date(transaction.start_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={
                            (transaction.end_date && new Date(transaction.end_date) < new Date()) ? 'destructive' : 
                            'default'
                          }
                        >
                          {(transaction.end_date && new Date(transaction.end_date) < new Date()) ? 'Encerrada' : 'Ativa'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setViewingTransaction(transaction)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setEditingTransaction(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setDeletingTransaction(transaction.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Recurring Transaction Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Transação Recorrente</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <RecurringTransactionEditForm
              recurringTransaction={editingTransaction}
              onSuccess={() => setEditingTransaction(null)}
              onCancel={() => setEditingTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Recurring Transaction Dialog */}
      <Dialog open={!!viewingTransaction} onOpenChange={() => setViewingTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Transação Recorrente</DialogTitle>
          </DialogHeader>
          {viewingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">
                    {viewingTransaction.transaction_type === 'entrada' ? 'Entrada' : 
                     viewingTransaction.transaction_type === 'transferencia' ? 'Transferência' : 'Saída'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge 
                    variant={
                      (viewingTransaction.end_date && new Date(viewingTransaction.end_date) < new Date()) ? 
                      'destructive' : 'default'
                    }
                  >
                    {(viewingTransaction.end_date && new Date(viewingTransaction.end_date) < new Date()) ? 
                     'Encerrada' : 'Ativa'}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Descrição</p>
                <p className="font-medium">{viewingTransaction.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className={`font-medium text-lg ${
                    viewingTransaction.transaction_type === 'entrada' ? 'text-green-600' : 
                    viewingTransaction.transaction_type === 'transferencia' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(Number(viewingTransaction.amount))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                  <p className="font-medium">{formatPaymentMethod(viewingTransaction.payment_method)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Contato</p>
                <p className="font-medium">{viewingTransaction.contacts?.name || '-'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Conta Contábil</p>
                <p className="font-medium">{viewingTransaction.chart_accounts?.nome || '-'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Frequência</p>
                  <p className="font-medium">
                    {viewingTransaction.frequency} 
                    {viewingTransaction.interval > 1 && ` a cada ${viewingTransaction.interval}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Recorrência</p>
                  <p className="font-medium">
                    {viewingTransaction.recurrence_type === 'fixed' ? 'Fixa' : 'Variável'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data de Início</p>
                  <p className="font-medium">
                    {viewingTransaction.start_date ? 
                      format(new Date(viewingTransaction.start_date), 'dd/MM/yyyy', { locale: ptBR }) : 
                      '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Término</p>
                  <p className="font-medium">
                    {viewingTransaction.end_date ? 
                      format(new Date(viewingTransaction.end_date), 'dd/MM/yyyy', { locale: ptBR }) : 
                      'Indefinida'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingTransaction} 
        onOpenChange={(open) => !open && setDeletingTransaction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a transação recorrente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingTransaction && handleDelete(deletingTransaction)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}