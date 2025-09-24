import { useValuesVisibility } from '@/hooks/use-values-visibility';
import { formatCurrency } from '@/utils/format-currency';

interface ValueDisplayProps {
  value: number;
  className?: string;
  currency?: boolean;
}

export function ValueDisplay({ value, className = '', currency = true }: ValueDisplayProps) {
  const { valuesHidden } = useValuesVisibility();
  
  if (valuesHidden) {
    return <span className={className}>••••••••</span>;
  }
  
  if (currency) {
    return <span className={className}>{formatCurrency(value)}</span>;
  }
  
  return <span className={className}>{value.toLocaleString('pt-BR')}</span>;
}