# Arquitetura do Sistema

Este documento descreve a arquitetura tecnica do Ejym SaaS.

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura Hibrida](#arquitetura-hibrida)
3. [Arquitetura Frontend](#arquitetura-frontend)
4. [Arquitetura Backend](#arquitetura-backend)
5. [Edge Functions](#edge-functions)
6. [Supabase Storage](#supabase-storage)
7. [Multi-Tenancy](#multi-tenancy)
8. [Fluxo de Autenticacao](#fluxo-de-autenticacao)
9. [Padroes de Codigo](#padroes-de-codigo)
10. [Seguranca](#seguranca)

---

## Visao Geral

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTE                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    React SPA                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │    │
│  │  │ Contexts │  │ Modules  │  │   Components     │   │    │
│  │  │ (Auth,   │  │ (Pages)  │  │   (UI Kit)       │   │    │
│  │  │ Tenant)  │  │          │  │                  │   │    │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
              │                               │
              │ Auth                          │ Data + Functions
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      Firebase Auth      │     │        Supabase         │
│  - Email/Password       │     │  - PostgreSQL           │
│  - Google OAuth         │     │  - RLS Policies         │
│  - Token Management     │     │  - Edge Functions       │
└─────────────────────────┘     └─────────────────────────┘
                                            │
                                            │ Email API
                                            ▼
                                ┌─────────────────────────┐
                                │       MailerSend        │
                                │  - Envio de emails      │
                                │  - Templates HTML       │
                                └─────────────────────────┘
```

---

## Arquitetura Hibrida

O sistema utiliza uma arquitetura hibrida combinando Firebase e Supabase:

### Por que Firebase Auth?

| Beneficio | Descricao |
|-----------|-----------|
| **Confiabilidade** | Infraestrutura Google, 99.95% SLA |
| **OAuth Simplificado** | Google, Facebook em minutos |
| **Sem Email Confirm** | Usuarios acessam imediatamente |
| **Escalabilidade** | Milhoes de usuarios |

### Por que manter Supabase?

| Beneficio | Descricao |
|-----------|-----------|
| **PostgreSQL** | Banco relacional robusto |
| **RLS** | Row Level Security para multi-tenancy |
| **Realtime** | Subscriptions em tempo real |
| **Storage** | Armazenamento de arquivos |

### Como funciona a integracao

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuario   │────▶│  Firebase   │────▶│  Supabase   │
│             │     │   Auth      │     │  profiles   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                   │
                     Firebase UID         Firebase UID
                     (string)             armazenado como
                          │               profiles.id (TEXT)
                          └───────────────────┘
```

1. Usuario faz login no Firebase (email ou Google)
2. Firebase retorna UID (string, nao UUID)
3. Sistema busca/cria profile no Supabase usando Firebase UID
4. Todas as queries usam Firebase UID para identificar usuario

---

## Arquitetura Frontend

### Estrutura de Pastas

```
src/
├── components/          # Componentes reutilizaveis
│   ├── ui/             # Componentes de UI primitivos
│   ├── layout/         # Componentes de layout
│   └── feedback/       # Loading, Empty states
├── modules/            # Modulos de features
│   ├── auth/          # Login, Registro, AcceptInvite
│   ├── admin/         # Area do Super Admin (Dashboard, Users)
│   ├── dashboard/     # Dashboard principal
│   ├── products/      # Produtos
│   ├── categories/    # Categorias
│   ├── customers/     # Clientes
│   ├── sales/         # Vendas
│   ├── catalog-orders/# Pedidos do catalogo
│   ├── catalog/       # Catalogo publico (CatalogPage, ProductPage)
│   ├── companies/     # Empresas (Super Admin)
│   ├── users/         # Usuarios
│   └── settings/      # Configuracoes (logo, senha, WhatsApp)
├── contexts/          # React Contexts globais
├── services/          # Servicos externos
│   ├── firebase.ts   # Cliente Firebase Auth
│   ├── supabase.ts   # Cliente Supabase
│   ├── storage.ts    # Upload de imagens (Supabase Storage)
│   └── email.ts      # Envio de emails (MailerSend)
├── routes/            # Sistema de rotas
├── types/             # TypeScript types
└── hooks/             # Custom hooks
```

### Responsividade Mobile-First

O sistema utiliza uma abordagem mobile-first para garantir boa experiencia em todos os dispositivos:

```
┌─────────────────────────────────────────────────────────────┐
│                      DESKTOP (md+)                            │
│  ┌─────────┐  ┌─────────────────────────────────────────┐   │
│  │ Sidebar │  │               Header                     │   │
│  │ (fixed) │  ├─────────────────────────────────────────┤   │
│  │         │  │               Content                    │   │
│  │         │  │   ┌───────────────────────────────────┐  │   │
│  │         │  │   │          Table View                │  │   │
│  │         │  │   └───────────────────────────────────┘  │   │
│  └─────────┘  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│        MOBILE (<md)          │
│  ┌─────────────────────────┐ │
│  │   Header (sticky)       │ │
│  │   [≡] Company    [User] │ │
│  ├─────────────────────────┤ │
│  │      Content            │ │
│  │  ┌───────────────────┐  │ │
│  │  │   Card View       │  │ │
│  │  │   (mobileCard)    │  │ │
│  │  └───────────────────┘  │ │
│  │  ┌───────────────────┐  │ │
│  │  │   Card View       │  │ │
│  │  └───────────────────┘  │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

#### Componentes Responsivos

| Componente | Desktop | Mobile |
|------------|---------|--------|
| **Sidebar** | Fixa na lateral, colapsavel | Drawer com overlay |
| **Header** | Normal (scroll com pagina) | Sticky no topo |
| **Table** | Tabela tradicional | Cards via `mobileCardRender` |
| **PageContainer** | Padding maior | Padding reduzido |
| **Modais** | Scroll horizontal se necessario | Cards empilhados |

#### Breakpoints (Tailwind)

| Classe | Largura | Uso |
|--------|---------|-----|
| `sm:` | 640px+ | Ajustes pequenos |
| `md:` | 768px+ | Desktop vs Mobile |
| `lg:` | 1024px+ | Telas grandes |

#### Deteccao de Mobile

```tsx
// Hook pattern usado nos layouts
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 768);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

### Gerenciamento de Estado

```
┌─────────────────────────────────────────┐
│              React Context               │
│  ┌─────────────────────────────────┐    │
│  │         AuthContext             │    │
│  │  - user (Firebase User)         │    │
│  │  - profile (Supabase profile)   │    │
│  │  - companies                    │    │
│  │  - isSuperAdmin                 │    │
│  │  - signIn, signInWithGoogle     │    │
│  │  - signUp, signOut              │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │        TenantContext            │    │
│  │  - currentCompany (from URL)    │    │
│  │  - userRole                     │    │
│  │  - isAdmin, isManager           │    │
│  │  - switchCompany (navigate)     │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │         ThemeContext            │    │
│  │  - theme (light/dark)           │    │
│  │  - toggleTheme                  │    │
│  └─────────────────────────────────┘    │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │         CartContext             │    │
│  │  - items (carrinho)             │    │
│  │  - addItem, removeItem          │    │
│  │  - updateQuantity, clearCart    │    │
│  │  - Persistencia localStorage    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

### Dashboard com Filtro de Periodo

O dashboard suporta filtragem dinamica de dados por periodo:

```
┌─────────────────────────────────────────┐
│           PeriodFilter                   │
│  - today: Hoje                          │
│  - yesterday: Ontem                     │
│  - last7days: Ultimos 7 dias            │
│  - last30days: Ultimos 30 dias (padrao) │
│  - thisMonth: Este mes                  │
│  - lastMonth: Mes passado               │
│  - all: Todo periodo                    │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│         Dados Filtrados                  │
│  - Total de Vendas                      │
│  - Faturamento                          │
│  - Pedidos do Catalogo (por status)     │
│  - Grafico de Vendas                    │
│  - Top Produtos                         │
└─────────────────────────────────────────┘
```

**Nota:** Clientes e Produtos exibem contagens totais (nao sao afetados pelo filtro de periodo).

---

## Arquitetura Backend

### Modelo de Dados

```
┌─────────────────┐
│    Firebase     │ (Auth only)
│    Auth Users   │
└────────┬────────┘
         │ Firebase UID (string)
         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────┐
│    profiles     │──────│ company_members │──────│  companies  │
│  id: TEXT (UID) │ 1:N  │  user_id: TEXT  │ N:1  │  id: UUID   │
└─────────────────┘      └─────────────────┘      └─────────────┘
                                                         │
           ┌────────────────┬────────────────┬───────────┴───────┐
           │                │                │                   │
           ▼                ▼                ▼                   ▼
     ┌──────────┐    ┌───────────┐    ┌──────────┐        ┌─────────┐
     │ customers│    │ categories│    │ products │        │  sales  │
     │company_id│    │company_id │    │company_id│        │company_id│
     └──────────┘    └───────────┘    └────┬─────┘        └────┬────┘
                                           │                   │
                                           └───────┬───────────┘
                                                   ▼
                                            ┌────────────┐
                                            │ sale_items │
                                            └────────────┘
```

### Tabelas Principais

| Tabela | Descricao | Chave Primaria |
|--------|-----------|----------------|
| `profiles` | Perfis de usuario | `id` (TEXT - Firebase UID) |
| `companies` | Empresas (tenants) | `id` (UUID) |
| `company_members` | Relacao usuario-empresa | `user_id` (TEXT) |
| `invites` | Sistema de convites | `id` (UUID) |
| `customers` | Clientes por empresa | `id` (UUID) |
| `categories` | Categorias de produtos | `id` (UUID) |
| `products` | Produtos por empresa | `id` (UUID) |
| `sales` | Vendas | `id` (UUID) |
| `sale_items` | Itens de cada venda | `id` (UUID) |
| `catalog_orders` | Pedidos do catalogo publico | `id` (UUID) |
| `catalog_order_items` | Itens de pedidos do catalogo | `id` (UUID) |

### Diferenca de UUID vs TEXT

```sql
-- Supabase Auth (antigo) usava UUID
profiles.id = auth.uid()  -- UUID

-- Firebase Auth (atual) usa string
profiles.id = 'abc123XYZ...'  -- TEXT (Firebase UID)
```

---

## Edge Functions

O sistema utiliza Supabase Edge Functions para operacoes server-side que nao podem ser feitas diretamente do frontend.

### Funcoes Disponiveis

| Funcao | Descricao | Trigger |
|--------|-----------|---------|
| `send-invite-email` | Envia email de convite via MailerSend | Chamada pelo frontend |

### send-invite-email

Envia emails de convite para novos administradores de empresas.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Frontend  │────▶│  Edge Function  │────▶│  MailerSend │
│  (React)    │     │ send-invite-email│    │    API      │
└─────────────┘     └─────────────────┘     └─────────────┘
      │                     │                      │
      │ supabase.functions  │ fetch()              │
      │ .invoke()           │ Bearer Token         │
      └─────────────────────┴──────────────────────┘
```

**Request:**
```json
{
  "email": "admin@empresa.com",
  "companyName": "Minha Empresa",
  "inviteLink": "https://app.ejym.com/aceitar-convite?token=xxx",
  "invitedByName": "Everton" // opcional
}
```

**Response:**
```json
{
  "success": true
}
```

### Secrets Configurados

| Secret | Descricao |
|--------|-----------|
| `MAILERSEND_API_TOKEN` | Token da API MailerSend |
| `MAILERSEND_FROM_EMAIL` | Email remetente verificado |
| `MAILERSEND_FROM_NAME` | Nome do remetente |

### Comandos Uteis

```bash
# Deploy de funcao
npx supabase functions deploy send-invite-email

# Configurar secrets
npx supabase secrets set MAILERSEND_API_TOKEN=xxx

# Ver logs
npx supabase functions logs send-invite-email
```

---

## Supabase Storage

O sistema utiliza Supabase Storage para armazenamento de arquivos.

### Buckets

| Bucket | Acesso | Descricao |
|--------|--------|-----------|
| `products` | Publico | Imagens de produtos |
| `companies` | Publico | Logos das empresas |

### Estrutura de Arquivos

```
products/
  {company_id}/
    {uuid}.jpg
    {uuid}.png

companies/
  {company_id}/
    logo-{uuid}.jpg
```

### Servico storage.ts

```typescript
// Upload de imagem de produto
uploadProductImage(file: File, companyId: string): Promise<UploadResult>

// Upload de logo da empresa
uploadCompanyLogo(file: File, companyId: string): Promise<UploadResult>

// Deletar imagem
deleteProductImage(imageUrl: string): Promise<void>
deleteCompanyLogo(imageUrl: string): Promise<void>
```

### Validacoes

- Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`
- Tamanho maximo: 5MB
- Nome unico gerado com UUID

---

## Multi-Tenancy

### Estrategia: Banco Compartilhado + RLS

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │                    products                         │ │
│  │  company_id=1      │  company_id=2                 │ │
│  │  ───────────────   │  ───────────────              │ │
│  │  Produto A1        │  Produto B1                   │ │
│  │  Produto A2        │  Produto B2                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  RLS Policy: USING (true) -- Simplificado para dev     │
└─────────────────────────────────────────────────────────┘
```

### Rotas baseadas em Slug

```
/app/:slug/*

/app/minha-loja/produtos    → Produtos da empresa "minha-loja"
/app/outra-empresa/vendas   → Vendas da empresa "outra-empresa"
```

### Papeis e Permissoes

```
┌─────────────────────────────────────────────────────────┐
│                    SUPER ADMIN                           │
│  - Email: evertonmarques.jm@gmail.com                   │
│  - Acesso a /admin/*                                    │
│  - Criar/gerenciar empresas                             │
│  - Enviar convites                                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       ADMIN                              │
│  - Acesso total a empresa                               │
│  - Gerenciar usuarios                                   │
│  - Gerenciar produtos, clientes, vendas                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      MANAGER                             │
│  - Gerenciar produtos e clientes                        │
│  - Registrar vendas                                     │
│  - Nao pode gerenciar usuarios                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       SELLER                             │
│  - Visualizar produtos e clientes                       │
│  - Registrar vendas                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo de Autenticacao

### Login com Email/Senha

```
┌────────┐     ┌────────────┐     ┌──────────┐     ┌──────────┐
│ Usuario│────>│ LoginPage  │────>│ Firebase │────>│ Supabase │
└────────┘     └────────────┘     │   Auth   │     │ profiles │
                    │             └──────────┘     └──────────┘
                    │                   │               │
                    │         Firebase User             │
                    │<──────────────────┘               │
                    │                                   │
                    │      syncUserWithSupabase()       │
                    │──────────────────────────────────>│
                    │                                   │
                    │         Profile + Companies       │
                    │<──────────────────────────────────│
                    ▼
              ┌──────────────┐
              │ AuthContext  │
              │  - user      │
              │  - profile   │
              │  - companies │
              └──────────────┘
```

### Login com Google

```
1. Usuario clica "Entrar com Google"
2. signInWithPopup() abre janela do Google
3. Usuario seleciona conta
4. Firebase retorna credenciais
5. Se profile nao existe no Supabase, cria automaticamente
6. Usuario logado e redirecionado
```

### Sistema de Convites

```
┌───────────┐     ┌──────────┐     ┌──────────┐
│Super Admin│────>│  Criar   │────>│  invites │
└───────────┘     │  Convite │     │  (table) │
                  └──────────┘     └──────────┘
                       │                 │
                       │  Link copiado   │
                       │<────────────────┘
                       │
                       ▼ (email manual)
                  ┌──────────┐
                  │ Convidado│
                  └──────────┘
                       │
                       ▼
                  ┌──────────────┐
                  │AcceptInvite  │
                  │   Page       │
                  └──────────────┘
                       │
                       │ 1. firebaseSignUp()
                       │ 2. Create profile
                       │ 3. Add to company_members
                       │ 4. Mark invite accepted
                       │ 5. refreshProfile()
                       ▼
                  ┌──────────┐
                  │ Logado!  │
                  └──────────┘
```

---

## Padroes de Codigo

### Nomenclatura

| Tipo | Padrao | Exemplo |
|------|--------|---------|
| Componentes | PascalCase | `ProductsPage`, `Button` |
| Hooks | camelCase com `use` | `useAuth`, `useTenant` |
| Contexts | PascalCase com `Context` | `AuthContext` |
| Funcoes | camelCase | `fetchProducts`, `handleSubmit` |
| Constantes | UPPER_SNAKE_CASE | `API_URL`, `STORAGE_KEY` |

### Estrutura de Pagina

```tsx
export function ExamplePage() {
  // 1. Hooks
  const { user, profile } = useAuth();
  const { currentCompany } = useTenant();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Effects
  useEffect(() => {
    fetchData();
  }, []);

  // 3. Handlers
  const fetchData = async () => { ... };
  const handleSubmit = async () => { ... };

  // 4. Render helpers
  const renderTable = () => { ... };

  // 5. Return
  return (
    <PageContainer title="Example">
      {renderTable()}
    </PageContainer>
  );
}
```

---

## Fluxo de Pedidos do Catalogo

### Carrinho (Frontend)

O carrinho utiliza localStorage para persistencia client-side:

```
┌─────────────────────────────────────────┐
│              CartContext                 │
│  - Key: ejym_cart_{slug}                │
│  - items: CartItem[]                    │
│  - Sincronizado com localStorage        │
└─────────────────────────────────────────┘
```

### Checkout e Criacao de Pedido

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  CartDrawer │────▶│CheckoutModal│────▶│ catalog_orders  │
│             │     │   (form)    │     │ catalog_order_  │
│             │     │             │     │ items           │
└─────────────┘     └─────────────┘     └─────────────────┘
                          │
                          │ WhatsApp (wa.me)
                          ▼
                    ┌─────────────┐
                    │  WhatsApp   │
                    │  Notificacao│
                    └─────────────┘
```

### Gestao de Pedidos (Empresa)

```
┌────────────────────────────────────────────────────────────┐
│                   CatalogOrdersPage                         │
│                                                             │
│  pending ──▶ confirmed ──▶ completed ──▶ [Venda criada]    │
│     │                          │                            │
│     └─── cancelled             │                            │
│                                │                            │
│                    convertOrderToSale()                     │
│                    ┌───────────┴───────────┐                │
│                    │  1. Criar venda       │                │
│                    │  2. Criar sale_items  │                │
│                    │  3. Baixar estoque    │                │
│                    └───────────────────────┘                │
└────────────────────────────────────────────────────────────┘
```

### Conversao Pedido → Venda

Quando um pedido e marcado como "completed" (entregue):

1. **Cria venda**: Insere na tabela `sales` com `payment_method = 'Catalogo Online'`
2. **Cria itens**: Insere cada item na tabela `sale_items`
3. **Atualiza estoque**: Decrementa `products.stock` para cada item
4. **Atualiza status**: Muda `catalog_orders.status` para `completed`

### Pagina Individual de Produto

```
/catalogo/:slug/produto/:productId
         │                │
         │                └──▶ ProductPage.tsx
         │                         │
         │                         ├── Detalhes do produto
         │                         ├── Adicionar ao carrinho
         │                         └── Link "Ver Catalogo"
         │
         └──▶ Usado em company_members RLS
```

---

## PWA (Progressive Web App)

O sistema implementa PWA para permitir instalacao e uso offline.

### Arquitetura PWA

```
┌─────────────────────────────────────────────────────────────┐
│                      NAVEGADOR                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    React App                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │usePWAInstall │  │PWAInstall    │  │ App.tsx      │   │ │
│  │  │   (hook)     │  │Prompt        │  │              │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                            │                                   │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  Service Worker                          │ │
│  │  - Cache de assets (JS, CSS, HTML, imagens)             │ │
│  │  - Cache de fontes Google                               │ │
│  │  - Estrategia CacheFirst para fontes                    │ │
│  │  - Auto-update em novas versoes                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Instalacao

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│beforeinstall│────▶│  Verifica   │────▶│   Mostra    │
│prompt event │     │  1h passou? │     │   Prompt    │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          │ Nao                │
                          ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Aguarda   │     │  Usuario    │
                    │  proximo    │     │  escolhe    │
                    │  intervalo  │     └─────────────┘
                    └─────────────┘            │
                                              ▼
                          ┌───────────────────┴───────────────────┐
                          │                                       │
                    ┌─────────────┐                        ┌─────────────┐
                    │  Instalar   │                        │  Dispensar  │
                    │             │                        │             │
                    └─────────────┘                        └─────────────┘
                          │                                       │
                          ▼                                       ▼
                    ┌─────────────┐                        ┌─────────────┐
                    │   Marca     │                        │ Incrementa  │
                    │ installed   │                        │dismiss count│
                    └─────────────┘                        └─────────────┘
```

### Hook usePWAInstall

```tsx
const {
  isInstallable,  // Se o navegador permite instalacao
  isInstalled,    // Se ja esta instalado
  showPrompt,     // Se deve mostrar o prompt
  installApp,     // Funcao para instalar
  dismissPrompt,  // Funcao para dispensar
  canShowPrompt   // Se pode mostrar (installable && !installed)
} = usePWAInstall();
```

### Configuracao (vite.config.ts)

| Opcao | Valor | Descricao |
|-------|-------|-----------|
| `registerType` | autoUpdate | Atualiza SW automaticamente |
| `display` | standalone | App sem barra do navegador |
| `theme_color` | #6366f1 | Cor primaria (indigo) |
| `background_color` | #111827 | Cor de fundo (gray-900) |

### Armazenamento Local

| Key | Descricao |
|-----|-----------|
| `ejym_pwa_last_prompt` | Timestamp do ultimo prompt |
| `ejym_pwa_installed` | Flag se foi instalado |
| `ejym_pwa_dismissed_count` | Contador de recusas (max 5) |

---

## Seguranca

### Camadas de Protecao

```
┌─────────────────────────────────────────┐
│            1. FRONTEND                   │
│  - Protected Routes                      │
│  - Context-based permissions             │
│  - Role validation                       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            2. FIREBASE AUTH              │
│  - Email/Password authentication         │
│  - Google OAuth 2.0                      │
│  - JWT token management                  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            3. SUPABASE RLS               │
│  - Row-level filtering                   │
│  - Company isolation                     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            4. DATABASE                   │
│  - Constraints                           │
│  - Foreign keys                          │
│  - Check constraints                     │
└─────────────────────────────────────────┘
```

### Tokens

| Token | Origem | Uso |
|-------|--------|-----|
| Firebase JWT | Firebase Auth | Identificar usuario |
| Supabase Anon Key | Supabase | Acessar banco com RLS |

### Boas Praticas

1. **Nunca confiar apenas no frontend** - RLS valida no backend
2. **Validar permissoes em multiplas camadas**
3. **Firebase UID e imutavel** - nao pode ser alterado
4. **Logs de auditoria** - registrar acoes importantes (futuro)

---

## Decisoes Arquiteturais

### Por que Firebase Auth + Supabase?

| Criterio | Firebase Auth | Supabase Auth |
|----------|---------------|---------------|
| Confiabilidade | Muito alta | Media (bugs no signup) |
| OAuth | Simples | Complexo |
| Email confirm | Opcional | Obrigatorio por padrao |
| Escalabilidade | Milhoes | Limitado |

### Por que React + Vite?

- **React**: Ecossistema maduro, grande comunidade
- **Vite**: Build rapido, HMR instantaneo, configuracao simples
- **TypeScript**: Type safety, melhor DX, menos bugs

### Por que Tailwind CSS?

- Utility-first: rapido para prototipar
- Tema customizavel
- Dark mode nativo
- Bundle size otimizado

---

Veja tambem: [Guia de Instalacao](SETUP.md) | [Firebase Auth](FIREBASE_AUTH.md) | [Roadmap](ROADMAP.md)
