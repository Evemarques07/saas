# Integracao Firebase Auth

Este documento descreve a integracao do Firebase Authentication com o Supabase para o sistema Ejym.

## Visao Geral

O sistema utiliza uma arquitetura hibrida:

- **Firebase Auth**: Responsavel pela autenticacao (login, signup, OAuth)
- **Supabase**: Responsavel pelo armazenamento de dados com RLS

### Por que Firebase Auth?

1. **Confiabilidade**: Firebase Auth e extremamente estavel
2. **OAuth Simplificado**: Login com Google, Facebook, etc. em minutos
3. **Sem Confirmacao de Email**: Usuarios podem acessar imediatamente
4. **Escalabilidade**: Suporta milhoes de usuarios

### Por que manter Supabase?

1. **PostgreSQL**: Banco de dados relacional robusto
2. **RLS**: Row Level Security para multi-tenancy
3. **Realtime**: Subscriptions em tempo real
4. **Storage**: Armazenamento de arquivos

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                     (React + Vite)                          │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      Firebase Auth      │     │        Supabase         │
│                         │     │                         │
│  - Email/Password       │     │  - profiles             │
│  - Google OAuth         │     │  - companies            │
│  - Token Management     │     │  - company_members      │
│                         │     │  - customers            │
│  Retorna: Firebase UID  │     │  - products             │
│           (string)      │     │  - sales                │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              │      Firebase UID             │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   profiles.id = Firebase UID  │
              │   (TEXT, nao UUID)            │
              └───────────────────────────────┘
```

---

## Configuracao

### 1. Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Crie um novo projeto ou selecione existente
3. Va em **Authentication** > **Sign-in method**
4. Ative os providers:
   - **Email/Password**: Ativar
   - **Google**: Ativar e configurar

### 2. Obter Credenciais

1. Va em **Project Settings** (engrenagem)
2. Scroll ate **Your apps**
3. Clique em **Web** (icone `</>`)
4. Registre o app (nao precisa de Hosting)
5. Copie o objeto `firebaseConfig`

### 3. Configurar Ambiente

Crie ou edite `.env.local`:

```env
VITE_FIREBASE_API_KEY=AIzaSyDOFm9CzYf92lxa_G-n7A0rT4yJqokwY1M
VITE_FIREBASE_AUTH_DOMAIN=saas-af55a.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=saas-af55a
VITE_FIREBASE_STORAGE_BUCKET=saas-af55a.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=789298373422
VITE_FIREBASE_APP_ID=1:789298373422:web:9981047cc31b07c34bd0bf
```

---

## Implementacao

### Servico Firebase (`src/services/firebase.ts`)

```typescript
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Funcoes exportadas
export async function firebaseSignIn(email: string, password: string): Promise<UserCredential>;
export async function firebaseSignUp(email: string, password: string, displayName: string): Promise<UserCredential>;
export async function firebaseSignInWithGoogle(): Promise<UserCredential>;
export async function firebaseSignOut(): Promise<void>;
export async function getFirebaseToken(): Promise<string | null>;

export { auth, onAuthStateChanged };
```

### AuthContext (`src/contexts/AuthContext.tsx`)

O AuthContext gerencia a sincronizacao entre Firebase e Supabase:

```typescript
// Ao detectar usuario Firebase, busca/cria profile no Supabase
const syncUserWithSupabase = async (firebaseUser: FirebaseUser) => {
  // Buscar profile por email
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', firebaseUser.email)
    .single();

  if (existingProfile) {
    setProfile(existingProfile);
    // Buscar empresas do usuario
    const { data: companiesData } = await supabase
      .from('company_members')
      .select(`*, company:companies(*)`)
      .eq('user_id', existingProfile.id);
    setCompanies(companiesData);
  }
};
```

---

## Fluxos de Autenticacao

### Login com Email/Senha

```
1. Usuario digita email e senha
2. firebaseSignIn(email, password)
3. Firebase valida credenciais
4. onAuthStateChanged dispara com usuario
5. syncUserWithSupabase busca profile
6. Usuario redirecionado para dashboard
```

### Login com Google

```
1. Usuario clica "Entrar com Google"
2. firebaseSignInWithGoogle()
3. Popup do Google abre
4. Usuario seleciona conta
5. Firebase retorna credenciais
6. Se profile nao existe, cria no Supabase
7. Usuario redirecionado para dashboard
```

### Aceitar Convite

```
1. Usuario acessa link com token
2. Valida convite no Supabase
3. Usuario preenche nome e senha
4. firebaseSignUp cria usuario
5. Cria profile no Supabase com Firebase UID
6. Adiciona usuario a empresa (company_members)
7. Marca convite como aceito
8. refreshProfile() atualiza estado
9. Usuario redirecionado para dashboard
```

---

## Mudancas no Banco de Dados

Para suportar Firebase UIDs (strings) em vez de UUIDs, foram feitas as seguintes alteracoes:

### Alteracao de Tipos

```sql
-- profiles.id: UUID -> TEXT
ALTER TABLE profiles ALTER COLUMN id TYPE TEXT;

-- company_members.user_id: UUID -> TEXT
ALTER TABLE company_members ALTER COLUMN user_id TYPE TEXT;

-- invites.invited_by: UUID -> TEXT
ALTER TABLE invites ALTER COLUMN invited_by TYPE TEXT;

-- sales.seller_id: UUID -> TEXT
ALTER TABLE sales ALTER COLUMN seller_id TYPE TEXT;
```

### Remocao de Foreign Keys

```sql
-- Remover FK de profiles para auth.users
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;

-- Remover FK de company_members para profiles
ALTER TABLE company_members DROP CONSTRAINT company_members_user_id_fkey;
```

---

## Seguranca

### RLS (Row Level Security)

As policies RLS continuam funcionando normalmente. O usuario e identificado pelo `user_id` (Firebase UID) em vez do `auth.uid()` do Supabase.

```sql
-- Exemplo de policy
CREATE POLICY "users_can_view_own_companies" ON company_members
  FOR SELECT USING (true);  -- Simplificado para permitir acesso
```

### Tokens

- **Firebase Token**: JWT gerado pelo Firebase, usado para autenticacao no frontend
- **Supabase Anon Key**: Usada para acessar o banco de dados com RLS

---

## Troubleshooting

### Erro: "auth/invalid-credential"

- Usuario nao existe no Firebase
- Senha incorreta
- Solucao: Verificar se usuario foi cadastrado

### Erro: "Profile not found"

- Usuario existe no Firebase mas nao no Supabase
- Solucao: O sistema cria automaticamente no login com Google

### Erro: "No companies"

- Usuario nao foi adicionado a nenhuma empresa
- Solucao: Super admin deve enviar convite

---

## Migracao de Supabase Auth para Firebase

Se voce tinha usuarios no Supabase Auth, eles precisarao:

1. Criar nova conta no Firebase
2. Admin deve reenviar convites
3. Dados no Supabase sao mantidos (apenas auth muda)

---

## Referencias

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Supabase Documentation](https://supabase.com/docs)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)
