import React, { useState } from 'react';
import { Plus, Search, Building, Edit, Trash2, CreditCard, Wallet, PiggyBank, TrendingUp, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { useCompanies } from '@/hooks/use-companies';
import { BankAccountForm } from '@/components/companies/BankAccountForm';
import { BankAccountEditForm } from '@/components/companies/BankAccountEditForm';
import { BankAccount } from '@/hooks/use-bank-accounts';

export default function BankAccounts() {
  const { companies } = useCompanies();
  const currentCompany = companies[0];
  
  const { bankAccounts, loading, deleteBankAccount } = useBankAccounts(currentCompany?.id);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const filteredAccounts = bankAccounts.filter(account => {
    const matchesSearch = 
      account.bank_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.agency?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleDeleteAccount = async (accountId: string) => {
    await deleteBankAccount(accountId);
  };

  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.current_balance, 0);

  // Get account type configuration
  const getAccountTypeConfig = (accountType?: string) => {
    const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      checking: { icon: <Wallet className="h-4 w-4" />, label: 'Conta Corrente', color: 'bg-blue-100 text-blue-800' },
      savings: { icon: <PiggyBank className="h-4 w-4" />, label: 'Conta Poupança', color: 'bg-green-100 text-green-800' },
      credit_card: { icon: <CreditCard className="h-4 w-4" />, label: 'Cartão de Crédito', color: 'bg-red-100 text-red-800' },
      investment: { icon: <TrendingUp className="h-4 w-4" />, label: 'Investimento', color: 'bg-purple-100 text-purple-800' },
      reserve: { icon: <Archive className="h-4 w-4" />, label: 'Reserva', color: 'bg-yellow-100 text-yellow-800' },
      other: { icon: <Building className="h-4 w-4" />, label: 'Outro', color: 'bg-gray-100 text-gray-800' },
    };
    
    return accountType ? config[accountType] : { icon: <Building className="h-4 w-4" />, label: 'Conta Bancária', color: 'bg-gray-100 text-gray-800' };
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie suas contas bancárias e saldos</p>
        </div>
        
        <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Conta Bancária</DialogTitle>
            </DialogHeader>
            <BankAccountForm
              companyId={currentCompany?.id}
              onSuccess={() => setIsAddingAccount(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Saldo Total em Contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(totalBalance)}
            </span>
            <Badge variant="outline">
              {bankAccounts.length} conta{bankAccounts.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por banco, agência ou conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Contas Bancárias</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                <Building className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhuma conta encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {bankAccounts.length === 0 
                  ? "Comece adicionando sua primeira conta bancária."
                  : "Tente ajustar a busca para ver mais resultados."
                }
              </p>
              <Button onClick={() => setIsAddingAccount(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Conta
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Agência</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Saldo Inicial</TableHead>
                    <TableHead>Saldo Atual</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => {
                    const accountTypeConfig = getAccountTypeConfig(account.account_type);
                    return (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {account.bank_name || 'Sem nome'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`flex items-center gap-1 ${accountTypeConfig.color}`}>
                            {accountTypeConfig.icon}
                            {accountTypeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.agency || '-'}</TableCell>
                        <TableCell>{account.account_number || '-'}</TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {formatCurrency(account.initial_balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(account.current_balance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setEditingAccount(account)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Editar Conta Bancária</DialogTitle>
                                </DialogHeader>
                                {editingAccount && (
                                  <BankAccountEditForm
                                    account={editingAccount}
                                    onSuccess={() => setEditingAccount(null)}
                                  />
                                )}
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir conta bancária</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza de que deseja excluir a conta "{account.bank_name}"? 
                                    Esta ação não pode ser desfeita e todas as transações vinculadas 
                                    a esta conta serão afetadas.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteAccount(account.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}