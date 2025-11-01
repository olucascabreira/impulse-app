// Supabase Edge Function para envio de notificações por email
// Suporta múltiplos provedores: SendGrid, SMTP, Resend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Tipos
interface EmailConfig {
  provider: 'sendgrid' | 'smtp' | 'resend';
  sendgridApiKey?: string;
  sendgridFromEmail?: string;
  sendgridFromName?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  smtpSecure?: boolean;
  resendApiKey?: string;
  resendFromEmail?: string;
  resendFromName?: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: { email: string; name: string };
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  transaction_type: string;
  contact_name?: string;
}

// Classe abstrata para Email Service
abstract class EmailService {
  abstract send(emailData: EmailData): Promise<{ success: boolean; error?: string }>;
}

// SendGrid Service
class SendGridService extends EmailService {
  constructor(private apiKey: string, private fromEmail: string, private fromName: string) {
    super();
  }

  async send(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: emailData.to }],
          }],
          from: {
            email: emailData.from?.email || this.fromEmail,
            name: emailData.from?.name || this.fromName,
          },
          subject: emailData.subject,
          content: [{
            type: 'text/html',
            value: emailData.html,
          }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `SendGrid error: ${error}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `SendGrid exception: ${error.message}` };
    }
  }
}

// SMTP Service (usando SMTPClient do Deno)
class SMTPService extends EmailService {
  constructor(
    private host: string,
    private port: number,
    private user: string,
    private password: string,
    private fromEmail: string,
    private fromName: string,
    private secure: boolean
  ) {
    super();
  }

  async send(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      // Usando nodemailer via npm: para Deno
      const nodemailer = await import('npm:nodemailer@6.9.7');

      const transporter = nodemailer.default.createTransport({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: {
          user: this.user,
          pass: this.password,
        },
      });

      await transporter.sendMail({
        from: `"${emailData.from?.name || this.fromName}" <${emailData.from?.email || this.fromEmail}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: `SMTP exception: ${error.message}` };
    }
  }
}

// Resend Service
class ResendService extends EmailService {
  constructor(private apiKey: string, private fromEmail: string, private fromName: string) {
    super();
  }

  async send(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${emailData.from?.name || this.fromName} <${emailData.from?.email || this.fromEmail}>`,
          to: [emailData.to],
          subject: emailData.subject,
          html: emailData.html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Resend error: ${error}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Resend exception: ${error.message}` };
    }
  }
}

// Factory para criar o serviço de email apropriado
function createEmailService(config: EmailConfig): EmailService {
  switch (config.provider) {
    case 'sendgrid':
      if (!config.sendgridApiKey || !config.sendgridFromEmail) {
        throw new Error('SendGrid credentials missing');
      }
      return new SendGridService(
        config.sendgridApiKey,
        config.sendgridFromEmail,
        config.sendgridFromName || 'Impulse Financeiro'
      );

    case 'smtp':
      if (!config.smtpHost || !config.smtpUser || !config.smtpPassword || !config.smtpFromEmail) {
        throw new Error('SMTP credentials missing');
      }
      return new SMTPService(
        config.smtpHost,
        config.smtpPort || 587,
        config.smtpUser,
        config.smtpPassword,
        config.smtpFromEmail,
        config.smtpFromName || 'Impulse Financeiro',
        config.smtpSecure || false
      );

    case 'resend':
      if (!config.resendApiKey || !config.resendFromEmail) {
        throw new Error('Resend credentials missing');
      }
      return new ResendService(
        config.resendApiKey,
        config.resendFromEmail,
        config.resendFromName || 'Impulse Financeiro'
      );

    default:
      throw new Error(`Unknown email provider: ${config.provider}`);
  }
}

// Template de email para contas a vencer
function generateDueSoonEmail(transactions: Transaction[], daysBeforeDue: number): string {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .transaction { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 4px; }
    .amount { font-weight: bold; color: #667eea; font-size: 18px; }
    .due-date { color: #e53e3e; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
    .button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Alertas de Vencimento</h1>
      <p>Você tem ${transactions.length} conta(s) vencendo em ${daysBeforeDue} dia(s)</p>
    </div>
    <div class="content">
      <p>Olá! Este é um lembrete automático sobre suas contas próximas do vencimento:</p>

      ${transactions.map(t => `
        <div class="transaction">
          <p><strong>${t.description}</strong></p>
          <p>Valor: <span class="amount">R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
          <p>Vencimento: <span class="due-date">${new Date(t.due_date).toLocaleDateString('pt-BR')}</span></p>
          ${t.contact_name ? `<p>Contato: ${t.contact_name}</p>` : ''}
          <p><em>${t.transaction_type === 'saida' ? '📤 Conta a Pagar' : '📥 Conta a Receber'}</em></p>
        </div>
      `).join('')}

      <p style="margin-top: 20px;"><strong>Total:</strong> <span class="amount">R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>

      <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/lancamentos" class="button">Ver Lançamentos</a>
    </div>
    <div class="footer">
      <p>Este é um email automático do Impulse Financeiro. Para alterar suas preferências de notificação, acesse as Configurações.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Template de email para contas vencidas
function generateOverdueEmail(transactions: Transaction[]): string {
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .transaction { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #e53e3e; border-radius: 4px; }
    .amount { font-weight: bold; color: #e53e3e; font-size: 18px; }
    .overdue { color: #e53e3e; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
    .button { background: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Contas Vencidas</h1>
      <p>Você tem ${transactions.length} conta(s) vencida(s)</p>
    </div>
    <div class="content">
      <div class="alert">
        <strong>⚠️ Atenção!</strong> As seguintes contas estão vencidas e precisam de sua atenção:
      </div>

      ${transactions.map(t => {
        const daysOverdue = Math.floor((Date.now() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24));
        return `
        <div class="transaction">
          <p><strong>${t.description}</strong></p>
          <p>Valor: <span class="amount">R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
          <p>Vencimento: <span class="overdue">${new Date(t.due_date).toLocaleDateString('pt-BR')} (${daysOverdue} dia(s) atrasado)</span></p>
          ${t.contact_name ? `<p>Contato: ${t.contact_name}</p>` : ''}
          <p><em>${t.transaction_type === 'saida' ? '📤 Conta a Pagar' : '📥 Conta a Receber'}</em></p>
        </div>
      `}).join('')}

      <p style="margin-top: 20px;"><strong>Total Vencido:</strong> <span class="amount">R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>

      <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/lancamentos" class="button">Regularizar Agora</a>
    </div>
    <div class="footer">
      <p>Este é um email automático do Impulse Financeiro. Para alterar suas preferências de notificação, acesse as Configurações.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Função principal
serve(async (req) => {
  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar emails da fila
    const { data: queueItems, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (queueError) throw queueError;

    const results = [];

    for (const item of queueItems || []) {
      try {
        // Buscar configuração de email da empresa
        const { data: emailConfig, error: configError } = await supabase
          .from('email_configurations')
          .select('*')
          .eq('company_id', item.company_id)
          .single();

        if (configError || !emailConfig) {
          throw new Error('Email configuration not found');
        }

        // Criar serviço de email
        const config: EmailConfig = {
          provider: emailConfig.active_provider,
          sendgridApiKey: emailConfig.sendgrid_api_key,
          sendgridFromEmail: emailConfig.sendgrid_from_email,
          sendgridFromName: emailConfig.sendgrid_from_name,
          smtpHost: emailConfig.smtp_host,
          smtpPort: emailConfig.smtp_port,
          smtpUser: emailConfig.smtp_user,
          smtpPassword: emailConfig.smtp_password,
          smtpFromEmail: emailConfig.smtp_from_email,
          smtpFromName: emailConfig.smtp_from_name,
          smtpSecure: emailConfig.smtp_secure,
          resendApiKey: emailConfig.resend_api_key,
          resendFromEmail: emailConfig.resend_from_email,
          resendFromName: emailConfig.resend_from_name,
        };

        const emailService = createEmailService(config);

        // Enviar email
        const result = await emailService.send({
          to: item.to_email,
          subject: item.subject,
          html: item.html_content,
        });

        if (result.success) {
          // Marcar como enviado
          await supabase
            .from('email_queue')
            .update({ status: 'sent' })
            .eq('id', item.id);

          // Registrar log
          await supabase
            .from('email_logs')
            .insert({
              user_id: item.user_id,
              company_id: item.company_id,
              to_email: item.to_email,
              subject: item.subject,
              notification_type: item.notification_type,
              provider_used: config.provider,
              success: true,
            });

          results.push({ id: item.id, success: true });
        } else {
          // Incrementar tentativas
          await supabase
            .from('email_queue')
            .update({
              attempts: item.attempts + 1,
              last_attempt_at: new Date().toISOString(),
              last_error: result.error,
              status: item.attempts + 1 >= 3 ? 'failed' : 'pending',
            })
            .eq('id', item.id);

          // Registrar log de falha
          await supabase
            .from('email_logs')
            .insert({
              user_id: item.user_id,
              company_id: item.company_id,
              to_email: item.to_email,
              subject: item.subject,
              notification_type: item.notification_type,
              provider_used: config.provider,
              success: false,
              error_message: result.error,
            });

          results.push({ id: item.id, success: false, error: result.error });
        }
      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);
        results.push({ id: item.id, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-email-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
