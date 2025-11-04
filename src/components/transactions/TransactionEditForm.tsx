import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTransactions } from '@/hooks/use-transactions';
import { BankAccount } from '@/hooks/use-bank-accounts';
import { ChartAccount } from '@/hooks/use-chart-accounts';
import { Contact } from '@/hooks/use-contacts';
import { Transaction } from '@/hooks/use-transactions';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions';

const transactionSchema = z.object({
  transaction_type: z.enum(['entrada', 'saida', 'transferencia']),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  chart_account_id: z.string().optional(),
  bank_account_id: z.string().optional(),
  destination_account_id: z.string().optional(),
  contact_id: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['pendente', 'pago', 'recebido', 'atrasado', 'cancelado', 'transferido']),
  payment_method: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionEditFormProps {
  transaction: Transaction;
  bankAccounts: BankAccount[];
  chartAccounts: ChartAccount[];
  contacts: Contact[];
  onSuccess?: () => void;
}

export function TransactionEditForm({
  transaction,
  bankAccounts,
  chartAccounts,
  contacts,
  onSuccess
}: TransactionEditFormProps) {
  const { updateTransaction } = useTransactions(transaction.company_id);
  const { createRecurringTransaction } = useRecurringTransactions(transaction.company_id);
  const { toast } = useToast();
  const [createRecurring, setCreateRecurring] = useState(false);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_type: transaction.transaction_type,
      description: transaction.description,
      amount: transaction.amount.toString().replace('.', ','),
      chart_account_id: transaction.chart_account_id || '',
      bank_account_id: transaction.bank_account_id || '',
      destination_account_id: transaction.destination_account_id || '',
      contact_id: transaction.contact_id || '',
      due_date: transaction.due_date || '',
      status: transaction.transaction_type === 'transferencia' ? 'pago' : transaction.status, // For transfers, default to 'pago' status
      payment_method: transaction.payment_method || '', 
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
    // Validate transfer transactions
    if (data.transaction_type === 'transferencia') {
      if (!data.bank_account_id || !data.destination_account_id) {
        toast({
          title: "Erro",
          description: "Para transferências, selecione a conta de origem e destino",
          variant: "destructive",
        });
        return;
      }
      if (data.bank_account_id === data.destination_account_id) {
        toast({
          title: "Erro",
          description: "A conta de origem e destino não podem ser iguais",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const amount = parseFloat(data.amount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Erro",
          description: "Valor inválido",
          variant: "destructive",
        });
        return;
      }

      // Validate sufficient funds for saida transactions (when status is pago)
      // Only check if the transaction is being changed or if amount/account changed
      if (data.transaction_type === 'saida' && data.status === 'pago' && data.bank_account_id) {
        const selectedAccount = bankAccounts.find(acc => acc.id === data.bank_account_id);
        if (selectedAccount) {
          // Calculate the balance considering the original transaction value
          const originalAmount = transaction.status === 'pago' && transaction.bank_account_id === data.bank_account_id
            ? transaction.amount
            : 0;
          const availableBalance = selectedAccount.current_balance + originalAmount;

          if (availableBalance < amount) {
            toast({
              title: "Erro",
              description: "Saldo insuficiente na conta bancária selecionada",
              variant: "destructive",
            });
            return;
          }
        }
      }

      const transactionData = {
        transaction_type: data.transaction_type,
        description: data.description,
        amount: amount,
        chart_account_id: data.chart_account_id || null,
        bank_account_id: data.bank_account_id || null,
        destination_account_id: data.transaction_type === 'transferencia' ? data.destination_account_id : null,
        contact_id: data.contact_id || null,
        due_date: data.due_date || null,
        status: data.transaction_type === 'transferencia' ? 'pago' : data.status, // For transfers, always use 'pago' status
        payment_method: data.payment_method || null,
      };

      const result = await updateTransaction(transaction.id, transactionData);
      
      if (!result.error) {
        toast({
          title: "Transação atualizada!",
          description: "Dados da transação atualizados com sucesso.",
        });
        
        if (createRecurring) {
          // Create a recurring transaction based on the current transaction
          try {
            const recurringTransactionData = {
              transaction_type: transactionData.transaction_type,
              description: transactionData.description,
              amount: transactionData.amount,
              chart_account_id: transactionData.chart_account_id,
              bank_account_id: transactionData.bank_account_id,
              contact_id: transactionData.contact_id,
              recurrence_type: 'fixed' as const,
              frequency: 'monthly' as const, // Default to monthly
              interval: 1, // Default to every 1 month
              start_date: new Date().toISOString().split('T')[0], // Start today
              payment_method: transactionData.payment_method,
              status: transactionData.status,
            };

            const recurringResult = await createRecurringTransaction(recurringTransactionData);
            
            if (recurringResult.error) {
              console.error('Error creating recurring transaction:', recurringResult.error);
              toast({
                title: "Erro ao criar transação recorrente",
                description: recurringResult.error.message || "Ocorreu um erro ao criar a transação recorrente",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Transação recorrente criada!",
                description: "Modelo de transação recorrente criado com sucesso.",
              });
            }
          } catch (recurringError) {
            console.error('Error creating recurring transaction:', recurringError);
            toast({
              title: "Erro ao criar transação recorrente",
              description: recurringError instanceof Error ? recurringError.message : "Ocorreu um erro inesperado",
              variant: "destructive",
            });
          }
        }
        
        onSuccess?.();
      } else {
        console.error('Error updating transaction:', result.error);
        toast({
          title: "Erro ao atualizar transação",
          description: result.error.message || "Ocorreu um erro ao atualizar a transação",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: "Erro inesperado",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }
  };

  const transactionType = form.watch('transaction_type');

  // Define status options based on transaction type
  const getStatusOptions = () => {
    if (transactionType === 'transferencia') {
      return [
        { value: 'pago', label: 'Pago' }, // Use 'pago' instead of 'transferido' for transfers
      ];
    } else if (transactionType === 'entrada') {
      return [
        { value: 'pendente', label: 'Pendente' },
        { value: 'recebido', label: 'Recebido' },
        { value: 'atrasado', label: 'Atrasado' },
        { value: 'cancelado', label: 'Cancelado' },
      ];
    } else {
      return [
        { value: 'pendente', label: 'Pendente' },
        { value: 'pago', label: 'Pago' },
        { value: 'atrasado', label: 'Atrasado' },
        { value: 'cancelado', label: 'Cancelado' },
      ];
    }
  };

  // Payment method options
  const paymentMethods = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'pix', label: 'PIX' },
    { value: 'transferencia_bancaria', label: 'Transferência Bancária' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'boleto', label: 'Boleto' },
    { value: 'outro', label: 'Outro' },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="transaction_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Transação</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={transaction.transaction_type === 'transferencia' || transaction.destination_account_id !== null}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0,00"
                    {...field}
                    onChange={(e) => {
                      // Remove non-numeric characters except comma
                      let value = e.target.value.replace(/[^\d,]/g, '');
                      // Allow only one comma
                      const parts = value.split(',');
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrição da transação..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {transactionType === 'transferencia' ? (
          // Transfer-specific fields
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bank_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta de Origem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts
                        .filter(account => account.id !== form.getValues('destination_account_id')) // Filter out the selected destination account
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bank_name} - {account.account_number} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.current_balance)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta de Destino</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts
                        .filter(account => account.id !== form.getValues('bank_account_id')) // Filter out the selected source account
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.bank_name} - {account.account_number}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          // Regular transaction fields
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="chart_account_id"
              render={({ field }) => {
                const filteredAccounts = chartAccounts.filter(account => {
                  // Filter by transaction type
                  if (transactionType === 'entrada') {
                    return account.tipo === 'receita';
                  } else if (transactionType === 'saida') {
                    return account.tipo === 'despesa';
                  }
                  return false;
                });

                return (
                  <FormItem>
                    <FormLabel>Conta do Plano</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            filteredAccounts.length === 0
                              ? transactionType === 'entrada'
                                ? "Nenhuma conta de receita cadastrada"
                                : "Nenhuma conta de despesa cadastrada"
                              : "Selecione a conta"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredAccounts.length === 0 ? (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            {transactionType === 'entrada'
                              ? "Nenhuma conta de receita encontrada. Cadastre uma conta primeiro."
                              : "Nenhuma conta de despesa encontrada. Cadastre uma conta primeiro."}
                          </div>
                        ) : (
                          filteredAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.codigo ? `${account.codigo} - ` : ''}{account.nome}
                              {account.status === 'inativo' ? ' (Inativa)' : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="bank_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Bancária</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bank_name} - {account.account_number} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.current_balance)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pagamento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {transactionType !== 'transferencia' && (
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contato</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {transactionType !== 'transferencia' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Vencimento</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getStatusOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Option to create recurring transaction - disabled for transfers */}
        {transactionType !== 'transferencia' && (
          <div className="flex items-center space-x-2 border-t pt-4">
            <Switch
              id="create-recurring"
              checked={createRecurring}
              onCheckedChange={setCreateRecurring}
            />
            <Label htmlFor="create-recurring" className="text-sm font-medium">
              Criar transação recorrente com base nessa transação
            </Label>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancelar
          </Button>
          <Button type="submit">
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  );
}