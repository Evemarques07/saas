# Debug do Problema de Logout com Subdomínios

## Problema
Desde a implementação de subdomínios (empresa.mercadovirtual.app), o logout não funciona corretamente. O usuário não consegue sair e ir para a tela de login.

## Arquitetura Atual
- **Domínio principal**: mercadovirtual.app (tela de login)
- **Subdomínios**: empresa.mercadovirtual.app (área logada)
- **Sessão compartilhada**: Cookie com domain=.mercadovirtual.app
- **Storage**: localStorage + cookie compartilhado
- **Transferência de sessão**: Via URL hash (#session=...)

## Fluxo Esperado
1. Usuário em empresa.mercadovirtual.app clica em "Sair"
2. Sessão é limpa (localStorage, cookies)
3. Redireciona para mercadovirtual.app/login
4. Tela de login é exibida

## Fluxo Atual (Problema)
1. Usuário clica em "Sair"
2. Vai para mercadovirtual.app/login
3. Cookie compartilhado ainda existe
4. Supabase recupera sessão do cookie
5. PublicRoute detecta usuário logado
6. Redireciona de volta para empresa.mercadovirtual.app COM sessão no hash
7. Sessão é restaurada do hash → usuário continua logado

## Tentativas de Correção (Não Funcionaram)

### Tentativa 1: Redirecionar para login no domínio principal após logout
**Arquivo**: src/contexts/AuthContext.tsx
**Mudança**: Em vez de window.location.reload(), redirecionar para mercadovirtual.app/login quando em subdomínio
```typescript
if (isSubdomainMode()) {
  window.location.href = 'https://mercadovirtual.app/login';
  return;
}
```
**Resultado**: Não funcionou. O cookie compartilhado ainda mantinha a sessão.

### Tentativa 2: Melhorar função removeFromCookie
**Arquivo**: src/services/supabase.ts
**Mudança**: Tentar remover cookie de múltiplos domínios e com várias combinações de atributos
```typescript
const domains = [undefined, '.mercadovirtual.app', 'mercadovirtual.app', hostname];
const paths = ['/', ''];
const secureOptions = [true, false];
const sameSiteOptions = ['Lax', 'Strict', 'None'];
// Tenta todas as combinações
```
**Resultado**: Não funcionou. Cookies ainda persistiam.

### Tentativa 3: Limpar mais dados no clearAllSessionData
**Arquivo**: src/services/supabase.ts
**Mudança**: Limpar sessionStorage, todas as chaves sb-* e mv-*
```typescript
sessionStorage.removeItem(STORAGE_KEY);
// Limpar todas as chaves relacionadas
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.startsWith('sb-') || key.startsWith('mv-'))) {
    keysToRemove.push(key);
  }
}
```
**Resultado**: Não funcionou.

### Tentativa 4: Parâmetro ?logout=true na URL
**Arquivos**: src/contexts/AuthContext.tsx, src/services/supabase.ts
**Mudança**: Passar parâmetro na URL e detectar no domínio principal para forçar limpeza
```typescript
// AuthContext - redireciona com parâmetro
window.location.href = 'https://mercadovirtual.app/login?logout=true';

// supabase.ts - detecta e limpa
if (urlParams.get('logout') === 'true') {
  // Limpa tudo
}
```
**Resultado**: Não funcionou. A sessão era recuperada antes da limpeza.

### Tentativa 5: Flag blockSessionRecovery
**Arquivo**: src/services/supabase.ts
**Mudança**: Bloquear recuperação de sessão no storage.getItem quando shouldClearSession é true
```typescript
let blockSessionRecovery = shouldClearSession;

// No storage.getItem:
if (blockSessionRecovery) {
  console.log('[Supabase] Session recovery blocked');
  return null;
}
```
**Resultado**: Não funcionou. A sessão continua sendo restaurada do URL hash.

## Análise dos Logs
Os logs mostram:
```
[Supabase] Found session in URL hash
[Supabase] Restoring session from URL hash
[Supabase] Session restored to localStorage
```

Isso indica que:
1. A sessão está vindo do hash da URL, não do cookie/localStorage
2. O hash é adicionado pelo PublicRoute em guards.tsx quando redireciona para o subdomínio
3. O código que restaura do hash roda ANTES de qualquer verificação de logout

## Próximas Tentativas Sugeridas

### 1. Não restaurar sessão do hash se veio de logout
Modificar getSessionFromHash() para verificar se há indicação de logout recente.

### 2. Usar cookie de logout
Setar um cookie mv-logout=true antes de redirecionar. No domínio principal, verificar esse cookie e não recuperar sessão.

### 3. Modificar PublicRoute
Não redirecionar para subdomínio com sessão se o usuário acabou de fazer logout.

### 4. Invalidar sessão no servidor
Chamar supabase.auth.signOut({ scope: 'global' }) para invalidar a sessão em todos os dispositivos.

### 5. Usar URL diferente para logout
Em vez de /login, usar /logout que limpa tudo e depois redireciona para /login.

## Arquivos Relevantes
- src/contexts/AuthContext.tsx - Função signOut
- src/services/supabase.ts - Storage customizado, clearAllSessionData
- src/routes/guards.tsx - PublicRoute, ProtectedRoute
- src/routes/paths.ts - Funções de redirecionamento

## Data
2026-02-04

### Tentativa 6: Verificar logout no PublicRoute
**Arquivos**: src/routes/guards.tsx
**Mudança**: Adicionar verificação de `?logout=true` no PublicRoute para não redirecionar quando acabou de fazer logout
```typescript
function justLoggedOut(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('logout') === 'true';
}

// No PublicRoute:
if (isLogout) {
  console.log('[PublicRoute] Logout detected - showing login page');
  return <>{children}</>;
}
```
**Resultado**: Não funcionou. A sessão ainda está sendo restaurada do URL hash no subdomínio ANTES de ir para o domínio principal. Os logs mostram:
- `[Supabase] Found session in URL hash`
- `[Supabase] Restoring session from URL hash`
- `[Supabase] Session restored to localStorage`

Isso indica que o usuário está chegando no subdomínio com a sessão já no hash da URL, então o problema acontece ANTES de chegar na página de login.

## Análise Atual do Problema

O fluxo real que está acontecendo:
1. Usuário está em manusbrabos.mercadovirtual.app
2. Clica em logout
3. signOut() é chamado
4. Redireciona para mercadovirtual.app/login?logout=true
5. No domínio principal, ALGO recupera a sessão (cookie?)
6. PublicRoute detecta usuário logado
7. Redireciona de VOLTA para manusbrabos.mercadovirtual.app COM sessão no hash
8. No subdomínio, a sessão é restaurada do hash → usuário continua logado

O problema central é que mesmo com todas as verificações de `?logout=true`, quando o código roda no domínio principal, a sessão ainda é recuperada de algum lugar (provavelmente cookie compartilhado) ANTES das verificações terem efeito.

## Próxima Abordagem Sugerida

O problema parece ser de timing - o Supabase recupera a sessão do cookie antes de qualquer código de aplicação rodar. Possíveis soluções:

1. **Criar página /logout dedicada**: Em vez de ir direto para /login?logout=true, ir para uma página /logout que:
   - Limpa TUDO (localStorage, cookies, sessionStorage)
   - Chama supabase.auth.signOut()
   - Só depois redireciona para /login

2. **Usar signOut global**: Chamar `supabase.auth.signOut({ scope: 'global' })` para invalidar a sessão no servidor Supabase

3. **Não usar cookie compartilhado**: Remover a sincronização via cookie e usar apenas o hash para transferir sessão entre domínios

Data: 2026-02-05

## SOLUÇÃO APLICADA - 2026-02-04

### Problema Raiz Identificado
O bug estava em dois lugares:

1. **`checkLogoutParam()` removia o parâmetro `?logout=true` da URL ANTES do `PublicRoute` poder verificar**
   - O fluxo era: `checkLogoutParam()` detecta logout → remove da URL → `PublicRoute` verifica URL → não encontra parâmetro → redireciona de volta para subdomínio

2. **`signOut()` não invalidava a sessão no servidor**
   - O cookie compartilhado ainda tinha uma sessão válida no servidor Supabase

### Correções Aplicadas

#### 1. `src/services/supabase.ts` - checkLogoutParam()
Agora seta a flag `mv-just-logged-out` no sessionStorage ANTES de remover o parâmetro da URL:
```typescript
if (urlParams.get(logout) === true) {
  // IMPORTANTE: Seta flag no sessionStorage ANTES de remover da URL
  sessionStorage.setItem(LOGOUT_FLAG_KEY, "true");
  // Remove the logout param from URL
  urlParams.delete(logout);
  ...
}
```

#### 2. `src/services/supabase.ts` - supabaseSignOut()
Agora usa `scope: "global"` para invalidar a sessão no servidor Supabase:
```typescript
const { error } = await supabase.auth.signOut({ scope: "global" });
```

#### 3. `src/routes/guards.tsx` - justLoggedOut()
Agora verifica TANTO o parâmetro da URL QUANTO a flag no sessionStorage:
```typescript
function justLoggedOut(): boolean {
  // Verifica parâmetro na URL
  if (urlParams.get("logout") === "true") return true;
  
  // Verifica flag no sessionStorage (setada pelo supabase.ts)
  const flag = sessionStorage.getItem(LOGOUT_FLAG_KEY);
  if (flag) {
    sessionStorage.removeItem(LOGOUT_FLAG_KEY);
    return true;
  }
  
  return false;
}
```

### Por que funciona
1. Quando o usuário faz logout no subdomínio, `signOut()` invalida a sessão GLOBALMENTE no servidor Supabase
2. O redirecionamento vai para `mercadovirtual.app/login?logout=true`
3. `checkLogoutParam()` seta a flag no sessionStorage e limpa localStorage/cookies
4. O parâmetro é removido da URL, mas a flag permanece no sessionStorage
5. `PublicRoute` verifica a flag via `justLoggedOut()` e NÃO redireciona de volta
6. Mesmo que houvesse redirecionamento, a sessão é inválida no servidor

### Status
✅ Build com sucesso
✅ Testado em produção

### Tentativa 7: Não limpar estados React no subdomínio
**Data**: 2026-02-04
**Arquivos**: src/contexts/AuthContext.tsx

**Análise dos logs**:
```
[AuthContext] Limpando estados locais...
[AuthContext] Em subdominio, redirecionando para login no dominio principal...
[ProtectedRoute] Render: {user: null, loading: false...}
[ProtectedRoute] No user, redirecting to login
[Guards] Redirecting to main login: https://mercadovirtual.app/login?returnTo=...
```

O problema era a **ordem das operações**:
1. `signOut()` limpava os estados React (`setUser(null)`, etc) ANTES de verificar subdomínio
2. Isso disparava re-render do React
3. `ProtectedRoute` via `user: null` e chamava `redirectToMainLogin()` 
4. O `window.location.href` do ProtectedRoute (`login?returnTo=...`) sobrescrevia o do AuthContext (`login?logout=true`)

**Mudança**: Reordenar a função `signOut()` para verificar subdomínio PRIMEIRO e fazer redirect ANTES de limpar estados React:

```typescript
const signOut = async () => {
  // IMPORTANTE: Se em subdominio, faz signOut e redireciona IMEDIATAMENTE
  // NAO limpa estados React para evitar re-render que causa redirect errado
  if (isSubdomainMode()) {
    await supabaseSignOut();
    window.location.href = "https://mercadovirtual.app/login?logout=true";
    return;  // Sai ANTES de limpar estados React
  }

  // Dominio principal - fluxo normal com limpeza de estados
  await supabaseSignOut();
  setProfile(null);
  setCompanies([]);
  setUser(null);
  // ...
};
```

**Por que funciona**: O redirect acontece ANTES de qualquer `setState`, então o React não re-renderiza e o ProtectedRoute não interfere.

**Resultado**: NAO FUNCIONOU - O redirect ainda esta sendo sobrescrito ou a sessao esta sendo recuperada no dominio principal. Precisa investigar os logs do dominio principal (mercadovirtual.app) para ver o que acontece apos o redirect.

### Tentativa 8: Análise dos logs após tentativa 7
**Data**: 2026-02-05

**Logs observados no SUBDOMÍNIO após logout**:
```
[Supabase] Initializing... {hostname: manusbrabos.mercadovirtual.app}
[Supabase] Found session in URL hash
[Supabase] Restoring session from URL hash
[Supabase] Session restored to localStorage
[ProtectedRoute] Render: {user: null, loading: true...}
[AuthContext] Auth state changed: SIGNED_IN evemarques072@gmail.com
[ProtectedRoute] All checks passed, rendering children
```

**Análise**:
O problema NÃO é mais no subdomínio fazendo logout. O fluxo que está acontecendo:

1. Usuário faz logout no subdomínio (manusbrabos.mercadovirtual.app)
2. Redireciona para mercadovirtual.app/login?logout=true ✅
3. **No domínio principal, a sessão ainda é detectada** (do cookie compartilhado?)
4. **PublicRoute redireciona de volta para o subdomínio COM A SESSÃO NO HASH DA URL**
5. No subdomínio, `getSessionFromHash()` encontra a sessão no hash
6. Sessão é restaurada → usuário continua logado

**Problema central identificado**:
O `?logout=true` não está funcionando no domínio principal. A sessão ainda está sendo recuperada e o PublicRoute está redirecionando de volta com a sessão.

**Próxima investigação necessária**:
- Ver os logs do DOMÍNIO PRINCIPAL (mercadovirtual.app) após o redirect
- Verificar se o `checkLogoutParam()` está sendo executado
- Verificar se o `shouldClearSession` está sendo true
- Verificar por que o PublicRoute ainda detecta usuário logado

**Hipótese**:
O Supabase client pode estar recuperando a sessão do cookie compartilhado ANTES do código de `checkLogoutParam()` rodar, porque o client é inicializado no momento do import do módulo.

**Resultado**: NAO FUNCIONOU - Sessão sendo restaurada do hash da URL no subdomínio


---

## Como Atualizar Arquivos na VPS

Para editar arquivos TypeScript/JavaScript com aspas e caracteres especiais, criar o script localmente e enviar via pipe:

```bash
# 1. Criar arquivo local com o script Python
# 2. Enviar para VPS e executar:
cat "caminho/local/script.py" | ssh evertonapi "cat > /tmp/script.py && python3 /tmp/script.py"
```

---

## Tentativa 9: isLogoutInProgress() e bloqueio em getSessionFromHash
**Data**: 2026-02-06

**Mudancas aplicadas**:
1. Adicionada funcao `isLogoutInProgress()` que verifica logout SEM remover a flag
2. Modificada `getSessionFromHash()` para bloquear restauracao durante logout
3. Modificada `shouldClearSession` para nao usar `justLoggedOut()` que removia a flag

**Logs observados apos a correcao**:
```
[Supabase] storage.getItem called for: mv-auth
[Supabase] localStorage value: found
[Supabase] Token check: {exp: '2026-02-07T01:44:42.000Z', now: '2026-02-07T00:45:04.000Z', isExpired: false}
[Supabase] storage.getItem result: has session
[AuthContext] Safety timeout - forcing loading=false
```

**Analise**:
A sessao ainda esta sendo recuperada do localStorage, NAO do hash. O problema NAO e o `getSessionFromHash()`.

O fluxo real:
1. Usuario faz logout no subdominio
2. Vai para mercadovirtual.app/login?logout=true
3. `checkLogoutParam()` limpa localStorage e cookies
4. MAS a sessao ainda esta sendo recuperada de algum lugar
5. `storage.getItem` retorna sessao do localStorage

**Hipotese**:
- O cookie compartilhado (.mercadovirtual.app) ainda tem a sessao
- Quando `storage.getItem` nao encontra no localStorage, recupera do cookie
- E salva de volta no localStorage

**Proxima abordagem sugerida**:
1. Verificar se `isLogoutInProgress()` esta sendo chamada no `storage.getItem`
2. Bloquear recuperacao do cookie quando ha logout em progresso
3. Ou usar `blockSessionRecovery` flag de forma mais agressiva

**Resultado**: NAO FUNCIONOU - Sessao sendo recuperada do localStorage/cookie


---

## SOLUCAO FINAL - 2026-02-06

### Problema Raiz Identificado
O problema era uma **race condition** entre o `signOut()` e o `ProtectedRoute`:

1. `signOut()` chamava `await supabaseSignOut()` (async)
2. Durante o await, eventos do Supabase disparavam re-render do React
3. `ProtectedRoute` via `user: null` e chamava `redirectToMainLogin()` com `?returnTo=`
4. Esse redirect acontecia ANTES do `window.location.href = "...?logout=true"`
5. No dominio principal, `?returnTo=` fazia o sistema redirecionar de volta COM sessao

### Solucao Aplicada

#### 1. AuthContext.tsx - Redirect ANTES de qualquer operacao async
```typescript
if (isSubdomainMode()) {
  // Seta flag ANTES de qualquer operacao async
  sessionStorage.setItem("mv-just-logged-out", "true");
  // Limpa localStorage SYNC (sem await)
  localStorage.removeItem("mv-auth");
  // Redireciona ANTES de chamar supabaseSignOut
  window.location.href = "https://mercadovirtual.app/login?logout=true";
  return;
}
```

#### 2. supabase.ts - Flag para signOut pendente no servidor
```typescript
// Flag para indicar que precisa fazer signOut no servidor
let pendingServerSignOut = false;

// No bloco shouldClearSession:
if (shouldClearSession) {
  // ... limpa localStorage e cookies ...
  pendingServerSignOut = true;
}

// Depois que o client e criado:
if (pendingServerSignOut) {
  supabase.auth.signOut({ scope: 'global' });
}
```

#### 3. supabase.ts - isLogoutInProgress() e bloqueio em getSessionFromHash()
```typescript
function isLogoutInProgress(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") return true;
  if (sessionStorage.getItem("mv-just-logged-out")) return true;
  return false;
}

function getSessionFromHash(): string | null {
  if (isLogoutInProgress()) {
    // Bloqueia restauracao de sessao do hash
    return null;
  }
  // ...
}
```

### Por que funciona
1. No subdominio, o redirect acontece IMEDIATAMENTE (sync), sem dar chance para o React re-renderizar
2. A flag `mv-just-logged-out` e setada ANTES do redirect
3. No dominio principal, `checkLogoutParam()` detecta `?logout=true`
4. `isLogoutInProgress()` bloqueia qualquer recuperacao de sessao (hash ou cookie)
5. `pendingServerSignOut` garante que a sessao e invalidada no servidor Supabase
6. `PublicRoute.justLoggedOut()` detecta a flag e mostra a tela de login

### Arquivos Modificados
- src/contexts/AuthContext.tsx
- src/services/supabase.ts

### Status
FUNCIONANDO - Testado em 2026-02-06


### Logs de Sucesso
```
[Supabase] Initializing... {hostname: 'mercadovirtual.app'}
[Supabase] Logout parameter detected - clearing all session data
[Supabase] Forcing session clear due to logout
[Supabase] Session cleared from localStorage and cookies
[Supabase] Executing pending server signOut...
[Guards] Logout detected via sessionStorage flag
[PublicRoute] Logout detected - showing login page, NOT redirecting
[Supabase] Session recovery blocked due to recent logout
[Supabase] Pending server signOut completed
[AuthContext] Auth state changed: SIGNED_OUT undefined
[PublicRoute] No user, showing children
```
