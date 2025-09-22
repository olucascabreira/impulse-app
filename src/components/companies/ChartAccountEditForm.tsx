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

const chartAccountSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['receita', 'despesa'], {
    required_error: 'Tipo é obrigatório',
  }),
  codigo: z.string().optional(),
  parent_id: z.string().optional(),
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

  const form = useForm<ChartAccountFormData>({
    resolver: zodResolver(chartAccountSchema),
    defaultValues: {
      nome: account.nome,
      tipo: account.tipo,
      codigo: account.codigo || '',
      parent_id: account.parent_id || '',
    },
  });

  const onSubmit = async (data: ChartAccountFormData) => {
    setLoading(true);
    try {
      const updateData = {
        ...data,
        parent_id: data.parent_id || null,
      };

      const result = await updateChartAccount(account.id, updateData);
      if (result && !result.error) {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error updating chart account:', error);
    } finally {
      setLoading(false);
    }
  };

  const parentAccounts = chartAccounts.filter(acc => !acc.parent_id && acc.id !== account.id);

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
                  <SelectItem value="">Nenhuma (Conta Principal)</SelectItem>
                  {parentAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.codigo ? `${acc.codigo} - ` : ''}{acc.nome}
                    </SelectItem>
                  ))}
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