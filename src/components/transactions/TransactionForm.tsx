import React, { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useRecurringTransactions } from '@/hooks/use-recurring-transactions';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const transactionSchema = z.object({
  transaction_type: z.enum(['entrada', 'saida', 'transferencia']),
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  chart_account_id: z.string().optional(),
  bank_account_id: z.string().optional(),
  destination_account_id: z.string().optional(),
  contact_id: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['pendente', 'pago', 'recebido', 'atrasado', 'cancelado', 'transferido']).default('pendente'),
  payment_method: z.string().optional(),
  // Recurring transaction fields
  create_recurring: z.boolean().default(false),
  recurrence_type: z.enum(['fixed', 'variable']).default('fixed'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  interval: z.number().min(1, 'Intervalo deve ser pelo menos 1').default(1),
  recurring_start_date: z.string().optional(),
  recurring_end_date: z.string().optional(),
  occurrences: z.number().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  companyId?: string;
  bankAccounts: BankAccount[];
  chartAccounts: ChartAccount[];
  contacts: Contact[];
  defaultType?: 'entrada' | 'saida' | 'transferencia';
  onSuccess?: () => void;
}

export function TransactionForm({
  companyId,
  bankAccounts,
  chartAccounts,
  contacts,
  defaultType = 'entrada',
  onSuccess
}: TransactionFormProps) {
  const { createTransaction } = useTransactions(companyId);
  const { createRecurringTransaction } = useRecurringTransactions(companyId);
  const { toast } = useToast();
  const [createRecurring, setCreateRecurring] = useState(false);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_type: defaultType,
      status: defaultType === 'transferencia' ? 'pago' : 'pendente', // Use 'pago' instead of 'transferido' for transfers
      payment_method: defaultType === 'transferencia' ? 'transferencia_bancaria' : 'dinheiro',
      amount: '',
      description: '',
      chart_account_id: '',
      bank_account_id: '',
      destination_account_id: '',
      contact_id: '',
      due_date: '',
      // Recurring transaction defaults
      create_recurring: false,
      recurrence_type: 'fixed',
      frequency: 'monthly',
      interval: 1,
      recurring_start_date: new Date().toISOString().split('T')[0],
      recurring_end_date: '',
      occurrences: undefined,
    },
  });

  const transactionType = form.watch('transaction_type');
  
  // Reset bank_account_id when changing to transferencia to ensure proper selection
  useEffect(() => {
    if (transactionType === 'transferencia') {
      form.setValue('chart_account_id', '');
      form.setValue('contact_id', '');
      form.setValue('due_date', '');
      form.setValue('status', 'pago'); // Use 'pago' instead of 'transferido' for transfers
      form.setValue('payment_method', 'transferencia_bancaria');
    } else {
      form.setValue('destination_account_id', '');
      form.setValue('status', 'pendente');
      form.setValue('payment_method', 'dinheiro');
    }
  }, [transactionType, form]);

  const onSubmit = async (data: TransactionFormData) => {
    if (!companyId) {
      toast({
        title: "Erro",
        description: "Empresa não encontrada",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields for transfers
    if (data.transaction_type === 'transferencia' && (!data.bank_account_id || !data.destination_account_id)) {
      toast({
        title: "Erro",
        description: "Para transferências, selecione a conta de origem e destino",
        variant: "destructive",
      });
      return;
    }

    // Validate that source and destination are different for transfers
    if (data.transaction_type === 'transferencia' && data.bank_account_id === data.destination_account_id) {
      toast({
        title: "Erro",
        description: "A conta de origem e destino não podem ser iguais",
        variant: "destructive",
      });
      return;
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
      if (data.transaction_type === 'saida' && data.status === 'pago' && data.bank_account_id) {
        const selectedAccount = bankAccounts.find(acc => acc.id === data.bank_account_id);
        if (selectedAccount && selectedAccount.current_balance < amount) {
          toast({
            title: "Erro",
            description: "Saldo insuficiente na conta bancária selecionada",
            variant: "destructive",
          });
          return;
        }
      }

      const transactionData = {
        transaction_type: data.transaction_type,
        description: data.description,
        amount: amount,
        chart_account_id: data.chart_account_id || undefined,
        bank_account_id: data.bank_account_id || undefined,
        destination_account_id: data.transaction_type === 'transferencia' ? data.destination_account_id : undefined,
        contact_id: data.contact_id || undefined,
        due_date: data.due_date || undefined,
        status: data.transaction_type === 'transferencia' ? 'pago' : data.status, // For transfers, always use 'pago' status
        payment_method: data.payment_method || undefined,
      };

      const result = await createTransaction(transactionData);
      
      if (!result.error) {
        toast({
          title: "Transação criada!",
          description: transactionData.transaction_type === 'transferencia' 
            ? `Transferência de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)} realizada com sucesso.` 
            : "Transação criada com sucesso.",
        });
        
        if (createRecurring) {
          // Create a recurring transaction based on the current transaction
          try {
            const formData = form.getValues();
            const recurringTransactionData = {
              transaction_type: transactionData.transaction_type,
              description: transactionData.description,
              amount: transactionData.amount,
              chart_account_id: transactionData.chart_account_id,
              bank_account_id: transactionData.bank_account_id,
              contact_id: transactionData.contact_id,
              recurrence_type: formData.recurrence_type,
              frequency: formData.frequency,
              interval: formData.interval,
              start_date: formData.recurring_start_date || new Date().toISOString().split('T')[0],
              end_date: formData.recurring_end_date || undefined,
              occurrences: formData.occurrences || undefined,
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
        
        form.reset();
        onSuccess?.();
      } else {
        console.error('Error creating transaction:', result.error);
        toast({
          title: "Erro ao criar transação",
          description: result.error.message || "Ocorreu um erro ao criar a transação",
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
      ];
    } else {
      return [
        { value: 'pendente', label: 'Pendente' },
        { value: 'pago', label: 'Pago' },
        { value: 'atrasado', label: 'Atrasado' },
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
                        <SelectValue placeholder="Selecione a conta de origem" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts
                        .filter(account => account.id !== form.getValues('destination_account_id')) // Filter out the selected destination account to avoid selecting same account
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
                        <SelectValue placeholder="Selecione a conta de destino" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o método de pagamento" />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        {/* Recurring transaction fields - only show when switch is on */}
        {createRecurring && (
          <div className="space-y-4 p-4 border rounded-md bg-muted/10">
            <h3 className="font-medium">Opções de Recorrência</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a frequência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Diariamente</SelectItem>
                        <SelectItem value="weekly">Semanalmente</SelectItem>
                        <SelectItem value="monthly">Mensalmente</SelectItem>
                        <SelectItem value="quarterly">Trimestralmente</SelectItem>
                        <SelectItem value="yearly">Anualmente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervalo</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="1"
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recurring_start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? date.toISOString().split('T')[0] : undefined)}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recurring_end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Término (Opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? date.toISOString().split('T')[0] : undefined)}
                          locale={ptBR}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="occurrences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Ocorrências (Opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1" 
                      placeholder="Deixe em branco para ilimitado"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Cancelar
          </Button>
          <Button type="submit">
            Salvar Transação
          </Button>
        </div>
      </form>
    </Form>
  );
}