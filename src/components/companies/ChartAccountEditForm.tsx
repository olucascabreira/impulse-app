import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartAccounts, ChartAccount } from '@/hooks/use-chart-accounts';
import { useCompanies } from '@/hooks/use-companies';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const chartAccountSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['ativo', 'passivo', 'patrimonio_liquido', 'receita', 'despesa'], {
    required_error: 'Tipo é obrigatório',
  }),
  codigo: z.string()
    .regex(/^\d+(\.\d+){0,3}$/, 'Formato inválido. Use: 1, 1.1, 1.1.1 ou 1.1.1.1')
    .optional()
    .or(z.literal('')),
  parent_id: z.string().optional().nullable(),
  descricao: z.string().optional(),
  status: z.enum(['ativo', 'inativo'], {
    required_error: 'Status é obrigatório',
  }),
});

type ChartAccountFormData = z.infer<typeof chartAccountSchema>;

interface ChartAccountEditFormProps {
  account: ChartAccount;
  onSuccess?: () => void;
}

export function ChartAccountEditForm({ account, onSuccess }: ChartAccountEditFormProps) {
  const { currentCompany } = useCompanies();
  const { chartAccounts, updateChartAccount } = useChartAccounts(currentCompany?.id);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChartAccountFormData>({
    resolver: zodResolver(chartAccountSchema),
    defaultValues: {
      nome: account.nome,
      tipo: account.tipo,
      codigo: account.codigo || '',
      parent_id: account.parent_id || 'null',
      descricao: account.descricao || '',
      status: account.status || 'ativo',
    },
  });

  const onSubmit = async (data: ChartAccountFormData) => {
    // Validate código is not duplicated (except current account)
    if (data.codigo && data.codigo !== '') {
      const isDuplicate = chartAccounts.some(
        acc => acc.codigo === data.codigo && acc.id !== account.id
      );
      if (isDuplicate) {
        form.setError('codigo', {
          type: 'manual',
          message: 'Este código já está sendo usado por outra conta',
        });
        return;
      }
    }

    // Check if tipo is being changed
    if (data.tipo !== account.tipo) {
      // Check if this account has transactions
      try {
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('id')
          .eq('chart_account_id', account.id)
          .limit(1);

        if (error) {
          console.error('Error checking transactions:', error);
          toast({
            title: 'Erro',
            description: 'Não foi possível verificar as transações desta conta',
            variant: 'destructive',
          });
          return;
        }

        if (transactions && transactions.length > 0) {
          form.setError('tipo', {
            type: 'manual',
            message: 'Não é possível mudar o tipo de uma conta que possui transações',
          });
          toast({
            title: 'Alteração não permitida',
            description: 'Esta conta possui transações associadas. Não é possível alterar o tipo.',
            variant: 'destructive',
          });
          return;
        }
      } catch (error) {
        console.error('Error validating tipo change:', error);
        return;
      }
    }

    // Validate parent_id won't create a cycle
    if (data.parent_id && data.parent_id !== 'null') {
      // Get all descendants of current account
      const getDescendants = (accountId: string): string[] => {
        const children = chartAccounts.filter(acc => acc.parent_id === accountId);
        const descendants = children.map(child => child.id);
        children.forEach(child => {
          descendants.push(...getDescendants(child.id));
        });
        return descendants;
      };

      const descendants = getDescendants(account.id);
      if (descendants.includes(data.parent_id) || data.parent_id === account.id) {
        form.setError('parent_id', {
          type: 'manual',
          message: 'Esta seleção criaria um ciclo na hierarquia',
        });
        return;
      }

      // Validate hierarchy depth (max 4 levels)
      const getDepth = (accountId: string, depth = 0): number => {
        const parent = chartAccounts.find(acc => acc.id === accountId);
        if (!parent || !parent.parent_id || depth >= 10) return depth;
        return getDepth(parent.parent_id, depth + 1);
      };

      const newDepth = getDepth(data.parent_id) + 1;
      // Check if any descendants would exceed depth limit
      const maxDescendantDepth = Math.max(0, ...descendants.map(d => getDepth(d) - getDepth(account.id)));

      if (newDepth + maxDescendantDepth >= 4) {
        form.setError('parent_id', {
          type: 'manual',
          message: 'Esta mudança faria a hierarquia ultrapassar 4 níveis',
        });
        return;
      }
    }

    setLoading(true);
    try {
      const updateData = {
        nome: data.nome,
        tipo: data.tipo as 'ativo' | 'passivo' | 'patrimonio_liquido' | 'receita' | 'despesa',
        codigo: data.codigo || null,
        parent_id: data.parent_id === 'null' ? null : data.parent_id || null,
        descricao: data.descricao || null,
        status: data.status as 'ativo' | 'inativo',
      };

      console.log('Sending update data:', updateData);
      const result = await updateChartAccount(account.id, updateData);
      console.log('Update result:', result);

      if (result && !result.error) {
        onSuccess?.();
      } else {
        console.error('Error updating chart account:', result?.error);
      }
    } catch (error) {
      console.error('Unexpected error updating chart account:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get account hierarchy level for visual indentation
  const getAccountLevel = (accountId: string, level = 0): number => {
    const acc = chartAccounts.find(a => a.id === accountId);
    if (!acc || !acc.parent_id || level >= 10) return level;
    return getAccountLevel(acc.parent_id, level + 1);
  };

  // Get all descendants to prevent cycles
  const getDescendants = (accountId: string): string[] => {
    const children = chartAccounts.filter(acc => acc.parent_id === accountId);
    const descendants = children.map(child => child.id);
    children.forEach(child => {
      descendants.push(...getDescendants(child.id));
    });
    return descendants;
  };

  const descendants = getDescendants(account.id);

  // Filter out current account and its descendants from parent selection
  const parentAccounts = chartAccounts
    .filter(acc => acc.id !== account.id && !descendants.includes(acc.id))
    .map(acc => ({
      ...acc,
      level: getAccountLevel(acc.id),
    }))
    .sort((a, b) => {
      const aCode = a.codigo || a.nome;
      const bCode = b.codigo || b.nome;
      return aCode.localeCompare(bCode);
    });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Conta</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Vendas de Produtos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="passivo">Passivo</SelectItem>
                  <SelectItem value="patrimonio_liquido">Patrimônio Líquido</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="codigo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ex: 3.1.1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parent_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conta Pai (Opcional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta pai" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">Nenhuma (Conta Principal)</SelectItem>
                  {parentAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {'  '.repeat(acc.level)}{acc.codigo ? `${acc.codigo} - ` : ''}{acc.nome}
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
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Descrição ou observações sobre esta conta" {...field} />
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
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </form>
    </Form>
  );
}