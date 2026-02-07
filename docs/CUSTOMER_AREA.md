# Area do Cliente - Catalogo Publico

Documentacao completa do sistema de area do cliente implementado no catalogo publico.

## Visao Geral

O sistema permite que clientes:
- Faca login usando telefone + CPF (sem senha)
- Visualizem historico de pedidos
- Repitam pedidos anteriores
- Apliquem cupons de desconto
- Acumulem e resgatem pontos de fidelidade
- Recebam promocoes exclusivas

---

## 1. Autenticacao do Cliente

### Como Funciona

O cliente faz login informando:
- **Telefone**: Formato (XX) XXXXX-XXXX
- **CPF**: Formato XXX.XXX.XXX-XX

O sistema busca o cliente na tabela `customers` pela combinacao `phone + document + company_id`.

### Sessao

- Armazenada no `localStorage` com chave `ejym_customer_{slug}`
- Expiracao: 30 dias
- Renovada automaticamente a cada login

### Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/contexts/CatalogCustomerContext.tsx` | Contexto de autenticacao |
| `src/modules/catalog/components/CustomerLoginModal.tsx` | Modal de login |

### Uso no Codigo

```tsx
import { useCatalogCustomer } from '../contexts/CatalogCustomerContext';

function MeuComponente() {
  const {
    customer,           // Cliente logado ou null
    isAuthenticated,    // Boolean
    login,              // (phone, cpf) => Promise<{success, error?}>
    logout,             // () => void
    orders,             // Array de pedidos
    loadOrders,         // () => Promise<void>
  } = useCatalogCustomer();
}
```

---

## 2. Historico de Pedidos

### Funcionalidades

- Lista todos os pedidos do cliente
- Mostra status com cores diferenciadas
- Permite ver detalhes do pedido
- Botao "Repetir Pedido" adiciona itens ao carrinho

### Status dos Pedidos

| Status | Label | Cor |
|--------|-------|-----|
| `pending` | Pendente | Amarelo |
| `confirmed` | Confirmado | Azul |
| `preparing` | Preparando | Indigo |
| `ready` | Pronto | Verde |
| `delivered` | Entregue | Verde |
| `cancelled` | Cancelado | Vermelho |

### Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/catalog/components/OrderHistoryList.tsx` | Lista de pedidos |
| `src/modules/catalog/components/OrderDetailModal.tsx` | Detalhes do pedido |
| `src/modules/catalog/components/CustomerAccountDrawer.tsx` | Drawer com abas |

---

## 3. Sistema de Cupons

### Tipos de Desconto

- **percentage**: Desconto percentual (ex: 10%)
- **fixed**: Valor fixo (ex: R$ 20,00)

### Campos do Cupom

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `code` | TEXT | Codigo unico do cupom |
| `discount_type` | TEXT | 'percentage' ou 'fixed' |
| `discount_value` | DECIMAL | Valor do desconto |
| `min_order_value` | DECIMAL | Pedido minimo para usar |
| `max_discount` | DECIMAL | Desconto maximo (para %) |
| `usage_limit` | INTEGER | Limite total de usos |
| `per_customer_limit` | INTEGER | Limite por cliente |
| `valid_until` | TIMESTAMP | Data de expiracao |
| `first_purchase_only` | BOOLEAN | Apenas primeira compra |

### Validacao de Cupom

O sistema valida:
1. Cupom existe e esta ativo
2. Nao expirou
3. Nao atingiu limite de uso
4. Cliente nao excedeu limite individual
5. Pedido atinge valor minimo
6. Se first_purchase_only, cliente nao tem pedidos anteriores

### Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/coupons/CouponsPage.tsx` | CRUD de cupons (admin) |
| `src/modules/catalog/components/CouponInput.tsx` | Input no checkout |
| `src/modules/catalog/components/CouponsList.tsx` | Lista de cupons disponiveis |

### Uso no Checkout

```tsx
import { CouponInput } from './CouponInput';

<CouponInput
  companyId={company.id}
  orderValue={total}
  appliedCoupon={coupon}
  onApplyCoupon={setCoupon}
  onRemoveCoupon={() => setCoupon(null)}
/>
```

---

## 4. Programa de Fidelidade

### Configuracao (loyalty_config)

| Campo | Tipo | Descricao | Padrao |
|-------|------|-----------|--------|
| `enabled` | BOOLEAN | Programa ativo | false |
| `points_per_real` | DECIMAL | Pontos por R$1 gasto | 1 |
| `points_value` | DECIMAL | Valor de cada ponto em R$ | 0.01 |
| `min_points_redeem` | INTEGER | Minimo de pontos para resgatar | 100 |
| `max_discount_percent` | INTEGER | Desconto maximo (%) | 50 |

### Niveis de Fidelidade (loyalty_levels)

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `name` | TEXT | Nome do nivel (Bronze, Prata, Ouro) |
| `min_points` | INTEGER | Pontos minimos para alcancar |
| `points_multiplier` | DECIMAL | Multiplicador de pontos (1.0, 1.5, 2.0) |
| `benefits` | TEXT[] | Lista de beneficios |
| `color` | TEXT | Cor do badge |

### Fluxo de Pontos

1. **Ganhar Pontos**: Pedido confirmado → pontos = valor * points_per_real * multiplicador_nivel
2. **Usar Pontos**: No checkout, slider de 0 ate maximo permitido
3. **Atualizar Nivel**: Automatico baseado em lifetime_points

### Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/loyalty/LoyaltyPage.tsx` | Configuracao (admin) |
| `src/modules/catalog/components/LoyaltyCard.tsx` | Card de pontos |
| `src/modules/catalog/components/PointsRedeemSlider.tsx` | Slider no checkout |

### Uso no Checkout

```tsx
import { PointsRedeemSlider } from './PointsRedeemSlider';

<PointsRedeemSlider
  availablePoints={customer.loyalty_points}
  pointsValue={config.points_value}
  maxDiscountPercent={config.max_discount_percent}
  minPointsRedeem={config.min_points_redeem}
  orderTotal={total}
  selectedPoints={pointsToUse}
  onPointsChange={setPointsToUse}
/>
```

---

## 5. Sistema de Promocoes

### Tipos de Promocao

| Tipo | Descricao |
|------|-----------|
| `birthday` | Desconto no mes de aniversario |
| `loyalty_level` | Desconto exclusivo por nivel |
| `first_purchase` | Desconto para novos clientes |
| `reactivation` | Desconto para clientes inativos |
| `category_discount` | Desconto em categorias especificas |
| `product_discount` | Desconto em produtos especificos |
| `seasonal` | Promocao por periodo (Natal, Black Friday) |
| `flash_sale` | Promocao relampago |

### Condicoes (JSONB)

```json
// loyalty_level
{ "level_ids": ["uuid1", "uuid2"] }

// reactivation
{ "inactive_days": 30 }

// category_discount
{ "category_ids": ["uuid1", "uuid2"] }

// product_discount
{ "product_ids": ["uuid1", "uuid2"] }
```

### Aplicacao Automatica de Promocoes

O sistema aplica promocoes automaticamente no checkout:

1. **Ao abrir o checkout**, o sistema busca promocoes ativas da empresa
2. **Para cada promocao**, verifica elegibilidade baseada no tipo:
   - `birthday`: Cliente logado com aniversario no mes atual
   - `loyalty_level`: Cliente em nivel de fidelidade especificado em `conditions.level_ids`
   - `first_purchase`: Cliente sem pedidos anteriores (`total_orders = 0`)
   - `reactivation`: Cliente inativo ha X dias (`conditions.inactive_days`)
   - `category_discount`: Itens no carrinho com categoria em `conditions.category_ids`
   - `product_discount`: Itens no carrinho com produto em `conditions.product_ids`
   - `seasonal` / `flash_sale`: Sempre aplica se dentro do periodo de validade
3. **Calcula o desconto** (percentual ou fixo) respeitando `max_discount`
4. **Exibe no resumo** do checkout com cor roxa
5. **Ao finalizar pedido**, registra uso em `promotion_usages` e incrementa `usage_count`

### Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/promotions/PromotionsPage.tsx` | CRUD de promocoes (admin) |
| `src/contexts/CatalogCustomerContext.tsx` | Funcao `getApplicablePromotions` |
| `src/modules/catalog/components/CheckoutModal.tsx` | Integracao no checkout |

### Uso no Codigo

```tsx
// Em CatalogCustomerContext
const { getApplicablePromotions } = useCatalogCustomer();

// Buscar promocoes aplicaveis
const promotions = await getApplicablePromotions(cartItems, subtotal);

// Cada promocao retornada tem:
// - promotion: dados da promocao
// - discount: valor calculado do desconto
// - reason: descricao da elegibilidade
```

---

## 6. Integracao no Checkout

O `CheckoutModal.tsx` foi atualizado para:

1. **Auto-preencher dados** se cliente logado
2. **Aplicar cupom** com validacao
3. **Usar pontos** de fidelidade
4. **Aplicar promocoes** automaticamente
5. **Calcular descontos** corretamente
6. **Salvar no pedido** todas as informacoes de desconto
7. **Enviar WhatsApp** com detalhes dos descontos

### Campos Adicionados em catalog_orders

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `coupon_id` | UUID | Referencia ao cupom usado |
| `coupon_code` | TEXT | Codigo do cupom |
| `coupon_discount` | DECIMAL | Valor do desconto do cupom |
| `points_used` | INTEGER | Pontos usados |
| `points_discount` | DECIMAL | Valor do desconto em pontos |
| `points_earned` | INTEGER | Pontos ganhos no pedido |
| `promotion_id` | UUID | Referencia a promocao principal |
| `promotion_discount` | DECIMAL | Valor do desconto de promocoes |

### Resumo de Descontos no Checkout

O resumo do pedido exibe todos os descontos com cores diferenciadas:

| Tipo de Desconto | Cor | Exemplo |
|-----------------|-----|---------|
| Cupom | Verde | `Cupom: PROMO10 -R$ 10,00` |
| Pontos | Ambar | `Pontos: 100 pts -R$ 5,00` |
| Promocao | Roxo | `Aniversario -R$ 8,00` |

---

## 6.1 Notificacoes WhatsApp com Descontos

As mensagens de WhatsApp agora incluem detalhes dos descontos aplicados.

### Exemplo de Mensagem para Cliente

```
Ola Joao!

Recebemos seu pedido na *Loja Exemplo*!

*Pedido #ABC12345*
  - 2x Produto A: R$ 50.00
  - 1x Produto B: R$ 30.00

*Subtotal:* R$ 80.00
*Descontos:*
  Cupom (PROMO10): -R$ 8.00
  Pontos (100 pts): -R$ 5.00
  Desconto de aniversario: -R$ 4.00

*Total: R$ 63.00*

Aguarde a confirmacao da loja.
Voce sera notificado quando o pedido for confirmado!
```

### Exemplo de Mensagem para Empresa

```
*NOVO PEDIDO!*

*Cliente:* Joao Silva
*Telefone:* (11) 99999-9999

*Itens:*
  - 2x Produto A: R$ 50.00
  - 1x Produto B: R$ 30.00

*Subtotal:* R$ 80.00
*Descontos:*
  Cupom (PROMO10): -R$ 8.00
  Pontos (100 pts): -R$ 5.00
  Desconto de aniversario: -R$ 4.00

*Total: R$ 63.00*

Acesse o painel para confirmar o pedido.
```

### Interface OrderDiscountInfo

```typescript
// src/services/whatsapp.ts
export interface OrderDiscountInfo {
  subtotal: number;
  couponCode?: string;
  couponDiscount?: number;
  pointsUsed?: number;
  pointsDiscount?: number;
  promotionDiscount?: number;
  promotionNames?: string[];
}
```

### Arquivos Modificados

| Arquivo | Descricao |
|---------|-----------|
| `src/services/whatsapp.ts` | Interface `OrderDiscountInfo` e formatacao de mensagens |
| `src/modules/catalog/components/CheckoutModal.tsx` | Monta `discountInfo` e passa para funcoes de formatacao |

---

## 6.2 Detalhes do Pedido (OrderDetailModal)

O modal de detalhes do pedido exibe todos os descontos de forma detalhada.

### Estrutura do Resumo

```
┌─────────────────────────────────────────┐
│ Subtotal                       R$ 80,00 │
│ Cupom: PROMO10                -R$ 8,00  │ (verde)
│ Pontos usados: 100            -R$ 5,00  │ (ambar)
│ Promocao                      -R$ 4,00  │ (roxo)
├─────────────────────────────────────────┤
│ Total                          R$ 63,00 │
│ Pontos ganhos                   +63 pts │ (ambar)
└─────────────────────────────────────────┘
```

### Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/catalog/components/OrderDetailModal.tsx` | Exibe descontos detalhados |

---

## 7. Rotas e Navegacao

### Novas Rotas (Admin)

| Rota | Componente | Descricao |
|------|------------|-----------|
| `/cupons` | CouponsPage | Gerenciar cupons |
| `/fidelidade` | LoyaltyPage | Configurar fidelidade |
| `/promocoes` | PromotionsPage | Gerenciar promocoes |

### Menu Lateral (Sidebar)

Novos itens adicionados:
- Cupons (LocalOfferIcon)
- Fidelidade (StarsIcon)
- Promocoes (CampaignIcon)

---

## 8. Banco de Dados

### Migrations Criadas

| Arquivo | Descricao |
|---------|-----------|
| `20260120000001_customer_auth.sql` | Campos de auth em customers |
| `20260120000002_coupons.sql` | Tabelas de cupons |
| `20260120000003_loyalty.sql` | Tabelas de fidelidade |
| `20260120000004_promotions.sql` | Tabelas de promocoes |
| `20260120000005_fix_rls_policies.sql` | Correcao de policies |
| `20260120000006_simple_rls_policies.sql` | Policies simplificadas |

### Tabelas Criadas

- `coupons` - Cupons de desconto
- `coupon_usages` - Historico de uso de cupons
- `loyalty_config` - Configuracao do programa
- `loyalty_levels` - Niveis de fidelidade
- `loyalty_points` - Historico de pontos
- `promotions` - Promocoes
- `promotion_usages` - Historico de uso de promocoes

### Campos Adicionados

**customers:**
- `birthday` - Data de aniversario
- `last_login_at` - Ultimo login
- `loyalty_points` - Saldo de pontos
- `loyalty_level_id` - Nivel atual
- `lifetime_points` - Total de pontos ganhos

**catalog_orders:**
- Campos de cupom, pontos e promocao (listados acima)

---

## 9. Tipos TypeScript

Novos tipos adicionados em `src/types/index.ts`:

```typescript
// Cupons
type CouponDiscountType = 'percentage' | 'fixed';
interface Coupon { ... }
interface CouponUsage { ... }
interface CouponValidation { ... }

// Fidelidade
interface LoyaltyConfig { ... }
interface LoyaltyLevel { ... }
interface LoyaltyPoint { ... }
interface CustomerLoyalty { ... }

// Promocoes
type PromotionType = 'birthday' | 'loyalty_level' | ...;
interface Promotion { ... }
interface PromotionUsage { ... }
interface ApplicablePromotion { ... }

// Extensoes
interface CustomerWithLoyalty extends Customer { ... }
interface CatalogOrderWithDiscounts extends CatalogOrder { ... }
```

---

## 10. Layout Responsivo do Catalogo

### Header - Desktop (>=640px)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Nome da Empresa     [Entrar]  [Carrinho (3)]        │
│         Catalogo de Produtos                                 │
└─────────────────────────────────────────────────────────────┘
```

- Botao "Entrar": Icone + texto
- Botao "Minha Conta" (logado): Icone + primeiro nome
- Botao "Carrinho": Icone + texto + badge inline

### Header - Mobile (<640px)

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Nome da Empresa                           [👤]      │
│         Catalogo de Produtos                                 │
└─────────────────────────────────────────────────────────────┘

                                          ┌─────────────────┐
                                          │  [🛒] 3         │  <- Flutuante
                                          └─────────────────┘
```

- Botao "Entrar": Apenas icone (com title para acessibilidade)
- Botao "Minha Conta" (logado): Apenas icone
- Botao "Carrinho": Flutuante no canto inferior direito (aparece quando tem itens)

### Arquivos Relacionados

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/catalog/CatalogPage.tsx` | Layout principal com header responsivo |

---

## 11. Fluxo de UX

```
┌─────────────────────────────────────────────────────────────┐
│  CATALOGO PUBLICO                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [Logo]  Buscar...        [Entrar] [Carrinho (3)]   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   [Entrar]                [Minha Conta]
        │                       │
        ▼                       ▼
┌─────────────────┐    ┌─────────────────────────┐
│ CustomerLogin   │    │ CustomerAccountDrawer   │
│ Modal           │    │ ├─ Meus Pedidos         │
│ ├─ Telefone     │    │ ├─ Meus Dados           │
│ ├─ CPF          │    │ ├─ Fidelidade           │
│ └─ [Entrar]     │    │ └─ Cupons               │
└─────────────────┘    └─────────────────────────┘
```

---

## 12. Checkout Condicional

O formulario de checkout se adapta ao estado de autenticacao do cliente.

### Cliente NAO Logado

Exibe todos os campos:
- Telefone/WhatsApp
- Nome
- Observacoes
- **Checkbox "Quero me cadastrar"** (exibe campos CPF e Email se marcado)
- Checkbox de consentimento WhatsApp (LGPD)

### Cliente Logado

Campos pre-preenchidos automaticamente:
- Telefone/WhatsApp (do cadastro)
- Nome (do cadastro)
- Email (do cadastro)
- CPF (do cadastro)
- Observacoes

**NAO exibe** a opcao "Quero me cadastrar" (ja esta cadastrado).

### Codigo Relacionado

```tsx
// src/modules/catalog/components/CheckoutModal.tsx

// Opcao de cadastro so aparece para nao logados
{!isAuthenticated && (
  <>
    <label>Quero me cadastrar...</label>
    {saveCustomerData && (
      <div>CPF e Email</div>
    )}
  </>
)}
```

---

## 13. Detalhes do Pedido (OrderDetailModal)

O modal de detalhes exibe todos os descontos aplicados no pedido.

### Estrutura de Exibicao

```
┌─────────────────────────────────────────┐
│ Pedido #ABC12345         15/01/2026     │
├─────────────────────────────────────────┤
│ ● Confirmado                            │
│   Pedido confirmado e em preparacao     │
├─────────────────────────────────────────┤
│ Itens do Pedido                         │
│ ┌─────────────────────────────────────┐ │
│ │ Produto A              R$ 50,00     │ │
│ │ 2x R$ 25,00                         │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Subtotal                    R$ 102,00   │
│ Cupom: PROMO10             -R$ 8,00     │ (verde)
│ Pontos: 100 pts            -R$ 3,00     │ (ambar)
│ Promocao                   -R$ 5,00     │ (roxo)
│ ─────────────────────────────────────── │
│ Total                       R$ 86,00    │
│ Pontos ganhos                +86 pts    │ (ambar)
└─────────────────────────────────────────┘
```

### Cores dos Descontos

| Tipo | Cor | Classe Tailwind |
|------|-----|-----------------|
| Cupom | Verde | `text-green-600` |
| Pontos | Ambar | `text-amber-600` |
| Promocao | Roxo | `text-purple-600` |

### Fallback para Pedidos Antigos

Pedidos criados antes da implementacao de cupons/pontos/promocoes nao tem os campos detalhados. O sistema calcula o desconto pela diferenca:

```typescript
// Se nao tem desconto detalhado, calcula pela diferenca
const totalDiscount = detailedDiscount > 0
  ? detailedDiscount
  : (order.discount || (order.subtotal - order.total));
```

E exibe como "Desconto" generico (verde).

### Campos de Desconto no Banco

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `discount` | DECIMAL | Total de desconto (legado) |
| `coupon_id` | UUID | Referencia ao cupom |
| `coupon_code` | TEXT | Codigo do cupom usado |
| `coupon_discount` | DECIMAL | Valor do desconto do cupom |
| `points_used` | INTEGER | Quantidade de pontos usados |
| `points_discount` | DECIMAL | Valor em R$ dos pontos |
| `points_earned` | INTEGER | Pontos ganhos no pedido |
| `promotion_id` | UUID | Referencia a promocao |
| `promotion_discount` | DECIMAL | Valor do desconto de promocao |

### Arquivos Relacionados

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/catalog/components/OrderDetailModal.tsx` | Modal de detalhes |
| `src/types/index.ts` | Interface CatalogOrder com campos de desconto |

---

## 14. Checklist de Testes

### Autenticacao
- [ ] Login com telefone + CPF validos
- [ ] Erro com credenciais invalidas
- [ ] Sessao persistida apos refresh
- [ ] Logout limpa sessao

### Cupons
- [ ] Criar cupom percentual
- [ ] Criar cupom valor fixo
- [ ] Validar cupom no checkout
- [ ] Respeitar pedido minimo
- [ ] Respeitar limite de uso
- [ ] Respeitar primeira compra only

### Fidelidade
- [ ] Configurar programa
- [ ] Criar niveis
- [ ] Ganhar pontos ao confirmar pedido
- [ ] Usar pontos no checkout
- [ ] Atualizar nivel automaticamente

### Promocoes
- [ ] Criar promocao de aniversario
- [ ] Criar promocao por nivel
- [ ] Criar promocao de categoria
- [ ] Validar aplicacao automatica

---

## 15. Consideracoes de Seguranca

1. **RLS Policies**: Todas as tabelas tem RLS habilitado
2. **Company Isolation**: Queries sempre filtram por `company_id`
3. **Sessao Local**: Dados sensiveis nao sao armazenados
4. **Validacao Server-side**: Cupons e pontos validados no backend

---

## 16. PWA do Catalogo (Progressive Web App)

O catalogo pode ser instalado como um app nativo no celular do cliente, com nome e logo da empresa.

### Dois PWAs Coexistentes

O sistema possui dois PWAs independentes:

| PWA | Publico | URL | ID |
|-----|---------|-----|-----|
| **Ejym** | Empresas/Funcionarios | `/` | `/` |
| **Catalogo** | Clientes | `/catalogo/{slug}` | `/catalogo/{slug}` |

O campo `id` no manifest eh o que diferencia os dois apps no browser.

### Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENTE ACESSA: /catalogo/loja-exemplo                     │
├─────────────────────────────────────────────────────────────┤
│  1. Hook useCatalogPWA carrega dados da empresa             │
│  2. REMOVE manifest estatico do PWA principal               │
│  3. Converte logo da empresa para Base64 (offline support)  │
│  4. Gera manifest.json dinamico (nome, logo, scope, id)     │
│  5. Injeta manifest no DOM via Blob URL                     │
│  6. Detecta beforeinstallprompt event                       │
│  7. Mostra banner de instalacao personalizado               │
└─────────────────────────────────────────────────────────────┘
```

### Manifest Dinamico

Cada empresa tem seu proprio manifest gerado em tempo real:

```json
{
  "name": "Loja Exemplo",
  "short_name": "Loja Exempl",
  "description": "Catalogo de produtos - Loja Exemplo",
  "start_url": "/catalogo/loja-exemplo",
  "scope": "/catalogo/loja-exemplo",
  "id": "/catalogo/loja-exemplo",
  "icons": [
    { "src": "data:image/png;base64,iVBORw0KGgo...", "sizes": "512x512" }
  ],
  "shortcuts": [
    { "name": "Ver Catalogo", "url": "/catalogo/loja-exemplo" }
  ]
}
```

**Nota:** A logo eh convertida para base64 (data URL) para funcionar offline!

### Conversao de Logo para Base64

Para garantir que a logo funcione mesmo offline, o sistema converte a imagem para base64:

```typescript
// src/hooks/useCatalogPWA.ts

// Converte imagem externa para data URL (base64)
async function imageToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('[CatalogPWA] Failed to convert image to base64:', error);
    return null;
  }
}
```

**Beneficios:**
- Logo fica embedada no manifest (nao depende de URL externa)
- Funciona offline apos instalacao
- Evita problemas de CORS
- Icone nunca fica branco por falha de rede

### Como Funciona a Substituicao do Manifest

```typescript
// src/hooks/useCatalogPWA.ts

async function injectManifest(company: Company): Promise<() => void> {
  // 1. Remove TODOS os manifests existentes (incluindo o estatico)
  const existingManifests = document.querySelectorAll('link[rel="manifest"]');
  existingManifests.forEach((manifest) => manifest.remove());

  // 2. Revoga URL antiga do mesmo catalogo (evita memory leak)
  const oldUrl = manifestUrls.get(company.slug);
  if (oldUrl) URL.revokeObjectURL(oldUrl);

  // 3. Gera manifest dinamico (async - aguarda conversao da logo)
  const manifestContent = await generateManifest(company);
  const blob = new Blob([manifestContent], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(blob);

  // 4. Armazena URL para cleanup posterior
  manifestUrls.set(company.slug, manifestUrl);

  // 5. Injeta novo manifest
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = manifestUrl;
  link.setAttribute('data-catalog', 'true');
  link.setAttribute('data-company', company.slug);
  document.head.appendChild(link);
}
```

### Gerenciamento de URLs do Manifest

O sistema usa um `Map` para gerenciar as Blob URLs:

```typescript
// URLs sao armazenadas por slug da empresa
const manifestUrls = new Map<string, string>();

// A URL so eh revogada quando:
// 1. Uma nova URL eh criada para a mesma empresa
// 2. O usuario navega para outro catalogo

// IMPORTANTE: A URL NAO eh revogada imediatamente no cleanup
// porque o browser precisa dela para o processo de instalacao
```

### Componentes

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useCatalogPWA.ts` | Hook que gerencia manifest e install prompt |
| `src/modules/catalog/components/CatalogInstallPrompt.tsx` | Banner de instalacao |
| `vite.config.ts` | Configuracao do PWA principal (Ejym) |

### Hook useCatalogPWA

```typescript
const {
  isInstallable,    // true se pode instalar
  isInstalled,      // true se ja esta instalado
  isIOS,            // true se eh iPhone/iPad
  installApp,       // funcao para instalar
  showIOSInstructions,
  setShowIOSInstructions,
} = useCatalogPWA({ company });
```

### Funcionalidades

1. **Manifest Dinamico**: Gera manifest com nome/logo da empresa
2. **Logo em Base64**: Converte logo para data URL (funciona offline)
3. **Substituicao de Manifest**: Remove o manifest estatico antes de injetar o dinamico
4. **ID Unico**: Cada catalogo tem seu proprio `id` para ser tratado como app separado
5. **Install Prompt**: Banner customizado para instalar
6. **iOS Support**: Instrucoes manuais para Safari
7. **Persistencia**: Lembra se usuario dismissou (7 dias)
8. **Deteccao**: Sabe se ja esta instalado
9. **Gerenciamento de URLs**: Evita memory leaks com Blob URLs

### Experiencia do Usuario

**Desktop (>=640px):**
- Botao "Instalar" aparece no header ao lado do carrinho

**Mobile:**
- Banner flutuante aparece na parte inferior da tela
- Instrucoes especiais para iOS (Safari)

### Resultado Final

Apos instalacao, o app aparece na tela inicial com:
- **Nome**: Nome da empresa
- **Icone**: Logo da empresa (embedada em base64)
- **Comportamento**: Abre em tela cheia, sem barra de navegacao

### Isolamento dos PWAs

O prompt de instalacao do sistema (Ejym) NAO aparece nas paginas do catalogo:

```typescript
// src/components/pwa/PWAInstallPrompt.tsx

const location = useLocation();
const isCatalogPage = location.pathname.startsWith('/catalogo/');

// Nao mostra no catalogo - ele tem seu proprio PWA
if (showPrompt && isInstallable && !isInstalled && !isCatalogPage) {
  // mostra prompt do Ejym
}
```

### Tratamento de Icones

O manifest inclui icones em base64 + fallback:

```typescript
// 1. Tenta converter logo da empresa para base64
if (company.logo_url) {
  const logoBase64 = await imageToBase64(company.logo_url);

  if (logoBase64) {
    // Logo em base64 - funciona offline!
    icons.push({ src: logoBase64, sizes: '192x192', purpose: 'any' });
    icons.push({ src: logoBase64, sizes: '512x512', purpose: 'any' });
    icons.push({ src: logoBase64, sizes: '512x512', purpose: 'maskable' });
  } else {
    // Fallback para URL externa se base64 falhar
    icons.push({ src: company.logo_url, sizes: '192x192' });
    icons.push({ src: company.logo_url, sizes: '512x512' });
  }
}

// 2. Fallback estatico (sempre incluido)
icons.push({ src: `${baseUrl}/pwa-192x192.png`, sizes: '192x192' });
icons.push({ src: `${baseUrl}/pwa-512x512.png`, sizes: '512x512' });
```

### Troubleshooting

**Problema: Aparece "Ejym" ao inves do nome da empresa**
1. Limpar cache do browser: DevTools > Application > Clear storage
2. Desinstalar PWA antigo se ja tinha instalado
3. Testar em aba anonima
4. Verificar console: `[CatalogPWA] Injected dynamic manifest for: Nome`

**Problema: Icone branco apos instalacao**
1. Verificar no console se aparece `[CatalogPWA] Logo converted to base64 successfully`
2. Se aparece `[CatalogPWA] Using external logo URL`, a conversao falhou (CORS)
3. Verificar se a logo esta no formato correto (PNG, JPG, WebP)
4. O sistema usa fallback automatico se a conversao falhar

**Problema: Prompt do sistema aparece no catalogo**
1. Verificar se `PWAInstallPrompt` tem a verificacao `isCatalogPage`
2. Limpar cache e testar novamente

**Problema: PWA trava ou fica lento**
1. Limpar cache completamente: DevTools > Application > Clear storage
2. Desinstalar PWA antigo
3. Reinstalar apos limpar cache

### Debug

Para verificar se o manifest dinamico esta sendo usado:

```javascript
// No console do browser
document.querySelector('link[rel="manifest"]').href
// Deve retornar um blob URL: blob:https://...

// Para ver o conteudo do manifest
fetch(document.querySelector('link[rel="manifest"]').href)
  .then(r => r.json())
  .then(console.log)

// Verificar se icones estao em base64
fetch(document.querySelector('link[rel="manifest"]').href)
  .then(r => r.json())
  .then(m => {
    m.icons.forEach((icon, i) => {
      const isBase64 = icon.src.startsWith('data:');
      console.log(`Icon ${i}: ${isBase64 ? 'BASE64' : 'URL'} (${icon.sizes})`);
    });
  })
```

### Logs do Console

O hook emite logs uteis para debug:

| Log | Significado |
|-----|-------------|
| `[CatalogPWA] Logo converted to base64 successfully` | Logo embedada com sucesso |
| `[CatalogPWA] Using external logo URL` | Conversao falhou, usando URL externa |
| `[CatalogPWA] Failed to convert image to base64` | Erro ao converter (CORS, 404, etc) |
| `[CatalogPWA] Injected dynamic manifest for: Nome` | Manifest injetado com sucesso |
| `[CatalogPWA] User accepted the install prompt` | Usuario instalou o PWA |
| `[CatalogPWA] User dismissed the install prompt` | Usuario recusou instalacao |

---

## 17. Proximos Passos (Sugestoes)

1. **Notificacoes Push**: Avisar sobre promocoes
2. **Email Marketing**: Integrar com campanhas
3. **Relatorios**: Dashboard de uso de cupons/pontos
4. **API de Pontos**: Permitir parceiros creditarem pontos
5. **Gamificacao**: Desafios e conquistas
