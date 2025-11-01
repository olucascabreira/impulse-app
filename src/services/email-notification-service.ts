import { supabase } from '@/integrations/supabase/client';
import { addDays, isAfter, isBefore, isToday, parseISO } from 'date-fns';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  transaction_type: 'entrada' | 'saida';
  status: string;
  contacts?: { name: string };
  company_id: string;
}

interface NotificationPreferences {
  user_id: string;
  email_notifications: boolean;
  due_date_alerts: boolean;
  days_before_due: number;
}

type NotificationType = 'due_soon' | 'due_today' | 'overdue' | 'monthly_report';

/**
 * Template de email para contas a vencer em breve
 */
function generateDueSoonEmailTemplate(
  transactions: Transaction[],
  daysBeforeDue: number,
  userName: string
): string {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .transaction { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #667eea; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .amount { font-weight: bold; color: #667eea; font-size: 18px; }
    .due-date { color: #e53e3e; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; }
    .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
    .summary { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Alertas de Vencimento</h1>
      <p>Olá ${userName}!</p>
      <p>Você tem ${transactions.length} conta(s) vencendo em ${daysBeforeDue} dia(s)</p>
    </div>
    <div class="content">
      <p>Este é um lembrete automático sobre suas contas próximas do vencimento:</p>

      ${transactions.map(t => `
        <div class="transaction">
          <p style="margin: 0 0 8px 0;"><strong>${t.description}</strong></p>
          <p style="margin: 0 0 8px 0;">Valor: <span class="amount">R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          <p style="margin: 0 0 8px 0;">Vencimento: <span class="due-date">${new Date(t.due_date).toLocaleDateString('pt-BR')}</span></p>
          ${t.contacts?.name ? `<p style="margin: 0 0 8px 0;">Contato: ${t.contacts.name}</p>` : ''}
          <p style="margin: 0;"><em>${t.transaction_type === 'saida' ? '📤 Conta a Pagar' : '📥 Conta a Receber'}</em></p>
        </div>
      `).join('')}

      <div class="summary">
        <p style="margin: 0;"><strong>Total:</strong> <span class="amount">R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
      </div>

      <div style="text-align: center;">
        <a href="${window.location.origin}/lancamentos" class="button">Ver Lançamentos</a>
      </div>
    </div>
    <div class="footer">
      <p>Este é um email automático do <strong>Impulse Financeiro</strong>.</p>
      <p>Para alterar suas preferências de notificação, acesse Configurações → Notificações.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template de email para contas vencidas
 */
function generateOverdueEmailTemplate(transactions: Transaction[], userName: string): string {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; }
    .header { background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); color: white; padding: 30px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .transaction { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #e53e3e; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .amount { font-weight: bold; color: #e53e3e; font-size: 18px; }
    .overdue { color: #e53e3e; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; }
    .button { background: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .summary { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Contas Vencidas</h1>
      <p>Olá ${userName}!</p>
      <p>Você tem ${transactions.length} conta(s) vencida(s)</p>
    </div>
    <div class="content">
      <div class="alert">
        <strong>⚠️ Atenção!</strong> As seguintes contas estão vencidas e precisam de sua atenção imediata:
      </div>

      ${transactions.map(t => {
        const daysOverdue = Math.floor((Date.now() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24));
        return `
        <div class="transaction">
          <p style="margin: 0 0 8px 0;"><strong>${t.description}</strong></p>
          <p style="margin: 0 0 8px 0;">Valor: <span class="amount">R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          <p style="margin: 0 0 8px 0;">Vencimento: <span class="overdue">${new Date(t.due_date).toLocaleDateString('pt-BR')} (${daysOverdue} dia${daysOverdue > 1 ? 's' : ''} atrasado)</span></p>
          ${t.contacts?.name ? `<p style="margin: 0 0 8px 0;">Contato: ${t.contacts.name}</p>` : ''}
          <p style="margin: 0;"><em>${t.transaction_type === 'saida' ? '📤 Conta a Pagar' : '📥 Conta a Receber'}</em></p>
        </div>
      `}).join('')}

      <div class="summary">
        <p style="margin: 0;"><strong>Total Vencido:</strong> <span class="amount">R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
      </div>

      <div style="text-align: center;">
        <a href="${window.location.origin}/lancamentos" class="button">Regularizar Agora</a>
      </div>
    </div>
    <div class="footer">
      <p>Este é um email automático do <strong>Impulse Financeiro</strong>.</p>
      <p>Para alterar suas preferências de notificação, acesse Configurações → Notificações.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template de email para contas que vencem hoje
 */
function generateDueTodayEmailTemplate(transactions: Transaction[], userName: string): string {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; }
    .header { background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); color: white; padding: 30px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .transaction { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f6ad55; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .amount { font-weight: bold; color: #ed8936; font-size: 18px; }
    .due-date { color: #dd6b20; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; }
    .button { background: #ed8936; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
    .summary { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Contas Vencendo Hoje</h1>
      <p>Olá ${userName}!</p>
      <p>Você tem ${transactions.length} conta(s) com vencimento para hoje</p>
    </div>
    <div class="content">
      <p>Lembrete: as seguintes contas <strong>vencem hoje</strong>:</p>

      ${transactions.map(t => `
        <div class="transaction">
          <p style="margin: 0 0 8px 0;"><strong>${t.description}</strong></p>
          <p style="margin: 0 0 8px 0;">Valor: <span class="amount">R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          <p style="margin: 0 0 8px 0;">Vencimento: <span class="due-date">Hoje, ${new Date(t.due_date).toLocaleDateString('pt-BR')}</span></p>
          ${t.contacts?.name ? `<p style="margin: 0 0 8px 0;">Contato: ${t.contacts.name}</p>` : ''}
          <p style="margin: 0;"><em>${t.transaction_type === 'saida' ? '📤 Conta a Pagar' : '📥 Conta a Receber'}</em></p>
        </div>
      `).join('')}

      <div class="summary">
        <p style="margin: 0;"><strong>Total:</strong> <span class="amount">R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
      </div>

      <div style="text-align: center;">
        <a href="${window.location.origin}/lancamentos" class="button">Ver Lançamentos</a>
      </div>
    </div>
    <div class="footer">
      <p>Este é um email automático do <strong>Impulse Financeiro</strong>.</p>
      <p>Para alterar suas preferências de notificação, acesse Configurações → Notificações.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Adiciona um email à fila de envio
 */
async function queueEmail(
  userId: string,
  companyId: string,
  toEmail: string,
  subject: string,
  htmlContent: string,
  notificationType: NotificationType
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('email_queue').insert({
      user_id: userId,
      company_id: companyId,
      to_email: toEmail,
      subject,
      html_content: htmlContent,
      notification_type: notificationType,
      scheduled_for: new Date().toISOString(),
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error queuing email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Processa notificações de vencimento e adiciona emails à fila
 */
export async function processPaymentNotifications(companyId: string): Promise<void> {
  try {
    // Buscar preferências de usuários com notificações ativadas
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*, profiles!inner(user_id, nome, email)')
      .eq('company_id', companyId)
      .eq('email_notifications', true)
      .eq('due_date_alerts', true);

    if (prefsError) throw prefsError;
    if (!preferences || preferences.length === 0) return;

    // Buscar transações pendentes
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*, contacts(name)')
      .eq('company_id', companyId)
      .neq('status', 'pago')
      .neq('status', 'recebido')
      .neq('status', 'cancelado')
      .not('due_date', 'is', null);

    if (transError) throw transError;
    if (!transactions || transactions.length === 0) return;

    const now = new Date();

    for (const pref of preferences) {
      const userEmail = (pref.profiles as any).email;
      const userName = (pref.profiles as any).nome || 'Usuário';
      const daysBeforeDue = pref.days_before_due || 3;

      // Filtrar transações vencidas
      const overdueTransactions = transactions.filter(t => {
        const dueDate = parseISO(t.due_date);
        return isBefore(dueDate, now);
      });

      // Filtrar transações que vencem hoje
      const dueTodayTransactions = transactions.filter(t => {
        const dueDate = parseISO(t.due_date);
        return isToday(dueDate);
      });

      // Filtrar transações que vencem em N dias
      const dueSoonTransactions = transactions.filter(t => {
        const dueDate = parseISO(t.due_date);
        const targetDate = addDays(now, daysBeforeDue);
        return isToday(dueDate) === false &&
               isBefore(dueDate, targetDate) &&
               isAfter(dueDate, now);
      });

      // Enviar email de vencidos
      if (overdueTransactions.length > 0) {
        const html = generateOverdueEmailTemplate(overdueTransactions as any[], userName);
        await queueEmail(
          pref.user_id,
          companyId,
          userEmail,
          `🚨 ${overdueTransactions.length} Conta(s) Vencida(s) - Impulse Financeiro`,
          html,
          'overdue'
        );
      }

      // Enviar email de vencimento hoje
      if (dueTodayTransactions.length > 0) {
        const html = generateDueTodayEmailTemplate(dueTodayTransactions as any[], userName);
        await queueEmail(
          pref.user_id,
          companyId,
          userEmail,
          `📅 ${dueTodayTransactions.length} Conta(s) Vencendo Hoje - Impulse Financeiro`,
          html,
          'due_today'
        );
      }

      // Enviar email de vencimento próximo
      if (dueSoonTransactions.length > 0) {
        const html = generateDueSoonEmailTemplate(dueSoonTransactions as any[], daysBeforeDue, userName);
        await queueEmail(
          pref.user_id,
          companyId,
          userEmail,
          `⏰ ${dueSoonTransactions.length} Conta(s) a Vencer em ${daysBeforeDue} Dias - Impulse Financeiro`,
          html,
          'due_soon'
        );
      }
    }
  } catch (error) {
    console.error('Error processing payment notifications:', error);
    throw error;
  }
}
