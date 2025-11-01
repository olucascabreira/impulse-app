-- ====================================
-- FIX: Row Level Security para email_queue
-- ====================================
-- Este script adiciona as políticas RLS faltantes para permitir
-- que usuários insiram e atualizem emails na fila

-- Adicionar política de INSERT
CREATE POLICY "Users can insert their own emails to queue"
  ON email_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Adicionar política de UPDATE (para quando a Edge Function processar)
CREATE POLICY "Users can update their own email queue"
  ON email_queue FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Adicionar política de DELETE (para limpeza, se necessário)
CREATE POLICY "Users can delete their own email queue"
  ON email_queue FOR DELETE
  USING (auth.uid() = user_id);

-- ====================================
-- IMPORTANTE: A Edge Function precisa de políticas especiais
-- ====================================
-- A Edge Function usa SERVICE_ROLE_KEY e bypassa RLS automaticamente,
-- então não precisa de políticas adicionais para processar a fila.

-- ====================================
-- Verificar as políticas criadas
-- ====================================
-- Execute esta query para confirmar:
/*
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'email_queue'
ORDER BY policyname;
*/

-- Resultado esperado: 4 políticas
-- 1. Users can view their own email queue (SELECT)
-- 2. Users can insert their own emails to queue (INSERT)
-- 3. Users can update their own email queue (UPDATE)
-- 4. Users can delete their own email queue (DELETE)
