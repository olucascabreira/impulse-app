# ✅ Correções Aplicadas no Sistema de Email

## 📋 Resumo das Correções

Foram identificados e corrigidos **4 problemas** no sistema de notificações por email:

---

## ✅ Correção 1: Resposta da Edge Function

### Problema:
A Edge Function retornava apenas `{ processed, results }` mas o Hook esperava `{ processed, sent, failed }`.

### Solução Aplicada:
**Arquivo:** `supabase/functions/send-email-notifications/index.ts:442-451`

```typescript
// Calcular totais de enviados e falhados
const sent = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

return new Response(
  JSON.stringify({
    processed: results.length,
    sent,
    failed,
    results,
  }),
  ...
);
```

**Status:** ✅ **CORRIGIDO**

---

## ✅ Correção 2: Templates HTML com `window.location`

### Problema:
Templates usavam `window.location.origin` que:
- Causaria erro `ReferenceError: window is not defined` se executado do backend
- Não funciona em cron jobs ou Edge Functions

### Solução Aplicada:
**Arquivo:** `src/services/email-notification-service.ts:5`

```typescript
// URL base da aplicação (pode vir de variável de ambiente)
const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
```

Substituiu `window.location.origin` por `APP_URL` em 3 templates:
- `generateDueSoonEmailTemplate()` (linha 79)
- `generateOverdueEmailTemplate()` (linha 145)
- `generateDueTodayEmailTemplate()` (linha 206)

**Status:** ✅ **CORRIGIDO** 

**Configuração Adicional Necessária:**
Adicione no arquivo `.env`:
```bash
VITE_APP_URL=https://seudominio.com
```

---

## ✅ Correção 3: Clarificação de Migrações

### Problema:
Aparente conflito entre duas migrações:
- `20250111_email_notifications.sql` (original)
- `20250112100000_setup_notification_system.sql` (nova)

### Solução Aplicada:
**Não há conflito real!** As migrações são complementares:

| Migração | O que faz |
|----------|-----------|
| `20250111_email_notifications.sql` | Cria tabelas, índices, RLS policies |
| `20250112100000_setup_notification_system.sql` | Adiciona funções HTML + cron job |

**Atualizado comentário na migração para deixar claro que são complementares.**

**Status:** ✅ **ESCLARECIDO**

---

## ⚠️ Observação 4: Duplicação de Templates HTML

### Situação:
Templates HTML existem em **2 lugares**:

1. **Edge Function** (`supabase/functions/send-email-notifications/index.ts`)
   - Linhas 208-314
   - Templates: `generateDueSoonEmail()`, `generateOverdueEmail()`

2. **Serviço Frontend** (`src/services/email-notification-service.ts`)
   - Linhas 27-217
   - Templates: `generateDueSoonEmailTemplate()`, `generateOverdueEmailTemplate()`, `generateDueTodayEmailTemplate()`

### Por que isso acontece:
- **Frontend:** Gera HTML e adiciona à fila (`email_queue`)
- **Edge Function:** Processa a fila e envia emails (tem templates como fallback/exemplo)

### Recomendação:
- **Opção A (ATUAL):** Manter templates sincronizados manualmente em ambos os lugares
- **Opção B (IDEAL):** Mover templates para funções SQL (banco de dados) e chamar de ambos os lados

**Status:** ⚠️ **DOCUMENTADO** (não é erro, é design atual)

---

## 📊 Resumo das Mudanças

| Arquivo | Mudanças | Status |
|---------|----------|--------|
| `supabase/functions/send-email-notifications/index.ts` | Adiciona campos `sent` e `failed` na resposta | ✅ |
| `src/services/email-notification-service.ts` | Remove dependência de `window.location` | ✅ |
| `supabase/migrations/20250112100000_setup_notification_system.sql` | Clarifica que é complementar | ✅ |

---

## 🚀 Próximos Passos

### Para Ativar o Sistema:

1. **Aplicar as Migrações:**
```sql
-- No Supabase SQL Editor, execute em ordem:
-- 1. supabase/migrations/20250111_email_notifications.sql
-- 2. supabase/migrations/20250112100000_setup_notification_system.sql
```

2. **Deploy da Edge Function:**
```bash
supabase functions deploy send-email-notifications
```

3. **Configurar Variáveis de Ambiente:**

No `.env`:
```bash
VITE_APP_URL=https://seudominio.com
```

No Supabase Dashboard → Edge Functions → send-email-notifications → Settings:
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-key
APP_URL=https://seudominio.com
```

4. **Configurar Provedor de Email:**
- Acesse: Configurações → Notificações → Configurar Email
- Escolha SendGrid/SMTP/Resend
- Preencha credenciais
- Clique em "Enviar Email de Teste"

5. **Processar Fila Manualmente (Teste):**
- Clique em "Processar Fila de Emails"
- Verifique se o email chegou

6. **Verificar Cron Job:**
```sql
-- Ver jobs agendados
SELECT * FROM cron.job;

-- Ver execuções
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-payment-notifications')
ORDER BY start_time DESC LIMIT 10;
```

---

## 🧪 Testes Recomendados

1. **Teste de Inserção na Fila:**
```sql
INSERT INTO email_queue (
  user_id, company_id, to_email, subject, html_content,
  notification_type, scheduled_for
) VALUES (
  'YOUR_USER_ID', 'YOUR_COMPANY_ID', 'seu-email@exemplo.com',
  'Teste Manual', '<h1>Teste</h1>', 'due_soon', NOW()
);
```

2. **Teste de Processamento:**
- Use o botão "Processar Fila de Emails" na interface
- OU chame a Edge Function via curl:
```bash
curl -X POST 'https://SEU-PROJECT.supabase.co/functions/v1/send-email-notifications' \
  -H 'Authorization: Bearer SEU-SERVICE-KEY' \
  -H 'Content-Type: application/json'
```

3. **Verificar Logs:**
```sql
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;
```

---

## 📝 Checklist de Ativação

- [ ] Migrações SQL aplicadas
- [ ] Edge Function deployada
- [ ] Variáveis de ambiente configuradas (.env + Supabase)
- [ ] Provedor de email configurado (SendGrid/SMTP/Resend)
- [ ] Teste manual enviado com sucesso
- [ ] Cron job verificado e ativo
- [ ] Preferências de usuários configuradas
- [ ] Sistema monitorado por 1 semana

---

## 🛠️ Troubleshooting

### Emails não são enviados:

1. Verifique configuração:
```sql
SELECT * FROM email_configurations WHERE company_id = 'YOUR_COMPANY_ID';
```

2. Verifique fila:
```sql
SELECT * FROM email_queue WHERE status = 'pending';
```

3. Verifique erros:
```sql
SELECT * FROM email_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

4. Verifique logs:
```sql
SELECT * FROM email_logs WHERE success = false ORDER BY sent_at DESC LIMIT 10;
```

---

**Última atualização:** 2025-01-12
**Status:** ✅ Todas as correções aplicadas com sucesso
