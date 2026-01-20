# Guia de Instalacao Detalhado

Este guia cobre todos os passos necessarios para configurar o Ejym SaaS do zero.

## Sumario

1. [Pre-requisitos](#pre-requisitos)
2. [Configuracao do Firebase](#configuracao-do-firebase)
3. [Configuracao do Supabase](#configuracao-do-supabase)
4. [Configuracao do MailerSend](#configuracao-do-mailersend)
5. [Configuracao do WuzAPI (WhatsApp)](#configuracao-do-wuzapi-whatsapp)
6. [Configuracao do Projeto](#configuracao-do-projeto)
7. [Aplicar Migrations](#aplicar-migrations)
8. [Deploy Edge Functions](#deploy-edge-functions)
9. [Primeiro Acesso](#primeiro-acesso)
10. [Troubleshooting](#troubleshooting)

---

## Pre-requisitos

### Software Necessario

| Software | Versao Minima | Download |
|----------|---------------|----------|
| Node.js | 18.x | [nodejs.org](https://nodejs.org) |
| npm | 9.x | Incluido com Node.js |
| Git | 2.x | [git-scm.com](https://git-scm.com) |

### Contas Necessarias

1. **Firebase** - Para autenticacao
2. **Supabase** - Para banco de dados

---

## Configuracao do Firebase

### 1. Criar Projeto

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em "Adicionar projeto"
3. De um nome ao projeto (ex: `ejym-saas`)
4. Desative Google Analytics (opcional)
5. Clique em "Criar projeto"

### 2. Configurar Authentication

1. No menu lateral, clique em **Authentication**
2. Clique em "Comecar"
3. Va em **Sign-in method**
4. Ative os provedores:
   - **Email/Password**: Clique, ative e salve
   - **Google**: Clique, ative, configure o email de suporte e salve

### 3. Registrar App Web

1. Na pagina inicial do projeto, clique no icone Web (`</>`)
2. De um apelido ao app (ex: `ejym-web`)
3. Nao precisa marcar "Firebase Hosting"
4. Clique em "Registrar app"
5. Copie o objeto `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Configuracao do Supabase

### 1. Criar Projeto

1. Acesse [Supabase](https://supabase.com)
2. Crie uma conta ou faca login
3. Clique em "New Project"
4. Escolha um nome (ex: `ejym-saas`)
5. Defina uma senha forte para o banco
6. Selecione a regiao (ex: `South America (Sao Paulo)`)
7. Aguarde a criacao (pode levar alguns minutos)

### 2. Obter Credenciais

1. Va em **Settings → API**
2. Copie:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public key**: `eyJhbGci...`

---

## Configuracao do MailerSend

O MailerSend e usado para enviar emails de convite automaticamente.

### 1. Criar Conta

1. Acesse [MailerSend](https://www.mailersend.com)
2. Crie uma conta gratuita
3. Confirme seu email

### 2. Obter API Token

1. Va em **Account → API Tokens**
2. Clique em "Generate new token"
3. De um nome (ex: `ejym-production`)
4. Copie o token (comeca com `mlsn.`)

### 3. Configurar Dominio de Envio

**Opcao A - Trial Domain (para testes):**
1. Va em **Domains**
2. Use o dominio de trial fornecido: `trial-xxxxx.mlsender.net`
3. O email remetente sera: `noreply@trial-xxxxx.mlsender.net`

**Opcao B - Dominio Proprio (para producao):**
1. Va em **Domains → Add domain**
2. Adicione seu dominio (ex: `ejym.com.br`)
3. Configure os registros DNS (SPF, DKIM, CNAME)
4. Aguarde verificacao

### 4. Limitacoes do Trial

| Limite | Valor |
|--------|-------|
| Emails por mes | 3.000 |
| Destinatarios unicos | 2 |
| Expiracao | 30 dias sem uso |

---

## Configuracao do WuzAPI (WhatsApp)

O WuzAPI e um servidor Go que permite conectar o WhatsApp das empresas para envio automatico de mensagens.

### 1. Pre-requisitos do Servidor

| Requisito | Descricao |
|-----------|-----------|
| VPS | Servidor Linux com Docker |
| Dominio | Subdominio apontando para o servidor |
| SSL | Certificado HTTPS (ex: Let's Encrypt) |

### 2. Instalar WuzAPI no Servidor

```bash
# Clonar repositorio
git clone https://github.com/asternic/wuzapi.git
cd wuzapi

# Configurar docker-compose.yml
# Ajustar WUZAPI_ADMIN_TOKEN para um token seguro

# Iniciar container
docker-compose up -d
```

### 3. Configurar Token Admin

No `docker-compose.yml`:

```yaml
environment:
  - WUZAPI_ADMIN_TOKEN=seu_token_seguro_aqui
```

**IMPORTANTE:** Este token NUNCA deve ser exposto no frontend. Ele sera configurado como secret na Edge Function.

### 4. Verificar Instalacao

```bash
# Verificar se API esta respondendo
curl https://seu-dominio.com/health
# Deve retornar: {"status":"ok"}
```

### 5. Configurar Secrets da Edge Function

```bash
# Token admin para gerenciar instancias
npx supabase secrets set WUZAPI_ADMIN_TOKEN=seu_token_seguro_aqui

# URL do servidor WuzAPI
npx supabase secrets set WUZAPI_URL=https://seu-dominio.com
```

### Endpoints Principais

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/health` | GET | Status da API |
| `/admin/users` | GET/POST | Gerenciar usuarios |
| `/session/connect` | POST | Conectar sessao |
| `/session/qr` | GET | Obter QR Code |
| `/chat/send/text` | POST | Enviar mensagem |

### Configuracao por Empresa

Cada empresa tera sua propria instancia:
- Nome: `ejym-{slug}` (ex: `ejym-loja-maria`)
- Token: Gerado automaticamente ao criar usuario
- Configuracoes salvas em `whatsapp_settings` JSONB no banco

---

## Configuracao do Projeto

### 1. Clonar o Repositorio

```bash
git clone <url-do-repositorio>
cd Saas_Ejym
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variaveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
# Supabase (Database)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Firebase Auth
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# WuzAPI (WhatsApp)
VITE_WUZAPI_URL=https://seu-wuzapi.com
# NOTA: Token admin NAO vai no frontend - configurado como secret na Edge Function
```

**Importante:** Nunca commite o arquivo `.env.local`!

**Sobre o Token Admin WuzAPI:** O token admin para gerenciar instancias NUNCA deve ser exposto no frontend (variaveis VITE_*). Ele e configurado apenas como secret na Edge Function `wuzapi-admin`.

---

## Aplicar Migrations

### Opcao 1: Via SQL Editor (Recomendado)

1. Acesse **Supabase Dashboard → SQL Editor**
2. Clique em "New Query"
3. Execute cada arquivo na ordem:

```
supabase/migrations/20251226000001_create_tables.sql
supabase/migrations/20251227000009_firebase_auth_support.sql
supabase/migrations/20251227000010_fix_tables_rls.sql
```

**Dica:** Copie o conteudo de cada arquivo e execute um por vez.

### Opcao 2: Via Supabase CLI

```bash
# Instalar CLI
npm install -g supabase

# Login
npx supabase login

# Linkar projeto
npx supabase link --project-ref seu_project_ref

# Aplicar migrations
npx supabase db push
```

### Verificar Migrations

Apos aplicar, verifique em **Table Editor** se as tabelas foram criadas:

- `companies`
- `profiles` (id e TEXT para Firebase UID)
- `company_members` (user_id e TEXT)
- `invites`
- `customers` (com colunas `phone_has_whatsapp`, `source`, `total_orders`, `total_spent`, `last_order_at`)
- `categories`
- `products` (com colunas `ean`, `images`)
- `sales`
- `sale_items`
- `catalog_orders` (com colunas `customer_id`, `whatsapp_consent`, `consent_at`)
- `catalog_order_items`

### Migrations Importantes

| Migration | Descricao |
|-----------|-----------|
| `20251226000001_create_tables.sql` | Tabelas base do sistema |
| `20251227000009_firebase_auth_support.sql` | Suporte a Firebase UID |
| `20260117000001_add_ean_to_products.sql` | Campo EAN/codigo de barras |
| `20260118000001_add_product_images.sql` | Multiplas imagens por produto |
| `20260118000002_enable_realtime.sql` | Realtime nas tabelas principais |
| `20260118000003_add_whatsapp_settings.sql` | Configuracoes WhatsApp por empresa |
| `20260119000001_add_customer_name_to_sales.sql` | Nome do cliente em vendas |
| `20260119000002_add_whatsapp_consent.sql` | LGPD: consentimento WhatsApp |
| `20260119100000_catalog_customer_registration.sql` | Cadastro de cliente pelo catalogo |

---

## Deploy Edge Functions

As Edge Functions sao necessarias para funcionalidades server-side como envio de emails.

### 1. Login no Supabase CLI

```bash
npx supabase login
```

### 2. Linkar Projeto (se ainda nao fez)

```bash
npx supabase link --project-ref seu_project_ref
```

### 3. Configurar Secrets do MailerSend

```bash
npx supabase secrets set \
  MAILERSEND_API_TOKEN=mlsn.seu_token_aqui \
  MAILERSEND_FROM_EMAIL=noreply@seu-dominio.mlsender.net \
  MAILERSEND_FROM_NAME=Ejym
```

### 4. Configurar Secrets do WuzAPI

```bash
npx supabase secrets set \
  WUZAPI_ADMIN_TOKEN=seu_token_admin_wuzapi \
  WUZAPI_URL=https://seu-wuzapi.com
```

### 5. Deploy das Funcoes

```bash
# Funcao de email
npx supabase functions deploy send-invite-email

# Funcao de admin WhatsApp (requer --no-verify-jwt para aceitar Firebase tokens)
npx supabase functions deploy wuzapi-admin --no-verify-jwt
```

**Nota sobre `--no-verify-jwt`:** A funcao `wuzapi-admin` valida tokens Firebase manualmente, portanto o Supabase nao deve validar o JWT automaticamente.

### 6. Verificar Deploy

Acesse o dashboard: **Supabase → Edge Functions**

Devem aparecer as funcoes com status "Active":
- `send-invite-email`
- `wuzapi-admin`

### Funcoes Disponiveis

| Funcao | Descricao | Flag Especial |
|--------|-----------|---------------|
| `send-invite-email` | Envia email de convite para novos admins | - |
| `wuzapi-admin` | Gerencia instancias WhatsApp (Super Admin) | `--no-verify-jwt` |

---

## Primeiro Acesso

### 1. Iniciar o Servidor

```bash
npm run dev
```

Acesse: http://localhost:5173

### 2. Criar Super Admin

1. Acesse `/login`
2. Clique em **"Entrar com Google"**
3. Selecione a conta: `evertonmarques.jm@gmail.com`
4. O sistema automaticamente define este email como Super Admin

**Importante:** O Super Admin e definido automaticamente pelo email. Para usar outro email, edite `src/contexts/AuthContext.tsx`.

### 3. Criar Primeira Empresa

1. Apos login, acesse `/admin/empresas`
2. Clique em "Nova Empresa"
3. Preencha:
   - Nome: Nome da empresa
   - Slug: URL amigavel (ex: `minha-loja`)
   - Segmentos: Selecione os aplicaveis
4. Clique em "Criar"

### 4. Convidar Usuario

**Opcao A - Ao criar empresa:**
1. Ao criar empresa, preencha o campo "Email do Administrador"
2. O sistema cria a empresa E envia o convite automaticamente por email

**Opcao B - Empresa existente:**
1. Na lista de empresas, clique no icone de convite (envelope)
2. Informe o email do futuro usuario
3. O email de convite e **enviado automaticamente** via MailerSend
4. O convidado cria nome e senha, sem precisar confirmar email

> **Fallback:** Se o email falhar, o link e copiado para a area de transferencia.

---

## Troubleshooting

### Erro: "auth/invalid-credential"

**Causa:** Usuario nao existe no Firebase ou senha incorreta.

**Solucao:**
1. Verifique se o email esta correto
2. Use "Entrar com Google" para criar conta automaticamente
3. Ou use o fluxo de convite

### Erro: "Profile not found" ou "Sem acesso a empresas"

**Causa:** Profile nao foi criado no Supabase ou usuario nao foi adicionado a empresa.

**Solucao:**
1. Para super admin: Login com Google cria profile automaticamente
2. Para usuarios: Devem usar link de convite

### Erro 404 em customers/products/sales

**Causa:** RLS policies nao configuradas.

**Solucao:**
Execute a migration `20251227000010_fix_tables_rls.sql` no SQL Editor.

### Login funciona mas nao redireciona

**Causa:** Profile existe mas nao ha empresas vinculadas.

**Solucao:**
1. Super admin deve ser adicionado a uma empresa
2. Ou criar empresa e se adicionar como membro

### Convite nao funciona

**Causa:** Token invalido ou expirado.

**Solucao:**
1. Verifique se o convite existe na tabela `invites`
2. Verifique se `accepted_at` e NULL
3. Verifique se `expires_at` e futuro

### Erro: "auth/email-already-in-use"

**Causa:** Email ja cadastrado no Firebase.

**Solucao:**
1. O usuario deve fazer login em vez de aceitar convite
2. Ou use o Firebase Console para deletar o usuario

### Email de convite nao chega

**Causas possiveis:**
1. Secrets do MailerSend nao configurados
2. Dominio nao verificado no MailerSend
3. Email caiu no spam

**Solucao:**
1. Verifique os secrets: `npx supabase secrets list`
2. Confira o dominio no dashboard do MailerSend
3. Verifique a pasta de spam do destinatario
4. Use o trial domain para testes: `noreply@trial-xxx.mlsender.net`

### Erro 422 ao enviar email

**Causa:** Email remetente nao verificado no MailerSend.

**Solucao:**
1. Nao use `@gmail.com` como remetente
2. Use o trial domain fornecido pelo MailerSend
3. Ou verifique seu dominio proprio

### Edge Function nao funciona

**Causa:** Funcao nao deployada ou secrets ausentes.

**Solucao:**
```bash
# Verificar deploy
npx supabase functions list

# Re-deploy
npx supabase functions deploy send-invite-email

# Verificar secrets
npx supabase secrets list
```

### WhatsApp: Super Admin nao ve instancias

**Causa 1:** Edge Function com erro de autorizacao.

**Solucao:**
```bash
# Re-deploy com flag correta
npx supabase functions deploy wuzapi-admin --no-verify-jwt
```

**Causa 2:** Erro "Invalid JWT" ou 401.

**Solucao:** O Supabase por padrao rejeita tokens Firebase. A flag `--no-verify-jwt` e obrigatoria.

**Causa 3:** Erro "column profiles.role does not exist".

**Solucao:** A Edge Function deve usar `is_super_admin` em vez de `role`:
```typescript
.select('is_super_admin')
.eq('id', firebaseUser.uid)
```

### WhatsApp: Conexao falha

**Causas possiveis:**
1. WuzAPI nao esta rodando
2. URL incorreta no `.env.local`
3. Token da empresa invalido

**Solucao:**
```bash
# Verificar se WuzAPI esta online
curl https://seu-wuzapi.com/health

# Verificar variaveis
echo $VITE_WUZAPI_URL
```

### WhatsApp: QR Code nao aparece

**Causa:** Sessao ja conectada ou timeout.

**Solucao:**
1. Clique em "Desconectar" e tente novamente
2. Verifique os logs do WuzAPI
3. Aguarde o timeout de 15 segundos

### WhatsApp: Mensagens nao sao enviadas

**Causas possiveis:**
1. Numero do cliente invalido
2. Cliente nao tem WhatsApp
3. Sessao desconectada

**Solucao:**
1. Use o botao "Testar WhatsApp" para verificar numero
2. Verifique status da conexao em Configuracoes
3. Reconecte a sessao se necessario

---

## Comandos Uteis

```bash
# Desenvolvimento
npm run dev

# Build de producao
npm run build

# Preview do build
npm run preview

# Linter
npm run lint

# Deploy para producao (build + firebase deploy)
npm run deploy
```

---

## Deploy para Producao

### Firebase Hosting

O projeto esta configurado para deploy automatico via GitHub Actions.

**Deploy automatico:**
- Ao fazer merge na branch `main`, o deploy e feito automaticamente
- PRs geram preview automatico

**Deploy manual (recomendado):**
```bash
npm run deploy
```

Este comando executa `npm run build && firebase deploy --only hosting` em sequencia.

**Alternativa (comandos separados):**
```bash
npm run build
npx firebase deploy --only hosting
```

**URL de producao:** https://saas-af55a.web.app

---

## Proximos Passos

Apos a instalacao:

1. Personalize o email do Super Admin em `AuthContext.tsx`
2. Configure produtos, clientes e categorias
3. Teste o fluxo completo de vendas

Veja tambem: [Arquitetura](ARCHITECTURE.md) | [Firebase Auth](FIREBASE_AUTH.md) | [Roadmap](ROADMAP.md)
