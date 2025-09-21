import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBankAccounts, BankAccount } from '@/hooks/use-bank-accounts';

const bankAccountSchema = z.object({
  bank_name: z.string().min(1, 'Nome do banco é obrigatório'),
  agency: z.string().optional(),
  account_number: z.string().optional(),
  initial_balance: z.string().min(1, 'Saldo inicial é obrigatório'),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

interface BankAccountEditFormProps {
  account: BankAccount;
  onSuccess?: () => void;
}

export function BankAccountEditForm({ account, onSuccess }: BankAccountEditFormProps) {
  const { updateBankAccount } = useBankAccounts(account.company_id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bank_name: account.bank_name || '',
      agency: account.agency || '',
      account_number: account.account_number || '',
      initial_balance: account.initial_balance.toString(),
    },
  });

  const onSubmit = async (data: BankAccountFormData) => {
    const updateData = {
      bank_name: data.bank_name,
      agency: data.agency || null,
      account_number: data.account_number || null,
      initial_balance: parseFloat(data.initial_balance),
    };

    const result = await updateBankAccount(account.id, updateData);
    
    if (!result.error) {
      onSuccess?.();
    }
  };

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
          Nota: O saldo atual será ajustado automaticamente com base nas transações
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
}