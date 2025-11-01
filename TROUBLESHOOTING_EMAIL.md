# 🔧 Troubleshooting - Sistema de Email

## 🚨 PROBLEMA: "Teste de envio de email não funciona"

Este guia vai te ajudar a identificar e corrigir o problema passo a passo.

---

## 📋 Passo 1: Executar Diagnóstico Automático

### **Via Interface (MAIS FÁCIL)**

1. Acesse **Configurações → Notificações**
2. Role até o final da página
3. Clique em **"Executar Diagnóstico"** no card "Diagnóstico do Sistema"
4. Aguarde os resultados aparecerem
5. Leia cada teste e suas mensagens

### **O que o diagnóstico verifica:**

✅ Se as tabelas do banco existem
✅ Se você configurou um provedor de email
✅ Se suas preferências estão salvas
✅ Se há emails na fila
✅ Se consegue inserir email de teste

---

## 🔍 Passo 2: Identificar o Problema

### **ERRO: "relation 'public.email_queue' does not exist"**

**Causa:** As tabelas não foram criadas no banco de dados.

**Solução:**
```sql
1. Abra o Supabase Dashboard
2. Vá em "SQL Editor"
3. Abra o arquivo: supabase/migrations/20250111_email_notifications.sql
4. Copie TODO o conteúdo
5. Cole no SQL Editor
6. Clique em "RUN"
7. Aguarde a confirmação de sucesso
```

**Verificar se funcionou:**
```sql
-- Execute isto no SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'notification_preferences',
    'email_configurations',
    'email_queue',
    'email_logs'
  );

-- Deve retornar 4 linhas
```

---

### **ERRO: "Email configuration not found"**

**Causa:** Você não configurou o provedor de email (SendGrid/SMTP/Resend).

**Solução:**
```
1. Vá em Configurações → Notificações
2. Clique em "Configurar" na seção "Provedor de Email"
3. Escolha um provedor (recomendado: SendGrid)
4. Preencha as credenciais:
   - SendGrid:
     - API Key: SG.xxxxxxx (da sua conta SendGrid)
     - Email Remetente: contato@suaempresa.com
     - Nome Remetente: Impulse Financeiro
5. Clique em "Salvar Configurações"
6. Aguarde a confirmação
```

**Como obter API Key do SendGrid:**
```
1. Acesse https://app.sendgrid.com
2. Login na sua conta
3. Settings (lado esquerdo) → API Keys
4. Create API Key
5. Nome: "Impulse Financeiro"
6. Escolha: "Restricted Access"
7. Marque: "Mail Send" → Full Access
8. Create & View
9. COPIE A CHAVE (aparece só uma vez!)
10. Cole na interface do Impulse
```

---

### **ERRO: "Email inserido na fila mas não é enviado"**

**Causa:** A Edge Function não foi deployada ou não está rodando.

**Solução:**

#### **Opção A: Deploy via Supabase Dashboard (MAIS FÁCIL)**
```
1. Acesse Supabase Dashboard
2. Vá em "Edge Functions"
3. Clique em "Create a new function"
4. Nome: send-email-notifications
5. Cole o código de: supabase/functions/send-email-notifications/index.ts
6. Deploy
7. Configure variáveis de ambiente (veja abaixo)
```

#### **Opção B: Deploy via CLI**
```bash
# Se você tem Supabase CLI instalado
supabase functions deploy send-email-notifications
```

#### **Variáveis de Ambiente necessárias:**
```
Vá em: Edge Functions → send-email-notifications → Settings

Adicione:
SUPABASE_URL = https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY = sua-service-role-key
APP_URL = http://localhost:5173 (ou seu domínio)
```

**Como obter Service Role Key:**
```
1. Supabase Dashboard
2. Settings → API
3. Project API keys
4. Copie: "service_role" (secret)
⚠️ NUNCA EXPONHA ESTA CHAVE NO FRONTEND!
```

---

### **ERRO: "Email na fila com status 'failed'"**

**Causa:** O provedor de email retornou erro (credenciais inválidas, limite excedido, etc.).

**Solução:**

#### **1. Verificar o erro exato:**
```sql
-- No SQL Editor do Supabase
SELECT
  to_email,
  subject,
  status,
  attempts,
  last_error,
  created_at
FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 5;

-- Leia a coluna 'last_error' para ver o erro
```

#### **2. Erros comuns do SendGrid:**

**"Forbidden" ou "Unauthorized":**
```
→ API Key inválida
→ Solução: Gere nova API Key e atualize nas configurações
```

**"The from email does not match a verified sender":**
```
→ O email remetente não foi verificado no SendGrid
→ Solução:
  1. SendGrid Dashboard → Sender Authentication
  2. Verify a Single Sender
  3. Preencha os dados do remetente
  4. Confirme o email
  5. Use o mesmo email nas configurações
```

**"Daily sending limit exceeded":**
```
→ Você atingiu o limite do plano
→ Solução: Aguarde 24h ou upgrade do plano
```

#### **3. Erros comuns do SMTP:**

**"Connection timeout" ou "Connection refused":**
```
→ Host ou porta incorretos
→ Firewall bloqueando
→ Solução:
  - Verifique host: smtp.hostinger.com
  - Verifique porta: 587 (TLS) ou 465 (SSL)
  - Configure SSL corretamente
```

**"Authentication failed":**
```
→ Usuário ou senha incorretos
→ Solução:
  - Verifique email completo como usuário
  - Verifique senha
  - Use App Password se tiver 2FA ativado
```

---

### **PROBLEMA: "Email chega na pasta de SPAM"**

**Causa:** Falta de configuração DNS (SPF, DKIM, DMARC).

**Solução para SendGrid:**
```
1. SendGrid Dashboard → Settings → Sender Authentication
2. Domain Authentication
3. Adicione seu domínio
4. Copie os registros DNS
5. Adicione no painel da Hostinger/Registro.br:
   - CNAME para s1._domainkey
   - CNAME para s2._domainkey
   - TXT para SPF
6. Aguarde propagação (até 48h)
7. Verifique no SendGrid
```

**Solução para SMTP próprio:**
```
1. Adicione registros SPF no DNS:
   TXT @ "v=spf1 include:_spf.hostinger.com ~all"

2. Configure DKIM (varia por provedor)

3. Adicione DMARC:
   TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@seudominio.com"
```

---

## 📊 Passo 3: Verificação Manual (SQL)

Execute estas queries no Supabase SQL Editor para verificar:

### **1. Ver emails na fila:**
```sql
SELECT * FROM email_queue
ORDER BY created_at DESC
LIMIT 10;
```

### **2. Ver emails enviados com sucesso:**
```sql
SELECT * FROM email_logs
WHERE success = true
ORDER BY sent_at DESC
LIMIT 10;
```

### **3. Ver emails com falha:**
```sql
SELECT
  to_email,
  subject,
  error_message,
  sent_at
FROM email_logs
WHERE success = false
ORDER BY sent_at DESC;
```

### **4. Ver sua configuração de email:**
```sql
SELECT
  active_provider,
  CASE WHEN sendgrid_api_key IS NOT NULL THEN '✓ Configurado' ELSE '✗ Não configurado' END as sendgrid,
  CASE WHEN smtp_host IS NOT NULL THEN '✓ Configurado' ELSE '✗ Não configurado' END as smtp,
  CASE WHEN resend_api_key IS NOT NULL THEN '✓ Configurado' ELSE '✗ Não configurado' END as resend
FROM email_configurations
WHERE company_id = 'SEU_COMPANY_ID';
```

---

## 🧪 Passo 4: Teste Manual Completo

### **1. Inserir email de teste manualmente:**
```sql
-- Primeiro, obtenha seus IDs:
SELECT
  u.id as user_id,
  cu.company_id
FROM auth.users u
JOIN company_users cu ON u.id = cu.user_id
WHERE u.email = 'seu-email@exemplo.com';

-- Copie os IDs e use abaixo:
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
  'COLE_USER_ID_AQUI',
  'COLE_COMPANY_ID_AQUI',
  'seu-email@exemplo.com',
  '[TESTE MANUAL] Impulse Financeiro',
  '<h1>Email de Teste</h1><p>Se você recebeu este email, está funcionando!</p>',
  'due_soon',
  NOW()
)
RETURNING id;
```

### **2. Processar a fila manualmente:**

Se você não configurou o cron job ainda, pode processar manualmente:

```bash
# Via curl (substitua a URL)
curl -X POST \
  https://seu-projeto.supabase.co/functions/v1/send-email-notifications \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**OU via interface (se adicionou o botão):**
- Adicione um botão admin para chamar a função manualmente

---

## ✅ Checklist de Verificação

Use este checklist para garantir que tudo está configurado:

- [ ] **Migration SQL executada com sucesso**
  - Verificar: 4 tabelas criadas

- [ ] **Provedor de email configurado**
  - SendGrid: API Key válida
  - SMTP: Host, porta, usuário, senha corretos
  - Email remetente verificado

- [ ] **Edge Function deployada**
  - Função existe no dashboard
  - Variáveis de ambiente configuradas

- [ ] **Preferências de notificação ativadas**
  - Email notifications: ON
  - Due date alerts: ON

- [ ] **Teste de inserção na fila funciona**
  - Email aparece na tabela email_queue

- [ ] **Email é processado pela Edge Function**
  - Status muda de 'pending' para 'sent'
  - Aparece na tabela email_logs

- [ ] **Email chega na caixa de entrada**
  - Verificar inbox
  - Verificar pasta de spam

---

## 🆘 Ainda não funciona?

### **Debug Avançado:**

1. **Ative logs detalhados:**
```javascript
// No console do navegador (F12)
localStorage.setItem('debug', 'true');
```

2. **Verifique console do navegador:**
- Pressione F12
- Vá na aba "Console"
- Procure por erros em vermelho

3. **Verifique logs da Edge Function:**
```
Supabase Dashboard → Edge Functions → send-email-notifications → Logs
```

4. **Teste a API do SendGrid diretamente:**
```bash
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "seu-email@exemplo.com"}]
    }],
    "from": {"email": "remetente@seudominio.com"},
    "subject": "Teste direto SendGrid",
    "content": [{
      "type": "text/plain",
      "value": "Teste"
    }]
  }'
```

---

## 📞 Precisa de Ajuda?

1. **Execute o diagnóstico automático** (Configurações → Notificações)
2. **Copie os resultados**
3. **Execute as queries SQL de verificação**
4. **Anote os erros específicos**
5. **Verifique os logs da Edge Function**

Com essas informações, você consegue identificar exatamente onde está o problema!

---

## 💡 Dicas Importantes

✅ **Use SendGrid se possível** - Melhor deliverability
✅ **Sempre verifique o remetente** no provedor
✅ **Configure DNS corretamente** - Evita spam
✅ **Monitore os logs** regularmente
✅ **Teste com email pessoal** primeiro
✅ **Verifique limites do plano** do provedor

---

**Boa sorte! 🚀**
