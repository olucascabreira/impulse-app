-- ====================================
-- DIAGNÓSTICO DO SISTEMA DE EMAIL
-- ====================================
-- Execute estas queries no Supabase SQL Editor para diagnosticar problemas

-- 1. Verificar se as tabelas existem
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'notification_preferences',
    'email_configurations',
    'email_queue',
    'email_logs'
  )
ORDER BY table_name;

-- Resultado esperado: 4 linhas (todas as tabelas devem existir)

-- ====================================

-- 2. Verificar estrutura da tabela email_queue
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'email_queue'
ORDER BY ordinal_position;

-- ====================================

-- 3. Verificar configurações de email por empresa
SELECT
  c.id as company_id,
  c.name as company_name,
  ec.active_provider,
  CASE
    WHEN ec.sendgrid_api_key IS NOT NULL THEN '✓ SendGrid configurado'
    ELSE '✗ SendGrid não configurado'
  END as sendgrid_status,
  CASE
    WHEN ec.smtp_host IS NOT NULL THEN '✓ SMTP configurado'
    ELSE '✗ SMTP não configurado'
  END as smtp_status,
  CASE
    WHEN ec.resend_api_key IS NOT NULL THEN '✓ Resend configurado'
    ELSE '✗ Resend não configurado'
  END as resend_status,
  ec.created_at,
  ec.updated_at
FROM companies c
LEFT JOIN email_configurations ec ON c.id = ec.company_id
ORDER BY c.name;

-- ====================================

-- 4. Verificar preferências de notificação dos usuários
SELECT
  p.nome as user_name,
  p.email,
  np.email_notifications,
  np.due_date_alerts,
  np.days_before_due,
  np.monthly_reports,
  np.app_notifications,
  c.name as company_name
FROM profiles p
LEFT JOIN notification_preferences np ON p.user_id = np.user_id
LEFT JOIN companies c ON np.company_id = c.id
ORDER BY p.nome;

-- ====================================

-- 5. Verificar emails na fila (últimos 20)
SELECT
  id,
  to_email,
  subject,
  notification_type,
  status,
  attempts,
  max_attempts,
  scheduled_for,
  last_attempt_at,
  last_error,
  created_at
FROM email_queue
ORDER BY created_at DESC
LIMIT 20;

-- ====================================

-- 6. Verificar emails na fila PENDENTES
SELECT
  id,
  to_email,
  subject,
  status,
  attempts,
  scheduled_for,
  last_error
FROM email_queue
WHERE status = 'pending'
ORDER BY scheduled_for ASC;

-- ====================================

-- 7. Verificar emails FALHADOS
SELECT
  id,
  to_email,
  subject,
  status,
  attempts,
  last_error,
  created_at
FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- ====================================

-- 8. Verificar logs de emails enviados (últimos 20)
SELECT
  id,
  to_email,
  subject,
  notification_type,
  provider_used,
  success,
  error_message,
  sent_at
FROM email_logs
ORDER BY sent_at DESC
LIMIT 20;

-- ====================================

-- 9. Estatísticas de envio por provedor
SELECT
  provider_used,
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed,
  ROUND(
    COUNT(*) FILTER (WHERE success = true) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as success_rate_pct
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY provider_used
ORDER BY total_emails DESC;

-- ====================================

-- 10. Verificar políticas de RLS (Row Level Security)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'notification_preferences',
    'email_configurations',
    'email_queue',
    'email_logs'
  )
ORDER BY tablename, policyname;

-- ====================================

-- 11. Inserir email de teste manualmente (PARA TESTAR)
-- ATENÇÃO: Substitua os valores abaixo pelos seus dados reais

/*
INSERT INTO email_queue (
  user_id,
  company_id,
  to_email,
  subject,
  html_content,
  notification_type,
  scheduled_for
)
VALUES (
  'SEU_USER_ID_AQUI',           -- Substitua pelo seu user_id
  'SEU_COMPANY_ID_AQUI',        -- Substitua pelo company_id
  'seu-email@exemplo.com',      -- Seu email de teste
  '[TESTE MANUAL] Impulse Financeiro',
  '<h1>Email de Teste Manual</h1><p>Se você recebeu este email, o sistema está funcionando!</p>',
  'due_soon',
  NOW()
)
RETURNING *;
*/

-- ====================================

-- 12. Limpar fila de emails de teste (CUIDADO!)
-- Descomente somente se quiser limpar emails de teste

/*
DELETE FROM email_queue
WHERE subject LIKE '%TESTE%'
  OR subject LIKE '%TEST%'
  OR subject LIKE '%DIAGNÓSTICO%';
*/

-- ====================================

-- 13. Verificar se há emails travados há muito tempo
SELECT
  id,
  to_email,
  subject,
  status,
  attempts,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_since_created
FROM email_queue
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at ASC;

-- ====================================

-- 14. Obter seu user_id e company_id (para usar nos testes)
SELECT
  u.id as user_id,
  u.email as user_email,
  p.nome as user_name,
  cu.company_id,
  c.name as company_name
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
LEFT JOIN company_users cu ON u.id = cu.user_id
LEFT JOIN companies c ON cu.company_id = c.id
WHERE u.email = 'SEU_EMAIL_AQUI'; -- Substitua pelo seu email

-- ====================================

-- 15. Verificar tipos ENUM criados
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('email_provider_type', 'notification_type')
ORDER BY t.typname, e.enumsortorder;

-- Resultado esperado:
-- email_provider_type: sendgrid, smtp, resend
-- notification_type: due_soon, due_today, overdue, monthly_report

-- ====================================
-- FIM DO DIAGNÓSTICO
-- ====================================

-- PRÓXIMOS PASSOS BASEADOS NOS RESULTADOS:

-- Se as tabelas NÃO existem:
--   → Execute a migration SQL: supabase/migrations/20250111_email_notifications.sql

-- Se as tabelas existem MAS não há configuração de email:
--   → Vá em Configurações → Notificações → Configurar Email
--   → Preencha as credenciais do SendGrid/SMTP/Resend

-- Se há emails na fila MAS não são enviados:
--   → Faça o deploy da Edge Function: send-email-notifications
--   → Configure as variáveis de ambiente da função
--   → Configure o cron job para processar a fila

-- Se emails estão sendo enviados MAS com falhas:
--   → Verifique a coluna 'error_message' na tabela email_logs
--   → Verifique se as credenciais estão corretas
--   → Teste a API Key do SendGrid manualmente

-- ====================================
