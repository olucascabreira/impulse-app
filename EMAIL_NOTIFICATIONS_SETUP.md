# 📧 Sistema de Notificações por Email - Impulse Financeiro

## Visão Geral

O sistema de notificações por email permite que você receba alertas sobre:
- ⏰ **Contas a vencer** (configurável: 1-30 dias antes)
- 📅 **Contas vencendo hoje**
- 🚨 **Contas vencidas**
- 📊 **Relatórios mensais** (futuro)

### ✨ Funcionalidades Principais

- **Multi-Provider**: Suporta SendGrid, SMTP customizado (Hostinger) e Resend
- **Configuração Flexível**: Escolha o provedor por empresa
- **Fila de Emails**: Sistema robusto com retry automático
- **Templates Profissionais**: Emails HTML responsivos e bonitos
- **Logs Completos**: Rastreamento de todos os emails enviados

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────┐
│   Frontend (React + TypeScript)             │
│   - Página de Configurações                 │
│   - Hook use-notification-preferences       │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│   Supabase Database (PostgreSQL)            │
│   - notification_preferences                │
│   - email_configurations (credenciais)      │
│   - email_queue (fila de envio)             │
│   - email_logs (histórico)                  │
└─────────────────┬───────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│   Supabase Edge Function                    │
│   send-email-notifications                  │
│   - Processa fila de emails                 │
│   - Seleciona provedor configurado          │
│   - Envia emails                            │
│   - Registra logs                           │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┼─────────┐
        ↓         ↓         ↓
   SendGrid    SMTP      Resend
     API      (Hostinger)  API
```

---

## 📋 Pré-requisitos

### 1. Banco de Dados

Execute a migration SQL:

```bash
# No console do Supabase ou via CLI
supabase migration up
```

Ou execute manualmente o arquivo:
```
supabase/migrations/20250111_email_notifications.sql
```

### 2. Supabase Edge Function

Faça deploy da Edge Function:

```bash
# Via Supabase CLI
supabase functions deploy send-email-notifications

# Ou crie manualmente no dashboard do Supabase
```

### 3. Configurar Variáveis de Ambiente

No Supabase Dashboard → Project Settings → Edge Functions:

```env
SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
APP_URL=https://seu-dominio.com (ou http://localhost:5173 para dev)
```

---

## ⚙️ Configuração dos Provedores

### Opção 1: SendGrid (Recomendado para você)

**Você já tem conta paga no SendGrid!**

1. Acesse [SendGrid Dashboard](https://app.sendgrid.com/)
2. Vá em **Settings → API Keys**
3. Crie uma nova API Key com permissão de envio (Mail Send)
4. Copie a API Key

**Configuração no Sistema:**
- Provedor: **SendGrid**
- API Key: `SG.xxxxxxxxxxxxxxxxxx`
- From Email: `seu-email@empresa.com` (verificado no SendGrid)
- From Name: `Impulse Financeiro` ou nome da sua empresa

**Vantagens:**
- ✅ Você já paga o plano
- ✅ Alta deliverability
- ✅ Métricas detalhadas
- ✅ Suporte a alto volume

---

### Opção 2: SMTP da Hostinger

**Para usar os emails corporativos da Hostinger**

1. Acesse o painel da Hostinger
2. Vá em **Emails** e obtenha as configurações SMTP
3. Use as credenciais do email corporativo

**Configuração no Sistema:**
- Provedor: **SMTP**
- Host: `smtp.hostinger.com` (ou conforme indicado)
- Porta: `587` (TLS) ou `465` (SSL)
- Usuário: `seu-email@seudominio.com`
- Senha: Senha do email
- Secure: `false` para TLS (porta 587), `true` para SSL (porta 465)
- From Email: `seu-email@seudominio.com`
- From Name: Nome da empresa

**Vantagens:**
- ✅ Usa seu domínio corporativo
- ✅ Sem custos extras (já tem a hospedagem)
- ✅ Fácil configuração

**Limites:**
- ⚠️ Geralmente 200-500 emails/dia (verificar com Hostinger)

---

### Opção 3: Resend (Alternativa)

**Caso queira testar**

1. Crie conta em [Resend.com](https://resend.com)
2. Obtenha API Key
3. Verifique domínio ou use domínio sandbox

**Configuração:**
- Provedor: **Resend**
- API Key: `re_xxxxxxxxxx`
- From Email: `seu-email@dominio-verificado.com`
- From Name: Nome da empresa

**Plano Gratuito:**
- ✅ 3.000 emails/mês
- ✅ 100 emails/dia

---

## 🚀 Como Usar

### 1. Configurar no Sistema

#### Interface de Configuração

Você precisará atualizar a página `Settings.tsx` para incluir a configuração de email. Aqui está um exemplo de seção:

```typescript
// Adicionar na página de Settings
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';

function EmailSettingsSection() {
  const {
    emailConfig,
    saving,
    saveEmailConfiguration,
    testEmailConfiguration
  } = useNotificationPreferences();

  return (
    <div>
      <Select
        value={emailConfig?.active_provider}
        onValueChange={(value) =>
          saveEmailConfiguration({ active_provider: value as EmailProvider })
        }
      >
        <SelectItem value="sendgrid">SendGrid</SelectItem>
        <SelectItem value="smtp">SMTP (Hostinger)</SelectItem>
        <SelectItem value="resend">Resend</SelectItem>
      </Select>

      {/* Campos específicos por provedor */}
      {/* Ver exemplo completo abaixo */}
    </div>
  );
}
```

### 2. Configurar Cron Job

No Supabase Dashboard:

**Opção A: Supabase Cron (Recomendado)**

```sql
-- Cria um cron job que roda diariamente às 9h
SELECT cron.schedule(
  'send-daily-email-notifications',
  '0 9 * * *', -- Todo dia às 9h
  $$
  SELECT net.http_post(
    url := 'https://seu-projeto.supabase.co/functions/v1/send-email-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object('type', 'scheduled')
  );
  $$
);
```

**Opção B: GitHub Actions (Alternativa)**

Crie `.github/workflows/email-notifications.yml`:

```yaml
name: Send Email Notifications

on:
  schedule:
    - cron: '0 9 * * *' # Todo dia às 9h UTC

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Edge Function
        run: |
          curl -X POST \
            https://seu-projeto.supabase.co/functions/v1/send-email-notifications \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"type": "scheduled"}'
```

**Opção C: Manual (Para testes)**

No código frontend, adicione um botão admin:

```typescript
// Para processar manualmente (apenas admin)
async function processPendingEmails() {
  await fetch(
    'https://seu-projeto.supabase.co/functions/v1/send-email-notifications',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
}
```

---

## 🎨 Templates de Email

O sistema inclui 3 templates HTML responsivos:

1. **Contas a Vencer** - Azul/Roxo (`due_soon`)
2. **Contas Vencendo Hoje** - Laranja (`due_today`)
3. **Contas Vencidas** - Vermelho (`overdue`)

Cada template inclui:
- ✅ Design moderno e profissional
- ✅ Responsivo (funciona em mobile)
- ✅ Lista de todas as transações
- ✅ Total consolidado
- ✅ Botão para acessar o sistema
- ✅ Informações do contato

---

## 🔒 Segurança

### Boas Práticas Implementadas:

1. **Credenciais no Backend**:
   - API Keys e senhas SMTP ficam no banco (criptografadas)
   - Nunca expostas no frontend

2. **Row Level Security (RLS)**:
   - Usuários só acessam suas próprias configurações
   - Admins da empresa podem configurar emails

3. **Retry com Limite**:
   - Máximo de 3 tentativas por email
   - Previne loops infinitos

4. **Logs Completos**:
   - Todos os envios registrados
   - Rastreamento de falhas

---

## 📊 Monitoramento

### Verificar Emails Enviados

```sql
-- Emails enviados nas últimas 24h
SELECT
  to_email,
  subject,
  notification_type,
  provider_used,
  success,
  sent_at
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;
```

### Verificar Fila de Emails

```sql
-- Emails pendentes
SELECT * FROM email_queue
WHERE status = 'pending'
ORDER BY scheduled_for ASC;

-- Emails com falha
SELECT * FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Emails não estão sendo enviados

1. **Verificar configuração do provedor:**
   ```sql
   SELECT * FROM email_configurations WHERE company_id = 'seu-company-id';
   ```

2. **Verificar fila:**
   ```sql
   SELECT * FROM email_queue WHERE status = 'pending';
   ```

3. **Verificar logs de erro:**
   ```sql
   SELECT * FROM email_logs WHERE success = false ORDER BY sent_at DESC LIMIT 10;
   ```

### SendGrid: "Forbidden" ou "Unauthorized"

- ✅ Verifique se a API Key está correta
- ✅ Confirme que a API Key tem permissão de "Mail Send"
- ✅ Verifique se o email remetente está verificado no SendGrid

### SMTP: Timeout ou Connection Refused

- ✅ Verifique host e porta
- ✅ Confirme usuário e senha
- ✅ Teste se o servidor SMTP permite conexões externas
- ✅ Verifique configuração de TLS/SSL (`smtp_secure`)

### Emails caem no spam

- ✅ Configure SPF, DKIM e DMARC no seu domínio
- ✅ Use um domínio verificado
- ✅ Evite palavras spam no assunto
- ✅ Mantenha boa reputação do IP (SendGrid ajuda nisso)

---

## 🎯 Próximos Passos

### Para você implementar:

1. ✅ **Executar migration SQL** no Supabase
2. ✅ **Deploy da Edge Function** `send-email-notifications`
3. ✅ **Atualizar página de Settings** para incluir:
   - Seletor de provedor
   - Campos de configuração por provedor
   - Botão "Testar Email"
   - Toggle de preferências de notificação
4. ✅ **Configurar credenciais**:
   - SendGrid (já tem!)
   - SMTP da Hostinger (opcional)
5. ✅ **Configurar cron job** (escolher uma das opções)
6. ✅ **Testar envio** usando o botão de teste

### Melhorias Futuras (Opcional):

- 📊 Dashboard de métricas de email
- 📝 Editor de templates personalizados
- 🌍 Internacionalização (PT/EN/ES)
- 📱 Notificações push (PWA)
- 🤖 Webhooks para integração com outros sistemas

---

## 💰 Estimativa de Custos

### Seu Cenário (assumindo 100 usuários):

**Com SendGrid (que você já paga):**
- Até 100 emails/dia = **Incluído no plano**
- Custo adicional: **R$ 0**

**Com SMTP Hostinger:**
- Incluído na hospedagem = **R$ 0**
- Limite: verificar com Hostinger

**Com Resend (se quiser testar):**
- Até 3.000/mês = **Gratuito**
- Depois: $20/mês = ~R$ 100/mês

**Recomendação:**
Use **SendGrid como principal** (você já paga) e configure **SMTP da Hostinger como backup**.

---

## 📞 Suporte

Se tiver dúvidas ou problemas:

1. Verifique os logs no Supabase
2. Teste o envio manualmente
3. Consulte a documentação do provedor:
   - [SendGrid Docs](https://docs.sendgrid.com/)
   - [Resend Docs](https://resend.com/docs)
   - Hostinger: Painel de controle da hospedagem

---

## ✅ Checklist de Implementação

- [ ] Migration SQL executada
- [ ] Edge Function deployed
- [ ] Variáveis de ambiente configuradas
- [ ] Página de Settings atualizada
- [ ] SendGrid configurado
- [ ] SMTP Hostinger configurado (opcional)
- [ ] Teste de envio realizado
- [ ] Cron job configurado
- [ ] Documentação interna criada
- [ ] Usuários treinados

---

**Pronto!** Agora você tem um sistema completo de notificações por email com suporte a múltiplos provedores. 🎉
