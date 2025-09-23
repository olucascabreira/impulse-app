import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';
import { Transaction } from '@/hooks/use-transactions';

interface FinancialSummaryProps {
  transactions: Transaction[];
  selectedDate: Date;
}

export function FinancialSummary({ transactions, selectedDate }: FinancialSummaryProps) {
  // Calculate receivables data (entradas)
  const receivablesData = useMemo(() => {
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.created_at);
      return (
        transactionDate.getMonth() === selectedDate.getMonth() &&
        transactionDate.getFullYear() === selectedDate.getFullYear() &&
        t.transaction_type === 'entrada'
      );
    });

    // For receitas, 'pago' counts as realized
    const received = currentMonthTransactions
      .filter(t => t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);

    const pending = currentMonthTransactions
      .filter(t => t.status === 'pendente' || t.status === 'atrasado')
      .reduce((sum, t) => sum + t.amount, 0);

    const planned = received + pending;
    const percentage = planned > 0 ? Math.round((received / planned) * 100) : 0;

    return {
      received,
      pending,
      planned,
      percentage
    };
  }, [transactions, selectedDate]);

  // Calculate payables data (saídas)
  const payablesData = useMemo(() => {
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.created_at);
      return (
        transactionDate.getMonth() === selectedDate.getMonth() &&
        transactionDate.getFullYear() === selectedDate.getFullYear() &&
        t.transaction_type === 'saida'
      );
    });

    // For despesas, 'pago' counts as realized
    const paid = currentMonthTransactions
      .filter(t => t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);

    const pending = currentMonthTransactions
      .filter(t => t.status === 'pendente' || t.status === 'atrasado')
      .reduce((sum, t) => sum + t.amount, 0);

    const planned = paid + pending;
    const percentage = planned > 0 ? Math.round((paid / planned) * 100) : 0;

    return {
      paid,
      pending,
      planned,
      percentage
    };
  }, [transactions, selectedDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recebimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recebimentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Chart */}
          <div className="flex items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-muted"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-emerald-500"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  strokeDasharray={`${receivablesData.percentage * 2.51} 251`}
                  transform="rotate(-90 50 50)"
                  strokeLinecap="round"
                />
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  dy="7"
                  fontSize="20"
                  fontWeight="bold"
                  fill="currentColor"
                  className="text-foreground"
                >
                  {receivablesData.percentage}%
                </text>
              </svg>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Recebido</span>
                <span className="text-sm font-medium text-emerald-600">
                  R$ {receivablesData.received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Progress value={receivablesData.percentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Realizado</p>
                <p className="font-semibold text-emerald-600">
                  R$ {receivablesData.received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Falta</p>
                <p className="font-semibold text-amber-600">
                  R$ {receivablesData.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-muted p-3 rounded-lg col-span-2">
                <p className="text-xs text-muted-foreground">Previsto</p>
                <p className="font-semibold">
                  R$ {receivablesData.planned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Despesas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Chart */}
          <div className="flex items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-muted"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-red-500"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  strokeDasharray={`${payablesData.percentage * 2.51} 251`}
                  transform="rotate(-90 50 50)"
                  strokeLinecap="round"
                />
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  dy="7"
                  fontSize="20"
                  fontWeight="bold"
                  fill="currentColor"
                  className="text-foreground"
                >
                  {payablesData.percentage}%
                </text>
              </svg>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Pago</span>
                <span className="text-sm font-medium text-red-600">
                  R$ {payablesData.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Progress value={payablesData.percentage} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Realizado</p>
                <p className="font-semibold text-red-600">
                  R$ {payablesData.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Falta</p>
                <p className="font-semibold text-amber-600">
                  R$ {payablesData.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-muted p-3 rounded-lg col-span-2">
                <p className="text-xs text-muted-foreground">Previsto</p>
                <p className="font-semibold">
                  R$ {payablesData.planned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}