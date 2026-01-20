# Fluxo de Criacao de Empresas em SaaS Multi-Tenant

Este documento detalha o fluxo completo de criacao de empresas (tenants) no sistema Ejym, servindo como guia de referencia para implementacao em outros projetos SaaS multi-tenant com Super Admin.

## Sumario

1. [Visao Geral](#visao-geral)
2. [Arquitetura Multi-Tenant](#arquitetura-multi-tenant)
3. [Sistema de Super Admin](#sistema-de-super-admin)
4. [Fluxo de Criacao de Empresa](#fluxo-de-criacao-de-empresa)
5. [Sistema de Convites](#sistema-de-convites)
6. [Modelo de Dados](#modelo-de-dados)
7. [Implementacao de Referencia](#implementacao-de-referencia)
8. [Boas Praticas](#boas-praticas)
9. [Checklist para Novos Projetos](#checklist-para-novos-projetos)

---

## Visao Geral

O sistema implementa um modelo SaaS multi-tenant onde:

- **Super Admin**: Administrador global que cria e gerencia empresas
- **Empresa (Tenant)**: Unidade isolada com seus proprios dados e usuarios
- **Admin da Empresa**: Usuario administrador de uma empresa especifica
- **Usuarios**: Membros da empresa com diferentes papeis

```
┌────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN                              │
│  (evertonmarques.jm@gmail.com ou configuravel)                 │
└────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│       Empresa A          │     │       Empresa B          │
│  ┌───────────────────┐   │     │  ┌───────────────────┐   │
│  │  Admin            │   │     │  │  Admin            │   │
│  │  Managers         │   │     │  │  Managers         │   │
│  │  Sellers          │   │     │  │  Sellers          │   │
│  ├───────────────────┤   │     │  ├───────────────────┤   │
│  │  Produtos         │   │     │  │  Produtos         │   │
│  │  Clientes         │   │     │  │  Clientes         │   │
│  │  Vendas           │   │     │  │  Vendas           │   │
│  └───────────────────┘   │     │  └───────────────────┘   │
└─────────────────────────┘     └─────────────────────────┘
```

---

## Arquitetura Multi-Tenant

### Estrategia: Banco Compartilhado com RLS

Todas as empresas compartilham o mesmo banco de dados, mas sao isoladas logicamente atraves de:

1. **company_id**: Coluna presente em todas tabelas de dados
2. **RLS (Row Level Security)**: Policies que filtram dados por empresa
3. **Rotas baseadas em Slug**: URLs no formato `/app/:slug/*`

```sql
-- Exemplo de estrutura com company_id
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policy para isolamento
CREATE POLICY "products_company_isolation" ON products
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_members
      WHERE user_id = current_user_id()
    )
  );
```

### Vantagens desta Abordagem

| Beneficio | Descricao |
|-----------|-----------|
| **Custo** | Um unico banco para todas empresas |
| **Manutencao** | Migrations aplicadas uma vez |
| **Escalabilidade** | Adicionar empresas sem infraestrutura |
| **Isolamento** | RLS garante seguranca dos dados |
| **Queries Cross-Tenant** | Super Admin pode ver dados de todas empresas |

---

## Sistema de Super Admin

### Definicao Automatica

O Super Admin e definido automaticamente pelo email no momento do login:

```typescript
// src/contexts/AuthContext.tsx

const signInWithGoogle = async () => {
  const userCredential = await firebaseSignInWithGoogle();
  const firebaseUser = userCredential.user;

  // Criar profile se nao existir
  if (!existingProfile) {
    await supabase.from('profiles').insert({
      id: firebaseUser.uid,
      email: firebaseUser.email,
      full_name: firebaseUser.displayName,
      // SUPER ADMIN definido por email
      is_super_admin: firebaseUser.email === 'evertonmarques.jm@gmail.com',
    });
  }
};
```

### Fluxo de Primeiro Acesso do Super Admin

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Super Admin    │────▶│  Login Google   │────▶│   Firebase      │
│  acessa /login  │     │  (1o acesso)    │     │   Auth          │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                              ┌──────────────────────────┘
                              │ Firebase UID + Email
                              ▼
                        ┌─────────────────┐
                        │   AuthContext   │
                        │ Verifica email  │
                        └─────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │ email === 'super@admin.com'?        │
           ▼                                     ▼
     ┌───────────┐                        ┌───────────┐
     │ is_super_ │                        │ is_super_ │
     │ admin:true│                        │admin:false│
     └───────────┘                        └───────────┘
           │
           ▼
     ┌─────────────────┐
     │ Cria profile    │
     │ no Supabase     │
     │ com flag true   │
     └─────────────────┘
           │
           ▼
     ┌─────────────────┐
     │ Redireciona     │
     │ para /admin     │
     └─────────────────┘
```

### Permissoes do Super Admin

| Acao | Rota | Descricao |
|------|------|-----------|
| Ver Dashboard Admin | `/admin` | Metricas globais do sistema |
| Criar Empresas | `/admin/empresas` | CRUD completo de empresas |
| Gerenciar Usuarios | `/admin/usuarios` | Lista de todos usuarios |
| Enviar Convites | Modal na lista | Convidar admins para empresas |

### Protecao de Rotas

```typescript
// src/routes/guards.tsx

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Uso nas rotas
<Route path="/admin/*" element={
  <SuperAdminRoute>
    <AdminLayout />
  </SuperAdminRoute>
}>
  <Route index element={<AdminDashboardPage />} />
  <Route path="empresas" element={<CompaniesPage />} />
  <Route path="usuarios" element={<AdminUsersPage />} />
</Route>
```

---

## Fluxo de Criacao de Empresa

### Diagrama Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Acessa /admin/empresas
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CompaniesPage                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [+ Nova Empresa]                                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Clica "Nova Empresa"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Modal: Nova Empresa                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Nome da Empresa: [_______________________]               │  │
│  │  Slug: [_______________________] (gerado automaticamente) │  │
│  │  Segmentos: [x] Roupas [ ] Calcados [x] Acessorios       │  │
│  │  [x] Empresa ativa                                        │  │
│  │  ─────────────────────────────────────────────────────── │  │
│  │  Email do Administrador: [admin@empresa.com] (opcional)  │  │
│  │                                                           │  │
│  │  [Cancelar]                                [Criar]       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Clica "Criar"
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Processamento                                 │
│                                                                  │
│  1. Valida dados (nome, slug obrigatorios)                      │
│  2. Formata slug (lowercase, remove acentos, hifens)            │
│  3. Insere empresa na tabela 'companies'                        │
│  4. Se adminEmail informado:                                    │
│     a. Cria convite na tabela 'invites'                        │
│     b. Envia email via MailerSend (Edge Function)              │
│     c. Se email falhar, mostra modal com link                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │ Com email admin?                     │
           ▼                                      ▼
     ┌───────────┐                         ┌───────────┐
     │ Empresa + │                         │ Apenas    │
     │ Convite   │                         │ Empresa   │
     │ criados   │                         │ criada    │
     └───────────┘                         └───────────┘
           │
           │ Email enviado?
           ▼
     ┌─────────────────┐
     │ Sim: Toast de   │
     │ sucesso         │
     ├─────────────────┤
     │ Nao: Modal com  │
     │ link do convite │
     │ para copiar     │
     └─────────────────┘
```

### Implementacao

```typescript
// src/modules/companies/CompaniesPage.tsx

const handleSubmitCompany = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Validacao
  if (!formData.name || !formData.slug) {
    toast.error('Nome e slug sao obrigatorios');
    return;
  }

  // 2. Preparar dados
  const companyData = {
    name: formData.name,
    slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
    segments: formData.segments,
    is_active: formData.is_active,
  };

  // 3. Inserir empresa
  const { data, error } = await supabase
    .from('companies')
    .insert(companyData)
    .select()
    .single();

  if (error) throw error;

  // 4. Se email do admin foi informado, criar convite
  if (formData.adminEmail && data) {
    await createAndSendInvite(data, formData.adminEmail);
  } else {
    toast.success('Empresa criada com sucesso!');
  }
};

// Funcao auxiliar para convite
const createAndSendInvite = async (company: Company, email: string) => {
  // Criar convite no banco
  const { data: inviteData } = await supabase
    .from('invites')
    .insert({
      email: email,
      company_id: company.id,
      role: 'admin',
      invited_by: currentUser.id,
    })
    .select()
    .single();

  // Gerar link
  const inviteLink = `${origin}/aceitar-convite?token=${inviteData.token}`;

  // Enviar email (via Edge Function)
  const result = await sendInviteEmail({
    email: email,
    companyName: company.name,
    inviteLink: inviteLink,
  });

  if (result.success) {
    toast.success(`Empresa criada e convite enviado para ${email}!`);
  } else {
    // Fallback: mostrar modal com link
    setInviteLinkModal({ open: true, link: inviteLink, email });
  }
};
```

### Geracao Automatica de Slug

```typescript
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')                    // Separa acentos
    .replace(/[\u0300-\u036f]/g, '')    // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')        // Substitui caracteres especiais
    .replace(/(^-|-$)+/g, '');          // Remove hifens das pontas
};

// Exemplos:
// "Loja da Maria" -> "loja-da-maria"
// "Moda Feminina SP" -> "moda-feminina-sp"
// "Calcados & Acessorios" -> "calcados-acessorios"
```

---

## Sistema de Convites

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN                                   │
│                                                                  │
│  1. Cria empresa com email do admin                             │
│     OU                                                          │
│  2. Clica em "Enviar Convite" em empresa existente              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA                                       │
│                                                                  │
│  1. Gera token UUID unico                                       │
│  2. Insere na tabela 'invites'                                  │
│  3. Define expires_at (7 dias)                                  │
│  4. Chama Edge Function 'send-invite-email'                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION                                 │
│                                                                  │
│  1. Recebe: email, companyName, inviteLink                      │
│  2. Chama API do MailerSend                                     │
│  3. Envia email com template HTML                               │
│  4. Retorna: { success: true/false }                            │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │                                      │
           ▼                                      ▼
     ┌───────────────┐                     ┌───────────────┐
     │ Email enviado │                     │ Email falhou  │
     │ com sucesso   │                     │               │
     └───────────────┘                     └───────────────┘
                                                  │
                                                  ▼
                                           ┌───────────────┐
                                           │ Modal exibe   │
                                           │ link para     │
                                           │ copiar        │
                                           └───────────────┘
```

### Estrutura do Convite

```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  role TEXT NOT NULL DEFAULT 'admin',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by TEXT REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para performance
CREATE UNIQUE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
```

### Fluxo de Aceitar Convite

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONVIDADO                                     │
│                                                                  │
│  Recebe email com link:                                         │
│  https://app.ejym.com/aceitar-convite?token=abc123              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Clica no link
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AcceptInvitePage                              │
│                                                                  │
│  1. Extrai token da URL                                         │
│  2. Busca convite no Supabase                                   │
│  3. Valida:                                                     │
│     - Token existe                                              │
│     - accepted_at IS NULL                                       │
│     - expires_at > now()                                        │
│  4. Exibe formulario:                                           │
│     - Email (readonly, do convite)                              │
│     - Nome completo                                             │
│     - Senha                                                     │
│     - Confirmar senha                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Submete formulario
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Processamento                                 │
│                                                                  │
│  1. Cria usuario no Firebase Auth                               │
│     (SEM necessidade de confirmar email!)                       │
│                                                                  │
│  2. Cria profile no Supabase                                    │
│     - id = Firebase UID                                         │
│     - email = email do convite                                  │
│     - full_name = nome informado                                │
│     - is_super_admin = false                                    │
│                                                                  │
│  3. Adiciona na company_members                                 │
│     - company_id = do convite                                   │
│     - user_id = Firebase UID                                    │
│     - role = do convite (admin, manager, seller)                │
│     - is_active = true                                          │
│                                                                  │
│  4. Marca convite como aceito                                   │
│     - UPDATE accepted_at = now()                                │
│                                                                  │
│  5. refreshProfile() para atualizar contexto                    │
│                                                                  │
│  6. Redireciona para /app/:slug                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementacao do AcceptInvitePage

```typescript
// src/modules/auth/AcceptInvitePage.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 1. Criar usuario no Firebase (sem confirmacao de email!)
  const userCredential = await firebaseSignUp(
    invite.email,
    password,
    fullName
  );
  const firebaseUser = userCredential.user;

  // 2. Criar profile no Supabase
  await supabase.from('profiles').insert({
    id: firebaseUser.uid,    // Firebase UID como ID
    email: invite.email,
    full_name: fullName,
    is_super_admin: false,
  });

  // 3. Adicionar a empresa
  await supabase.from('company_members').insert({
    company_id: invite.company_id,
    user_id: firebaseUser.uid,
    role: invite.role,
    is_active: true,
  });

  // 4. Marcar convite como aceito
  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // 5. Atualizar contexto
  await refreshProfile();

  // 6. Redirecionar
  navigate('/');
};
```

---

## Modelo de Dados

### Diagrama ER

```
┌─────────────────┐
│    profiles     │◄──────────────────────────────────────┐
│─────────────────│                                        │
│ id (TEXT/PK)    │  Firebase UID                          │
│ email           │                                        │
│ full_name       │                                        │
│ avatar_url      │                                        │
│ is_super_admin  │                                        │
│ created_at      │                                        │
└────────┬────────┘                                        │
         │                                                 │
         │ 1:N                                             │
         ▼                                                 │
┌─────────────────┐     ┌─────────────────┐               │
│ company_members │────▶│    companies    │               │
│─────────────────│ N:1 │─────────────────│               │
│ id (UUID/PK)    │     │ id (UUID/PK)    │               │
│ user_id (TEXT)  │─────│ name            │               │
│ company_id      │     │ slug (UNIQUE)   │               │
│ role            │     │ logo_url        │               │
│ is_active       │     │ segments[]      │               │
│ created_at      │     │ is_active       │               │
└─────────────────┘     │ created_at      │               │
                        └────────┬────────┘               │
                                 │                         │
         ┌───────────────────────┼───────────────────────┐│
         │                       │                       ││
         ▼                       ▼                       ▼│
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    customers    │     │    products     │     │     invites     │
│─────────────────│     │─────────────────│     │─────────────────│
│ id              │     │ id              │     │ id              │
│ company_id      │     │ company_id      │     │ email           │
│ name            │     │ name            │     │ company_id      │
│ email           │     │ price           │     │ role            │
│ phone           │     │ stock           │     │ token (UNIQUE)  │
│ document (CPF)  │     │ ean             │     │ invited_by ─────┘
│ source *        │     │ images[]        │     │ accepted_at     │
│ total_orders    │     │ ...             │     │ expires_at      │
│ total_spent     │     └─────────────────┘     └─────────────────┘
│ ...             │
└─────────────────┘     * source: 'manual' (admin) | 'catalog' (checkout)

┌─────────────────┐
│  catalog_orders │ (Pedidos do catalogo publico)
│─────────────────│
│ id              │
│ company_id      │
│ customer_id     │ ◄── Vinculo opcional com customers
│ customer_name   │
│ customer_phone  │
│ status          │
│ whatsapp_consent│ (LGPD)
│ ...             │
└─────────────────┘
```

### Papeis (Roles)

```typescript
type MemberRole = 'admin' | 'manager' | 'seller';

// Hierarquia de permissoes
const ROLE_HIERARCHY = {
  admin: ['admin', 'manager', 'seller'],    // Pode tudo
  manager: ['manager', 'seller'],            // Pode produtos, clientes, vendas
  seller: ['seller'],                        // Pode apenas registrar vendas
};

// Verificacao de permissao
const hasPermission = (userRole: MemberRole, requiredRole: MemberRole) => {
  return ROLE_HIERARCHY[userRole].includes(requiredRole);
};
```

---

## Implementacao de Referencia

### Contexto de Autenticacao

```typescript
// src/contexts/AuthContext.tsx

interface AuthContextType {
  user: FirebaseUser | null;     // Usuario do Firebase
  profile: Profile | null;        // Perfil do Supabase
  companies: CompanyMember[];     // Empresas do usuario
  isSuperAdmin: boolean;          // Flag de super admin

  signIn: (email, password) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signUp: (email, password, name) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

### Contexto de Tenant

```typescript
// src/contexts/TenantContext.tsx

interface TenantContextType {
  currentCompany: Company | null;  // Empresa ativa (do slug da URL)
  userRole: MemberRole | null;     // Papel na empresa atual
  isAdmin: boolean;
  isManager: boolean;
  canManageUsers: boolean;
  canManageProducts: boolean;
  switchCompany: (slug: string) => void;
}
```

### Protecao de Rotas

```typescript
// src/routes/guards.tsx

// Rota protegida - requer autenticacao
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;

  return children;
}

// Rota de Super Admin
export function SuperAdminRoute({ children }) {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!isSuperAdmin) return <Navigate to="/" />;

  return children;
}

// Rota de Tenant - requer empresa
export function TenantRoute({ children }) {
  const { currentCompany, loading } = useTenant();

  if (loading) return <PageLoader />;
  if (!currentCompany) return <Navigate to="/" />;

  return children;
}
```

---

## Boas Praticas

### 1. Seguranca

- **Nunca confiar no frontend**: Validar permissoes no backend via RLS
- **Firebase UID e imutavel**: Usar como chave primaria do profile
- **Tokens de convite**: UUID aleatorio, expiracao de 7 dias
- **Senhas**: Minimo 6 caracteres, validacao no Firebase

### 2. UX

- **Slug automatico**: Gerar a partir do nome, mas permitir edicao
- **Fallback de email**: Se falhar envio, mostrar link para copiar
- **Sem confirmacao de email**: Usuario acessa imediatamente
- **Toast de feedback**: Informar sucesso/erro de cada acao

### 3. Performance

- **Indices no banco**: Token do convite, email, company_id
- **Lazy loading**: Carregar dados apenas quando necessario
- **Cache de profile**: Evitar multiplas queries

### 4. Manutencao

- **Logs de debug**: Console.log com prefixo `[Component]`
- **Tratamento de erros**: Try/catch com mensagens amigaveis
- **Tipagem forte**: TypeScript em todo o projeto

---

## Checklist para Novos Projetos

Use este checklist ao implementar multi-tenancy em um novo projeto:

### Banco de Dados

- [ ] Tabela `companies` com slug unico
- [ ] Tabela `profiles` com id TEXT (Firebase UID)
- [ ] Tabela `company_members` com user_id e company_id
- [ ] Tabela `invites` com token, expires_at, accepted_at
- [ ] Coluna `company_id` em todas tabelas de dados
- [ ] RLS policies para isolamento de dados
- [ ] Indices em colunas de busca frequente

### Autenticacao

- [ ] Firebase Auth configurado (Email + Google)
- [ ] AuthContext com sincronizacao Firebase/Supabase
- [ ] Logica de Super Admin por email
- [ ] SignUp sem confirmacao de email
- [ ] Refresh de profile apos acoes

### Frontend

- [ ] Rotas `/admin/*` para Super Admin
- [ ] Rotas `/app/:slug/*` para tenants
- [ ] Guards de rota (ProtectedRoute, SuperAdminRoute)
- [ ] Pagina de criacao de empresas
- [ ] Modal de convite com email
- [ ] Pagina de aceitar convite

### Envio de Email

- [ ] Edge Function para envio
- [ ] MailerSend (ou alternativa) configurado
- [ ] Template HTML do convite
- [ ] Fallback para copiar link

### Testes

- [ ] Fluxo de Super Admin criar empresa
- [ ] Fluxo de Super Admin convidar admin
- [ ] Fluxo de aceitar convite
- [ ] Verificar isolamento de dados entre empresas
- [ ] Verificar permissoes por papel

---

## Referencias

- [README.md](../README.md) - Documentacao principal
- [ARCHITECTURE.md](ARCHITECTURE.md) - Arquitetura do sistema
- [SETUP.md](SETUP.md) - Guia de instalacao
- [FIREBASE_AUTH.md](FIREBASE_AUTH.md) - Integracao Firebase

---

## Conclusao

Este modelo de multi-tenancy com Super Admin pode ser replicado em outros projetos SaaS seguindo os padroes aqui documentados. Os principais pontos sao:

1. **Isolamento via RLS**: Seguro e escalavel
2. **Super Admin por email**: Simples de configurar
3. **Convites com token**: Onboarding seguro
4. **Firebase + Supabase**: Melhor de dois mundos
5. **Rotas por slug**: URLs amigaveis e SEO-friendly

Para adaptar a outro projeto, basta substituir as entidades de negocio (produtos, vendas, etc) mantendo a estrutura de empresas, usuarios e convites.
