# Arquitetura do Sistema

Este documento descreve a arquitetura tecnica do Ejym SaaS.

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura Hibrida](#arquitetura-hibrida)
3. [Arquitetura Frontend](#arquitetura-frontend)
4. [Arquitetura Backend](#arquitetura-backend)
5. [Edge Functions](#edge-functions)
6. [Supabase Storage](#supabase-storage)
7. [Scanner de Codigo de Barras](#scanner-de-codigo-de-barras)
8. [Supabase Realtime](#supabase-realtime)
9. [Sistema de Notificacoes](#sistema-de-notificacoes)
10. [Integracao WhatsApp (WuzAPI)](#integracao-whatsapp-wuzapi)
11. [Validacao de Telefone/WhatsApp](#validacao-de-telefonewhatsapp)
12. [Persistencia de Estado da UI](#persistencia-de-estado-da-ui)
13. [Multi-Tenancy](#multi-tenancy)
14. [Fluxo de Autenticacao](#fluxo-de-autenticacao)
15. [Fluxo de Pedidos do Catalogo](#fluxo-de-pedidos-do-catalogo)
16. [PWA](#pwa-progressive-web-app)
17. [Padroes de Codigo](#padroes-de-codigo)
18. [Seguranca](#seguranca)

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
| **Realtime** | Subscriptions em tempo real (produtos, vendas, pedidos) |
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
│   ├── admin/         # Area do Super Admin (Dashboard, Users, WhatsApp)
│   ├── dashboard/     # Dashboard principal
│   ├── products/      # Produtos
│   ├── categories/    # Categorias
│   ├── customers/     # Clientes
│   ├── sales/         # Vendas
│   ├── catalog-orders/# Pedidos do catalogo
│   ├── catalog/       # Catalogo publico (CatalogPage, ProductPage)
│   ├── companies/     # Empresas (Super Admin)
│   ├── users/         # Usuarios
│   └── settings/      # Configuracoes (logo, senha, WhatsApp, providers auth)
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

| Componente | Desktop (1024px+) | Tablet/Mobile (<1024px) |
|------------|-------------------|-------------------------|
| **Sidebar** | Fixa na lateral, colapsavel | Drawer com overlay |
| **Header** | Fixo no topo, arredondado | Sticky no topo |
| **Main Area** | Container arredondado com scroll | Container arredondado com scroll |
| **Table** | Tabela tradicional | Cards paginados via `mobileCardRender` |
| **PageContainer** | Toolbar sticky + conteudo scroll | Toolbar sticky + conteudo scroll |
| **Modais** | Centrado na tela | Fullscreen ou bottom sheet |

#### Componente Table Responsivo

O componente `Table` automaticamente troca de tabela para cards em telas menores:

```tsx
<Table
  columns={columns}
  data={products}
  keyExtractor={(p) => p.id}
  mobileCardRender={(p) => <ProductCard product={p} />}
  cardBreakpoint={1024}  // Mostrar cards em < 1024px (default)
  pageSize={10}          // Itens por pagina (default: 10)
  disablePagination={false}
/>
```

**Breakpoints:**
- `>= 1024px`: Tabela tradicional (sem paginacao)
- `< 1024px`: Cards com paginacao automatica

**Props do Table:**

| Prop | Tipo | Default | Descricao |
|------|------|---------|-----------|
| `mobileCardRender` | `(item) => ReactNode` | - | Render function para cards |
| `cardBreakpoint` | `number` | `1024` | Breakpoint em pixels para cards |
| `pageSize` | `number` | `10` | Itens por pagina nos cards |
| `disablePagination` | `boolean` | `false` | Desabilita paginacao |

**Paginacao:**
- Exibe "1-10 de 50" para indicar posicao
- Navegacao com setas < e >
- Mostra "Pagina 1 / 5"
- Reset automatico ao filtrar/buscar
- Renderiza apenas itens da pagina atual (performance)

#### Layout com Areas Arredondadas

O sistema utiliza containers arredondados com scroll interno para uma experiencia visual moderna:

```
┌─────────────────────────────────────────────────────────────────┐
│  DESKTOP                                                          │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │   Sidebar    │  │              Header                      │  │
│  │  (rounded)   │  │             (rounded)                    │  │
│  │              │  ├──────────────────────────────────────────┤  │
│  │              │  │              Main Area                   │  │
│  │              │  │             (rounded)                    │  │
│  │              │  │  ┌─────────────────────────────────────┐ │  │
│  │              │  │  │ Toolbar (sticky) - filtros/busca   │ │  │
│  │              │  │  ├─────────────────────────────────────┤ │  │
│  │              │  │  │ Content (scroll)                    │ │  │
│  │              │  │  │ - Titulo rola com conteudo          │ │  │
│  │              │  │  │ - Tabelas/Cards                     │ │  │
│  │              │  │  └─────────────────────────────────────┘ │  │
│  │              │  └──────────────────────────────────────────┘  │
│  └──────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### PageContainer com Toolbar

O componente `PageContainer` suporta uma prop `toolbar` para filtros sticky:

```tsx
<PageContainer
  title="Produtos"
  subtitle="150 produtos"
  action={<Button>Novo</Button>}
  toolbar={
    <Card>
      <Input placeholder="Buscar..." />
      <Select options={categories} />
    </Card>
  }
>
  <Table data={products} />
</PageContainer>
```

- **title/subtitle**: Rolam junto com o conteudo
- **action**: Botoes de acao (fixos junto ao titulo)
- **toolbar**: Filtros/busca que ficam sticky no topo durante scroll
- **children**: Conteudo principal com scroll

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
| `wuzapi-admin` | Operacoes do WuzAPI (criar/listar/deletar instancias) | Chamada pelo frontend |

### wuzapi-admin

Edge Function que gerencia operacoes do WuzAPI, validando autenticacao Firebase e permissoes baseadas no tipo de acao.

**Arquitetura de Seguranca:**

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Frontend  │────>│  Edge Function  │────>│    WuzAPI       │────>│  WhatsApp   │
│  (React)    │     │  wuzapi-admin   │     │    (Go)         │     │  Sessions   │
└─────────────┘     └─────────────────┘     └─────────────────┘     └─────────────┘
      │                     │
      │ Firebase ID Token   │ 1. Decodifica JWT Firebase
      │ (Bearer)            │ 2. Valida claims (iss, aud, exp)
      │                     │ 3. Verifica permissao (varia por acao)
      │                     │ 4. Usa WUZAPI_ADMIN_TOKEN (secret)
      └─────────────────────┘
```

**Acoes Suportadas e Permissoes:**

| Acao | Descricao | Permissao |
|------|-----------|-----------|
| `create-user` | Cria instancia WuzAPI para empresa | Membro da empresa OU Super Admin |
| `list-users` | Lista todas as instancias WuzAPI | Apenas Super Admin |
| `get-user-status` | Status detalhado de uma instancia | Qualquer usuario autenticado |
| `delete-user` | Remove instancia do WuzAPI | Apenas Super Admin |

**Verificacao de Membership (create-user):**
- Se o usuario NAO e super admin, verifica se e membro da empresa
- Query: `company_members` JOIN `companies` WHERE `user_id` = UID AND `companies.slug` = companySlug
- Permite que qualquer membro configure WhatsApp de sua propria empresa

**Request:**
```json
{
  "action": "list-users"
}
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "e635a4b39d...",
      "name": "ejym-loja-maria",
      "token": "abc123..."
    }
  ]
}
```

**Seguranca:**
- Token admin WuzAPI NUNCA exposto no frontend
- Validacao de Firebase ID Token sem dependencia do SDK Firebase Admin
- Permissoes diferenciadas por acao:
  - `create-user`: Membro da empresa OU Super Admin
  - `list-users` / `delete-user`: Apenas Super Admin
  - `get-user-status`: Qualquer usuario autenticado
- Deploy com `--no-verify-jwt` para aceitar tokens Firebase

**Comandos de Deploy:**
```bash
# Deploy da funcao
npx supabase functions deploy wuzapi-admin --project-ref jyjkeqnmofzjnzpvkugl --no-verify-jwt

# Configurar secret do token admin
npx supabase secrets set WUZAPI_ADMIN_TOKEN=seu_token_secreto
```

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

| Secret | Funcao | Descricao |
|--------|--------|-----------|
| `MAILERSEND_API_TOKEN` | send-invite-email | Token da API MailerSend |
| `MAILERSEND_FROM_EMAIL` | send-invite-email | Email remetente verificado |
| `MAILERSEND_FROM_NAME` | send-invite-email | Nome do remetente |
| `WUZAPI_ADMIN_TOKEN` | wuzapi-admin | Token admin para API WuzAPI |
| `WUZAPI_URL` | wuzapi-admin | URL do servidor WuzAPI |
| `SUPABASE_URL` | wuzapi-admin | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | wuzapi-admin | Service role key para queries admin |

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
// Upload de imagem de produto (individual)
uploadProductImage(file: File, companyId: string): Promise<UploadResult>

// Upload de multiplas imagens de produto (lote)
uploadProductImages(files: File[], companyId: string): Promise<UploadResult[]>

// Upload de logo da empresa
uploadCompanyLogo(file: File, companyId: string): Promise<UploadResult>

// Deletar imagem (individual)
deleteProductImage(imageUrl: string): Promise<void>

// Deletar multiplas imagens (lote)
deleteProductImages(imageUrls: string[]): Promise<void>

// Deletar logo
deleteCompanyLogo(imageUrl: string): Promise<void>
```

### Multiplas Imagens por Produto

O sistema suporta ate 4 imagens por produto, armazenadas em coluna JSONB:

```typescript
interface ProductImage {
  url: string;        // URL publica da imagem
  order: number;      // Ordem (0-3) para exibicao
  isPrimary: boolean; // Imagem principal (thumbnail)
}
```

**Estrutura no banco:**
```sql
products.images JSONB DEFAULT '[]'::jsonb
-- Ex: [{"url": "https://...", "order": 0, "isPrimary": true}, ...]
```

**Compatibilidade:** O campo `image_url` e mantido para retrocompatibilidade, sincronizado com a imagem principal.

### Componentes de Imagem

| Componente | Uso |
|------------|-----|
| `ImageCarousel` | Carrossel com swipe (mobile) e setas (desktop) |
| `ImageLightbox` | Visualizacao fullscreen com navegacao |
| `MultiImageUpload` | Upload com drag & drop para reordenar |

---

## Scanner de Codigo de Barras

O sistema suporta leitura de codigos de barras via camera do dispositivo.

### Componente BarcodeScanner

```typescript
import { BarcodeScanner } from '../components/ui';

<BarcodeScanner
  isOpen={showScanner}
  onClose={() => setShowScanner(false)}
  onScan={(code) => console.log('Codigo:', code)}
  title="Escanear Produto"
/>
```

### Formatos Suportados

| Formato | Descricao |
|---------|-----------|
| EAN-13 | Codigo de barras padrao brasileiro |
| EAN-8 | Versao curta do EAN |
| UPC-A | Codigo americano |
| UPC-E | Versao curta do UPC |
| Code 128 | Codigo alfanumerico |
| Code 39 | Codigo industrial |
| QR Code | Codigo bidimensional |

### Tipos de Leitores

| Tipo | Suporte | Observacao |
|------|---------|------------|
| Camera do dispositivo | Implementado | Usa biblioteca @zxing/library |
| Leitor USB | Automatico | Funciona como teclado |
| Leitor Bluetooth | Automatico | Funciona como teclado |

### Uso no Sistema

**Cadastro de Produtos (ProductsPage)**
- Botao de scanner ao lado do campo EAN
- Preenche automaticamente o codigo escaneado

**Nova Venda (SalesPage)**
- Botao de scanner ao lado da busca de produtos
- Busca produto pelo EAN e adiciona ao carrinho
- Exibe erro se produto nao encontrado

### Arquitetura do Scanner

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Camera do     │────▶│   @zxing/       │────▶│   Callback      │
│   Dispositivo   │     │   library       │     │   onScan()      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ getUserMedia()        │ decode()              │ Codigo lido
        │                       │                       │
        └───────────────────────┴───────────────────────┘
```

### Validacoes

- Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`
- Tamanho maximo: 5MB
- Nome unico gerado com UUID
- Maximo de 4 imagens por produto

---

## Supabase Realtime

O sistema utiliza Supabase Realtime para atualizacoes em tempo real.

### Tabelas com Realtime Habilitado

| Tabela | Uso |
|--------|-----|
| `products` | Atualizacoes de inventario e catalogo |
| `sales` | Rastreamento de vendas em tempo real |
| `sale_items` | Detalhes das vendas |
| `catalog_orders` | Notificacoes de novos pedidos |
| `catalog_order_items` | Detalhes dos pedidos |
| `categories` | Atualizacoes do catalogo |
| `customers` | Sincronizacao de clientes |

### Hook useRealtimeSubscription

```typescript
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

// Escutar novos pedidos
useRealtimeSubscription<CatalogOrder>({
  table: 'catalog_orders',
  filter: `company_id=eq.${companyId}`,
  event: 'INSERT',
  onInsert: (order) => {
    toast.success(`Novo pedido de ${order.customer_name}!`);
    refetchOrders();
  },
});

// Atualizar lista automaticamente
useRealtimeSubscription<Product>({
  table: 'products',
  filter: `company_id=eq.${companyId}`,
  onInsert: (p) => setProducts(prev => [...prev, p]),
  onUpdate: ({ new: p }) => setProducts(prev =>
    prev.map(x => x.id === p.id ? p : x)
  ),
  onDelete: (p) => setProducts(prev =>
    prev.filter(x => x.id !== p.id)
  ),
});
```

### Hook useRealtimeRefresh (Simplificado)

```typescript
import { useRealtimeRefresh } from '../hooks/useRealtimeSubscription';

// Recarregar dados quando houver qualquer mudanca
useRealtimeRefresh({
  table: 'sales',
  filter: `company_id=eq.${companyId}`,
  onRefresh: fetchSales,
});
```

### Arquitetura Realtime

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  PostgreSQL     │────▶│   Supabase      │────▶│    Frontend     │
│  (INSERT/UPDATE/│     │   Realtime      │     │  (WebSocket)    │
│   DELETE)       │     │   Server        │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ Trigger               │ Publication           │ useRealtime
        │                       │ supabase_realtime     │ Subscription
        └───────────────────────┴───────────────────────┘
```

---

## Sistema de Notificacoes

O sistema possui notificacoes em tempo real para novos pedidos do catalogo.

### NotificationContext

```typescript
import { useNotifications } from '../contexts/NotificationContext';

const {
  pendingOrdersCount,  // Quantidade de pedidos pendentes
  hasNewOrders,        // Se ha pedidos nao vistos
  refreshPendingCount, // Atualizar contagem manualmente
  markOrdersAsSeen,    // Marcar como vistos
} = useNotifications();
```

### Arquitetura de Notificacoes

```
┌─────────────────────────────────────────────────────────────────┐
│                    Novo Pedido no Catalogo                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Realtime                              │
│              (INSERT em catalog_orders)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NotificationContext                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Atualiza pendingOrdersCount                            │  │
│  │  2. Define hasNewOrders = true                             │  │
│  │  3. Toca som de notificacao (Web Audio API)               │  │
│  │  4. Exibe toast customizado com dados do pedido           │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    Sidebar Badge        │     │    Toast Notification   │
│  (contador vermelho)    │     │  (nome + valor pedido)  │
│  (pulsa se novo)        │     │                         │
└─────────────────────────┘     └─────────────────────────┘
```

### Funcionalidades

| Funcionalidade | Descricao |
|----------------|-----------|
| **Toast Visual** | Exibe nome do cliente e valor do pedido |
| **Som de Notificacao** | Dois beeps usando Web Audio API |
| **Badge na Sidebar** | Contador vermelho no item "Pedidos" |
| **Animacao Pulse** | Badge pulsa quando ha novos pedidos |
| **Auto-dismiss** | Badge para de pulsar ao visitar pagina de pedidos |

### Som de Notificacao

O sistema usa Web Audio API para tocar um som de notificacao sem necessidade de arquivos externos:

```typescript
const playNotificationSound = () => {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  // Dois beeps: La5 (880Hz) seguido de Do#6 (1108Hz)
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  // ...
};
```

### Pagina de Pedidos com Filtros

A pagina de pedidos (`CatalogOrdersPage`) possui filtros por status:

```
┌─────────────────────────────────────────────────────────────────┐
│  Filtros de Status                                                │
│  ┌──────────┐ ┌────────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │  Todos   │ │  Pendentes (3) │ │ Confirmados │ │ Entregues │  │
│  │  (15)    │ │   [amarelo]    │ │   (5)       │ │   (7)     │  │
│  └──────────┘ └────────────────┘ └─────────────┘ └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Status disponiveis:**

| Status | Cor | Descricao |
|--------|-----|-----------|
| `pending` | Amarelo | Pedido aguardando confirmacao |
| `confirmed` | Azul | Pedido confirmado, em preparacao |
| `completed` | Verde | Pedido entregue (convertido em venda) |
| `cancelled` | Vermelho | Pedido cancelado |

**Funcionalidades:**
- Contagem de pedidos por status em cada botao
- Badge destacado para pedidos pendentes
- Cores correspondentes ao status
- Mensagem de empty state dinamica

---

## Integracao WhatsApp (WuzAPI)

O sistema integra com o WhatsApp para envio automatico de mensagens sobre pedidos.

### Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    WuzAPI       │────▶│   WhatsApp      │
│   (React)       │     │   (VPS)         │     │   (Cliente)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ├── API REST (Go)
        │                       ├── whatsmeow (biblioteca)
        │                       └── SQLite (sessoes)
        │
        └── Servico: src/services/whatsapp.ts
```

### Servidor WuzAPI

| Item | Valor |
|------|-------|
| **URL** | `https://evertonapi.vps-kinghost.net` |
| **Tecnologia** | Go + whatsmeow |
| **Multi-tenant** | Sim (1 usuario por empresa) |
| **Persistencia** | SQLite (volume Docker) |

### Fluxo de Conexao

1. Empresa clica em "Conectar WhatsApp" nas Configuracoes
2. Sistema cria usuario no WuzAPI: `ejym-{slug}`
3. Sistema conecta sessao e busca QR Code
4. Admin escaneia QR Code no celular
5. Sistema detecta conexao via polling
6. Salva token e configuracoes no banco

### Tratamento do 9o Digito

Numeros brasileiros podem estar no WhatsApp com ou sem o 9o digito:

```typescript
// Fluxo de envio de mensagem
1. Cliente digita: 85996863450
2. Sistema formata: 5585996863450
3. API /user/check retorna JID correto (pode ser sem o 9)
4. Sistema usa o JID retornado para enviar
```

### Servico (`src/services/whatsapp.ts`)

| Funcao | Descricao |
|--------|-----------|
| `createUser()` | Cria usuario no WuzAPI |
| `connectSession()` | Inicia sessao para QR Code |
| `getSessionStatus()` | Verifica status da conexao |
| `getQRCode()` | Obtem QR Code base64 |
| `checkPhoneOnWhatsApp()` | Verifica se telefone existe (retorna JID correto) |
| `sendTextMessage()` | Envia mensagem de texto |
| `disconnectSession()` | Desconecta WhatsApp |
| `formatOrderMessageForCustomer()` | Formata mensagem de pedido |

### Configuracoes por Empresa

```typescript
interface WhatsAppSettings {
  enabled: boolean;
  provider: 'wuzapi';
  user_token: string;          // Token unico por empresa
  connected: boolean;
  connected_at: string | null;
  phone: string | null;        // Numero conectado
  phone_name: string | null;   // Nome do perfil
  notify_on_new_order: boolean;
  notify_on_confirm: boolean;
  notify_on_complete: boolean;
  notify_on_cancel: boolean;
}
```

### Painel de Administracao (Super Admin)

O Super Admin tem acesso a um painel completo para gerenciar todas as instancias WhatsApp:

```
┌────────────────────────────────────────────────────────────────────────┐
│  /admin/whatsapp - Painel de Administracao WhatsApp                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Status da API: [●] Online - evertonapi.vps-kinghost.net        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │ Total      │ │ Conectadas │ │ Desconect. │ │ Orfas      │          │
│  │    5       │ │    3 ●     │ │    1 ○     │ │    1 ⚠     │          │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Empresa           Status       Telefone         Acoes           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Loja Maria        ● Conectado  +55 85 99999    [QR] [✕] [🗑]    │   │
│  │ New Empire        ○ Desconect. -               [QR] [✕] [🗑]    │   │
│  │ ⚠ ejym-antiga     ⚠ Orfa       -               [🗑]            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└────────────────────────────────────────────────────────────────────────┘
```

**Funcionalidades do Painel:**

| Funcao | Descricao |
|--------|-----------|
| Status da API | Verifica se WuzAPI esta online |
| Lista de Instancias | Todas as empresas com WhatsApp configurado |
| Instancias Orfas | Existem no WuzAPI mas nao no sistema |
| Reconectar | Gera novo QR Code para reconexao |
| Desconectar | Faz logout da sessao WhatsApp |
| Excluir | Remove instancia completamente do WuzAPI |

**Funcoes Admin no Servico (`whatsapp.ts`):**

```typescript
// Listar todas as instancias
listAllUsers(): Promise<{ success: boolean; users: WuzAPIUser[] }>

// Verificar status de uma instancia
getUserStatus(userToken: string): Promise<WuzAPIUserStatus | null>

// Forcar reconexao (logout + connect)
forceReconnect(userToken: string): Promise<{ success: boolean }>

// Deletar instancia por ID (hash)
deleteUserById(userId: string): Promise<boolean>

// Deletar instancia por slug (busca ID primeiro)
deleteUser(companySlug: string): Promise<boolean>
```

**Interface de Usuario no WuzAPI:**

```typescript
interface WuzAPIUser {
  id: string;      // Hash unico (ex: e635a4b39d6e3f49abe437feb8b46218)
  name: string;    // Nome (ex: ejym-loja-maria)
  token: string;   // Token de autenticacao
}

interface WuzAPIUserStatus {
  name: string;
  token: string;
  connected: boolean;   // Conectado ao WuzAPI
  loggedIn: boolean;    // Logado no WhatsApp
  jid: string | null;   // ID do WhatsApp
  phone: string | null; // Numero formatado
  phoneName: string | null;
}
```

---

## Validacao de Telefone/WhatsApp

O sistema valida e formata numeros de telefone brasileiros:

```typescript
// Formatacao automatica
formatPhoneNumber("11999998888") // "(11) 99999-8888"

// Validacao
validatePhoneNumber("(11) 99999-8888")
// { valid: true, message: "Numero valido" }

validatePhoneNumber("(11) 9999-888")
// { valid: false, message: "Numero incompleto" }
```

**Regras de validacao:**
- DDD entre 11 e 99
- Celular (11 digitos) deve comecar com 9
- Aceita fixo (10 digitos) ou celular (11 digitos)
- Maximo 11 digitos

**Funcionalidades na UI:**
- Icone verde quando valido
- Icone vermelho quando invalido
- Mensagens de erro especificas
- Botao "Testar WhatsApp" para verificar numero

---

## Persistencia de Estado da UI

O sistema persiste preferencias do usuario no localStorage.

### Estados Persistidos

| Chave | Descricao | Valores |
|-------|-----------|---------|
| `ejym_sidebar_collapsed` | Estado da sidebar (app) | `'true'` / `'false'` |
| `ejym_admin_sidebar_collapsed` | Estado da sidebar (admin) | `'true'` / `'false'` |
| `ejym_current_company` | ID da empresa atual | UUID |
| `ejym_cart_{slug}` | Carrinho do catalogo | JSON (CartItem[]) |
| `ejym_pwa_last_prompt` | Ultimo prompt PWA | Timestamp |
| `ejym_pwa_installed` | Se PWA foi instalado | `'true'` / `'false'` |
| `ejym_pwa_dismissed_count` | Vezes que recusou PWA | Numero |

### Implementacao (Sidebar)

```typescript
const SIDEBAR_COLLAPSED_KEY = 'ejym_sidebar_collapsed';

// Inicializar do localStorage
const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
  const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  return saved === 'true';
});

// Salvar no localStorage quando mudar
useEffect(() => {
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
}, [sidebarCollapsed]);
```

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

### Deteccao de Providers de Autenticacao

O sistema detecta quais metodos de login o usuario tem vinculados atraves do `providerData` do Firebase:

```typescript
// src/modules/settings/SettingsPage.tsx
const authProviders = useMemo(() => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return { hasPassword: false, hasGoogle: false, providers: [] };

  const providers = firebaseUser.providerData.map(p => p.providerId);
  return {
    hasPassword: providers.includes('password'),      // Email/Senha
    hasGoogle: providers.includes('google.com'),      // Google OAuth
    providers,
  };
}, [auth.currentUser]);
```

**Providers possiveis:**
| Provider ID | Descricao |
|-------------|-----------|
| `password` | Login com email e senha |
| `google.com` | Login com Google OAuth |

**Uso na pagina de Configuracoes:**
- Se `hasPassword = true`: Mostra formulario para alterar senha
- Se `hasPassword = false` (apenas Google): Mostra mensagem orientando usar "Esqueci senha" para criar uma senha
- Badges visuais mostram quais metodos estao vinculados

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

### Layout do Catalogo Publico

O catalogo publico (`/catalogo/:slug`) utiliza o mesmo padrao de layout arredondado:

```
┌─────────────────────────────────────────────────────────────────┐
│  CATALOGO PUBLICO                                                 │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Header (rounded) - Logo + Nome + Carrinho               │   │
│  └───────────────────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Main Area (rounded)                                       │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │  Filtros (sticky) - Busca + Categoria + Limpar (X) │  │   │
│  │  ├─────────────────────────────────────────────────────┤  │   │
│  │  │  Produtos (scroll)                                   │  │   │
│  │  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                   │  │   │
│  │  │  │     │ │     │ │     │ │     │  Grid 2-4 cols    │  │   │
│  │  │  └─────┘ └─────┘ └─────┘ └─────┘                   │  │   │
│  │  │  ────────────────────────────────────────────────  │  │   │
│  │  │  Footer - Powered by Ejym                          │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────┘   │
│  [Carrinho Flutuante - Mobile]                                   │
└─────────────────────────────────────────────────────────────────┘
```

Caracteristicas:
- **Header arredondado**: Logo da empresa + botao do carrinho
- **Container principal arredondado**: Conteudo com scroll interno
- **Filtros sticky**: Busca com botao limpar (X) + categoria
- **Grid responsivo**: 2 colunas mobile, 3-4 colunas desktop
- **Carrinho flutuante**: Visivel apenas no mobile quando ha itens

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

### Cadastro Opcional de Cliente

O checkout permite que clientes se cadastrem opcionalmente para facilitar proximas compras.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CheckoutModal                                  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Nome: [____________________]                              │   │
│  │  Telefone: [____________________]  (auto-busca cliente)   │   │
│  │                                                            │   │
│  │  [ ] Aceito receber atualizacoes sobre meu pedido         │   │
│  │  [ ] Quero me cadastrar para facilitar proximas compras   │   │
│  │                                                            │   │
│  │  ┌── Campos visiveis apenas se "Quero me cadastrar" ──┐   │   │
│  │  │  CPF: [000.000.000-00] *                            │   │   │
│  │  │  Email: [____________________]                      │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                            │   │
│  │  Observacoes: [____________________]                      │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Fluxo de Cadastro:**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Cliente digita  │────▶│ Sistema busca   │────▶│  Cliente        │
│ telefone        │     │ por telefone    │     │  encontrado?    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┴───────────┐
                        │ Sim                                       │ Nao
                        ▼                                           ▼
                  ┌─────────────────┐                        ┌─────────────────┐
                  │ Auto-preenche   │                        │ Formulario      │
                  │ nome, CPF, email│                        │ em branco       │
                  └─────────────────┘                        └─────────────────┘
```

**Estrutura de Dados:**

```typescript
// Novos campos em Customer
interface Customer {
  // ... campos existentes
  phone_has_whatsapp: boolean | null;  // Verificado via WuzAPI
  source: 'manual' | 'catalog';        // Origem do cadastro
  total_orders: number;                 // Contagem de pedidos
  total_spent: number;                  // Valor total gasto
  last_order_at: string | null;         // Data do ultimo pedido
}

// Vinculo em CatalogOrder
interface CatalogOrder {
  // ... campos existentes
  customer_id: string | null;           // Cliente cadastrado (opcional)
  whatsapp_consent: boolean;            // LGPD: consentimento
  consent_at: string | null;            // Data do consentimento
}
```

**Validacao de CPF:**

```typescript
const isValidCpf = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;  // Todos digitos iguais

  // Algoritmo de validacao
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;

  return remainder === parseInt(cleaned[10]);
};
```

**Indices de Unicidade:**

```sql
-- Evita duplicatas de telefone por empresa
CREATE UNIQUE INDEX idx_customers_phone_company
  ON customers(phone, company_id)
  WHERE phone IS NOT NULL;

-- Evita duplicatas de CPF por empresa
CREATE UNIQUE INDEX idx_customers_document_company
  ON customers(document, company_id)
  WHERE document IS NOT NULL;
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
│          3. EDGE FUNCTIONS               │
│  - Validacao de Firebase ID Token        │
│  - Protecao de tokens sensiveis          │
│  - Verificacao de permissoes admin       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            4. SUPABASE RLS               │
│  - Row-level filtering                   │
│  - Company isolation                     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│            5. DATABASE                   │
│  - Constraints                           │
│  - Foreign keys                          │
│  - Check constraints                     │
└─────────────────────────────────────────┘
```

### Tokens

| Token | Origem | Uso | Exposicao |
|-------|--------|-----|-----------|
| Firebase JWT | Firebase Auth | Identificar usuario | Frontend (seguro) |
| Supabase Anon Key | Supabase | Acessar banco com RLS | Frontend (seguro) |
| WuzAPI Admin Token | WuzAPI | Gerenciar instancias | Apenas Edge Function |
| WuzAPI User Token | WuzAPI | Conectar empresa | Apenas backend |

### Protecao de Tokens Sensiveis

**IMPORTANTE:** Variaveis com prefixo `VITE_` sao expostas no bundle JavaScript.

```
┌─────────────────────────────────────────────────────────────────┐
│  SEGURO NO FRONTEND (VITE_*)                                      │
│  - VITE_FIREBASE_API_KEY (chave publica)                         │
│  - VITE_SUPABASE_URL (URL publica)                               │
│  - VITE_SUPABASE_ANON_KEY (chave restrita por RLS)              │
│  - VITE_WUZAPI_URL (URL publica da API)                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  NUNCA NO FRONTEND (apenas secrets Edge Function)                 │
│  - WUZAPI_ADMIN_TOKEN (acesso total as instancias)              │
│  - SUPABASE_SERVICE_ROLE_KEY (bypass RLS)                        │
│  - MAILERSEND_API_TOKEN (envio de emails)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Validacao de Firebase Token em Edge Functions

Para operacoes que requerem autenticacao Firebase em Edge Functions (fora do Firebase):

```typescript
// Decodificar JWT manualmente (sem Firebase Admin SDK)
function decodeFirebaseToken(idToken: string) {
  const parts = idToken.split('.');
  const payload = JSON.parse(atob(parts[1]));

  // Validar claims obrigatorios
  const projectId = 'seu-projeto';
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    return null; // Issuer invalido
  }
  if (payload.aud !== projectId) {
    return null; // Audience invalido
  }
  if (payload.exp < Date.now() / 1000) {
    return null; // Token expirado
  }

  return { uid: payload.user_id, email: payload.email };
}
```

**Nota:** Esta validacao e suficiente para ambientes server-side onde o token ja foi validado pelo Firebase no cliente.

### Boas Praticas

1. **Nunca confiar apenas no frontend** - RLS valida no backend
2. **Validar permissoes em multiplas camadas**
3. **Firebase UID e imutavel** - nao pode ser alterado
4. **Logs de auditoria** - registrar acoes importantes (futuro)
5. **Tokens admin em secrets** - nunca expor no bundle JS
6. **Edge Functions para operacoes sensiveis** - proteger tokens de servicos terceiros

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
