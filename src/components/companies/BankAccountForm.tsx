import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBankAccounts } from '@/hooks/use-bank-accounts';

const bankAccountSchema = z.object({
  bank_name: z.string().min(1, 'Nome do banco é obrigatório'),
  agency: z.string().optional(),
  account_number: z.string().optional(),
  initial_balance: z.string().min(1, 'Saldo inicial é obrigatório'),
  account_type: z.string().optional(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccountFormProps {
  companyId?: string;
  onSuccess?: () => void;
}

export function BankAccountForm({ companyId, onSuccess }: BankAccountFormProps) {
  const { createBankAccount } = useBankAccounts(companyId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bank_name: '',
      agency: '',
      account_number: '',
      initial_balance: '0',
      account_type: 'checking',
    },
  });

  const accountType = watch('account_type');

  const onSubmit = async (data: BankAccountFormData) => {
    if (!companyId) return;

    const accountData = {
      bank_name: data.bank_name,
      agency: data.agency || null,
      account_number: data.account_number || null,
      initial_balance: parseFloat(data.initial_balance),
      account_type: data.account_type || null,
      company_id: companyId,
    };

    const result = await createBankAccount(accountData);
    
    if (!result.error) {
      reset();
      onSuccess?.();
    }
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^\d,.-]/g, '');
    return numericValue;
  };

  const accountTypes = [
    { value: 'checking', label: 'Conta Corrente' },
    { value: 'savings', label: 'Conta Poupança' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'investment', label: 'Conta de Investimento' },
    { value: 'reserve', label: 'Conta de Reserva' },
    { value: 'other', label: 'Outro' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bank_name">Nome do Banco *</Label>
        <Input
          id="bank_name"
          placeholder="Ex: Banco do Brasil"
          {...register('bank_name')}
        />
        {errors.bank_name && (
          <p className="text-sm text-destructive">{errors.bank_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="account_type">Tipo de Conta</Label>
        <Select 
          value={accountType} 
          onValueChange={(value) => setValue('account_type', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de conta" />
          </SelectTrigger>
          <SelectContent>
            {accountTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.account_type && (
          <p className="text-sm text-destructive">{errors.account_type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="agency">Agência</Label>
        <Input
          id="agency"
          placeholder="Ex: 1234-5"
          {...register('agency')}
        />
        {errors.agency && (
          <p className="text-sm text-destructive">{errors.agency.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="account_number">Número da Conta</Label>
        <Input
          id="account_number"
          placeholder="Ex: 12345-6"
          {...register('account_number')}
        />
        {errors.account_number && (
          <p className="text-sm text-destructive">{errors.account_number.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="initial_balance">Saldo Inicial *</Label>
        <Input
          id="initial_balance"
          type="number"
          step="0.01"
          placeholder="0,00"
          {...register('initial_balance')}
        />
        {errors.initial_balance && (
          <p className="text-sm text-destructive">{errors.initial_balance.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Nota: Este será o saldo inicial e o saldo atual da conta
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Criando...' : 'Criar Conta'}
        </Button>
      </div>
    </form>
  );
}