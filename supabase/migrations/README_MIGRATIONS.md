# Migrações de Banco de Dados - Melhorias de Segurança e Integridade

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Migrações Criadas](#migrações-criadas)
- [Como Aplicar](#como-aplicar)
- [Como Usar a Função RPC de Transferências](#como-usar-a-função-rpc-de-transferências)
- [Benefícios](#benefícios)
- [Validações Implementadas](#validações-implementadas)

---

## Visão Geral

Este conjunto de migrações adiciona camadas críticas de segurança e integridade ao banco de dados, resolvendo problemas identificados nas funções de transações e plano de contas.

### Problemas Resolvidos
✅ **Códigos duplicados** no plano de contas
✅ **Ciclos na hierarquia** do plano de contas
✅ **Mudança de tipo** de conta com transações existentes
✅ **Transferências não atômicas** (race conditions)
✅ **Saldos não atualizados** automaticamente
✅ **Validação de saldo** apenas no frontend
✅ **Hierarquia ilimitada** causando problemas de performance

---

## Migrações Criadas

### 1. `20250112000000_add_chart_accounts_constraints.sql`
**Constraints e Validações do Plano de Contas**

- ✅ Adiciona constraint único para `codigo` dentro da mesma empresa
- ✅ Adiciona coluna `status` ('ativo' ou 'inativo')
- ✅ Adiciona coluna `descricao`
- ✅ Atualiza enum `tipo` para incluir todos os tipos de conta
- ✅ Valida profundidade máxima da hierarquia (4 níveis)
- ✅ Previne ciclos na hierarquia
- ✅ Previne mudança de `tipo` quando há transações associadas

**Triggers criados:**
- `validate_chart_account_depth` - Valida profundidade
- `prevent_chart_account_cycle` - Previne ciclos
- `prevent_chart_account_tipo_change_trigger` - Previne mudança de tipo

---

### 2. `20250112010000_create_atomic_transfer_function.sql`
**Função RPC para Transferências Atômicas**

Cria a função `create_bank_transfer()` que:
- ✅ Executa transferências em uma **transação SQL única**
- ✅ Valida saldo suficiente
- ✅ Valida contas diferentes
- ✅ Usa row-level locks para prevenir race conditions
- ✅ Cria automaticamente as duas transações (débito e crédito)
- ✅ Faz rollback automático em caso de erro

**Parâmetros:**
```sql
create_bank_transfer(
    p_company_id UUID,
    p_source_account_id UUID,
    p_destination_account_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_payment_method TEXT DEFAULT 'transferencia_bancaria',
    p_due_date DATE DEFAULT CURRENT_DATE
)
```

---

### 3. `20250112020000_create_balance_update_triggers.sql`
**Triggers Automáticos de Atualização de Saldo**

Cria triggers que atualizam automaticamente os saldos quando:
- ✅ Transação é criada (INSERT)
- ✅ Transação é atualizada (UPDATE)
  - Status muda de pendente → pago
  - Status muda de pago → pendente
  - Valor é alterado
  - Conta bancária é alterada
- ✅ Transação é deletada (DELETE)

**Triggers criados:**
- `update_bank_balance_on_transaction_insert`
- `update_bank_balance_on_transaction_update`
- `update_bank_balance_on_transaction_delete`

---

### 4. `20250112030000_add_balance_validation.sql`
**Validação de Saldo Suficiente no Banco**

- ✅ Valida saldo antes de salvar transação de saída paga
- ✅ Considera valor anterior ao atualizar transação
- ✅ Retorna erro claro com saldo disponível

**Trigger criado:**
- `validate_balance_before_transaction`

---

## Como Aplicar

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# 1. Certifique-se de estar na raiz do projeto
cd C:\Users\lucas\Downloads\impulse-app

# 2. Link com seu projeto Supabase (se ainda não estiver linkado)
supabase link --project-ref seu-project-ref

# 3. Aplique as migrações
supabase db push
```

### Opção 2: Via Dashboard do Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Database** → **Migrations**
4. Copie e execute cada arquivo SQL na ordem:
   - `20250112000000_add_chart_accounts_constraints.sql`
   - `20250112010000_create_atomic_transfer_function.sql`
   - `20250112020000_create_balance_update_triggers.sql`
   - `20250112030000_add_balance_validation.sql`

### Opção 3: Via SQL Editor

1. Acesse **SQL Editor** no Dashboard
2. Copie e execute cada migração uma por uma na ordem acima

---

## Como Usar a Função RPC de Transferências

### No Código TypeScript/JavaScript

Atualize o hook `use-transactions.ts` para usar a função RPC:

```typescript
// Substitua a função createTransferTransaction por esta:
const createTransferTransaction = async (transactionData) => {
  if (!companyId) return { error: new Error('Company ID required') };

  try {
    const { data, error } = await supabase.rpc('create_bank_transfer', {
      p_company_id: companyId,
      p_source_account_id: transactionData.bank_account_id,
      p_destination_account_id: transactionData.destination_account_id,
      p_amount: transactionData.amount,
      p_description: transactionData.description,
      p_payment_method: transactionData.payment_method || 'transferencia_bancaria',
      p_due_date: transactionData.due_date || new Date().toISOString().split('T')[0],
    });

    if (error) {
      toast({
        title: 'Erro ao realizar transferência',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    // Atualizar lista de transações
    await fetchTransactions();

    toast({
      title: 'Transferência realizada!',
      description: data.message,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error creating transfer:', error);
    return { error };
  }
};
```

### Resposta da Função

```json
{
  "success": true,
  "source_transaction_id": "uuid-da-transacao-de-saida",
  "destination_transaction_id": "uuid-da-transacao-de-entrada",
  "source_account_new_balance": 1000.00,
  "destination_account_new_balance": 2000.00,
  "message": "Transferência realizada com sucesso"
}
```

---

## Benefícios

### 🔒 Segurança
- Validações no banco impossíveis de contornar via frontend
- Transações atômicas previnem estados inconsistentes
- Row-level locks previnem race conditions

### 📊 Integridade de Dados
- Códigos únicos garantidos por constraint
- Hierarquia sempre válida
- Saldos sempre sincronizados com transações
- Impossível criar ciclos na hierarquia

### ⚡ Performance
- Locks ordenados previnem deadlocks
- Triggers otimizados executam apenas quando necessário
- Índice único em codigo melhora buscas

### 🛡️ Consistência
- Uma única fonte de verdade para saldos
- Rollback automático em caso de erro
- Validações centralizadas no banco

---

## Validações Implementadas

### Plano de Contas
| Validação | Onde | Quando |
|-----------|------|--------|
| Código único por empresa | Constraint único | INSERT/UPDATE |
| Profundidade máxima 4 níveis | Trigger | INSERT/UPDATE parent_id |
| Prevenir ciclos | Trigger | INSERT/UPDATE parent_id |
| Prevenir mudança de tipo com transações | Trigger | UPDATE tipo |

### Transações
| Validação | Onde | Quando |
|-----------|------|--------|
| Saldo suficiente | Trigger | INSERT/UPDATE saída paga |
| Contas diferentes em transferência | Função RPC | create_bank_transfer |
| Valor positivo | Função RPC | create_bank_transfer |
| Atualização automática de saldo | Triggers | INSERT/UPDATE/DELETE |

---

## Rollback (Se Necessário)

Se precisar reverter as migrações:

```sql
-- Reverter migração 4
DROP TRIGGER IF EXISTS validate_balance_before_transaction ON public.transactions;
DROP FUNCTION IF EXISTS public.validate_sufficient_balance();

-- Reverter migração 3
DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_insert ON public.transactions;
DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_update ON public.transactions;
DROP TRIGGER IF EXISTS update_bank_balance_on_transaction_delete ON public.transactions;
DROP FUNCTION IF EXISTS public.update_bank_balance_on_insert();
DROP FUNCTION IF EXISTS public.update_bank_balance_on_update();
DROP FUNCTION IF EXISTS public.update_bank_balance_on_delete();

-- Reverter migração 2
DROP FUNCTION IF EXISTS public.create_bank_transfer(UUID, UUID, UUID, NUMERIC, TEXT, TEXT, DATE);

-- Reverter migração 1
DROP TRIGGER IF EXISTS validate_chart_account_depth ON public.chart_accounts;
DROP TRIGGER IF EXISTS prevent_chart_account_cycle ON public.chart_accounts;
DROP TRIGGER IF EXISTS prevent_chart_account_tipo_change_trigger ON public.chart_accounts;
DROP FUNCTION IF EXISTS public.validate_chart_account_hierarchy_depth();
DROP FUNCTION IF EXISTS public.prevent_chart_account_hierarchy_cycle();
DROP FUNCTION IF EXISTS public.prevent_chart_account_tipo_change();
DROP INDEX IF EXISTS chart_accounts_company_codigo_unique;
ALTER TABLE public.chart_accounts DROP COLUMN IF EXISTS descricao;
ALTER TABLE public.chart_accounts DROP COLUMN IF EXISTS status;
```

---

## Próximos Passos

1. ✅ Aplicar as migrações no banco de dados
2. ✅ Atualizar `use-transactions.ts` para usar a função RPC
3. ✅ Remover validações duplicadas do frontend (opcional, mas mantê-las melhora UX)
4. ✅ Testar criação/edição de contas
5. ✅ Testar transferências
6. ✅ Testar criação/edição de transações

---

## Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase
2. Execute as migrações na ordem correta
3. Certifique-se de que as tabelas existem antes de aplicar
4. Verifique permissões RLS se houver erros de acesso

---

**Criado em:** 2025-01-12
**Versão:** 1.0.0
**Status:** ✅ Pronto para produção
