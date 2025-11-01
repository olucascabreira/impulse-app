# 🔧 FIX: Row Level Security - email_queue

## 🚨 Problema Identificado

**Erro:** `new row violates row-level security policy for table 'email_queue'`

**Causa:** A migration inicial criou apenas uma política de **SELECT** para a tabela `email_queue`, mas não criou as políticas de **INSERT**, **UPDATE** e **DELETE** necessárias.

---

## ✅ Solução (3 minutos)

### **Passo 1: Abrir Supabase Dashboard**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: **SQL Editor** (menu lateral esquerdo)

### **Passo 2: Executar o Script de Correção**

1. Clique em **"New Query"**
2. Abra o arquivo: `supabase/migrations/20250111_fix_email_queue_rls.sql`
3. Copie **TODO** o conteúdo
4. Cole no SQL Editor
5. Clique em **"RUN"** (ou pressione Ctrl+Enter)

### **Passo 3: Verificar se Funcionou**

Execute esta query no SQL Editor:

```sql
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
```

**Resultado Esperado:** 4 políticas

| policyname | cmd |
|------------|-----|
| Users can delete their own email queue | DELETE |
| Users can insert their own emails to queue | INSERT |
| Users can update their own email queue | UPDATE |
| Users can view their own email queue | SELECT |

---

## 🧪 Testar Novamente

### **Via Interface (RECOMENDADO)**

1. Vá em: **Configurações → Notificações**
2. Role até o final
3. Clique em **"Executar Diagnóstico"**
4. Aguarde os resultados

**Resultado Esperado no Teste #9:**
```
✅ Testar inserção de email na fila
   Email inserido com sucesso! ID: [algum-uuid]
```

### **Via Interface - Teste Real**

1. Vá em: **Configurações → Notificações**
2. Na seção "Provedor de Email", clique em **"Configurar"**
3. Certifique-se que SendGrid está configurado
4. Clique em **"📧 Enviar Email de Teste"**

**Resultado Esperado:**
- Toast de sucesso: "Email adicionado à fila com sucesso!"
- Email deve aparecer na tabela `email_queue` com status `pending`

---

## 🔍 Verificação Manual (SQL)

### **Ver o email de teste na fila:**

```sql
SELECT
  id,
  to_email,
  subject,
  status,
  created_at
FROM email_queue
WHERE subject LIKE '%TESTE%'
ORDER BY created_at DESC
LIMIT 5;
```

### **Ver todos os emails na fila:**

```sql
SELECT
  id,
  to_email,
  subject,
  status,
  attempts,
  scheduled_for
FROM email_queue
ORDER BY created_at DESC
LIMIT 10;
```

---

## 📊 O que Mudou?

### **ANTES (❌ Não funcionava):**

```sql
-- Apenas 1 política
CREATE POLICY "Users can view their own email queue"
  ON email_queue FOR SELECT
  USING (auth.uid() = user_id);
```

**Resultado:** Usuários podiam apenas VER seus emails, mas não INSERIR.

### **DEPOIS (✅ Funciona):**

```sql
-- 4 políticas completas

-- 1. SELECT - Ver emails
CREATE POLICY "Users can view their own email queue"
  ON email_queue FOR SELECT
  USING (auth.uid() = user_id);

-- 2. INSERT - Adicionar emails (NOVO!)
CREATE POLICY "Users can insert their own emails to queue"
  ON email_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE - Atualizar status (NOVO!)
CREATE POLICY "Users can update their own email queue"
  ON email_queue FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE - Remover emails (NOVO!)
CREATE POLICY "Users can delete their own email queue"
  ON email_queue FOR DELETE
  USING (auth.uid() = user_id);
```

**Resultado:** Usuários agora podem fazer todas as operações CRUD em seus próprios emails.

---

## ⚙️ Próximos Passos (Após o Fix)

### **1. Testar Email**

✅ Execute o diagnóstico novamente
✅ Teste o botão "Enviar Email de Teste"
✅ Verifique se o email aparece na fila

### **2. Deploy da Edge Function** (se ainda não fez)

```bash
# Via CLI
supabase functions deploy send-email-notifications

# Ou manualmente no Supabase Dashboard
# Edge Functions → Create a new function → send-email-notifications
```

### **3. Configurar Variáveis de Ambiente da Edge Function**

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
APP_URL=http://localhost:5173 (ou seu domínio)
```

### **4. Processar a Fila Manualmente (Teste)**

```bash
# Via curl (substitua a URL e KEY)
curl -X POST \
  https://seu-projeto.supabase.co/functions/v1/send-email-notifications \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### **5. Configurar Cron Job (Automático)**

```sql
-- No SQL Editor
SELECT cron.schedule(
  'send-daily-email-notifications',
  '0 9 * * *', -- Todo dia às 9h
  $$
  SELECT net.http_post(
    url := 'https://seu-projeto.supabase.co/functions/v1/send-email-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

---

## 🆘 Ainda Tem Problemas?

### **Erro Persiste Após Fix:**

1. Certifique-se que executou o script SQL no projeto correto
2. Faça logout e login novamente na aplicação
3. Limpe o cache do navegador (Ctrl+Shift+R)
4. Verifique se as políticas foram criadas (query de verificação acima)

### **Email na Fila mas Não é Enviado:**

1. Verifique se a Edge Function foi deployada
2. Verifique se as variáveis de ambiente estão configuradas
3. Verifique os logs da Edge Function no dashboard
4. Teste chamar a Edge Function manualmente (curl acima)

### **Email Enviado mas com Erro:**

1. Verifique a tabela `email_logs`:
   ```sql
   SELECT * FROM email_logs
   WHERE success = false
   ORDER BY sent_at DESC
   LIMIT 5;
   ```
2. Leia a coluna `error_message` para ver o erro específico
3. Verifique se a API Key do SendGrid está correta
4. Verifique se o email remetente foi verificado no SendGrid

---

## 💡 Explicação Técnica

### **O que é Row Level Security (RLS)?**

RLS é um recurso do PostgreSQL (usado pelo Supabase) que controla quais linhas um usuário pode ver/modificar em uma tabela.

### **Por que Precisamos de Políticas?**

Sem políticas, **ninguém** pode acessar a tabela (nem para ler, nem para escrever). As políticas definem **quem pode fazer o quê**.

### **Por que a Edge Function Funciona?**

A Edge Function usa `SERVICE_ROLE_KEY`, que bypassa automaticamente todas as políticas RLS. Por isso ela consegue:
- Ler todos os emails da fila (não só os seus)
- Atualizar o status de qualquer email
- Registrar logs

### **Segurança**

As políticas garantem que:
- ✅ Usuário A só vê/edita seus próprios emails
- ✅ Usuário A não pode ver emails do Usuário B
- ✅ Usuário A não pode modificar emails do Usuário B
- ✅ A Edge Function (com SERVICE_ROLE_KEY) pode processar todos os emails

---

## ✅ Checklist Final

Após aplicar o fix, marque:

- [ ] Script SQL executado com sucesso
- [ ] Políticas verificadas (4 políticas existem)
- [ ] Diagnóstico executado (todos os testes passam)
- [ ] Botão "Enviar Email de Teste" funciona
- [ ] Email aparece na tabela `email_queue`
- [ ] Edge Function deployada (próximo passo)
- [ ] Variáveis de ambiente configuradas (próximo passo)
- [ ] Teste de envio real (após Edge Function)

---

## 📞 Status Esperado Após o Fix

### **✅ Funcionando:**
- Salvar preferências de notificação
- Configurar provedor de email (SendGrid/SMTP/Resend)
- Executar diagnóstico completo
- Adicionar emails à fila
- Ver emails na fila

### **⚠️ Ainda Precisa Configurar:**
- Deploy da Edge Function
- Processamento automático da fila
- Cron job para emails diários

---

**Boa sorte! 🚀**

Se o erro persistir após aplicar este fix, compartilhe o resultado da query de verificação das políticas.
