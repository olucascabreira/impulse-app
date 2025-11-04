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
  const { chartAccounts, loading, deleteChartAccount, getAccountLevel } = useChartAccounts(currentCompany?.id);
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

  const getAccountTypeLabel = (tipo: string) => {
    const typeLabels: Record<string, string> = {
      'ativo': 'Ativo',
      'passivo': 'Passivo',
      'patrimonio_liquido': 'Patrimônio Líquido',
      'receita': 'Receita',
      'despesa': 'Despesa'
    };
    return typeLabels[tipo] || tipo;
  };

  const getAccountTypeColor = (tipo: string) => {
    const typeColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      'ativo': 'default',
      'passivo': 'destructive',
      'patrimonio_liquido': 'outline',
      'receita': 'default',
      'despesa': 'secondary'
    };
    return typeColors[tipo] || 'secondary';
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
            <Button onClick={() => console.log("Botão de nova conta clicado")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Conta</DialogTitle>
            </DialogHeader>
            <ChartAccountForm 
              onSuccess={() => {
                console.log("Conta criada com sucesso, fechando modal");
                setCreateDialogOpen(false);
              }} 
            />
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => {
                  const level = getAccountLevel(account);
                  const indent = '└─ '.repeat(level);

                  return (
                    <TableRow key={account.id} className={account.status === 'inativo' ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{account.codigo || '-'}</TableCell>
                      <TableCell style={{ paddingLeft: `${level * 24 + 16}px` }}>
                        <span className="text-muted-foreground">{indent}</span>
                        {account.nome}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getAccountTypeColor(account.tipo)}>
                          {getAccountTypeLabel(account.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {level === 0 ? 'Principal' : `Nível ${level + 1}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.status === 'ativo' ? 'default' : 'secondary'}>
                          {account.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
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
                  );
                })}
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