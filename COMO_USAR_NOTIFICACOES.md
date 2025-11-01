# 📧 Como Usar as Notificações por Email

## ✅ Interface Criada com Sucesso!

A interface de configuração de notificações por email já está pronta e funcionando na página de **Configurações** do sistema.

---

## 🚀 Como Acessar

1. Faça login no Impulse Financeiro
2. Clique em **Configurações** no menu lateral
3. Vá na aba **Notificações**

---

## 🎯 Funcionalidades Disponíveis

### **1. Preferências de Notificação**

#### ✅ **Notificações por Email**
- Ative ou desative todas as notificações por email
- Toggle simples on/off

#### ⏰ **Alertas de Vencimento**
- Receba emails sobre contas próximas do vencimento
- Configure quantos dias antes você quer ser avisado (1-30 dias)
- Padrão: 3 dias antes

#### 📊 **Relatórios Mensais**
- Receba relatórios financeiros mensais por email
- (Funcionalidade planejada para futuro)

#### 🔔 **Notificações no App**
- Ative/desative notificações dentro do sistema
- Já funciona com o popover de notificações

---

### **2. Configuração de Provedor de Email**

Clique em **"Configurar"** para abrir o painel de configuração.

#### **Opção 1: SendGrid** (Recomendado para você)

**Quando usar:**
- Você já paga o plano SendGrid
- Precisa enviar alto volume de emails
- Quer métricas detalhadas de entrega

**Configuração:**
```
Provedor: SendGrid
API Key: SG.xxxxxxxxxxxxxxxx (da conta SendGrid)
Email Remetente: contato@suaempresa.com
Nome Remetente: Impulse Financeiro
```

**Como obter a API Key:**
1. Acesse https://app.sendgrid.com
2. Settings → API Keys
3. Create API Key
4. Escolha "Restricted Access" → Mail Send (Full Access)
5. Copie a chave

---

#### **Opção 2: SMTP (Hostinger)** (Usa seu domínio)

**Quando usar:**
- Quer enviar emails com seu domínio corporativo
- Já tem hospedagem na Hostinger
- Volume baixo/médio (até 500 emails/dia)

**Configuração:**
```
Provedor: SMTP
Host SMTP: smtp.hostinger.com
Porta: 587 (TLS) ou 465 (SSL)
Usuário: contato@seudominio.com
Senha: senha-do-email
Email Remetente: contato@seudominio.com
Nome Remetente: Sua Empresa
SSL: Desativado (para porta 587)
```

**Como obter as configurações:**
1. Acesse o painel Hostinger
2. Vá em **Emails**
3. Clique em **Configurações** do email
4. Copie as informações SMTP

---

#### **Opção 3: Resend** (Alternativa gratuita)

**Quando usar:**
- Quer testar o sistema sem custo
- Até 3.000 emails/mês grátis

**Configuração:**
```
Provedor: Resend
API Key: re_xxxxxxxxxxxxxxxx
Email Remetente: contato@dominio-verificado.com
Nome Remetente: Sua Empresa
```

**Como obter:**
1. Crie conta em https://resend.com
2. Dashboard → API Keys → Create API Key
3. Verifique seu domínio (ou use sandbox para testes)

---

## 🧪 Testando a Configuração

### **Botão "Enviar Email de Teste"**

Depois de configurar, clique em **"Enviar Email de Teste"**.

**O que acontece:**
1. Um email é adicionado à fila
2. Você recebe uma notificação de confirmação
3. Em alguns segundos/minutos, o email chega na sua caixa de entrada
4. Verifique também a pasta de spam

**Email de teste diz:**
```
Assunto: Teste de Configuração de Email - Impulse Financeiro

Parabéns! Suas configurações de email estão funcionando corretamente.
Este é um email de teste enviado via [SendGrid/SMTP/Resend].
```

---

## 📨 Tipos de Emails Enviados

### **1. Contas a Vencer** (Azul/Roxo)
- Enviado X dias antes do vencimento
- Lista todas as contas próximas
- Inclui valor total

### **2. Contas Vencendo Hoje** (Laranja)
- Enviado no dia do vencimento
- Lembrete urgente
- Lista todas as contas do dia

### **3. Contas Vencidas** (Vermelho)
- Enviado após o vencimento
- Alerta crítico
- Mostra dias de atraso
- Valor total vencido

---

## ⚙️ Próximos Passos (Você precisa fazer)

### **1. Executar Migration SQL** ⚠️

**IMPORTANTE:** Antes de usar, você precisa criar as tabelas no banco:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo: `supabase/migrations/20250111_email_notifications.sql`
4. Cole todo o conteúdo
5. Clique em **Run**

Isso cria:
- `notification_preferences`
- `email_configurations`
- `email_queue`
- `email_logs`

---

### **2. Deploy da Edge Function** ⚠️

**Via Supabase Dashboard:**
1. Vá em **Edge Functions**
2. Crie nova função: `send-email-notifications`
3. Cole o conteúdo de: `supabase/functions/send-email-notifications/index.ts`
4. Deploy

**Via CLI (se tiver):**
```bash
supabase functions deploy send-email-notifications
```

---

### **3. Configurar Variáveis de Ambiente**

No Supabase → Edge Functions → Settings:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
APP_URL=https://seudominio.com (ou http://localhost:5173 para dev)
```

---

### **4. Configurar Envio Automático**

**Opção A: Supabase Cron (Recomendado)**

No SQL Editor do Supabase:

```sql
SELECT cron.schedule(
  'send-daily-email-notifications',
  '0 9 * * *', -- Todo dia às 9h da manhã
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

**Opção B: Botão Manual (Para testes)**

Você pode adicionar um botão admin para processar emails manualmente enquanto testa.

---

## 🎨 Como Funciona (Fluxo)

```
1. Usuário ativa notificações nas Configurações
   ↓
2. Configura provedor (SendGrid/SMTP/Resend)
   ↓
3. Testa o envio
   ↓
4. Cron job roda diariamente (9h da manhã)
   ↓
5. Sistema verifica transações próximas do vencimento
   ↓
6. Adiciona emails à fila
   ↓
7. Edge Function processa a fila
   ↓
8. Envia emails usando o provedor configurado
   ↓
9. Registra logs de sucesso/falha
```

---

## 🐛 Solução de Problemas

### **Erro: "Email configuration not found"**
- Execute a migration SQL primeiro
- Configure o provedor na interface

### **Erro: "Missing authorization header"**
- Configure as variáveis de ambiente na Edge Function

### **Emails não chegam**
1. Verifique a fila: `SELECT * FROM email_queue WHERE status = 'pending'`
2. Verifique os logs: `SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10`
3. Teste o envio manualmente

### **Emails vão para spam**
- Use SendGrid (melhor deliverability)
- Configure SPF, DKIM e DMARC no seu domínio
- Use email verificado como remetente

---

## 📊 Monitoramento

### **Ver emails enviados:**
```sql
SELECT
  to_email,
  subject,
  notification_type,
  provider_used,
  success,
  sent_at
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
ORDER BY sent_at DESC;
```

### **Ver emails pendentes:**
```sql
SELECT * FROM email_queue
WHERE status = 'pending'
ORDER BY scheduled_for ASC;
```

### **Ver emails com falha:**
```sql
SELECT * FROM email_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 💡 Dicas

1. **Use SendGrid como principal** (você já paga!)
2. **Configure SMTP como backup** (Hostinger)
3. **Teste com email de teste primeiro**
4. **Monitore os logs regularmente**
5. **Ajuste os dias de antecedência** conforme necessário
6. **Verifique spam nas primeiras semanas**

---

## ✅ Checklist de Implementação

- [ ] Migration SQL executada
- [ ] Edge Function deployed
- [ ] Variáveis de ambiente configuradas
- [ ] Provedor de email configurado (SendGrid/SMTP/Resend)
- [ ] Email de teste enviado com sucesso
- [ ] Cron job configurado
- [ ] Monitoramento de logs funcionando
- [ ] Documentação de uso criada para equipe

---

**Pronto! Agora você tem um sistema completo de notificações por email! 🎉**

Se tiver dúvidas, consulte o arquivo `EMAIL_NOTIFICATIONS_SETUP.md` para informações técnicas detalhadas.
