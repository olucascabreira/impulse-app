-- Migration: Sistema de Notificações por Email
-- Descrição: Tabelas para configuração de notificações e log de emails enviados

-- Enum para tipos de provedores de email
CREATE TYPE email_provider_type AS ENUM ('sendgrid', 'smtp', 'resend');

-- Enum para tipos de notificações
CREATE TYPE notification_type AS ENUM ('due_soon', 'due_today', 'overdue', 'monthly_report');

-- Tabela de preferências de notificação
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Configurações de notificação
  email_notifications BOOLEAN DEFAULT true,
  due_date_alerts BOOLEAN DEFAULT true,
  monthly_reports BOOLEAN DEFAULT false,
  app_notifications BOOLEAN DEFAULT true,

  -- Configuração do provedor de email
  email_provider email_provider_type DEFAULT 'smtp',

  -- Dias de antecedência para alertas
  days_before_due INTEGER DEFAULT 3 CHECK (days_before_due >= 1 AND days_before_due <= 30),

  -- Horário preferido para receber emails (formato HH:MM)
  preferred_time TIME DEFAULT '09:00:00',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações de email por empresa
-- Permite que cada empresa configure suas próprias credenciais
CREATE TABLE IF NOT EXISTS email_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Provedor ativo
  active_provider email_provider_type DEFAULT 'smtp',

  -- Configurações SendGrid
  sendgrid_api_key TEXT,
  sendgrid_from_email TEXT,
  sendgrid_from_name TEXT,

  -- Configurações SMTP
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT,
  smtp_password TEXT,
  smtp_from_email TEXT,
  smtp_from_name TEXT,
  smtp_secure BOOLEAN DEFAULT false, -- true para SSL, false para TLS

  -- Configurações Resend
  resend_api_key TEXT,
  resend_from_email TEXT,
  resend_from_name TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de log de emails enviados
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Informações do email
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  notification_type notification_type NOT NULL,
  provider_used email_provider_type NOT NULL,

  -- Status do envio
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT,

  -- Dados relacionados (opcional)
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  metadata JSONB, -- Dados adicionais como valores, descrições, etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de fila de emails pendentes
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  notification_type notification_type NOT NULL,

  -- Controle de envio
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,

  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_company_id ON notification_preferences(company_id);
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_company_id ON email_logs(company_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_notification_type ON email_logs(notification_type);
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON email_queue(scheduled_for);
CREATE INDEX idx_email_configurations_company_id ON email_configurations(company_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_configurations_updated_at
  BEFORE UPDATE ON email_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas de acesso para email_configurations
CREATE POLICY "Company admins can view email configurations"
  ON email_configurations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = email_configurations.company_id
      AND companies.user_admin_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can insert email configurations"
  ON email_configurations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = email_configurations.company_id
      AND companies.user_admin_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can update email configurations"
  ON email_configurations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = email_configurations.company_id
      AND companies.user_admin_id = auth.uid()
    )
  );

-- Políticas de acesso para email_logs
CREATE POLICY "Users can view their own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Políticas de acesso para email_queue
CREATE POLICY "Users can view their own email queue"
  ON email_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE notification_preferences IS 'Preferências de notificação de cada usuário';
COMMENT ON TABLE email_configurations IS 'Configurações de provedores de email por empresa';
COMMENT ON TABLE email_logs IS 'Log de todos os emails enviados pelo sistema';
COMMENT ON TABLE email_queue IS 'Fila de emails pendentes para envio';
COMMENT ON COLUMN notification_preferences.days_before_due IS 'Quantos dias antes do vencimento enviar alerta';
COMMENT ON COLUMN email_queue.attempts IS 'Número de tentativas de envio';
