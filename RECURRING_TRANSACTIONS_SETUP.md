# Setup de Transações Recorrentes

Este documento explica como configurar o sistema de transações recorrentes no Impulse App.

## Visão Geral

O sistema de transações recorrentes permite que os usuários criem modelos de transações financeiras que são automaticamente replicadas em datas futuras. Isso é útil para cobranças mensais, pagamentos recorrentes e outras transações regulares.

## Componentes do Sistema

### 1. Banco de Dados
- Tabela `recurring_transactions` para armazenar modelos de transações recorrentes
- Tipos de enum: `recurrence_frequency` e `recurrence_type`

### 2. Componentes Frontend
- `RecurringTransactionForm` - Formulário para criar transações recorrentes
- `RecurringTransactionEditForm` - Formulário para editar transações recorrentes
- Página `/transacoes-recorrentes` - Interface de gerenciamento

### 3. Hooks e Serviços
- `useRecurringTransactions` - Hook para operações CRUD
- `processRecurringTransactions` - Função para gerar transações a partir de modelos

## Funcionalidades

### Criação de Transações Recorrentes
Usuários podem definir:
- Tipo de transação (entrada, saída, transferência)
- Descrição
- Valor
- Frequência (diária, semanal, mensal, trimestral, anual)
- Intervalo de repetição
- Data de início e fim
- Número máximo de ocorrências
- Conta bancária e contábil associada
- Contato

### Geração Automática
- O sistema verifica transações recorrentes ativas periodicamente
- Gera transações reais com base nos modelos
- Evita duplicações verificando datas e descrições
- Atualiza a data da última geração

### Interface de Gerenciamento
- Visualização de todas as transações recorrentes
- Filtros e busca
- Edição e exclusão
- Botão para geração manual de transações

## Configuração da Tarefa Agendada

Para ativar a geração automática de transações, você precisa configurar uma tarefa agendada (cron job) que chame o serviço de processamento de transações recorrentes.

### Opções de Implementação:

#### 1. Node-cron (ambiente Node.js)
```javascript
import cron from 'node-cron';
import { processRecurringTransactions } from './src/services/recurring-transaction-generator';

// Executa diariamente às 00:01
cron.schedule('1 0 * * *', async () => {
  console.log('Executando geração de transações recorrentes...');
  await processRecurringTransactions();
});
```

#### 2. Supabase Functions (recomendado)
Crie uma Supabase Function que chama o serviço de geração de transações recorrentes periodicamente.

#### 3. Vercel Cron (se hospedando no Vercel)
Configure um endpoint do tipo cron que execute a geração de transações periodicamente.

#### 4. Manual
O botão "Gerar Transações" na interface da página de transações recorrentes permite a geração manual quando necessário.

## Frequências Suportadas

- `daily`: Diariamente
- `weekly`: Semanalmente
- `monthly`: Mensalmente
- `quarterly`: Trimestralmente
- `yearly`: Anualmente

Cada frequência pode ter um intervalo personalizado (ex: a cada 3 meses, a cada 2 semanas).

## Segurança

- O acesso às transações recorrentes é controlado pelo RLS (Row Level Security)
- Os usuários só podem acessar transações da empresa em que têm permissão

## Considerações Importantes

1. As transações recorrentes não afetam saldos bancários automaticamente - apenas criam registros de transações pendentes
2. Transações transferência são criadas com status 'pago' por padrão
3. O sistema evita criar duplicatas verificando data, descrição e valor
4. Após a geração, as transações recorrentes podem ser gerenciadas como transações normais

## API Endpoints

O sistema usa os seguintes endpoints do Supabase:
- `recurring_transactions` - para modelos de transações recorrentes
- `transactions` - para transações geradas a partir dos modelos