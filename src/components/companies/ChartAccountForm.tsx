import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartAccounts } from '@/hooks/use-chart-accounts';
import { useCompanies } from '@/hooks/use-companies';

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

interface ChartAccountFormProps {
  onSuccess?: () => void;
}

export function ChartAccountForm({ onSuccess }: ChartAccountFormProps) {
  const { currentCompany } = useCompanies();
  const { chartAccounts, createChartAccount } = useChartAccounts(currentCompany?.id);
  const [loading, setLoading] = useState(false);

  const form = useForm<ChartAccountFormData>({
    resolver: zodResolver(chartAccountSchema),
    defaultValues: {
      nome: '',
      tipo: 'ativo',
      codigo: '',
      parent_id: 'null',
      descricao: '',
      status: 'ativo',
    },
  });

  const onSubmit = async (data: ChartAccountFormData) => {
    if (!currentCompany) {
      console.error('No current company selected');
      return;
    }

    // Validate código is not duplicated
    if (data.codigo && data.codigo !== '') {
      const isDuplicate = chartAccounts.some(
        account => account.codigo === data.codigo
      );
      if (isDuplicate) {
        form.setError('codigo', {
          type: 'manual',
          message: 'Este código já está sendo usado por outra conta',
        });
        return;
      }
    }

    // Validate hierarchy depth (max 4 levels)
    if (data.parent_id && data.parent_id !== 'null') {
      const getDepth = (accountId: string, depth = 0): number => {
        const parent = chartAccounts.find(acc => acc.id === accountId);
        if (!parent || !parent.parent_id || depth >= 10) return depth;
        return getDepth(parent.parent_id, depth + 1);
      };

      const parentDepth = getDepth(data.parent_id);
      if (parentDepth >= 3) {
        form.setError('parent_id', {
          type: 'manual',
          message: 'A hierarquia não pode ter mais de 4 níveis',
        });
        return;
      }
    }

    setLoading(true);
    try {
      const accountData = {
        nome: data.nome,
        tipo: data.tipo as 'ativo' | 'passivo' | 'patrimonio_liquido' | 'receita' | 'despesa',
        codigo: data.codigo || null,
        parent_id: data.parent_id === 'null' ? null : data.parent_id || null,
        descricao: data.descricao || null,
        status: data.status as 'ativo' | 'inativo',
        // company_id será adicionado no hook
      };

      console.log('Sending data to create:', accountData);
      const result = await createChartAccount(accountData);
      console.log('Create result:', result);

      if (result && !result.error) {
        form.reset();
        onSuccess?.();
      } else {
        console.error('Error creating chart account:', result?.error);
      }
    } catch (error) {
      console.error('Unexpected error creating chart account:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get account hierarchy level for visual indentation
  const getAccountLevel = (accountId: string, level = 0): number => {
    const account = chartAccounts.find(acc => acc.id === accountId);
    if (!account || !account.parent_id || level >= 10) return level;
    return getAccountLevel(account.parent_id, level + 1);
  };

  // Show all accounts as potential parents, sorted by hierarchy
  const parentAccounts = chartAccounts
    .map(account => ({
      ...account,
      level: getAccountLevel(account.id),
    }))
    .sort((a, b) => {
      // Sort by codigo if available, otherwise by nome
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta pai" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">Nenhuma (Conta Principal)</SelectItem>
                  {parentAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {'  '.repeat(account.level)}{account.codigo ? `${account.codigo} - ` : ''}{account.nome}
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          {loading ? 'Criando...' : 'Criar Conta'}
        </Button>
      </form>
    </Form>
  );
}