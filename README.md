# Ejym - SaaS de Gestao de Vendas Multi-Tenant

Sistema SaaS completo para gestao de vendas no varejo, desenvolvido para atender diferentes segmentos como roupas, calcados, perfumaria, cosmeticos e outros.

## Stack Tecnologica

| Tecnologia | Versao | Descricao |
|------------|--------|-----------|
| **React** | 18.x | Framework frontend com TypeScript |
| **Vite** | 7.x | Build tool e dev server |
| **Tailwind CSS** | 3.x | Estilizacao utility-first |
| **MUI Icons** | 5.x | Biblioteca de icones |
| **Recharts** | 2.x | Graficos e visualizacoes |
| **Firebase** | 11.x | Autenticacao (Auth) |
| **Supabase** | 2.x | Backend (Database, RLS, Storage) |
| **xlsx** | 0.18.x | Exportacao para Excel |
| **jsPDF** | 2.x | Exportacao para PDF |
| **React Router** | 6.x | Roteamento SPA |
| **React Hot Toast** | 2.x | Notificacoes |

---

## Status do Projeto

### Implementado

- [x] Autenticacao com Firebase Auth
- [x] Login com Google
- [x] Sistema de registro e login com visualizacao de senha
- [x] Multi-tenancy com RLS (Row Level Security)
- [x] Rotas baseadas em slug da empresa (`/app/:slug/*`)
- [x] Area administrativa separada (`/admin/*`)
- [x] Super Admin automatico (email especifico)
- [x] CRUD de Empresas (Super Admin)
- [x] Sistema de Convites (com link copiavel)
- [x] **Envio automatico de email de convite (MailerSend)**
- [x] Aceitacao de convite sem confirmacao de email
- [x] Tema claro/escuro
- [x] Layout responsivo com Sidebar
- [x] Componentes UI reutilizaveis
- [x] Dashboard com metricas
- [x] CRUD de Produtos
- [x] CRUD de Clientes
- [x] Sistema de Vendas
- [x] Catalogo publico
- [x] Exportacao Excel/PDF
- [x] **Supabase Edge Functions**
- [x] **Upload de imagens de produtos (Supabase Storage)**
- [x] **UI moderna com cantos arredondados**
- [x] **Logo EJYM com fonte Bebas Neue**
- [x] **Coluna de email do admin na lista de empresas**

### Proximos Passos

- [ ] Relatorios avancados
- [ ] Integracao com pagamentos
- [ ] App mobile (React Native)
- [ ] Notificacoes push
- [ ] Upload de logo da empresa

---

## Arquitetura

### Autenticacao Hibrida

O sistema utiliza uma arquitetura hibrida:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  Firebase   │     │  Supabase   │
│   React     │     │  Auth       │     │  PostgreSQL │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │              Firebase UID             │
       └───────────────────┴───────────────────┘
              Supabase armazena dados com Firebase UID
```

- **Firebase Auth**: Gerencia autenticacao (login, signup, Google OAuth)
- **Supabase**: Banco de dados PostgreSQL com RLS para isolamento multi-tenant
- **Sincronizacao**: Firebase UID e armazenado como `profiles.id` no Supabase

### Estrutura de Rotas

| Rota | Descricao | Acesso |
|------|-----------|--------|
| `/login` | Pagina de login | Publico |
| `/registro` | Pagina de registro | Publico |
| `/aceitar-convite?token=xxx` | Aceitar convite | Publico |
| `/catalogo/:slug` | Catalogo publico | Publico |
| `/admin` | Dashboard admin | Super Admin |
| `/admin/empresas` | Gestao de empresas | Super Admin |
| `/app/:slug` | Dashboard da empresa | Autenticado |
| `/app/:slug/vendas` | Gestao de vendas | Autenticado |
| `/app/:slug/clientes` | Gestao de clientes | Autenticado |
| `/app/:slug/produtos` | Gestao de produtos | Autenticado |
| `/app/:slug/usuarios` | Gestao de usuarios | Admin |

---

## Estrutura do Projeto

```
src/
├── components/           # Componentes reutilizaveis
│   ├── ui/              # Button, Input, Modal, Table, etc.
│   ├── layout/          # Sidebar, Header, AppLayout, TenantLayout
│   │   ├── AdminLayout.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminHeader.tsx
│   │   └── TenantLayout.tsx
│   └── feedback/        # Skeleton, EmptyState
├── modules/             # Modulos funcionais
│   ├── auth/            # Login, Registro, Convites
│   ├── admin/           # AdminDashboardPage
│   ├── dashboard/       # Dashboard principal
│   ├── sales/           # Gestao de vendas
│   ├── customers/       # Gestao de clientes
│   ├── products/        # Gestao de produtos
│   ├── catalog/         # Catalogo publico
│   ├── companies/       # Gestao de empresas (Super Admin)
│   └── users/           # Gestao de usuarios
├── contexts/            # React Contexts
│   ├── AuthContext.tsx  # Autenticacao Firebase + Supabase
│   ├── TenantContext.tsx # Empresa ativa (multi-tenant)
│   └── ThemeContext.tsx # Tema claro/escuro
├── routes/              # Sistema de rotas
│   ├── paths.ts         # Constantes e helpers de rotas
│   ├── guards.tsx       # ProtectedRoute, PublicRoute, SuperAdminRoute
│   ├── RootRedirect.tsx # Logica de redirecionamento
│   ├── LegacyRouteRedirect.tsx # Compatibilidade com URLs antigas
│   └── index.tsx        # Definicao central das rotas
├── services/            # Servicos
│   ├── firebase.ts      # Cliente Firebase Auth
│   ├── supabase.ts      # Cliente Supabase
│   ├── storage.ts       # Upload de imagens (Supabase Storage)
│   ├── email.ts         # Servico de email (MailerSend)
│   └── export.ts        # Exportacao Excel/PDF
├── types/               # TypeScript types
└── hooks/               # Custom hooks

supabase/
├── migrations/          # Migrations do banco de dados
└── functions/           # Edge Functions
    └── send-invite-email/  # Envio de emails de convite

docs/                    # Documentacao
├── SETUP.md            # Guia de instalacao
├── ARCHITECTURE.md     # Arquitetura do sistema
├── FIREBASE_AUTH.md    # Documentacao Firebase Auth
└── ROADMAP.md          # Planos futuros
```

---

## Instalacao

### Pre-requisitos

- Node.js 18+
- Conta no [Firebase](https://firebase.google.com)
- Conta no [Supabase](https://supabase.com)

### 1. Clonar e instalar

```bash
cd Saas_Ejym
npm install
```

### 2. Configurar Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto
3. Ative **Authentication** > **Email/Password** e **Google**
4. Em **Project Settings** > **Your apps** > **Web**, copie as credenciais

### 3. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie a URL e Anon Key

### 4. Criar `.env.local`

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key

# Firebase Auth
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 5. Aplicar migrations

```bash
npx supabase link --project-ref seu-projeto
npx supabase db push
```

### 6. Executar

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## Primeiro Acesso

### 1. Criar Super Admin

1. Acesse `/registro` ou `/login`
2. Clique em **"Entrar com Google"**
3. Use o email: `evertonmarques.jm@gmail.com`
4. O sistema automaticamente define como Super Admin

### 2. Criar Empresa

1. Acesse `/admin/empresas`
2. Clique em "Nova Empresa"
3. Preencha nome, slug e segmentos

### 3. Convidar Usuario

**Opcao A - Ao criar empresa:**
1. Ao criar empresa, preencha o campo "Email do Administrador"
2. O sistema cria a empresa E envia o convite automaticamente por email

**Opcao B - Empresa existente:**
1. Na lista de empresas, clique no icone de convite
2. Informe o email do futuro usuario
3. O email de convite e **enviado automaticamente** via MailerSend
4. O convidado cria senha e acessa **sem precisar confirmar email**

> Se o envio de email falhar, o link e copiado para a area de transferencia como fallback.

---

## Arquitetura Multi-Tenant

### Conceito

- Cada empresa (tenant) possui isolamento logico de dados
- Todas as tabelas principais possuem `company_id`
- Row Level Security (RLS) garante que usuarios so acessem dados de suas empresas
- Um usuario pode pertencer a multiplas empresas com diferentes papeis
- Rotas baseadas em slug: `/app/minha-empresa/produtos`

### Papeis e Permissoes

| Papel | Descricao | Permissoes |
|-------|-----------|------------|
| **Super Admin** | Administrador global | Criar empresas, visao geral do sistema |
| **Admin** | Administrador da empresa | Gerenciar usuarios, produtos, clientes, vendas |
| **Manager** | Gerente | Gerenciar produtos, clientes, vendas |
| **Seller** | Vendedor | Registrar vendas, visualizar clientes/produtos |

---

## Banco de Dados

### Tabelas Principais

| Tabela | Descricao | Chave |
|--------|-----------|-------|
| `profiles` | Perfis de usuario | `id` (Firebase UID - TEXT) |
| `companies` | Empresas (tenants) | `id` (UUID) |
| `company_members` | Relacao usuario-empresa | `user_id` (TEXT) |
| `invites` | Sistema de convites | `invited_by` (TEXT) |
| `customers` | Clientes por empresa | `company_id` (UUID) |
| `categories` | Categorias de produtos | `company_id` (UUID) |
| `products` | Produtos por empresa | `company_id` (UUID) |
| `sales` | Vendas | `company_id` (UUID) |
| `sale_items` | Itens de cada venda | `sale_id` (UUID) |

### Diagrama de Relacionamento

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  companies  │────<│ company_members │>────│   profiles   │
└─────────────┘     └─────────────────┘     └──────────────┘
       │                                           │
       │                                           │
       ├──────────────┬──────────────┬─────────────┤
       │              │              │             │
       ▼              ▼              ▼             ▼
┌───────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐
│ customers │  │ categories│  │ products │  │   sales   │
└───────────┘  └───────────┘  └──────────┘  └───────────┘
                                   │              │
                                   │              │
                                   └──────┬───────┘
                                          ▼
                                   ┌────────────┐
                                   │ sale_items │
                                   └────────────┘
```

---

## Contexts

### AuthContext

```tsx
const {
  user,           // Usuario do Firebase Auth
  profile,        // Perfil do usuario (tabela profiles)
  companies,      // Empresas que o usuario pertence
  isSuperAdmin,   // Se e super admin
  signIn,         // Login com email/senha
  signInWithGoogle, // Login com Google
  signUp,         // Registro
  signOut,        // Logout
  refreshProfile, // Recarregar perfil
  getToken        // Obter token Firebase
} = useAuth();
```

### TenantContext

```tsx
const {
  currentCompany,     // Empresa ativa (do slug da URL)
  switchCompany,      // Trocar empresa (navega para nova URL)
  userRole,           // Papel na empresa atual
  isAdmin,            // Se e admin
  isManager,          // Se e manager ou superior
  canManageUsers,     // Permissao para gerenciar usuarios
  canManageProducts   // Permissao para gerenciar produtos
} = useTenant();
```

### ThemeContext

```tsx
const { theme, toggleTheme } = useTheme();
```

---

## Componentes UI

| Componente | Descricao |
|------------|-----------|
| `Button` | Botao com variantes (primary, secondary, danger, ghost) |
| `Input` | Campo de entrada com label, erro, icones |
| `Select` | Select customizado |
| `Modal` | Modal reutilizavel com header e footer |
| `Table` | Tabela com ordenacao e loading state |
| `Card` | Container card |
| `Badge` | Badge de status (success, warning, danger, info) |
| `Loader` | Spinner de carregamento |
| `Skeleton` | Placeholder de carregamento |
| `EmptyState` | Estado vazio com icone e acao |
| `ImageUpload` | Upload de imagens com drag & drop e preview |

---

## Scripts Disponiveis

| Script | Descricao |
|--------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de producao |
| `npm run preview` | Preview do build de producao |
| `npm run lint` | Executa linter |

---

## Variaveis de Ambiente

| Variavel | Descricao | Obrigatorio |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `VITE_SUPABASE_ANON_KEY` | Chave anonima do Supabase | Sim |
| `VITE_FIREBASE_API_KEY` | API Key do Firebase | Sim |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth Domain do Firebase | Sim |
| `VITE_FIREBASE_PROJECT_ID` | Project ID do Firebase | Sim |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage Bucket do Firebase | Sim |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging Sender ID | Sim |
| `VITE_FIREBASE_APP_ID` | App ID do Firebase | Sim |
| `VITE_MAILERSEND_API_TOKEN` | Token da API MailerSend | Sim* |
| `VITE_MAILERSEND_FROM_EMAIL` | Email remetente (verificado no MailerSend) | Sim* |
| `VITE_MAILERSEND_FROM_NAME` | Nome do remetente | Nao |

*Obrigatorio para envio automatico de emails de convite

---

## Documentacao Adicional

- [Guia de Instalacao Detalhado](docs/SETUP.md)
- [Arquitetura do Sistema](docs/ARCHITECTURE.md)
- [Integracao Firebase Auth](docs/FIREBASE_AUTH.md)
- [Roadmap e Planos Futuros](docs/ROADMAP.md)

---

## Autor

Desenvolvido por Everton Marques

## Licenca

Projeto proprietario - Todos os direitos reservados.
