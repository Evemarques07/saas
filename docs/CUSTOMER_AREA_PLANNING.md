# Area do Cliente para Catalogo Publico

Este documento detalha o planejamento da area do cliente no catalogo publico do Ejym.

## Visao Geral

Sistema de identificacao de clientes no catalogo publico com beneficios opcionais.

### Principios

1. **Pedido sem cadastro continua funcionando** - O fluxo atual (nome + telefone) permanece intacto
2. **Cadastro eh opcional** - Cliente escolhe se quer criar conta
3. **Fidelidade eh por empresa** - So aparece se a empresa ativar
4. **Cupons sao por empresa** - So aparecem se a empresa criar

---

## Comparativo: Com vs Sem Cadastro

| Funcionalidade | Sem Cadastro | Com Cadastro |
|----------------|--------------|--------------|
| Fazer pedido | ✅ | ✅ |
| Ver historico de pedidos | ❌ | ✅ |
| Repetir pedido anterior | ❌ | ✅ |
| Dados auto-preenchidos | Parcial (localStorage) | ✅ Completo |
| Usar cupons | ❌ | ✅ (se empresa criar) |
| Acumular pontos | ❌ | ✅ (se empresa ativar) |
| Promocoes exclusivas | ❌ | ✅ (se empresa criar) |

---

## Autenticacao

### Metodo: Telefone + CPF

- **Simples**: Sem senha, sem email obrigatorio
- **Seguro**: CPF valida identidade
- **Pratico**: Dados que o cliente ja informa no checkout

### Fluxo de Login

```
1. Cliente clica "Entrar" no catalogo
2. Informa telefone (ja formatado)
3. Informa CPF (validado)
4. Sistema busca: customers WHERE phone + document + company_id
5. Se encontrado: autentica e carrega dados
6. Se NAO encontrado: oferece criar conta
7. Sessao salva em localStorage (30 dias)
```

### Fluxo de Primeiro Cadastro

```
1. Cliente faz pedido normalmente (nome + telefone)
2. Marca checkbox "Quero me cadastrar" (ja existe)
3. Preenche CPF (obrigatorio para cadastro)
4. Pedido criado + cliente cadastrado
5. Proxima visita: pode fazer login com telefone + CPF
```

---

## Fases de Implementacao

### FASE 1: MVP - Autenticacao + Historico

**Escopo:**
- Contexto `CatalogCustomerContext` para gerenciar sessao
- Modal de login (telefone + CPF)
- Drawer "Minha Conta" com historico de pedidos
- Funcao "Repetir Pedido"
- Botao de login/conta no header do catalogo

**Arquivos a criar:**
```
src/contexts/CatalogCustomerContext.tsx
src/modules/catalog/components/CustomerLoginModal.tsx
src/modules/catalog/components/CustomerAccountDrawer.tsx
src/modules/catalog/components/OrderHistoryList.tsx
src/modules/catalog/components/OrderDetailModal.tsx
```

**Arquivos a modificar:**
```
src/modules/catalog/CatalogPage.tsx (adicionar provider e botao)
src/modules/catalog/components/CheckoutModal.tsx (auto-preencher se logado)
src/types/index.ts (tipos se necessario)
```

**Migration:**
```sql
-- Campos opcionais em customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
```

---

### FASE 2: Sistema de Cupons

**Pre-requisito:** Empresa precisa criar cupons para clientes usarem.

**Escopo:**
- Tabelas `coupons` e `coupon_usages`
- Input de cupom no checkout
- Lista de cupons disponiveis (para cliente logado)
- Pagina de gestao de cupons (admin da empresa)

**Arquivos a criar:**
```
supabase/migrations/XXXXXX_create_coupons.sql
src/modules/catalog/components/CouponInput.tsx
src/modules/catalog/components/CouponsList.tsx
src/modules/coupons/CouponsPage.tsx (admin)
```

**Arquivos a modificar:**
```
src/modules/catalog/components/CheckoutModal.tsx (adicionar cupom)
src/modules/catalog/components/CustomerAccountDrawer.tsx (tab cupons)
src/routes/index.tsx (rota admin cupons)
catalog_orders (campos de desconto)
```

**Estrutura da tabela `coupons`:**
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  code TEXT NOT NULL,                    -- BEMVINDO10
  description TEXT,                      -- 10% na primeira compra
  discount_type TEXT,                    -- 'percentage' ou 'fixed'
  discount_value DECIMAL(10,2),          -- 10 (%) ou 10.00 (R$)
  min_order_value DECIMAL(10,2),         -- Pedido minimo
  max_discount DECIMAL(10,2),            -- Desconto maximo
  usage_limit INTEGER,                   -- Limite total de usos
  per_customer_limit INTEGER DEFAULT 1,  -- Limite por cliente
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  first_purchase_only BOOLEAN DEFAULT false,
  UNIQUE(company_id, code)
);
```

---

### FASE 3: Programa de Fidelidade

**Pre-requisito:** Empresa precisa ATIVAR o programa de fidelidade.

**Escopo:**
- Tabelas `loyalty_config`, `loyalty_levels`, `loyalty_points`
- Card de fidelidade no drawer do cliente
- Slider para usar pontos no checkout
- Configuracao do programa (admin da empresa)

**Como funciona:**
1. Empresa ativa programa e define regras (pontos por R$, valor do ponto)
2. Empresa cria niveis (Bronze, Prata, Ouro) com multiplicadores
3. Cliente faz pedido → ganha pontos (valor × multiplicador do nivel)
4. Cliente pode usar pontos como desconto (limitado a % do pedido)
5. Cliente sobe de nivel conforme acumula pontos

**Estrutura das tabelas:**
```sql
-- Configuracao por empresa
CREATE TABLE loyalty_config (
  company_id UUID PRIMARY KEY REFERENCES companies(id),
  enabled BOOLEAN DEFAULT false,
  points_per_real DECIMAL DEFAULT 1,     -- 1 ponto por R$1
  points_value DECIMAL DEFAULT 0.01,     -- 1 ponto = R$0.01
  min_points_redeem INTEGER DEFAULT 100, -- Minimo para resgatar
  max_discount_percent INTEGER DEFAULT 50 -- Max 50% do pedido
);

-- Niveis
CREATE TABLE loyalty_levels (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT,                    -- Bronze, Prata, Ouro
  min_points INTEGER,           -- Pontos para alcancar
  points_multiplier DECIMAL,    -- 1.0, 1.5, 2.0
  benefits TEXT[],              -- Lista de beneficios
  color TEXT                    -- Cor do badge
);

-- Historico de pontos
CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY,
  company_id UUID,
  customer_id UUID,
  order_id UUID,
  points INTEGER,               -- Positivo = ganhou, Negativo = usou
  type TEXT,                    -- 'earned', 'redeemed', 'expired', 'bonus'
  description TEXT,
  created_at TIMESTAMPTZ
);

-- Campos em customers
ALTER TABLE customers ADD COLUMN loyalty_points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN loyalty_level_id UUID;
ALTER TABLE customers ADD COLUMN lifetime_points INTEGER DEFAULT 0;
```

---

### FASE 4: Promocoes Exclusivas

**Pre-requisito:** Empresa precisa criar promocoes.

**Escopo:**
- Tabela `promotions`
- Banner de promocoes no catalogo (para cliente elegivel)
- Aplicacao automatica de desconto
- Gestao de promocoes (admin)

**Tipos de promocao:**
- **Aniversario**: Desconto no mes de aniversario
- **Nivel de fidelidade**: Desconto exclusivo para nivel X
- **Reativacao**: Cliente inativo ha X dias
- **Primeira compra**: Novo cliente
- **Categoria/Produto**: Desconto em itens especificos

---

## Fluxo de UX

### Header do Catalogo (atualizado)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo Empresa]    [Buscar...]    [Entrar] [Carrinho (3)]   │
└─────────────────────────────────────────────────────────────┘
                          │
            Cliente logado: [Ola, Joao ▼] [Carrinho (3)]
```

### Modal de Login

```
┌─────────────────────────────────────────┐
│           Entrar na sua conta           │
│                                         │
│  Telefone                               │
│  ┌─────────────────────────────────┐   │
│  │ (85) 99999-9999                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  CPF                                    │
│  ┌─────────────────────────────────┐   │
│  │ 123.456.789-00                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ☑ Lembrar neste dispositivo           │
│                                         │
│  [Cancelar]              [Entrar]       │
│                                         │
│  Nao tem cadastro? Faca um pedido e    │
│  marque "Quero me cadastrar"            │
└─────────────────────────────────────────┘
```

### Drawer "Minha Conta"

```
┌─────────────────────────────────────────┐
│  Minha Conta                        [X] │
├─────────────────────────────────────────┤
│  [Meus Dados] [Pedidos] [Cupons]        │
├─────────────────────────────────────────┤
│                                         │
│  PEDIDOS RECENTES                       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Pedido #abc123                  │   │
│  │ 15/01/2026 - R$ 89,90          │   │
│  │ Status: ● Entregue              │   │
│  │ [Ver detalhes] [Repetir]        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Pedido #def456                  │   │
│  │ 10/01/2026 - R$ 159,00         │   │
│  │ Status: ● Confirmado            │   │
│  │ [Ver detalhes] [Repetir]        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Sair da conta]                        │
└─────────────────────────────────────────┘
```

---

## Verificacao (Como Testar)

### Fase 1 - Autenticacao + Historico

1. **Criar conta via checkout**
   - Acessar catalogo → Adicionar produto → Checkout
   - Marcar "Quero me cadastrar" → Preencher CPF
   - Finalizar pedido

2. **Fazer login**
   - Fechar e reabrir navegador
   - Clicar "Entrar" → Informar telefone + CPF
   - Verificar se autentica

3. **Ver historico**
   - Logado, clicar no nome → "Minha Conta"
   - Verificar pedidos listados

4. **Repetir pedido**
   - Clicar "Repetir" em um pedido
   - Verificar itens adicionados ao carrinho

5. **Checkout auto-preenchido**
   - Logado, adicionar produto e ir para checkout
   - Verificar dados ja preenchidos

### Fase 2 - Cupons

1. **Criar cupom (admin)**
   - Acessar `/app/{slug}/cupons`
   - Criar cupom "TESTE10" com 10% desconto

2. **Usar cupom (cliente)**
   - No checkout, digitar "TESTE10"
   - Verificar desconto aplicado

### Fase 3 - Fidelidade

1. **Ativar programa (admin)**
   - Acessar configuracoes → Fidelidade
   - Ativar e configurar regras

2. **Ganhar pontos (cliente)**
   - Fazer pedido → Verificar pontos creditados

3. **Usar pontos (cliente)**
   - No checkout, usar slider de pontos
   - Verificar desconto aplicado

---

## Cronograma Sugerido

| Fase | Escopo | Estimativa |
|------|--------|------------|
| 1 | Autenticacao + Historico | MVP |
| 2 | Sistema de Cupons | Apos MVP |
| 3 | Programa de Fidelidade | Apos Cupons |
| 4 | Promocoes Exclusivas | Futuro |

---

## Referencias

- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura do sistema
- [COMPANY_CREATION_FLOW.md](COMPANY_CREATION_FLOW.md) - Fluxo multi-tenant
- [WHATSAPP_IMPLEMENTATION.md](WHATSAPP_IMPLEMENTATION.md) - Integracao WhatsApp
