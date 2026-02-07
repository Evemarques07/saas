# Debug do Problema de Login - Loop Infinito

## Data
2026-02-06

## Problema
Após implementar a correção do logout com subdomínios, o login entrou em loop infinito. O usuário só consegue acessar:
1. Abrindo uma guia anônima e fazendo login
2. Limpando os cookies e abrindo uma nova aba (entra direto)

## Contexto
Este problema surgiu após a correção do logout (ver LOGOUT_DEBUG.md - Solução Final 2026-02-06).

## Correções Aplicadas que Causaram o Problema

### 1. AuthContext.tsx - signOut() com redirect imediato
```typescript
if (isSubdomainMode()) {
  sessionStorage.setItem("mv-just-logged-out", "true");
  localStorage.removeItem("mv-auth");
  window.location.href = "https://mercadovirtual.app/login?logout=true";
  return;
}
```

### 2. supabase.ts - isLogoutInProgress()
```typescript
function isLogoutInProgress(): boolean {
  if (typeof window === "undefined") return false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("logout") === "true") return true;
  if (sessionStorage.getItem("mv-just-logged-out")) return true;
  return false;
}
```

### 3. supabase.ts - Bloqueio em getSessionFromHash()
```typescript
if (isLogoutInProgress()) {
  console.log('[Supabase] getSessionFromHash BLOCKED - logout in progress');
  return null;
}
```

### 4. supabase.ts - pendingServerSignOut
```typescript
let pendingServerSignOut = false;
// ... no bloco shouldClearSession:
pendingServerSignOut = true;
// ... depois do client criado:
if (pendingServerSignOut) {
  supabase.auth.signOut({ scope: 'global' });
}
```

### 5. supabase.ts - Verificação dinâmica no storage.getItem (tentativa de correção)
```typescript
getItem: (key) => {
  const justLoggedOutFlag = sessionStorage.getItem('mv-just-logged-out');
  const urlHasLogout = new URLSearchParams(window.location.search).get('logout') === 'true';
  if (justLoggedOutFlag || urlHasLogout) {
    console.log('[Supabase] Session recovery blocked due to recent logout');
    return null;
  }
  // ...
}
```

## Hipóteses do Problema

### Hipótese 1: Flag não está sendo removida
A flag `mv-just-logged-out` no sessionStorage pode não estar sendo removida corretamente pelo guards.tsx, fazendo com que todas as tentativas de recuperar sessão sejam bloqueadas.

### Hipótese 2: pendingServerSignOut invalida sessão nova
O `pendingServerSignOut` pode estar chamando `signOut({ scope: 'global' })` mesmo após um login novo, invalidando a sessão recém-criada.

### Hipótese 3: checkLogoutParam() persiste
O `shouldClearSession` pode estar sendo setado como true em situações onde não deveria.

## Arquivos Relevantes
- src/services/supabase.ts
- src/contexts/AuthContext.tsx
- src/routes/guards.tsx

## Próximos Passos Sugeridos

1. **Adicionar logs detalhados** para ver:
   - Quando a flag `mv-just-logged-out` é setada e removida
   - Quando `pendingServerSignOut` é executado
   - Estado do sessionStorage em cada operação

2. **Verificar guards.tsx** - Confirmar que `justLoggedOut()` está removendo a flag corretamente

3. **Revisar timing** - O `pendingServerSignOut` pode estar rodando depois de um login novo

4. **Isolar o problema** - Testar desabilitando cada correção uma por vez

## Como Alterar Arquivos na VPS

Mesmo metodo do LOGOUT_DEBUG - criar script Python local e enviar via pipe:

```bash
# 1. Criar arquivo local com script Python que faz as alteracoes
# 2. Enviar para VPS e executar:
cat "caminho/local/script.py" | ssh evertonapi "cat > /tmp/script.py && python3 /tmp/script.py"

# 3. Fazer build:
ssh evertonapi 'cd /var/www/mercadovirtual && npm run build'
```

Este metodo evita problemas com heredocs e caracteres especiais (aspas, crases, etc).

## SOLUCAO APLICADA - 2026-02-07

### Problema Raiz Identificado

O `sessionStorage` e **per-origin**. Cada subdominio tem seu proprio sessionStorage isolado:
- `mercadovirtual.app` -> sessionStorage A
- `manusbrabos.mercadovirtual.app` -> sessionStorage B

O fluxo quebrado era:
1. Logout em `manusbrabos.mercadovirtual.app` -> seta `mv-just-logged-out` no **sessionStorage B**
2. Redireciona para `mercadovirtual.app/login?logout=true` -> seta flag no **sessionStorage A**
3. `justLoggedOut()` no guards.tsx remove a flag do **sessionStorage A** (dominio principal)
4. Usuario faz login novamente
5. `PublicRoute` redireciona para `manusbrabos.mercadovirtual.app#session=...`
6. Ao carregar o subdominio, `getSessionFromHash()` chama `isLogoutInProgress()`
7. `isLogoutInProgress()` encontra a flag **velha** no **sessionStorage B** (nunca foi limpa!)
8. **Session hash e BLOQUEADA** -> usuario fica preso no loading infinito

### Correcao Aplicada

**Arquivo**: `src/services/supabase.ts` - `getSessionFromHash()`

**Logica**: Se ha um session hash na URL, significa que o usuario ACABOU de logar (o hash e gerado pelo `PublicRoute` no momento do redirect). Isso tem prioridade sobre qualquer flag de logout velha no sessionStorage.

**Antes** (bloqueava tudo se logout flag existisse):
```typescript
function getSessionFromHash(): string | null {
  if (typeof window === 'undefined') return null;

  // BLOQUEAVA AQUI - flag velha do logout anterior
  if (isLogoutInProgress()) {
    console.log('[Supabase] getSessionFromHash BLOCKED - logout in progress');
    if (window.location.hash && window.location.hash.includes('session=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    return null;
  }

  const hash = window.location.hash;
  if (!hash) return null;
  // ...
}
```

**Depois** (session hash tem prioridade, limpa flag velha):
```typescript
function getSessionFromHash(): string | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash;
  if (!hash) return null;

  const match = hash.match(/session=([^&]+)/);
  if (!match) return null;

  // Se ha session hash na URL, significa que o usuario ACABOU de logar.
  // Isso tem prioridade sobre qualquer flag de logout velha no sessionStorage
  // (que pode ter ficado de um logout anterior neste mesmo subdominio).
  const logoutFlag = sessionStorage.getItem('mv-just-logged-out');
  if (logoutFlag) {
    console.log('[Supabase] Clearing stale logout flag - new session arriving via hash');
    sessionStorage.removeItem('mv-just-logged-out');
  }

  try {
    const sessionData = decodeURIComponent(match[1]);
    console.log('[Supabase] Found session in URL hash');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return sessionData;
  } catch (err) {
    console.error('[Supabase] Error parsing session from hash:', err);
  }
  return null;
}
```

### Por que funciona

1. O bloqueio de logout continua funcionando para recovery via cookie/localStorage (no `storage.getItem`)
2. Mas quando ha session hash na URL (= login novo), a flag velha e limpa e a sessao e restaurada
3. O session hash so e gerado pelo `PublicRoute` apos autenticacao bem-sucedida, entao e seguro confiar nele

### Licao Aprendida

`sessionStorage` e per-origin. Flags setadas em `subdominio.exemplo.com` NAO sao visiveis em `exemplo.com` e vice-versa. Ao usar flags cross-domain, considerar que cada subdominio tem seu proprio storage isolado.

### Estado Final
- Logout: FUNCIONANDO
- Login apos logout: FUNCIONANDO
- Testado em producao: 2026-02-07
