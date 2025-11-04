# 📧 Como Ativar as Notificações de Email

## 🎯 Resumo

As notificações de email para transações em atraso **não estavam funcionando** porque faltava configurar o cron job automático. Agora você tem tudo para ativar!

---

## ✅ O que foi criado

1. **Migração SQL** (`20250112100000_setup_notification_system.sql`)
   - Funções para gerar HTML dos emails
   - Função para processar notificações diariamente
   - Cron job agendado para 8h da manhã

2. **Diagnóstico** (`DIAGNOSTICO_NOTIFICACOES.md`)
   - Análise completa do problema
   - Explicação do fluxo

---

## 🚀 Como Ativar (Passo a Passo)

### Passo 1: Aplicar a Migração

```bash
cd C:\Users\lucas\Downloads\impulse-app

# Opção A: Via Supabase CLI
supabase db push

# Opção B: Via Dashboard
# Copie o conteúdo de supabase/migrations/20250112100000_setup_notification_system.sql
# Cole no SQL Editor do Supabase Dashboard e execute
```

---

### Passo 2: Configurar Credenciais de Email

Você precisa configurar um provedor de email. Escolha um:

#### Opção A: Gmail (SMTP) - FÁCIL ⭐

1. Acesse https://myaccount.google.com/apppasswords
2. Crie uma senha de app
3. Insira no banco:

```sql
INSERT INTO email_configurations (
  company_id,
  active_provider,
  smtp_host,
  smtp_port,
  smtp_user,
  smtp_password,
  smtp_from_email,
  smtp_from_name,
  smtp_secure
) VALUES (
  'YOUR_COMPANY_ID',
  'smtp',
  'smtp.gmail.com',
  587,
  'seu-email@gmail.com',
  'sua-senha-de-app',  -- Senha de app (NÃO sua senha normal)
  'seu-email@gmail.com',
  'Impulse Financeiro',
  false  -- false para TLS, true para SSL
);
```

#### Opção B: SendGrid - PROFISSIONAL

1. Crie conta em https://sendgrid.com (gratuito até 100 emails/dia)
2. Gere API Key
3. Insira no banco:

```sql
INSERT INTO email_configurations (
  company_id,
  active_provider,
  sendgrid_api_key,
  sendgrid_from_email,
  sendgrid_from_name
) VALUES (
  'YOUR_COMPANY_ID',
  'sendgrid',
  'SG.xxxxxxxxxxxxxxxxxxxxx',
  'seu-email@seudominio.com',
  'Impulse Financeiro'
);
```

#### Opção C: Resend - MODERNO

1. Crie conta em https://resend.com
2. Gere API Key
3. Insira no banco:

```sql
INSERT INTO email_configurations (
  company_id,
  active_provider,
  resend_api_key,
  resend_from_email,
  resend_from_name
) VALUES (
  'YOUR_COMPANY_ID',
  'resend',
  're_xxxxxxxxxxxxxxxxxxxxx',
  'seu-email@seudominio.com',
  'Impulse Financeiro'
);
```

---

### Passo 3: Configurar Preferências de Usuário

Para cada usuário que quer receber notificações:

```sql
INSERT INTO notification_preferences (
  user_id,
  company_id,
  email_notifications,
  due_date_alerts,
  days_before_due,
  preferred_time
) VALUES (
  'USER_ID_AQUI',
  'COMPANY_ID_AQUI',
  true,      -- Ativar notificações por email
  true,      -- Ativar alertas de vencimento
  3,         -- Alertar 3 dias antes do vencimento
  '09:00:00' -- Horário preferido (ainda não implementado)
);
```

---

### Passo 4: Configurar Cron para Enviar Emails

A migração cria um cron que ENFILEIRA os emails, mas você precisa configurar o envio.

#### Opção A: Cron no Supabase (RECOMENDADO)

```sql
-- Habilitar extensão de HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- Configurar URL da Edge Function
ALTER DATABASE postgres SET app.edge_function_url TO 'https://SEU-PROJECT-REF.supabase.co';

-- Agendar envio a cada 15 minutos
SELECT cron.schedule(
  'send-email-notifications',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.edge_function_url') || '/functions/v1/send-email-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**IMPORTANTE:** Substitua `SEU-PROJECT-REF` pela referência do seu projeto Supabase.

---

## 🧪 Testar Manualmente

### Teste 1: Enfileirar Email Manualmente

```sql
-- Buscar seu user_id
SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com';

-- Buscar company_id
SELECT id FROM companies LIMIT 1;

-- Enfileirar um email de teste
INSERT INTO email_queue (
  user_id,
  company_id,
  to_email,
  subject,
  html_content,
  notification_type,
  scheduled_for
) VALUES (
  'USER_ID_AQUI',
  'COMPANY_ID_AQUI',
  'seu-email@exemplo.com',
  '🧪 Email de Teste - Impulse',
  '<h1>Teste de Email</h1><p>Se você recebeu este email, o sistema está funcionando!</p>',
  'overdue',
  NOW()
);

-- Verificar se foi enfileirado
SELECT * FROM email_queue WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5;
```

### Teste 2: Processar Fila Manualmente

Chame a Edge Function via cURL:

```bash
curl -X POST 'https://SEU-PROJECT-REF.supabase.co/functions/v1/send-email-notifications' \
  -H 'Authorization: Bearer SEU_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Teste 3: Executar Cron Manualmente

```sql
-- Executar a função de processar notificações
SELECT process_payment_notifications_cron();

-- Verificar emails enfileirados
SELECT * FROM email_queue WHERE created_at > NOW() - INTERVAL '1 hour';

-- Verificar logs de envio
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;
```

---

## 📊 Monitoramento

### Ver Emails Pendentes
```sql
SELECT
  eq.to_email,
  eq.subject,
  eq.notification_type,
  eq.status,
  eq.attempts,
  eq.last_error,
  eq.created_at
FROM email_queue eq
WHERE eq.status = 'pending'
ORDER BY eq.created_at DESC;
```

### Ver Emails Enviados Hoje
```sql
SELECT
  el.to_email,
  el.subject,
  el.notification_type,
  el.success,
  el.sent_at,
  el.error_message
FROM email_logs el
WHERE DATE(el.sent_at) = CURRENT_DATE
ORDER BY el.sent_at DESC;
```

### Ver Taxa de Sucesso
```sql
SELECT
  notification_type,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as enviados,
  ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as taxa_sucesso
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY notification_type;
```

---

## 🔧 Troubleshooting

### Problema 1: Emails não são enfileirados

**Verificar se há preferências configuradas:**
```sql
SELECT * FROM notification_preferences WHERE email_notifications = true;
```

**Solução:** Configure as preferências (Passo 3)

---

### Problema 2: Emails enfileirados mas não enviados

**Verificar status da fila:**
```sql
SELECT status, COUNT(*) FROM email_queue GROUP BY status;
```

**Verificar erros:**
```sql
SELECT * FROM email_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

**Solução:**
1. Verifique credenciais de email
2. Teste envio manual (Teste 2)
3. Verifique se Edge Function está deployed

---

### Problema 3: Cron não executa

**Verificar se cron está ativo:**
```sql
SELECT * FROM cron.job;
```

**Verificar logs do cron:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%notification%')
ORDER BY start_time DESC
LIMIT 10;
```

**Solução:**
1. Verifique se pg_cron está habilitado
2. Reaplique a migração
3. Verifique permissões do banco

---

### Problema 4: Emails vão para spam

**Soluções:**
- Use domínio próprio (não @gmail.com)
- Configure SPF, DKIM, DMARC no seu domínio
- Use SendGrid ou Resend (melhor deliverability)
- Peça para usuários adicionarem seu email aos contatos

---

## 📅 Cronograma de Envios

Com a configuração padrão:

| Horário | Ação | O que faz |
|---------|------|-----------|
| **08:00** | Processar notificações | Busca transações vencidas/a vencer e enfileira emails |
| **08:15** | Enviar emails | Processa fila e envia emails |
| **08:30** | Enviar emails | Processa fila e envia emails |
| **08:45** | Enviar emails | Processa fila e envia emails |
| ... | A cada 15 min | Continua processando fila durante o dia |

---

## 🎯 Checklist de Ativação

- [ ] Aplicar migração SQL
- [ ] Configurar credenciais de email (Gmail/SendGrid/Resend)
- [ ] Configurar preferências de usuário
- [ ] Configurar cron de envio (Edge Function)
- [ ] Executar teste manual (Teste 1)
- [ ] Verificar email recebido
- [ ] Monitorar logs por 1 semana
- [ ] Documentar para equipe

---

## 🆘 Precisa de Ajuda?

1. Verifique `DIAGNOSTICO_NOTIFICACOES.md` para entender o sistema
2. Execute os queries de monitoramento acima
3. Verifique logs da Edge Function no Supabase Dashboard
4. Teste manualmente antes de confiar no cron

---

**Status:** ✅ Sistema criado e pronto para ativar
**Última atualização:** 2025-01-12
**Tempo estimado de configuração:** 30 minutos
