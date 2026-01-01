# Arquitetura do Sistema

Este documento descreve a arquitetura tecnica do Ejym SaaS.

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura Hibrida](#arquitetura-hibrida)
3. [Arquitetura Frontend](#arquitetura-frontend)
4. [Arquitetura Backend](#arquitetura-backend)
5. [Edge Functions](#edge-functions)
6. [Multi-Tenancy](#multi-tenancy)
7. [Fluxo de Autenticacao](#fluxo-de-autenticacao)
8. [Padroes de Codigo](#padroes-de-codigo)
9. [Seguranca](#seguranca)

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
│   ├── admin/         # Area do Super Admin
│   ├── dashboard/     # Dashboard principal
│   ├── products/      # Produtos
│   ├── customers/     # Clientes
│   ├── sales/         # Vendas
│   ├── catalog/       # Catalogo publico
│   ├── companies/     # Empresas (Super Admin)
│   └── users/         # Usuarios
├── contexts/          # React Contexts globais
├── services/          # Servicos externos
│   ├── firebase.ts   # Cliente Firebase Auth
│   └── supabase.ts   # Cliente Supabase
├── routes/            # Sistema de rotas
├── types/             # TypeScript types
└── hooks/             # Custom hooks
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
└─────────────────────────────────────────┘
```

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
