-- Migration: Complete Notification System Setup - PART 2
-- Description: Adds HTML generation functions and pg_cron automation for email notifications
-- IMPORTANT: This migration is complementary to 20250111_email_notifications.sql
--            It adds the automation layer (cron jobs) and HTML templates for emails

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Function to generate HTML for overdue emails
CREATE OR REPLACE FUNCTION generate_overdue_email_html(
  transactions_json JSONB,
  user_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  html TEXT;
  total_amount NUMERIC := 0;
  transaction JSONB;
BEGIN
  -- Calculate total
  FOR transaction IN SELECT * FROM jsonb_array_elements(transactions_json)
  LOOP
    total_amount := total_amount + (transaction->>'amount')::NUMERIC;
  END LOOP;

  html := format('
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; }
    .header { background: linear-gradient(135deg, #e53e3e 0%%, #c53030 100%%); color: white; padding: 30px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .transaction { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #e53e3e; border-radius: 4px; }
    .amount { font-weight: bold; color: #e53e3e; font-size: 18px; }
    .overdue { color: #e53e3e; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; }
    .button { background: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
    .alert { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Contas Vencidas</h1>
      <p>Olá %s!</p>
      <p>Você tem contas vencidas</p>
    </div>
    <div class="content">
      <div class="alert">
        <strong>⚠️ Atenção!</strong> As seguintes contas estão vencidas e precisam de sua atenção:
      </div>
      %s
      <p style="margin-top: 20px;"><strong>Total Vencido:</strong> <span class="amount">R$ %s</span></p>
      <div style="text-align: center;">
        <a href="%s/transactions" class="button">Regularizar Agora</a>
      </div>
    </div>
    <div class="footer">
      <p>Este é um email automático do Impulse Financeiro.</p>
    </div>
  </div>
</body>
</html>',
    user_name,
    (
      SELECT string_agg(
        format('<div class="transaction">
          <p><strong>%s</strong></p>
          <p>Valor: <span class="amount">R$ %s</span></p>
          <p>Vencimento: <span class="overdue">%s (%s dias atrasado)</span></p>
          <p><em>%s</em></p>
        </div>',
          t->>'description',
          to_char((t->>'amount')::NUMERIC, 'FM999G999G999D00'),
          to_char((t->>'due_date')::DATE, 'DD/MM/YYYY'),
          EXTRACT(DAY FROM (CURRENT_DATE - (t->>'due_date')::DATE)),
          CASE WHEN t->>'transaction_type' = 'saida' THEN '📤 Conta a Pagar' ELSE '📥 Conta a Receber' END
        ),
        ''
      )
      FROM jsonb_array_elements(transactions_json) t
    ),
    to_char(total_amount, 'FM999G999G999D00'),
    coalesce(current_setting('app.base_url', true), 'http://localhost:5173')
  );

  RETURN html;
END;
$$;

-- 3. Function to generate HTML for due today emails
CREATE OR REPLACE FUNCTION generate_due_today_email_html(
  transactions_json JSONB,
  user_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  html TEXT;
  total_amount NUMERIC := 0;
  transaction JSONB;
BEGIN
  FOR transaction IN SELECT * FROM jsonb_array_elements(transactions_json)
  LOOP
    total_amount := total_amount + (transaction->>'amount')::NUMERIC;
  END LOOP;

  html := format('
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0; }
    .header { background: linear-gradient(135deg, #f6ad55 0%%, #ed8936 100%%); color: white; padding: 30px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; }
    .transaction { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f6ad55; border-radius: 4px; }
    .amount { font-weight: bold; color: #ed8936; font-size: 18px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f0f0f0; }
    .button { background: #ed8936; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Contas Vencendo Hoje</h1>
      <p>Olá %s!</p>
    </div>
    <div class="content">
      <p>As seguintes contas <strong>vencem hoje</strong>:</p>
      %s
      <p style="margin-top: 20px;"><strong>Total:</strong> <span class="amount">R$ %s</span></p>
      <div style="text-align: center;">
        <a href="%s/transactions" class="button">Ver Lançamentos</a>
      </div>
    </div>
    <div class="footer">
      <p>Este é um email automático do Impulse Financeiro.</p>
    </div>
  </div>
</body>
</html>',
    user_name,
    (
      SELECT string_agg(
        format('<div class="transaction">
          <p><strong>%s</strong></p>
          <p>Valor: <span class="amount">R$ %s</span></p>
          <p>Vencimento: <strong>Hoje, %s</strong></p>
          <p><em>%s</em></p>
        </div>',
          t->>'description',
          to_char((t->>'amount')::NUMERIC, 'FM999G999G999D00'),
          to_char((t->>'due_date')::DATE, 'DD/MM/YYYY'),
          CASE WHEN t->>'transaction_type' = 'saida' THEN '📤 Conta a Pagar' ELSE '📥 Conta a Receber' END
        ),
        ''
      )
      FROM jsonb_array_elements(transactions_json) t
    ),
    to_char(total_amount, 'FM999G999G999D00'),
    coalesce(current_setting('app.base_url', true), 'http://localhost:5173')
  );

  RETURN html;
END;
$$;

-- 4. Main function to process notifications
CREATE OR REPLACE FUNCTION process_payment_notifications_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_record RECORD;
  prefs_record RECORD;
  overdue_transactions JSONB;
  due_today_transactions JSONB;
  due_soon_transactions JSONB;
BEGIN
  RAISE NOTICE '[%] Starting payment notifications process', NOW();

  -- Iterate over all companies
  FOR company_record IN SELECT DISTINCT id FROM companies LOOP

    -- Get users with notifications enabled for this company
    FOR prefs_record IN
      SELECT
        np.user_id,
        np.company_id,
        np.days_before_due,
        p.nome as user_name,
        au.email as user_email
      FROM notification_preferences np
      JOIN profiles p ON p.user_id = np.user_id
      JOIN auth.users au ON au.id = np.user_id
      WHERE np.company_id = company_record.id
        AND np.email_notifications = true
        AND np.due_date_alerts = true
    LOOP

      -- Fetch overdue transactions
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'description', t.description,
        'amount', t.amount,
        'due_date', t.due_date,
        'transaction_type', t.transaction_type,
        'contact_name', c.name
      ))
      INTO overdue_transactions
      FROM transactions t
      LEFT JOIN contacts c ON c.id = t.contact_id
      WHERE t.company_id = company_record.id
        AND t.due_date < CURRENT_DATE
        AND t.status IN ('pendente', 'atrasado')
        AND t.due_date IS NOT NULL;

      -- Fetch due today transactions
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'description', t.description,
        'amount', t.amount,
        'due_date', t.due_date,
        'transaction_type', t.transaction_type,
        'contact_name', c.name
      ))
      INTO due_today_transactions
      FROM transactions t
      LEFT JOIN contacts c ON c.id = t.contact_id
      WHERE t.company_id = company_record.id
        AND t.due_date = CURRENT_DATE
        AND t.status = 'pendente'
        AND t.due_date IS NOT NULL;

      -- Queue overdue email
      IF overdue_transactions IS NOT NULL THEN
        INSERT INTO email_queue (
          user_id,
          company_id,
          to_email,
          subject,
          html_content,
          notification_type,
          scheduled_for
        )
        SELECT
          prefs_record.user_id,
          prefs_record.company_id,
          prefs_record.user_email,
          '🚨 Contas Vencidas - Impulse Financeiro',
          generate_overdue_email_html(overdue_transactions, prefs_record.user_name),
          'overdue',
          NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM email_logs
          WHERE user_id = prefs_record.user_id
            AND notification_type = 'overdue'
            AND DATE(sent_at) = CURRENT_DATE
        );

        RAISE NOTICE '[%] Queued overdue notification for user % (company %)',
          NOW(), prefs_record.user_id, prefs_record.company_id;
      END IF;

      -- Queue due today email
      IF due_today_transactions IS NOT NULL THEN
        INSERT INTO email_queue (
          user_id,
          company_id,
          to_email,
          subject,
          html_content,
          notification_type,
          scheduled_for
        )
        SELECT
          prefs_record.user_id,
          prefs_record.company_id,
          prefs_record.user_email,
          '📅 Contas Vencendo Hoje - Impulse Financeiro',
          generate_due_today_email_html(due_today_transactions, prefs_record.user_name),
          'due_today',
          NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM email_logs
          WHERE user_id = prefs_record.user_id
            AND notification_type = 'due_today'
            AND DATE(sent_at) = CURRENT_DATE
        );

        RAISE NOTICE '[%] Queued due today notification for user % (company %)',
          NOW(), prefs_record.user_id, prefs_record.company_id;
      END IF;

    END LOOP;
  END LOOP;

  RAISE NOTICE '[%] Payment notifications process completed', NOW();
END;
$$;

-- 5. Schedule cron job to run daily at 8am
SELECT cron.schedule(
  'process-payment-notifications',
  '0 8 * * *',  -- Every day at 8am
  'SELECT process_payment_notifications_cron()'
);

-- 6. Note: To send queued emails automatically, you need to configure the Edge Function
--    See COMO_ATIVAR_NOTIFICACOES.md for instructions on setting up the send-email-notifications cron

-- 7. Add comments for documentation
COMMENT ON FUNCTION generate_overdue_email_html IS 'Generates HTML template for overdue transactions email';
COMMENT ON FUNCTION generate_due_today_email_html IS 'Generates HTML template for transactions due today email';
COMMENT ON FUNCTION process_payment_notifications_cron IS 'Processes payment notifications and queues emails - Runs daily at 8am';

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_overdue_email_html TO authenticated;
GRANT EXECUTE ON FUNCTION generate_due_today_email_html TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Notification system setup completed successfully!';
  RAISE NOTICE '📧 Cron job scheduled to run daily at 8am';
  RAISE NOTICE '⚠️  Remember to:';
  RAISE NOTICE '   1. Configure email credentials in email_configurations table';
  RAISE NOTICE '   2. Set up user notification preferences';
  RAISE NOTICE '   3. Configure Edge Function URL in cron (commented section)';
END $$;
