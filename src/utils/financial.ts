/**
 * Format currency value
 * @param value - The numeric value to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Parse currency string to number
 * @param value - The currency string to parse (e.g. "R$ 1.234,56" or "1234.56")
 * @returns The parsed number value
 */
export function parseCurrency(value: string): number {
  // Remove currency symbol and other non-numeric characters except decimal separator
  const cleanedValue = value.replace(/[^\d,]/g, '').replace(',', '.');
  const numberValue = parseFloat(cleanedValue);
  return isNaN(numberValue) ? 0 : numberValue;
}

/**
 * Format payment method for display
 * @param method - The payment method code
 * @returns Formatted payment method name
 */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return '-';
  
  const paymentMethods: Record<string, string> = {
    'dinheiro': 'Dinheiro',
    'cartao_credito': 'Cartão de Crédito',
    'cartao_debito': 'Cartão de Débito',
    'pix': 'PIX',
    'boleto': 'Boleto',
    'transferencia': 'Transferência',
    'cheque': 'Cheque',
  };
  
  return paymentMethods[method] || method;
}