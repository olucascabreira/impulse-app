import { useState } from 'react';
import { useChartAccounts } from '@/hooks/use-chart-accounts';
import { useCompanies } from '@/hooks/use-companies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, TreePine } from 'lucide-react';
import { ChartAccountForm } from '@/components/companies/ChartAccountForm';
import { ChartAccountEditForm } from '@/components/companies/ChartAccountEditForm';

export default function ChartAccounts() {
  const { companies, currentCompany } = useCompanies();
  const { chartAccounts, loading, deleteChartAccount } = useChartAccounts(currentCompany?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const filteredAccounts = chartAccounts.filter(account =>
    account.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (account: any) => {
    setSelectedAccount(account);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteChartAccount(id);
  };

  const getAccountLevel = (account: any) => {
    return account.parent_id ? 1 : 0;
  };

  if (!currentCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para gerenciar o plano de contas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Plano de Contas</h1>
          <p className="text-muted-foreground">Gerencie o plano de contas da empresa {currentCompany.name}</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Conta</DialogTitle>
            </DialogHeader>
            <ChartAccountForm onSuccess={() => setCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            Estrutura do Plano de Contas
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando plano de contas...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.codigo}</TableCell>
                    <TableCell style={{ paddingLeft: `${getAccountLevel(account) * 24 + 16}px` }}>
                      {account.nome}
                    </TableCell>
                    <TableCell>
                      <Badge variant={account.tipo === 'receita' ? 'default' : 'secondary'}>
                        {account.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getAccountLevel(account) === 0 ? 'Principal' : 'Subconta'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(account)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a conta "{account.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(account.id)}>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <ChartAccountEditForm
              account={selectedAccount}
              onSuccess={() => {
                setEditDialogOpen(false);
                setSelectedAccount(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}