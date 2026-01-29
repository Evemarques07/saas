# Migracao Firebase Auth para Supabase Auth

Este documento descreve o plano de migracao do sistema de autenticacao de Firebase Auth para Supabase Auth.

## Motivacao

1. **Realtime nao funciona** - RLS policies usam JWT Supabase, mas app usa Firebase Auth
2. **Arquitetura simplificada** - Remover dependencia do Firebase
3. **Seguranca** - Restaurar RLS policies apropriadas (atualmente permissivas)
4. **Custo** - Eliminar custos do Firebase

---

## Status da Migracao

- [x] Documentacao criada
- [x] Fase 1: Criar servico Supabase Auth
- [x] Fase 2: Migrar AuthContext
- [x] Fase 3: Migrar paginas de autenticacao
- [x] Fase 4: Atualizar componentes (Headers)
- [x] Fase 5: Atualizar pagina de configuracoes
- [x] Fase 6: Atualizar services (asaas, whatsapp)
- [x] Fase 7: Atualizar Edge Functions
- [x] Fase 8: Restaurar RLS policies
- [ ] Fase 9: Testes e cleanup
- [x] Fase 10: Remover Firebase

### Migracao Concluida em 28/01/2026

Arquivos modificados:
- `src/services/supabase.ts` - Funcoes de auth adicionadas
- `src/contexts/AuthContext.tsx` - Reescrito para Supabase
- `src/modules/auth/LoginPage.tsx` - Atualizado
- `src/modules/auth/RegisterPage.tsx` - Atualizado
- `src/modules/auth/AcceptInvitePage.tsx` - Atualizado
- `src/modules/auth/AuthCallbackPage.tsx` - Criado (OAuth callback)
- `src/routes/index.tsx` - Rota /auth/callback adicionada
- `src/components/layout/Header.tsx` - Atualizado avatar
- `src/modules/settings/SettingsPage.tsx` - Removido Firebase
- `src/services/asaas.ts` - Usando Supabase token
- `src/services/whatsapp.ts` - Usando Supabase token
- `supabase/functions/asaas-billing/index.ts` - Validacao Supabase JWT
- `supabase/functions/wuzapi-admin/index.ts` - Validacao Supabase JWT
- `supabase/migrations/20260128000002_supabase_auth_rls.sql` - RLS atualizado

Arquivos removidos:
- `src/services/firebase.ts` - Removido

Dependencias removidas:
- `firebase` - Removido do package.json

---

## Arquivos Afetados

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/services/supabase.ts` | Exportar auth do Supabase |
| `src/contexts/AuthContext.tsx` | Trocar Firebase por Supabase Auth |
| `src/modules/auth/LoginPage.tsx` | Usar Supabase signIn |
| `src/modules/auth/RegisterPage.tsx` | Usar Supabase signUp |
| `src/modules/auth/AcceptInvitePage.tsx` | Usar Supabase signUp |
| `src/components/layout/Header.tsx` | Usar Supabase signOut |
| `src/components/layout/AdminHeader.tsx` | Usar Supabase signOut |
| `src/modules/settings/SettingsPage.tsx` | Usar Supabase updateUser |
| `src/services/asaas.ts` | Usar Supabase getSession |
| `src/services/whatsapp.ts` | Usar Supabase getSession |
| `supabase/functions/asaas-billing/index.ts` | Validar JWT Supabase |
| `supabase/functions/asaas-webhook/index.ts` | Manter (nao usa auth) |

### Arquivos a Remover

| Arquivo | Razao |
|---------|-------|
| `src/services/firebase.ts` | Nao mais necessario |
| `docs/FIREBASE_AUTH.md` | Documentacao obsoleta |

### Migrations SQL a Criar

| Migration | Descricao |
|-----------|-----------|
| `20260128100001_restore_rls_policies.sql` | Restaurar RLS com auth.uid() |

---

## Fase 1: Criar Servico Supabase Auth

### 1.1 Atualizar `src/services/supabase.ts`

Exportar funcoes de autenticacao do Supabase:

```typescript
// Adicionar exports de auth
export const supabaseAuth = supabase.auth;

// Helper functions
export async function supabaseSignIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function supabaseSignUp(email: string, password: string, metadata?: { full_name?: string }) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
}

export async function supabaseSignInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/auth/callback' }
  });
}

export async function supabaseSignOut() {
  return supabase.auth.signOut();
}

export async function supabaseResetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/auth/reset-password'
  });
}

export async function supabaseUpdatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

export async function supabaseGetSession() {
  return supabase.auth.getSession();
}

export function supabaseOnAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
```

---

## Fase 2: Migrar AuthContext

### 2.1 Atualizar `src/contexts/AuthContext.tsx`

Principais mudancas:

1. Remover imports do Firebase
2. Usar `supabase.auth.onAuthStateChange` em vez de `onAuthStateChanged`
3. Usar `session.user` em vez de `firebaseUser`
4. User ID agora e UUID (nao mais string do Firebase)
5. Atualizar funcoes signIn, signUp, signOut

```typescript
// ANTES (Firebase)
import { auth, onAuthStateChanged } from '../services/firebase';

// DEPOIS (Supabase)
import { supabase } from '../services/supabase';
```

### 2.2 Mapeamento de Funcoes

| Firebase | Supabase |
|----------|----------|
| `onAuthStateChanged(auth, callback)` | `supabase.auth.onAuthStateChange(callback)` |
| `signInWithEmailAndPassword(auth, email, password)` | `supabase.auth.signInWithPassword({ email, password })` |
| `createUserWithEmailAndPassword(auth, email, password)` | `supabase.auth.signUp({ email, password })` |
| `signInWithPopup(auth, googleProvider)` | `supabase.auth.signInWithOAuth({ provider: 'google' })` |
| `signOut(auth)` | `supabase.auth.signOut()` |
| `sendPasswordResetEmail(auth, email)` | `supabase.auth.resetPasswordForEmail(email)` |
| `updatePassword(user, newPassword)` | `supabase.auth.updateUser({ password })` |
| `user.getIdToken()` | `session.access_token` |
| `user.uid` | `session.user.id` |
| `user.email` | `session.user.email` |
| `user.displayName` | `session.user.user_metadata.full_name` |
| `user.photoURL` | `session.user.user_metadata.avatar_url` |

---

## Fase 3: Migrar Paginas de Autenticacao

### 3.1 LoginPage.tsx

- Remover Google popup (Supabase usa redirect)
- Atualizar error handling para erros Supabase
- Manter UI igual

### 3.2 RegisterPage.tsx

- Usar `supabase.auth.signUp` com metadata
- Profile sera criado automaticamente via trigger (ou no callback)
- Atualizar error handling

### 3.3 AcceptInvitePage.tsx

- Usar `supabase.auth.signUp`
- Atualizar logica de criar profile e company_member

---

## Fase 4: Atualizar Componentes

### 4.1 Header.tsx e AdminHeader.tsx

- Usar `signOut` do AuthContext (que agora usa Supabase)
- Nenhuma mudanca significativa na UI

---

## Fase 5: Atualizar Settings

### 5.1 SettingsPage.tsx

Mudancas para troca de senha:

```typescript
// ANTES (Firebase)
const credential = EmailAuthProvider.credential(user.email, currentPassword);
await reauthenticateWithCredential(auth.currentUser, credential);
await updatePassword(auth.currentUser, newPassword);

// DEPOIS (Supabase)
// Supabase nao requer reautenticacao para trocar senha se ja logado
await supabase.auth.updateUser({ password: newPassword });
```

---

## Fase 6: Atualizar Services

### 6.1 asaas.ts

```typescript
// ANTES
import { auth } from './firebase';
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// DEPOIS
import { supabase } from './supabase';
async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return session.access_token;
}
```

### 6.2 whatsapp.ts

Mesma mudanca do asaas.ts.

---

## Fase 7: Atualizar Edge Functions

### 7.1 asaas-billing/index.ts

Trocar validacao de Firebase JWT para Supabase JWT:

```typescript
// ANTES - Decodifica Firebase JWT manualmente
function decodeFirebaseToken(idToken: string) { ... }

// DEPOIS - Usar Supabase para validar
import { createClient } from '@supabase/supabase-js';

async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, error: 'Token ausente' };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { authorized: false, error: 'Token invalido' };
  }

  return {
    authorized: true,
    userId: user.id,
    email: user.email,
  };
}
```

---

## Fase 8: Restaurar RLS Policies

### 8.1 Criar Migration

Criar `supabase/migrations/20260128100001_restore_rls_policies.sql`:

```sql
-- Restaurar RLS policies usando auth.uid()

-- Helper function
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(company_id)
  FROM company_members
  WHERE user_id = auth.uid()::text
  AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
DROP POLICY IF EXISTS "profiles_all" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid()::text);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid()::text);

-- Companies
DROP POLICY IF EXISTS "companies_select_all" ON companies;
CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  USING (id = ANY(get_user_company_ids()) OR is_active = true);

-- Products (exemplo)
DROP POLICY IF EXISTS "products_all" ON products;
CREATE POLICY "Users can view company products"
  ON products FOR SELECT
  USING (company_id = ANY(get_user_company_ids()) OR (is_active = true AND show_in_catalog = true));
CREATE POLICY "Users can manage company products"
  ON products FOR ALL
  USING (company_id = ANY(get_user_company_ids()));

-- Subscriptions (ja esta correto, usa JWT claims)
-- Apenas garantir que auth.uid() funcione
```

---

## Fase 9: Testes

### Checklist de Testes

- [ ] Login com email/senha
- [ ] Login com Google
- [ ] Registro de novo usuario
- [ ] Logout
- [ ] Recuperacao de senha
- [ ] Troca de senha
- [ ] Aceitar convite
- [ ] Criar assinatura (billing)
- [ ] Webhook atualiza status
- [ ] Realtime funciona
- [ ] RLS bloqueia acesso nao autorizado

---

## Fase 10: Remover Firebase

### 10.1 Arquivos a Remover

```bash
rm src/services/firebase.ts
rm docs/FIREBASE_AUTH.md
```

### 10.2 Dependencias a Remover

```bash
npm uninstall firebase
```

### 10.3 Variaveis de Ambiente a Remover

```env
# Remover do .env
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

---

## Configuracao do Supabase Auth

### Habilitar Providers

No Supabase Dashboard > Authentication > Providers:

1. **Email** - Ja habilitado
2. **Google** - Configurar OAuth credentials

### Configurar Google OAuth

1. Acesse Google Cloud Console
2. Crie OAuth 2.0 credentials
3. Adicione redirect URI: `https://jyjkeqnmofzjnzpvkugl.supabase.co/auth/v1/callback`
4. Copie Client ID e Secret para o Supabase

### Configurar Emails

No Supabase Dashboard > Authentication > Email Templates:

- Confirmation email
- Password reset email
- Magic link email (opcional)

---

## Rollback

Se precisar reverter:

1. Restaurar `src/services/firebase.ts` do git
2. Restaurar `src/contexts/AuthContext.tsx` do git
3. Nao aplicar a migration de RLS
4. Manter Firebase Auth

```bash
git checkout HEAD~1 -- src/services/firebase.ts src/contexts/AuthContext.tsx
```

---

## Estimativa de Tempo

| Fase | Tempo Estimado |
|------|----------------|
| Fase 1-2 | 30 min |
| Fase 3 | 20 min |
| Fase 4-5 | 15 min |
| Fase 6 | 10 min |
| Fase 7 | 20 min |
| Fase 8 | 30 min |
| Fase 9 | 30 min |
| Fase 10 | 5 min |
| **Total** | **~2.5 horas** |

---

## Referencias

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
