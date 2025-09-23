import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useTransactions } from '@/hooks/use-transactions';
import { BankAccount } from '@/hooks/use-bank-accounts';
import { ChartAccount } from '@/hooks/use-chart-accounts';
import { Contact } from '@/hooks/use-contacts';
import { Transaction } from '@/hooks/use-transactions';
import { useToast } from '@/hooks/use-toast';

const transactionSchema = z.object({
  transaction_type: z.enum(['entrada', 'saida', 'transferencia']),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  chart_account_id: z.string().optional(),
  bank_account_id: z.string().optional(),
  destination_account_id: z.string().optional(),
  contact_id: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['pendente', 'pago', 'atrasado', 'transferido']),
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
  const { toast } = useToast();

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
      status: transaction.status,
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

    const transactionData = {
      transaction_type: data.transaction_type,
      description: data.description,
      amount: parseFloat(data.amount.replace(',', '.')),
      status: data.status,
      chart_account_id: data.chart_account_id || null,
      bank_account_id: data.bank_account_id || null,
      destination_account_id: data.transaction_type === 'transferencia' ? data.destination_account_id : null,
      contact_id: data.contact_id || null,
      due_date: data.due_date || null,
    };

    const result = await updateTransaction(transaction.id, transactionData);
    
    if (!result.error) {
      onSuccess?.();
    }
  };

  const transactionType = form.watch('transaction_type');

  // Define status options based on transaction type
  const getStatusOptions = () => {
    if (transactionType === 'transferencia') {
      return [
        { value: 'transferido', label: 'Transferido' },
      ];
    } else {
      return [
        { value: 'pendente', label: 'Pendente' },
        { value: 'pago', label: 'Pago' },
        { value: 'atrasado', label: 'Atrasado' },
      ];
    }
  };

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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
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
                      const value = e.target.value.replace(/[^\d,]/g, '');
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
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta de origem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.map((account) => (
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

            <FormField
              control={form.control}
              name="destination_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta de Destino</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta de destino" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.map((account) => (
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta do Plano</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {chartAccounts
                        .filter(account => account.tipo === (transactionType === 'entrada' ? 'receita' : 'despesa'))
                        .map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.codigo} - {account.nome}
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
              name="bank_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta Bancária</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.map((account) => (
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
        )}

        {transactionType !== 'transferencia' && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contato</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o contato" />
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
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancelar
          </Button>
          <Button type="submit">
            Atualizar Lançamento
          </Button>
        </div>
      </form>
    </Form>
  );
}