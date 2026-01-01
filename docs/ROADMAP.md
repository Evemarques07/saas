# Roadmap - Ejym SaaS

Este documento descreve os planos de desenvolvimento do Ejym SaaS, dividido em fases.

## Sumario

1. [Visao Geral](#visao-geral)
2. [Fase 1 - MVP Core](#fase-1---mvp-core)
3. [Fase 2 - Funcionalidades Essenciais](#fase-2---funcionalidades-essenciais)
4. [Fase 3 - Melhorias e Integracoes](#fase-3---melhorias-e-integracoes)
5. [Fase 4 - Escala e Monetizacao](#fase-4---escala-e-monetizacao)
6. [Fase 5 - Automacao de Vendas e Fiscal](#fase-5---automacao-de-vendas-e-fiscal)
7. [Backlog Futuro](#backlog-futuro)

---

## Visao Geral

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ROADMAP VISUAL                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  FASE 1 (MVP)       FASE 2           FASE 3       FASE 4       FASE 5        │
│  ────────────────────────────────────────────────────────────────────────    │
│                                                                               │
│  [x] Auth Firebase  [x] Dashboard    [x] Email    [ ] Planos   [ ] Cod.Barras│
│  [x] Google OAuth   [x] Produtos     [x] WhatsApp [ ] Stripe   [ ] QR Code   │
│  [x] Multi-tenant   [x] Clientes     [ ] Relat.   [ ] Mobile   [ ] PDV       │
│  [x] Empresas       [x] Vendas       [x] Storage  [ ] API      [ ] NFCe      │
│  [x] Convites       [x] Catalogo     [ ] PWA      [x] Logo                   │
│  [x] RLS            [x] Exportacao   [x] Edge Fn  [x] Config                 │
│                     [x] Categorias   [x] Hosting  [x] Senha                  │
│                     [x] Import Excel [x] SKU Auto                            │
│                     [x] Carrinho     [x] Pedidos                             │
│                                                                               │
│  ██████████████████ ██████████████   ████████░░   ░░░░░░░░     ░░░░░░░░      │
│      CONCLUIDO         CONCLUIDO      EM PROG      FUTURO       PLANEJADO    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1 - MVP Core

**Status: Concluido**

### Autenticacao (Firebase Auth)

- [x] Login com email/senha (Firebase Auth)
- [x] Login com Google OAuth
- [x] Registro de novos usuarios
- [x] Sistema de perfis (`profiles`)
- [x] Super Admin automatico (email especifico)
- [x] Integracao Firebase + Supabase
- [x] Toggle de visibilidade de senha

### Multi-Tenancy

- [x] Isolamento de dados por empresa
- [x] Row Level Security (RLS)
- [x] Rotas baseadas em slug (`/app/:slug/*`)
- [x] Troca de empresa no header

### Gestao de Empresas

- [x] CRUD de empresas (Super Admin)
- [x] Definicao de segmentos
- [x] Ativar/desativar empresas
- [x] Sistema de convites com link copiavel
- [x] Aceitar convite sem confirmacao de email

### Interface Base

- [x] Layout responsivo com Sidebar
- [x] Area admin separada (`/admin/*`)
- [x] Tema claro/escuro
- [x] Componentes UI reutilizaveis
- [x] Navegacao por rotas

### Infraestrutura

- [x] Migrations do banco de dados
- [x] Politicas RLS
- [x] Suporte a Firebase UID (TEXT)

---

## Fase 2 - Funcionalidades Essenciais

**Status: Concluido**

### Dashboard

- [x] Cards com metricas principais
  - Total de vendas
  - Faturamento
  - Clientes
  - Produtos
- [x] Link para catalogo publico

### Gestao de Produtos

- [x] CRUD completo de produtos
- [x] Categorizacao
- [x] Controle de estoque
- [x] Preco de custo e venda
- [x] Status ativo/inativo

### Gestao de Categorias

- [x] CRUD completo de categorias
- [x] Vinculacao com produtos
- [x] Status ativo/inativo

### Gestao de Clientes

- [x] CRUD completo de clientes
- [x] Dados de contato (email, telefone)
- [x] Documento (CPF/CNPJ)
- [x] Endereco
- [x] Observacoes
- [x] Busca e filtros

### Sistema de Vendas

- [x] Nova venda (carrinho)
- [x] Busca de produtos
- [x] Selecao de cliente
- [x] Calculo automatico de totais
- [x] Desconto (valor ou percentual)
- [x] Formas de pagamento
- [x] Historico de vendas
- [x] Filtros por periodo

### Catalogo Publico

- [x] Pagina publica `/catalogo/:slug`
- [x] Listagem de produtos ativos
- [x] Filtro por categoria
- [x] Busca de produtos
- [x] Exibicao de precos
- [x] Informacoes da empresa
- [x] **Carrinho de compras (localStorage)**
- [x] **Checkout com formulario de cliente**
- [x] **Pagina individual de produto (link compartilhavel)**

### Pedidos do Catalogo

- [x] **Tabelas `catalog_orders` e `catalog_order_items`**
- [x] **Pagina de gestao de pedidos**
- [x] **Status: pending, confirmed, completed, cancelled**
- [x] **Botao WhatsApp para contato**
- [x] **Conversao automatica de pedido em venda**
- [x] **Baixa automatica de estoque**
- [x] **Estatisticas de pedidos no dashboard**

### Exportacoes

- [x] Exportar clientes (Excel/PDF)
- [x] Exportar produtos (Excel/PDF)
- [x] Exportar vendas (Excel/PDF)

---

## Fase 3 - Melhorias e Integracoes

**Status: Em Progresso**

### Email Automatico

- [x] Configuracao de API de email (MailerSend)
- [x] Email de convite automatico
- [x] Template HTML responsivo para emails
- [x] Fallback para clipboard se email falhar
- [ ] Notificacoes de estoque baixo
- [ ] Resumo diario de vendas

### Supabase Edge Functions

- [x] Estrutura de Edge Functions
- [x] `send-invite-email` - Envio de emails via MailerSend
- [x] Secrets configurados no Supabase

### Integracao WhatsApp

- [x] **Botao de contato no catalogo (pedidos)**
- [x] **Mensagem pre-formatada com dados do pedido**
- [x] **Formatacao automatica do numero (55 + DDD)**
- [ ] Notificacao de nova venda (push)
- [ ] Lembrete de pagamento

### Relatorios Avancados

- [ ] Relatorio de vendas por periodo
- [ ] Relatorio de produtos mais vendidos
- [ ] Relatorio de clientes
- [ ] Relatorio financeiro
- [ ] Graficos e visualizacoes

### Storage de Arquivos

- [x] Upload de logo da empresa (Supabase Storage)
- [x] Upload de imagens de produtos (Supabase Storage)
- [ ] Compressao automatica
- [ ] CDN para entrega

### PWA (Progressive Web App)

- [ ] Manifest.json
- [ ] Service Worker
- [ ] Instalacao no celular
- [ ] Funcionamento offline (leitura)
- [ ] Push notifications

### Hospedagem e Deploy

- [x] Firebase Hosting configurado
- [x] GitHub Actions para CI/CD
- [x] Deploy automatico ao fazer merge na main
- [x] Preview de PRs automatico
- [x] Deploy manual disponivel

### Melhorias de Seguranca

- [ ] RLS mais restritivo para producao
- [ ] Auditoria de acoes
- [ ] Logs de acesso

---

## Fase 4 - Escala e Monetizacao

**Status: Visao de Longo Prazo**

### Sistema de Planos

- [ ] Plano Free (1 empresa, limites)
- [ ] Plano Pro (recursos ilimitados)
- [ ] Plano Enterprise (white-label)
- [ ] Comparativo de planos

### Integracao de Pagamento

- [ ] Stripe para assinaturas
- [ ] Portal do cliente
- [ ] Faturas automaticas
- [ ] Upgrade/downgrade de planos
- [ ] Periodo de trial

### App Mobile

- [ ] React Native
- [ ] App para vendedores
- [ ] Scanner de codigo de barras
- [ ] Vendas offline
- [ ] Sincronizacao

### White-Label

- [ ] Dominio personalizado
- [ ] Tema customizavel
- [ ] Logo propria
- [ ] Remocao de branding

### Integracoes

- [ ] Integracao com ERP
- [ ] Integracao com NFe/NFCe
- [ ] Integracao com marketplaces
- [ ] API publica

---

## Fase 5 - Automacao de Vendas e Fiscal

**Status: Planejado**

### Leitor de Codigo de Barras e QR Code

Implementar leitura de codigos para agilizar cadastro de produtos e registro de vendas.

#### Cadastro de Produtos

- [ ] Leitura de codigo de barras EAN-13/EAN-8 via camera
- [ ] Leitura de QR Code para importar dados
- [ ] Consulta automatica em APIs de produtos (ex: Cosmos, Open Food Facts)
- [ ] Preenchimento automatico de nome, marca, categoria
- [ ] Suporte a leitor USB/Bluetooth externo
- [ ] Cadastro rapido com scanner

#### Registro de Vendas (PDV)

- [ ] Modo PDV (Ponto de Venda) em tela cheia
- [ ] Leitura continua de produtos via camera
- [ ] Som de confirmacao ao adicionar produto
- [ ] Busca por codigo de barras no carrinho
- [ ] Suporte a leitor de mesa USB
- [ ] Modo offline com sincronizacao

#### Tecnologias Sugeridas

| Biblioteca | Uso |
|------------|-----|
| `@zxing/browser` | Leitura de codigo via camera (Web) |
| `quagga2` | Alternativa para codigo de barras |
| `html5-qrcode` | QR Code e codigos 1D/2D |
| React Native Camera | Para app mobile futuro |

### Emissao de NFCe (Nota Fiscal de Consumidor Eletronica)

Integracao com sistemas de emissao fiscal para formalizar vendas.

#### Configuracao

- [ ] Cadastro de dados fiscais da empresa (CNPJ, IE, regime tributario)
- [ ] Configuracao de certificado digital A1
- [ ] Definicao de CST, CFOP, NCM por produto
- [ ] Ambiente de homologacao e producao

#### Emissao

- [ ] Geracao de NFCe no fechamento da venda
- [ ] Impressao de DANFE-NFCe (cupom fiscal)
- [ ] Envio para SEFAZ em tempo real
- [ ] Contingencia offline com envio posterior
- [ ] Cancelamento de NFCe

#### Integracao

- [ ] API de emissor fiscal (ex: Focus NFe, Enotas, NFe.io)
- [ ] Webhook para status de autorizacao
- [ ] Armazenamento de XML assinado
- [ ] Consulta de notas emitidas

#### Fluxo de Emissao

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Venda     │────▶│  Gerar XML  │────▶│   Assinar   │
│  Finalizada │     │   NFCe      │     │  Cert. A1   │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Imprimir   │◀────│  Autorizada │◀────│ Enviar SEFAZ│
│   DANFE     │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

#### Custos Estimados

| Servico | Modelo |
|---------|--------|
| Focus NFe | Por nota emitida (~R$0,10-0,15) |
| Enotas | Planos mensais |
| NFe.io | Por nota + mensalidade |
| Certificado A1 | Anual (~R$150-300) |

---

## Backlog Futuro

### Funcionalidades Consideradas

| Feature | Prioridade | Complexidade |
|---------|------------|--------------|
| Leitor codigo de barras (camera) | Alta | Media |
| Leitor QR Code | Alta | Baixa |
| Modo PDV tela cheia | Alta | Media |
| Emissao NFCe | Alta | Alta |
| Consulta produto por EAN | Media | Baixa |
| Comissao de vendedor | Baixa | Media |
| Metas de vendas | Baixa | Media |
| Promocoes/descontos | Media | Alta |
| Programa de fidelidade | Baixa | Alta |
| Multi-moeda | Baixa | Media |
| Multi-idioma | Baixa | Media |
| Backup automatico | Alta | Baixa |

### Ideias em Avaliacao

- **IA para sugestoes**: Sugerir produtos para clientes baseado em historico
- **Previsao de estoque**: ML para prever quando repor
- **Analise de vendas**: Insights automaticos sobre performance
- **Chatbot**: Atendimento automatizado no catalogo

---

## Changelog

### v0.6.0 (Janeiro 2026)

- **Carrinho de Compras no Catalogo**
  - CartContext com persistencia em localStorage (por empresa/slug)
  - CartDrawer para visualizar/editar itens
  - Validacao de estoque ao adicionar produtos
  - Interface responsiva para mobile
- **Sistema de Pedidos do Catalogo**
  - Tabelas `catalog_orders` e `catalog_order_items`
  - CheckoutModal com formulario (nome, telefone, observacoes)
  - Pagina de gestao de pedidos `/app/:slug/pedidos`
  - Status: pending, confirmed, completed, cancelled
  - Botao WhatsApp para contatar cliente
- **Conversao Pedido → Venda**
  - Ao marcar pedido como "entregue", cria venda automaticamente
  - Baixa automatica de estoque
  - Forma de pagamento: "Catalogo Online"
  - Faturamento unificado com vendas manuais
- **Dashboard: Estatisticas de Pedidos**
  - Cards com contagem por status (pendentes, confirmados, entregues, cancelados)
  - Cores diferenciadas por status
- **Pagina Individual de Produto**
  - Rota `/catalogo/:slug/produto/:productId`
  - Detalhes completos do produto
  - Adicionar ao carrinho
  - Link "Ver Catalogo Completo"
- **Link Compartilhavel de Produto**
  - Botao de copiar link na lista de produtos
  - Botao de abrir em nova aba
  - Links so aparecem para produtos ativos no catalogo

### v0.5.0 (Janeiro 2025)

- **Upload de Logo da Empresa**
  - Bucket `companies` no Supabase Storage
  - Administradores podem fazer upload/remover logo
  - Logo exibido no Header, seletor de empresa, lista de empresas e usuarios
- **Alteracao de Senha**
  - Todos os usuarios podem alterar sua propria senha
  - Reautenticacao com Firebase para seguranca
- **Pagina de Configuracoes**
  - Nova rota `/app/:slug/configuracoes`
  - Upload de logo (admin only)
  - Alteracao de senha (todos)
- **Lista de Usuarios do Sistema (Super Admin)**
  - Nova rota `/admin/usuarios`
  - Usuarios agrupados por empresa (accordion)
  - Busca por nome, email ou empresa
  - Secao separada para usuarios sem empresa
- **Melhorias na Gestao de Produtos**
  - Foto do produto exibida na lista (thumbnail 12x12)
  - SKU automatico no formato `PROD-00001` ao criar produto
  - Importacao em massa de produtos via Excel
  - Download de modelo Excel para importacao
  - Vinculacao automatica de categoria pelo nome na importacao

### v0.4.0 (Dezembro 2024)

- **Firebase Hosting**
  - Deploy automatico via GitHub Actions (CI/CD)
  - Workflow para merge na main e preview em PRs
  - Deploy manual: `npm run build && npx firebase deploy --only hosting`
  - URL de producao: https://saas-af55a.web.app
- **Gestao de Categorias**
  - CRUD completo de categorias de produtos
  - Vinculacao de produtos a categorias
- **Melhorias de UX**
  - `ConfirmModal` - Modal de confirmacao substituindo `window.confirm()`
  - `InviteLinkModal` - Modal para exibir e copiar link de convite
  - Todas as acoes destrutivas agora usam modais
- **Correcoes**
  - Fix jspdf-autotable para producao (import correto)
  - Fix query de members em UsersPage (separacao de queries)
  - Fix warning do Recharts (minWidth no ResponsiveContainer)

### v0.3.0 (Dezembro 2024)

- **Envio automatico de emails de convite**
  - Integracao com MailerSend API
  - Template HTML responsivo e profissional
  - Fallback para clipboard se email falhar
- **Supabase Edge Functions**
  - `send-invite-email` para envio de emails
  - Secrets configurados no Supabase
- **Melhorias no formulario de empresa**
  - Campo opcional "Email do Administrador" ao criar empresa
  - Envio automatico de convite ao criar empresa
- **Correcao de race condition**
  - AuthContext agora busca profile por UID (mais confiavel)
  - Sistema de retry automatico para sincronizacao

### v0.2.0 (Dezembro 2024)

- Migracao para Firebase Auth
- Login com Google OAuth
- Dashboard com metricas
- CRUD de produtos, clientes e vendas
- Catalogo publico
- Exportacao Excel/PDF
- Rotas baseadas em slug da empresa
- Area administrativa separada

### v0.1.0 (Dezembro 2024)

- Implementacao inicial do MVP
- Sistema de autenticacao (Supabase Auth)
- Multi-tenancy com RLS
- Gestao de empresas
- Sistema de convites
- Layout base com tema claro/escuro

---

Veja tambem: [Guia de Instalacao](SETUP.md) | [Arquitetura](ARCHITECTURE.md) | [Firebase Auth](FIREBASE_AUTH.md)
