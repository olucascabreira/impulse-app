# 📋 Funcionalidades Recomendadas - Impulse App

> **Documento criado em:** 04/11/2025
> **Objetivo:** Plano estratégico de evolução do sistema comparado ao Granatum
> **Status:** Aguardando implementação

---

## 📊 Análise Comparativa: Impulse App vs Granatum

### Resumo Executivo

| Aspecto | Granatum | Impulse App | Gap |
|---------|----------|-------------|-----|
| **Custo** | R$ 396/mês | R$ 0 (self-hosted) | ✅ Vantagem |
| **Customização** | Limitada | Ilimitada | ✅ Vantagem |
| **Controle de Dados** | Fornecedor | 100% proprietário | ✅ Vantagem |
| **Automações Bancárias** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ Gap |
| **Relatórios Gerenciais** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ Gap |
| **Interface/UX** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Vantagem |
| **Integrações Externas** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ❌ Gap |
| **Suporte Técnico** | ⭐⭐⭐⭐ | DIY | ⚠️ Neutro |

---

## 🎯 Funcionalidades Prioritárias (Baixa/Média Complexidade)

### **1. 📎 Sistema de Anexos/Documentos**

**Complexidade:** BAIXA
**Impacto:** ALTO
**Tempo estimado:** 4-6 horas
**Prioridade:** 🔴 CRÍTICA

#### Por que implementar

- ✅ Granatum tem, Impulse App não tem
- ✅ Supabase Storage já configurado (buckets para logos existem)
- ✅ Permite anexar comprovantes, notas fiscais, recibos às transações
- ✅ Aumenta confiabilidade e auditabilidade do sistema
- ✅ Reduz necessidade de arquivos externos

#### Estrutura do Banco de Dados

```sql
-- Migration: 20251104_add_transaction_attachments.sql

CREATE TABLE transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Caminho no Supabase Storage
  file_type TEXT, -- application/pdf, image/jpeg, image/png, etc
  file_size INTEGER, -- Tamanho em bytes
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Índices para performance
  CONSTRAINT fk_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);
CREATE INDEX idx_transaction_attachments_company_id ON transaction_attachments(company_id);

-- RLS Policies
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments from their company"
  ON transaction_attachments FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for their company"
  ON transaction_attachments FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments from their company"
  ON transaction_attachments FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );
```

#### Storage Bucket

```sql
-- Criar bucket no Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-documents', 'transaction-documents', false);

-- Políticas de acesso
CREATE POLICY "Users can upload transaction documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'transaction-documents' AND
    auth.uid() IN (
      SELECT user_id FROM company_users
      WHERE company_id = (storage.foldername(name))[1]::uuid
    )
  );

CREATE POLICY "Users can view their company documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'transaction-documents' AND
    auth.uid() IN (
      SELECT user_id FROM company_users
      WHERE company_id = (storage.foldername(name))[1]::uuid
    )
  );
```

#### Componentes Frontend

**Hook: `use-transaction-attachments.ts`**
```typescript
export interface TransactionAttachment {
  id: string;
  transaction_id: string;
  company_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export function useTransactionAttachments(transactionId?: string, companyId?: string) {
  // Fetch, upload, delete attachments
}
```

**Componente: `TransactionAttachmentUpload.tsx`**
- Drag-and-drop zone
- Lista de arquivos anexados
- Preview de imagens
- Download de PDFs
- Validação de tamanho (max 5MB)
- Tipos aceitos: PDF, JPG, PNG, XLSX

#### Casos de Uso

1. **Upload ao criar transação:** Anexar nota fiscal no momento do lançamento
2. **Upload posterior:** Adicionar comprovante quando receber o documento
3. **Múltiplos anexos:** Nota + boleto + comprovante de pagamento
4. **Auditoria:** Rastrear quem anexou cada documento

---

### **2. 🏷️ Tags/Etiquetas Customizáveis**

**Complexidade:** BAIXA
**Impacto:** MÉDIO-ALTO
**Tempo estimado:** 3-4 horas
**Prioridade:** 🟡 ALTA

#### Por que implementar

- ✅ Categorização flexível além do plano de contas
- ✅ Exemplos: "Urgente", "Recorrente", "Marketing", "Viagem", "Projeto X"
- ✅ Facilita filtros e relatórios customizados
- ✅ Granatum tem "tags personalizadas"
- ✅ Análises multi-dimensionais (ex: "Quanto gastei com Marketing em viagens?")

#### Estrutura do Banco de Dados

```sql
-- Migration: 20251104_add_tags_system.sql

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6', -- Hex color code
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(company_id, name) -- Evita tags duplicadas na mesma empresa
);

CREATE TABLE transaction_tags (
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  PRIMARY KEY (transaction_id, tag_id)
);

-- Índices
CREATE INDEX idx_tags_company_id ON tags(company_id);
CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);

-- RLS Policies
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags from their company"
  ON tags FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage tags from their company"
  ON tags FOR ALL
  USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage transaction tags from their company"
  ON transaction_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_tags.transaction_id
        AND t.company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid())
    )
  );
```

#### Componentes Frontend

**Hook: `use-tags.ts`**
```typescript
export interface Tag {
  id: string;
  company_id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
}

export function useTags(companyId?: string) {
  // CRUD de tags
}
```

**Componente: `TagManager.tsx`**
- Lista de tags com cores
- CRUD de tags
- Seletor de cor (color picker)

**Componente: `TagSelector.tsx`**
- Multi-select de tags
- Criação rápida de tag inline

**Componente: `TagBadge.tsx`**
- Badge colorido para exibir tag

#### Casos de Uso

1. **Categorização de projetos:** Tag "Projeto Website", "Projeto App Mobile"
2. **Priorização:** Tags "Urgente", "Baixa Prioridade"
3. **Origem:** Tags "E-commerce", "Loja Física", "B2B"
4. **Campanhas:** Tags "Black Friday", "Natal 2025"
5. **Relatórios:** "Quanto gastei com 'Marketing' no 'Projeto X'?"

---

### **3. 📊 DRE (Demonstração do Resultado do Exercício)**

**Complexidade:** MÉDIA
**Impacto:** MUITO ALTO
**Tempo estimado:** 6-8 horas
**Prioridade:** 🔴 CRÍTICA

#### Por que implementar

- ✅ **Granatum destaca isso como funcionalidade premium**
- ✅ Relatório financeiro essencial para empresas
- ✅ Todos os dados necessários já existem (receitas, despesas, plano de contas)
- ✅ Não requer integração externa
- ✅ Agrega valor profissional ao sistema
- ✅ Facilita tomada de decisão estratégica

#### Estrutura do DRE

```
┌─────────────────────────────────────────────────┐
│ DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)   │
├─────────────────────────────────────────────────┤
│                                                 │
│ RECEITA OPERACIONAL BRUTA                       │
│   (+) Vendas de Produtos                  XX.XXX│
│   (+) Prestação de Serviços               XX.XXX│
│ = Receita Bruta                           XX.XXX│
│                                                 │
│ (-) DEDUÇÕES DA RECEITA                         │
│   (-) Impostos sobre Vendas               (X.XXX)│
│   (-) Devoluções e Cancelamentos          (X.XXX)│
│ = RECEITA OPERACIONAL LÍQUIDA             XX.XXX│
│                                                 │
│ (-) CUSTOS E DESPESAS OPERACIONAIS              │
│   (-) Despesas com Pessoal                (X.XXX)│
│   (-) Despesas Administrativas            (X.XXX)│
│   (-) Despesas com Marketing              (X.XXX)│
│   (-) Outras Despesas Operacionais        (X.XXX)│
│ = RESULTADO OPERACIONAL (EBITDA)          XX.XXX│
│                                                 │
│ (+/-) RESULTADO FINANCEIRO                      │
│   (+) Receitas Financeiras                 X.XXX│
│   (-) Despesas Financeiras                (X.XXX)│
│ = RESULTADO ANTES DOS IMPOSTOS            XX.XXX│
│                                                 │
│ (-) IMPOSTO DE RENDA E CSLL                     │
│   (-) Provisão para IR/CSLL               (X.XXX)│
│                                                 │
│ = LUCRO/PREJUÍZO LÍQUIDO                  XX.XXX│
│                                                 │
│ Margem Líquida: XX.X%                           │
└─────────────────────────────────────────────────┘
```

#### View SQL

```sql
-- Migration: 20251104_add_dre_views.sql

CREATE OR REPLACE VIEW v_dre_monthly AS
WITH base_data AS (
  SELECT
    t.company_id,
    DATE_TRUNC('month', t.due_date) as period,
    ca.tipo as account_type,
    ca.nome as account_name,
    ca.parent_id,
    t.amount,
    t.status,
    t.transaction_type
  FROM transactions t
  LEFT JOIN chart_accounts ca ON t.chart_account_id = ca.id
  WHERE t.status IN ('pago', 'recebido')
)
SELECT
  company_id,
  period,

  -- RECEITAS
  SUM(CASE
    WHEN transaction_type = 'entrada' AND account_type = 'receita'
    THEN amount ELSE 0
  END) as receita_bruta,

  -- DEDUÇÕES (poderia ser uma subcategoria de receita)
  SUM(CASE
    WHEN transaction_type = 'saida' AND account_name ILIKE '%imposto%'
    THEN amount ELSE 0
  END) as deducoes,

  -- RECEITA LÍQUIDA
  SUM(CASE
    WHEN transaction_type = 'entrada' AND account_type = 'receita'
    THEN amount ELSE 0
  END) - SUM(CASE
    WHEN transaction_type = 'saida' AND account_name ILIKE '%imposto%'
    THEN amount ELSE 0
  END) as receita_liquida,

  -- DESPESAS OPERACIONAIS
  SUM(CASE
    WHEN transaction_type = 'saida' AND account_type = 'despesa'
      AND account_name NOT ILIKE '%financeira%'
      AND account_name NOT ILIKE '%imposto%'
    THEN amount ELSE 0
  END) as despesas_operacionais,

  -- RESULTADO OPERACIONAL
  (SUM(CASE
    WHEN transaction_type = 'entrada' AND account_type = 'receita'
    THEN amount ELSE 0
  END) - SUM(CASE
    WHEN transaction_type = 'saida' AND account_name ILIKE '%imposto%'
    THEN amount ELSE 0
  END)) - SUM(CASE
    WHEN transaction_type = 'saida' AND account_type = 'despesa'
      AND account_name NOT ILIKE '%financeira%'
      AND account_name NOT ILIKE '%imposto%'
    THEN amount ELSE 0
  END) as resultado_operacional,

  -- RESULTADO FINANCEIRO
  SUM(CASE
    WHEN transaction_type = 'entrada' AND account_name ILIKE '%financeira%'
    THEN amount ELSE 0
  END) as receitas_financeiras,

  SUM(CASE
    WHEN transaction_type = 'saida' AND account_name ILIKE '%financeira%'
    THEN amount ELSE 0
  END) as despesas_financeiras,

  -- LUCRO/PREJUÍZO
  SUM(CASE
    WHEN transaction_type = 'entrada'
    THEN amount ELSE -amount
  END) as lucro_liquido

FROM base_data
GROUP BY company_id, period
ORDER BY period DESC;

-- Grant permissions
GRANT SELECT ON v_dre_monthly TO authenticated;
```

#### Componentes Frontend

**Página: `DRE.tsx`**
```typescript
export default function DREPage() {
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch DRE data
  // Display structured report
  // Export to PDF/Excel
}
```

**Funcionalidades:**
1. Seleção de período (mensal, trimestral, anual)
2. Comparativo período atual vs anterior
3. Gráfico de evolução de margem líquida
4. Exportação para PDF (usando jsPDF)
5. Exportação para Excel (usando xlsx)
6. Drill-down (clicar em linha para ver detalhes)

---

### **4. 💰 Orçamento Mensal (Budget)**

**Complexidade:** MÉDIA
**Impacto:** ALTO
**Tempo estimado:** 5-6 horas
**Prioridade:** 🟡 ALTA

#### Por que implementar

- ✅ Granatum tem planejamento orçamentário
- ✅ Permite definir metas financeiras
- ✅ Comparação realizado vs orçado
- ✅ Alertas de desvios orçamentários
- ✅ Facilita controle de gastos

#### Estrutura do Banco de Dados

```sql
-- Migration: 20251104_add_budgets.sql

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  chart_account_id UUID REFERENCES chart_accounts(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  planned_amount NUMERIC(12,2) NOT NULL CHECK (planned_amount >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(company_id, chart_account_id, period_month, period_year)
);

-- Índices
CREATE INDEX idx_budgets_company_id ON budgets(company_id);
CREATE INDEX idx_budgets_period ON budgets(period_year, period_month);
CREATE INDEX idx_budgets_chart_account_id ON budgets(chart_account_id);

-- RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budgets from their company"
  ON budgets FOR ALL
  USING (company_id IN (SELECT company_id FROM company_users WHERE user_id = auth.uid()));

-- View comparativa
CREATE OR REPLACE VIEW v_budget_vs_actual AS
SELECT
  b.company_id,
  b.period_year,
  b.period_month,
  b.chart_account_id,
  ca.nome as account_name,
  ca.tipo as account_type,
  b.planned_amount,
  COALESCE(SUM(t.amount), 0) as actual_amount,
  b.planned_amount - COALESCE(SUM(t.amount), 0) as variance,
  CASE
    WHEN b.planned_amount > 0
    THEN ((COALESCE(SUM(t.amount), 0) / b.planned_amount) * 100)
    ELSE 0
  END as percentage_used
FROM budgets b
LEFT JOIN chart_accounts ca ON b.chart_account_id = ca.id
LEFT JOIN transactions t ON
  t.chart_account_id = b.chart_account_id
  AND EXTRACT(YEAR FROM t.due_date) = b.period_year
  AND EXTRACT(MONTH FROM t.due_date) = b.period_month
  AND t.status IN ('pago', 'recebido')
GROUP BY b.id, b.company_id, b.period_year, b.period_month,
         b.chart_account_id, ca.nome, ca.tipo, b.planned_amount;

GRANT SELECT ON v_budget_vs_actual TO authenticated;
```

#### Componentes Frontend

**Hook: `use-budgets.ts`**
```typescript
export interface Budget {
  id: string;
  company_id: string;
  chart_account_id: string;
  period_month: number;
  period_year: number;
  planned_amount: number;
  notes?: string;
}

export interface BudgetVsActual extends Budget {
  account_name: string;
  account_type: 'receita' | 'despesa';
  actual_amount: number;
  variance: number;
  percentage_used: number;
}
```

**Componente: `BudgetManager.tsx`**
- Definir orçamento por conta
- Copiar orçamento do mês anterior
- Visualização em grid (tabela)

**Componente: `BudgetProgress.tsx`**
- Card com progresso visual
- 🟢 0-80%: No budget
- 🟡 81-100%: Warning
- 🔴 >100%: Over budget

**Widget Dashboard:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Orçamento do Mês</CardTitle>
  </CardHeader>
  <CardContent>
    <Progress value={85} className="mb-2" />
    <p className="text-sm text-muted-foreground">
      85% do orçamento utilizado (R$ 42.500 de R$ 50.000)
    </p>
  </CardContent>
</Card>
```

---

## 🚀 Roadmap de Implementação

### Fase 1 - Fundamentos (Semana 1)
**Objetivo:** Alcançar paridade básica com Granatum

- [ ] 📎 Sistema de Anexos/Documentos (4-6h)
- [ ] 🏷️ Tags Customizáveis (3-4h)

**Total estimado:** 7-10 horas
**Entregável:** Transações com anexos e tags funcionando

---

### Fase 2 - Relatórios Profissionais (Semana 2)
**Objetivo:** Relatórios gerenciais de nível empresarial

- [ ] 📊 DRE (Demonstração de Resultado) (6-8h)
- [ ] 💰 Orçamento Mensal (5-6h)

**Total estimado:** 11-14 horas
**Entregável:** DRE e comparativo orçado vs realizado

---

### Fase 3 - Automações (Semana 3-4)
**Objetivo:** Reduzir trabalho manual

- [ ] 🔄 Conciliação Bancária (10-12h)
- [ ] 📧 Melhorias no sistema de notificações (4-6h)
- [ ] 📁 Exportação de relatórios (PDF/Excel) (6-8h)

**Total estimado:** 20-26 horas
**Entregável:** Conciliação automática e exportações

---

### Fase 4 - Integrações (Semana 5-6)
**Objetivo:** Conectar com sistemas externos

- [ ] 🏦 API para importação de extratos OFX/CSV (8-10h)
- [ ] 💳 Integração com gateways de pagamento (12-15h)
- [ ] 📄 Emissão de NFS-e (se aplicável) (15-20h)

**Total estimado:** 35-45 horas
**Entregável:** Integrações bancárias e fiscais

---

## 📈 Métricas de Sucesso

| Métrica | Antes | Meta | Como Medir |
|---------|-------|------|------------|
| **Tempo médio para lançamento** | 3 min | 1.5 min | Com anexos integrados |
| **Relatórios gerados/mês** | 5 | 20 | Com DRE e exports |
| **Erros de categorização** | 15% | 5% | Com tags e plano de contas |
| **Tempo de fechamento mensal** | 8h | 2h | Com conciliação automática |
| **Satisfação do usuário** | - | 4.5/5 | Survey trimestral |

---

## 💡 Diferenciais Competitivos

Após implementar as Fases 1 e 2, o Impulse App terá:

### Vantagens sobre o Granatum

1. **Custo-benefício imbatível**
   - Granatum: R$ 396/mês (R$ 4.752/ano)
   - Impulse App: R$ 0 + custo de hospedagem (~R$ 50/mês no Vercel/Supabase)
   - **Economia anual: ~R$ 4.150**

2. **Propriedade total dos dados**
   - Backup próprio
   - Sem lock-in de fornecedor
   - Conformidade com LGPD facilitada

3. **Interface superior**
   - Stack moderna (React + shadcn/ui)
   - Responsivo e acessível
   - Tema claro/escuro

4. **Extensibilidade ilimitada**
   - Código-fonte acessível
   - Adicionar features customizadas
   - Integrações sob medida

### Funcionalidades Únicas (Futuras)

- **White-label:** Empresas de contabilidade podem revender
- **Multi-tenant avançado:** Gestão de múltiplas empresas
- **API GraphQL:** Integrações mais flexíveis
- **Modo offline:** PWA com sincronização

---

## 🛠️ Stack Tecnológico Recomendado

### Para Exportações

- **PDF:** [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Excel:** [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs)
- **CSV:** Nativo (FileReader API)

### Para Gráficos Avançados

- **Já instalado:** Recharts (ótimo para dashboards)
- **Alternativa:** [Chart.js](https://www.chartjs.org/) (se precisar de mais customização)
- **Para DRE:** Waterfall charts (Recharts suporta)

### Para Upload de Arquivos

- **Drag & Drop:** [react-dropzone](https://github.com/react-dropzone/react-dropzone)
- **Preview:** [react-pdf](https://github.com/wojtekmaj/react-pdf) (para PDFs)

### Para Conciliação Bancária

- **Parser OFX:** [ofx-js](https://github.com/arolson101/ofx-js)
- **Parser CSV:** [PapaParse](https://www.papaparse.com/)
- **Matching:** Algoritmo de Levenshtein (fuzzy matching)

---

## 📚 Recursos de Aprendizado

### DRE e Contabilidade

- [Sebrae - Como fazer DRE](https://www.sebrae.com.br/sites/PortalSebrae/artigos/demonstracao-do-resultado-do-exercicio-dre)
- [CVM - Estrutura Conceitual](https://www.gov.br/cvm/)

### Upload de Arquivos no Supabase

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase Storage Security](https://supabase.com/docs/guides/storage/security/access-control)

### Exportação de Relatórios

- [jsPDF Examples](https://github.com/parallax/jsPDF/tree/master/examples)
- [SheetJS Demos](https://docs.sheetjs.com/docs/demos/)

---

## 🎯 Próximos Passos Sugeridos

### Implementação Imediata (Esta Semana)

1. **Decidir prioridade:** Anexos ou Tags primeiro?
2. **Criar migrations:** Schema do banco de dados
3. **Setup Storage:** Bucket para documentos (se anexos)
4. **Criar hooks:** `use-transaction-attachments` ou `use-tags`
5. **Componentes UI:** Upload ou Tag selector
6. **Testes:** Validar upload/criação de tags

### Planejamento (Próxima Semana)

1. **Design do DRE:** Definir categorias do plano de contas
2. **Mockup visual:** Como será o relatório
3. **View SQL:** Implementar lógica de cálculo
4. **Página de relatório:** Layout e filtros

---

## 📞 Suporte e Dúvidas

Este documento foi gerado como guia estratégico. Para implementação:

1. **Priorize** funcionalidades por impacto vs esforço
2. **Teste** cada feature isoladamente
3. **Documente** mudanças no código
4. **Valide** com usuários reais antes de escalar

---

**Última atualização:** 04/11/2025
**Versão do documento:** 1.0
**Próxima revisão:** Após implementação da Fase 1

---

## 🔖 Referências

- [Granatum - Site Oficial](https://www.granatum.com.br/)
- [Impulse App - Repositório](./README.md)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
