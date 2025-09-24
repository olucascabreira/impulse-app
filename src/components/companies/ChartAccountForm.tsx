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
  tipo: z.enum(['receita', 'despesa'], {
    required_error: 'Tipo é obrigatório',
  }),
  codigo: z.string().optional(),
  parent_id: z.string().optional().nullable(),
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
      tipo: 'receita',
      codigo: '',
      parent_id: 'null',
    },
  });

  const onSubmit = async (data: ChartAccountFormData) => {
    if (!currentCompany) {
      console.error('No current company selected');
      return;
    }

    setLoading(true);
    try {
      const accountData = {
        nome: data.nome,
        tipo: data.tipo as 'receita' | 'despesa', // Assegura o tipo correto
        codigo: data.codigo || null, // Garante que seja null se vazio
        parent_id: data.parent_id === 'null' ? null : data.parent_id || null,
        // company_id será adicionado no hook
      };

      console.log('Sending data to create:', accountData); // Log para debug
      const result = await createChartAccount(accountData);
      console.log('Create result:', result); // Log para debug
      
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

  const parentAccounts = chartAccounts.filter(account => !account.parent_id);

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
                  <SelectItem value="null">Nenhuma (Conta Principal)</SelectItem>
                  {parentAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.codigo ? `${account.codigo} - ` : ''}{account.nome}
                    </SelectItem>
                  ))}
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