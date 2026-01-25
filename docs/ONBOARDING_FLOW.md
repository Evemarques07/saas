# Fluxo de Onboarding - Mercado Virtual

## Visao Geral

O sistema de onboarding permite que novas empresas criem suas proprias contas de forma autonoma, sem necessidade de intervencao do Super Admin.

## Fluxos de Entrada

### Fluxo 1: Self-Service (Novo)

```
Landing Page → Cadastro → Onboarding Wizard → Dashboard
```

1. Usuario acessa `/inicio` ou `/`
2. Clica em "Comecar Gratis"
3. Preenche dados pessoais (nome, email, senha)
4. Redirecionado para `/onboarding`
5. Wizard em 3 passos:
   - **Step 1**: Nome da loja + Slug
   - **Step 2**: Segmentos do negocio
   - **Step 3**: Logo (opcional)
6. Empresa criada, usuario vira admin
7. Dashboard com checklist de ativacao

### Fluxo 2: Convite (Existente)

```
Email Convite → Aceitar Convite → Dashboard
```

1. Super Admin ou Admin de empresa envia convite
2. Usuario recebe email com link
3. Acessa `/aceitar-convite?token=xxx`
4. Cria conta e e automaticamente vinculado a empresa
5. Vai direto para o dashboard (sem onboarding wizard)

### Fluxo 3: Login com Google (Atualizado)

```
Landing/Login → Google Auth → Onboarding (se novo) → Dashboard
```

1. Usuario clica em "Entrar com Google"
2. Autentica via Google OAuth
3. Se nao tem empresas → vai para `/onboarding`
4. Se ja tem empresas → vai para dashboard

## Estrutura de Dados

### Campo Adicionado: profiles.onboarding_completed

```sql
ALTER TABLE profiles
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Marcar usuarios existentes como completos
UPDATE profiles p
SET onboarding_completed = TRUE
WHERE EXISTS (
  SELECT 1 FROM company_members cm
  WHERE cm.user_id = p.id
);
```

## Componentes

### OnboardingPage (`/src/modules/onboarding/OnboardingPage.tsx`)

Wizard de configuracao da empresa com 3 steps:

1. **StepCompanyName**: Nome e slug da loja
   - Valida disponibilidade do slug em tempo real
   - Bloqueia slugs reservados (admin, api, app, etc.)

2. **StepSegments**: Selecao de segmentos (multi-select)
   - Roupas, Calcados, Perfumaria, Cosmeticos
   - Acessorios, Joias e Bijuterias, Outros

3. **StepLogo**: Upload de logo (opcional)
   - Preview local antes do upload
   - Upload para Supabase Storage apos criacao da empresa

### OnboardingProgress (`/src/modules/onboarding/components/OnboardingProgress.tsx`)

Indicador visual de progresso com 3 etapas e linha de conexao animada.

### ActivationChecklist (`/src/components/dashboard/ActivationChecklist.tsx`)

Card exibido no dashboard com tarefas para o usuario completar:

- [ ] Cadastrar primeiro produto
- [ ] Personalizar catalogo
- [ ] Simular primeira venda
- [ ] Convidar equipe (opcional)

O checklist pode ser dispensado pelo usuario e fica oculto quando todas as tarefas sao concluidas.

## Guards de Rota

### OnboardingRoute (`/src/routes/guards.tsx`)

```tsx
export function OnboardingRoute({ children }) {
  const { user, loading, companies, isSuperAdmin } = useAuth();

  if (loading) return <LoadingScreen />;

  // Nao autenticado → login
  if (!user) return <Navigate to="/login" replace />;

  // Ja tem empresa → dashboard
  if (companies.length > 0) {
    return <Navigate to={`/app/${companies[0].slug}`} replace />;
  }

  // Super admin → admin dashboard
  if (isSuperAdmin) return <Navigate to="/admin" replace />;

  // Mostra onboarding
  return <>{children}</>;
}
```

### ProtectedRoute (Atualizado)

Agora redireciona usuarios sem empresa para `/onboarding`.

## Rotas

| Rota | Acesso | Descricao |
|------|--------|-----------|
| `/onboarding` | Autenticado sem empresa | Wizard de criacao |
| `/registro` | Publico | Cadastro de usuario |
| `/login` | Publico | Login |
| `/aceitar-convite` | Publico | Aceitar convite |
| `/app/:slug/*` | Autenticado com empresa | Area do tenant |
| `/admin/*` | Super Admin | Area administrativa |

## Seguranca

### Validacao de Slug

Slugs reservados que nao podem ser usados:
- admin, api, app, catalogo, login, registro, onboarding
- aceitar-convite, inicio, dashboard, www, mail, ftp, smtp
- support, help, blog, static, assets, cdn, media

### Verificacao de Disponibilidade

O slug e verificado em tempo real contra a tabela `companies` no Supabase com debounce de 500ms.

## Arquivos do Sistema

### Criados

| Arquivo | Descricao |
|---------|-----------|
| `src/modules/onboarding/OnboardingPage.tsx` | Wizard principal |
| `src/modules/onboarding/components/OnboardingProgress.tsx` | Indicador de progresso |
| `src/modules/onboarding/components/StepCompanyName.tsx` | Step 1: Nome e slug |
| `src/modules/onboarding/components/StepSegments.tsx` | Step 2: Segmentos |
| `src/modules/onboarding/components/StepLogo.tsx` | Step 3: Logo |
| `src/components/dashboard/ActivationChecklist.tsx` | Checklist de ativacao |

### Modificados

| Arquivo | Modificacao |
|---------|-------------|
| `src/types/index.ts` | Adicionado `onboarding_completed` ao Profile |
| `src/modules/auth/RegisterPage.tsx` | Redireciona para `/onboarding` |
| `src/routes/guards.tsx` | Adicionado `OnboardingRoute` |
| `src/routes/index.tsx` | Adicionada rota `/onboarding` |
| `src/modules/dashboard/DashboardPage.tsx` | Integrado checklist |

## Checklist de Implementacao

- [x] Documentacao do fluxo
- [x] Atualizar tipo Profile com `onboarding_completed`
- [x] Criar pagina OnboardingPage
- [x] Criar componentes dos steps (StepCompanyName, StepSegments, StepLogo)
- [x] Criar componente OnboardingProgress
- [x] Modificar RegisterPage para redirecionar ao onboarding
- [x] Criar guard OnboardingRoute
- [x] Atualizar rotas em index.tsx
- [x] Criar ActivationChecklist
- [x] Integrar checklist no Dashboard
- [ ] **Executar migracao SQL no Supabase** (pendente)

## Migracao Pendente

Execute o seguinte SQL no Supabase para completar a implementacao:

```sql
-- Adicionar campo de onboarding
ALTER TABLE profiles
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Marcar usuarios existentes com empresas como completos
UPDATE profiles p
SET onboarding_completed = TRUE
WHERE EXISTS (
  SELECT 1 FROM company_members cm
  WHERE cm.user_id = p.id
);
```
