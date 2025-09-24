/**
 * Format currency value with option to hide the actual value
 * @param value - The numeric value to format
 * @param hidden - Whether to hide the value
 * @returns Formatted currency string or hidden placeholder
 */
export function formatCurrency(value: number, hidden: boolean = false): string {
  if (hidden) {
    return '••••••••';
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}