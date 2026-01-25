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
   - [Agente de IA para WhatsApp](#agente-de-ia-para-whatsapp-planejado)

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
│  [x] Auth Firebase  [x] Dashboard    [x] Email    [ ] Planos   [ ] QR Code   │
│  [x] Google OAuth   [x] Produtos     [x] WhatsApp [ ] Stripe   [ ] PDV       │
│  [x] Multi-tenant   [x] Clientes     [ ] Relat.   [ ] Mobile   [ ] NFCe      │
│  [x] Empresas       [x] Vendas       [x] Storage  [ ] API                    │
│  [x] Convites       [x] Catalogo     [x] PWA      [x] Logo                   │
│  [x] RLS            [x] Exportacao   [x] Edge Fn  [x] Config                 │
│  [x] Mobile-First   [x] Categorias   [x] Hosting  [x] Senha                  │
│  [x] Sidebar Drawer [x] Import Excel [x] SKU Auto [x] Filtros                │
│  [x] Cards Mobile   [x] Carrinho     [x] Pedidos  [x] Cancel                 │
│  [x] Layout Arred.  [x] EAN/Barcode  [x] Layout   [x] Header                 │
│  [x] Sticky Filter  [x] Catalog UI   [x] Clear X  [x] Multi-Img              │
│  [x] Persist State  [x] Multi-Imagens[x] Carousel [x] Lightbox               │
│  [x] Table Tablet   [x] Paginacao   [x] Realtime [x] Barcode                │
│  [x] Filtro Status  [x] Valid.Phone [x] Notific. [x] Badge                  │
│  [x] Area Cliente   [x] Cupons      [x] Fidelidde[x] Promocoes               │
│  [x] Graf. Funil    [x] Graf.Scatter[x] Responsiv [x] Overflow               │
│                                                                               │
│  ██████████████████ ██████████████   ██████████   ░░░░░░░░     ░░░░░░░░      │
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

- [x] Layout responsivo mobile-first com Sidebar drawer
- [x] Header sticky no mobile
- [x] Tabelas com `mobileCardRender` para cards no mobile
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
- [x] **Filtro de periodo dinamico**
- [x] **Grafico de vendas nos ultimos 30 dias** (AreaChart)
- [x] **Grafico Top 5 Produtos** (BarChart horizontal)
- [x] **Cards de pedidos do catalogo** (por status)
- [x] **Grafico de Funil de Pedidos** (FunnelChart)
  - Etapas: Total → Confirmados → Entregues
  - Metricas de conversao e cancelamento
- [x] **Grafico de Dispersao - Perfil de Clientes** (ScatterChart)
  - Frequencia de compras vs Ticket medio
  - Identificacao de clientes VIP por quadrante
  - Cores por perfil: VIP, Frequente, Potencial, Casual

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
- [x] Cancelamento com confirmacao e justificativa

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
- [x] `wuzapi-admin` - Operacoes admin do WuzAPI com validacao Firebase
- [x] Secrets configurados no Supabase
- [x] Validacao de Firebase ID Token em Edge Functions

### Integracao WhatsApp (WuzAPI)

- [x] **Botao de contato no catalogo (pedidos)**
- [x] **Mensagem pre-formatada com dados do pedido**
- [x] **Formatacao automatica do numero (55 + DDD)**
- [x] **WuzAPI instalado na VPS** (substitui Evolution API)
- [x] **Servico `src/services/whatsapp.ts`** com API completa
- [x] **Componente `WhatsAppConnectModal`** para conexao via QR Code
- [x] **Secao de automacao em Configuracoes**
- [x] **Verificacao de telefone com `/user/check`** (resolve 9o digito)
- [x] **Envio de mensagem de teste funcionando**
- [x] **Notificacoes automaticas de pedidos** (Janeiro 2026)
  - [x] Notificacao para CLIENTE quando pedido criado
  - [x] Notificacao para EMPRESA quando pedido criado
  - [x] Notificacao para CLIENTE quando status muda
- [ ] Edge Function para envio via trigger (opcional)
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
- [x] **Multiplas imagens por produto (ate 4)**
- [x] **Carrossel de imagens no catalogo**
- [x] **Lightbox para visualizacao em tela cheia**
- [ ] Compressao automatica
- [ ] CDN para entrega

### PWA (Progressive Web App)

- [x] Manifest.json (via vite-plugin-pwa)
- [x] Service Worker (Workbox)
- [x] Instalacao no celular/desktop
- [x] Cache offline de assets e fontes
- [x] Prompt de instalacao a cada 1 hora
- [ ] Push notifications

### Hospedagem e Deploy

- [x] Firebase Hosting configurado
- [x] GitHub Actions para CI/CD
- [x] Deploy automatico ao fazer merge na main
- [x] Preview de PRs automatico
- [x] Deploy manual disponivel

### Supabase Realtime

- [x] **Habilitado Realtime nas tabelas principais**
- [x] **Hook useRealtimeSubscription para subscricoes**
- [x] **Hook useRealtimeRefresh simplificado**
- [x] **Filtros por company_id para multi-tenancy**
- [x] **Notificacoes de novos pedidos (toast + som + badge)**
- [x] **Atualizacao automatica da lista de pedidos**
- [ ] Push notifications nativas
- [ ] Atualizacao automatica de dashboard

### Persistencia de Estado

- [x] **Estado da sidebar salvo no localStorage**
- [x] **Preferencia mantida apos refresh da pagina**
- [x] **Separado por layout (app e admin)**

### Melhorias de Seguranca

- [x] **Token admin WuzAPI protegido via Edge Function**
- [x] **Validacao de Firebase Token sem SDK Admin**
- [x] **Verificacao de `is_super_admin` no Supabase**
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

**Status: Em Progresso**

### Leitor de Codigo de Barras e QR Code

Implementar leitura de codigos para agilizar cadastro de produtos e registro de vendas.

#### Cadastro de Produtos

- [x] **Leitura de codigo de barras EAN-13/EAN-8 via camera**
- [x] **Leitura de QR Code para importar dados**
- [ ] Consulta automatica em APIs de produtos (ex: Cosmos, Open Food Facts)
- [ ] Preenchimento automatico de nome, marca, categoria
- [x] **Suporte a leitor USB/Bluetooth externo (funciona automaticamente)**
- [x] **Cadastro rapido com scanner**

#### Registro de Vendas (PDV)

- [ ] Modo PDV (Ponto de Venda) em tela cheia
- [x] **Leitura de produtos via camera**
- [x] **Som de confirmacao ao adicionar produto**
- [x] **Busca por codigo de barras (EAN) no carrinho**
- [x] **Suporte a leitor USB/Bluetooth (funciona automaticamente)**
- [ ] Modo offline com sincronizacao

#### Tecnologias Utilizadas

| Biblioteca | Uso | Status |
|------------|-----|--------|
| `@zxing/library` | Decodificacao de codigos de barras | **Implementado** |
| `@zxing/browser` | Leitura de codigo via camera (Web) | **Implementado** |
| React Native Camera | Para app mobile futuro | Planejado |

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
| Promocoes/descontos | ~~Media~~ | ~~Alta~~ | **Concluido** |
| Programa de fidelidade | ~~Baixa~~ | ~~Alta~~ | **Concluido** |
| Multi-moeda | Baixa | Media |
| Multi-idioma | Baixa | Media |
| Backup automatico | Alta | Baixa |

### Ideias em Avaliacao

- **IA para sugestoes**: Sugerir produtos para clientes baseado em historico
- **Previsao de estoque**: ML para prever quando repor
- **Analise de vendas**: Insights automaticos sobre performance
- **Chatbot**: Atendimento automatizado no catalogo

### Agente de IA para WhatsApp (Planejado)

Implementar um agente de inteligencia artificial para responder automaticamente mensagens recebidas no WhatsApp conectado da empresa.

#### Visao Geral

Quando a empresa envia notificacoes automaticas (pedido confirmado, entregue, etc.), os clientes podem responder com duvidas. Atualmente essas mensagens ficam sem resposta automatica. O agente de IA responderia de forma inteligente usando dados da propria empresa.

#### Arquitetura Proposta

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cliente       │────▶│    WuzAPI       │────▶│    Webhook      │
│   WhatsApp      │     │    (VPS)        │     │    (Backend)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Resposta      │◀────│    LLM API      │◀────│    Contexto     │
│   Automatica    │     │ (Claude/OpenAI) │     │    da Empresa   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Funcionalidades Planejadas

| Funcionalidade | Descricao | Prioridade |
|----------------|-----------|------------|
| **Resposta a duvidas de pedido** | Status, previsao de entrega, itens | Alta |
| **Informacoes de produtos** | Preco, disponibilidade, detalhes | Alta |
| **Horario de funcionamento** | Baseado em configuracao da empresa | Media |
| **Politica de troca/devolucao** | Texto configuravel pela empresa | Media |
| **Formas de pagamento** | Lista configuravel | Media |
| **Escalonamento para humano** | Quando IA nao souber responder | Alta |

#### Fontes de Contexto para a IA

A IA tera acesso aos dados da empresa para responder com precisao:

1. **Catalogo de Produtos**
   - Nome, descricao, preco, disponibilidade
   - Categorias e caracteristicas

2. **Pedidos do Cliente**
   - Status atual (pendente, confirmado, entregue)
   - Itens do pedido, valor total
   - Historico de pedidos anteriores

3. **Configuracoes da Empresa**
   - Horario de funcionamento
   - Endereco e contato
   - Politicas (troca, devolucao, garantia)
   - Formas de pagamento aceitas

4. **FAQ Personalizado**
   - Perguntas e respostas configuradas pela empresa
   - Informacoes especificas do segmento

#### Fluxo de Resposta

```
1. Cliente envia mensagem para WhatsApp da empresa
2. WuzAPI recebe e envia webhook para backend
3. Backend identifica cliente pelo telefone
4. Sistema busca contexto relevante (pedidos, produtos, config)
5. Monta prompt com contexto + pergunta do cliente
6. Envia para API de LLM (Claude/OpenAI)
7. Recebe resposta e envia via WuzAPI para cliente
8. Registra conversa no historico
```

#### Configuracoes da Empresa (Planejadas)

Interface na pagina de Configuracoes para:

- [ ] Ativar/desativar agente de IA
- [ ] Definir horario de atendimento automatico
- [ ] Configurar mensagem de boas-vindas
- [ ] Configurar mensagem quando fora do horario
- [ ] Definir limite de mensagens por cliente/dia
- [ ] Configurar escalonamento (encaminhar para humano)
- [ ] Personalizar tom de voz (formal/informal)
- [ ] Adicionar FAQ personalizado

#### Limites e Custos

| Aspecto | Consideracao |
|---------|--------------|
| **Custo por mensagem** | ~$0.01-0.05 por resposta (depende do modelo) |
| **Rate limiting** | Limite de mensagens por cliente para evitar abuso |
| **Modelo de IA** | Claude Haiku (rapido e barato) ou GPT-3.5 |
| **Fallback** | Encaminha para humano se IA nao souber |
| **Privacidade** | Dados da empresa nunca expostos para outros clientes |

#### Integracao com WuzAPI

O WuzAPI suporta webhooks para receber mensagens:

```typescript
// Configurar webhook no WuzAPI
// POST /webhook/set
{
  "webhookUrl": "https://api.ejym.com/whatsapp/incoming",
  "events": ["Message"]
}
```

#### Proximos Passos para Implementacao

1. [ ] Configurar webhook no WuzAPI para receber mensagens
2. [ ] Criar Edge Function para processar mensagens recebidas
3. [ ] Integrar com API de LLM (Claude/OpenAI)
4. [ ] Criar interface de configuracao para empresas
5. [ ] Implementar historico de conversas
6. [ ] Implementar escalonamento para humano
7. [ ] Adicionar metricas e analytics
8. [ ] Testar com empresa piloto

---

## Changelog

### v0.20.0 (Janeiro 2026)

- **Dashboard: Melhorias de Responsividade**
  - Cards de estatisticas com layout vertical no mobile (< 640px)
  - Fontes menores para caber em telas pequenas (`text-[10px]` para labels)
  - Valores com `text-base` no mobile, crescendo para `text-2xl` no desktop
  - Cards de pedidos do catalogo tambem ajustados
  - Padding reduzido (`p-2.5`) para melhor aproveitamento de espaco

- **Dashboard: Grafico Top 5 Produtos**
  - Altura aumentada de `h-48/h-64` para `h-64/h-80`
  - Mais espaco vertical para visualizar as barras
  - Titulo alterado para "Top 5 Produtos" (mais claro)

- **Dashboard: Grafico de Funil de Pedidos**
  - Novo grafico mostrando conversao de pedidos
  - Etapas: Total de Pedidos → Confirmados → Entregues
  - Labels centralizados com nome + valor (ex: "Total de Pedidos: 10")
  - Cards de metricas ao lado do funil:
    - Total de Pedidos
    - Pedidos Pendentes
    - Taxa de Confirmacao (%)
    - Taxa de Entrega (%)
    - Pedidos Cancelados + Taxa de Cancelamento (%)
  - Componentes: `FunnelChart`, `Funnel`, `LabelList`, `Cell`
  - Icone `FilterAltIcon` no titulo

- **Dashboard: Grafico de Dispersao - Perfil de Clientes**
  - Novo grafico de dispersao (Scatter Chart)
  - Eixo X: Numero de compras (frequencia)
  - Eixo Y: Ticket medio (R$)
  - Tamanho do ponto: Total gasto pelo cliente (ZAxis)
  - Cores por quadrante:
    - Verde: VIP (alta frequencia + alto ticket)
    - Azul: Frequente (alta frequencia, ticket baixo)
    - Amarelo: Potencial (ticket alto, baixa frequencia)
    - Cinza: Casual (baixa frequencia + baixo ticket)
  - Tooltip com nome do cliente e todas as metricas
  - Cards laterais com legenda e contagem por categoria
  - Dados buscados de vendas completadas agrupadas por cliente
  - Limite de 50 clientes (ordenados por total gasto)
  - Componentes: `ScatterChart`, `Scatter`, `ZAxis`, `Cell`
  - Icone `BubbleChartIcon` no titulo

- **Dashboard: Correcao de Warnings do Recharts**
  - Adicionado `minWidth={0}` em todos os `ResponsiveContainer`
  - Logica melhorada para `chartsReady`:
    - Verifica dimensoes dos containers antes de renderizar
    - Backoff exponencial entre tentativas (50ms, 100ms...)
    - Limite de 20 tentativas com fallback automatico
  - Eliminados warnings "width(-1) and height(-1) should be greater than 0"

- **Layout: Remocao do Scroll Horizontal**
  - `AppLayout.tsx`: `overflow-auto` → `overflow-y-auto overflow-x-hidden`
  - `AdminLayout.tsx`: `overflow-auto` → `overflow-y-auto overflow-x-hidden`
  - `PageContainer.tsx`: `overflow-auto` → `overflow-y-auto overflow-x-hidden`
  - Scroll horizontal "fantasma" eliminado em todas as paginas

- **Cupons e Promocoes: Cards Mobile**
  - `CouponsPage`: Adicionado `mobileCardRender` na Table
    - Card mostra codigo, descricao, status, desconto, uso e validade
    - Botoes de editar/excluir no rodape
    - Cores de status: Ativo (verde), Inativo (cinza), Expirado (vermelho)
  - `PromotionsPage`: Adicionado `mobileCardRender` na Table
    - Card mostra nome, tipo, status, desconto, uso e periodo
    - Cards de overview tambem ajustados para mobile (layout vertical)

- **Arquivos Criados**
  - Nenhum

- **Arquivos Modificados**
  - `src/modules/dashboard/DashboardPage.tsx` - Graficos e responsividade
  - `src/modules/coupons/CouponsPage.tsx` - Mobile cards
  - `src/modules/promotions/PromotionsPage.tsx` - Mobile cards
  - `src/components/layout/AppLayout.tsx` - Scroll horizontal fix
  - `src/components/layout/AdminLayout.tsx` - Scroll horizontal fix
  - `src/components/layout/PageContainer.tsx` - Scroll horizontal fix

### v0.19.1 (Janeiro 2026)

- **Aplicacao Automatica de Promocoes no Checkout**
  - Sistema busca promocoes ativas ao abrir checkout
  - Verifica elegibilidade por tipo de promocao:
    - `birthday`: Mes de aniversario do cliente
    - `loyalty_level`: Nivel de fidelidade especifico
    - `first_purchase`: Primeiro pedido do cliente
    - `reactivation`: Cliente inativo ha X dias
    - `category_discount`: Produtos de categorias especificas
    - `product_discount`: Produtos especificos
    - `seasonal` / `flash_sale`: Periodo de validade
  - Calcula desconto respeitando `max_discount`
  - Exibe promocoes aplicadas no resumo (cor roxa)
  - Registra uso em `promotion_usages` ao finalizar pedido

- **Descontos Detalhados no WhatsApp**
  - Mensagens agora mostram todos os descontos aplicados
  - Nova interface `OrderDiscountInfo` para passar dados de desconto
  - Secao de descontos mostra:
    - Cupom (codigo e valor)
    - Pontos (quantidade e valor)
    - Promocoes (nome e valor)
  - Atualizado `formatOrderMessageForCustomer` e `formatOrderMessageForCompany`

- **Descontos Detalhados nos Detalhes do Pedido**
  - `OrderDetailModal` exibe cada tipo de desconto separadamente
  - Cores diferenciadas: cupom (verde), pontos (ambar), promocao (roxo)
  - Removida linha generica "Descontos" em favor de linhas especificas

- **Suporte a Categoria no Carrinho**
  - `CartItem` agora inclui `categoryId` opcional
  - `CartContext` salva `categoryId` do produto ao adicionar
  - Permite funcionamento de promocoes por categoria

- **Arquivos Criados**
  - Nenhum

- **Arquivos Modificados**
  - `src/services/whatsapp.ts` - Interface `OrderDiscountInfo` e mensagens com descontos
  - `src/modules/catalog/components/CheckoutModal.tsx` - Aplicacao automatica de promocoes
  - `src/modules/catalog/components/OrderDetailModal.tsx` - Exibicao de descontos detalhados
  - `src/contexts/CartContext.tsx` - Salva `categoryId` no item do carrinho
  - `src/types/index.ts` - `categoryId` em `CartItem`
  - `docs/CUSTOMER_AREA.md` - Documentacao de promocoes automaticas e WhatsApp

### v0.19.0 (Janeiro 2026)

- **Area do Cliente no Catalogo Publico**
  - Login de cliente via telefone + CPF (sem senha)
  - Sessao persistida no localStorage (30 dias)
  - Contexto `CatalogCustomerContext` para gerenciar autenticacao
  - Modal de login (`CustomerLoginModal`)
  - Drawer de conta (`CustomerAccountDrawer`) com abas

- **Historico de Pedidos**
  - Visualizacao de todos os pedidos do cliente
  - Detalhes completos do pedido
  - Funcao "Repetir Pedido" adiciona itens ao carrinho
  - Status com cores diferenciadas

- **Sistema de Cupons de Desconto**
  - CRUD completo de cupons (`/app/:slug/cupons`)
  - Tipos: percentual ou valor fixo
  - Validacoes: pedido minimo, limite de uso, primeira compra
  - Input de cupom no checkout com validacao em tempo real
  - Lista de cupons disponiveis para o cliente

- **Programa de Fidelidade**
  - Configuracao do programa (`/app/:slug/fidelidade`)
  - Pontos por R$ gasto (configuravel)
  - Valor do ponto em R$ (configuravel)
  - Niveis de fidelidade com multiplicadores
  - Slider para usar pontos no checkout
  - Card de fidelidade na area do cliente

- **Sistema de Promocoes**
  - CRUD completo de promocoes (`/app/:slug/promocoes`)
  - 8 tipos de promocao:
    - Aniversario
    - Nivel de fidelidade
    - Primeira compra
    - Reativacao de cliente
    - Desconto por categoria
    - Desconto por produto
    - Sazonal
    - Flash sale
  - Condicoes em JSONB para flexibilidade

- **Integracao no Checkout**
  - Auto-preenchimento de dados se cliente logado
  - Aplicacao de cupom com validacao
  - Resgate de pontos de fidelidade
  - Calculo de descontos no resumo
  - Novos campos em `catalog_orders`:
    - `coupon_id`, `coupon_code`, `coupon_discount`
    - `points_used`, `points_discount`, `points_earned`
    - `promotion_id`, `promotion_discount`

- **Novas Rotas**
  - `/app/:slug/cupons` - Gerenciar cupons
  - `/app/:slug/fidelidade` - Configurar fidelidade
  - `/app/:slug/promocoes` - Gerenciar promocoes

- **Menu Lateral Atualizado**
  - Cupons (LocalOfferIcon)
  - Fidelidade (StarsIcon)
  - Promocoes (CampaignIcon)

- **Banco de Dados**
  - Migrations: `20260120000001` ate `20260120000006`
  - Novas tabelas: `coupons`, `coupon_usages`, `loyalty_config`, `loyalty_levels`, `loyalty_points`, `promotions`, `promotion_usages`
  - Campos adicionados em `customers` e `catalog_orders`

- **Documentacao**
  - `docs/CUSTOMER_AREA.md` - Documentacao completa da area do cliente

- **Arquivos Criados**
  - `src/contexts/CatalogCustomerContext.tsx`
  - `src/modules/catalog/components/CustomerLoginModal.tsx`
  - `src/modules/catalog/components/CustomerAccountDrawer.tsx`
  - `src/modules/catalog/components/OrderHistoryList.tsx`
  - `src/modules/catalog/components/OrderDetailModal.tsx`
  - `src/modules/catalog/components/CouponInput.tsx`
  - `src/modules/catalog/components/CouponsList.tsx`
  - `src/modules/catalog/components/LoyaltyCard.tsx`
  - `src/modules/catalog/components/PointsRedeemSlider.tsx`
  - `src/modules/coupons/CouponsPage.tsx`
  - `src/modules/loyalty/LoyaltyPage.tsx`
  - `src/modules/promotions/PromotionsPage.tsx`

- **Arquivos Modificados**
  - `src/types/index.ts` - Novos tipos
  - `src/routes/index.tsx` - Novas rotas
  - `src/routes/paths.ts` - Novos paths
  - `src/components/layout/Sidebar.tsx` - Novos itens de menu
  - `src/modules/catalog/CatalogPage.tsx` - Integracao com area do cliente
  - `src/modules/catalog/components/CheckoutModal.tsx` - Cupons e fidelidade

### v0.18.0 (Janeiro 2026)

- **Filtro de Busca em Pedidos do Catalogo**
  - Campo de busca por nome ou telefone do cliente
  - Filtragem em tempo real combinada com filtro de status
  - Icone de limpar busca (X)
  - EmptyState diferenciado para busca sem resultados

- **Link "Ver Detalhes" no Catalogo Publico**
  - Nome do produto agora e clicavel (abre pagina de detalhes)
  - Botao "Ver Detalhes" com icone de olho em cada produto
  - Responsivo: texto completo no desktop, "Detalhes" no mobile
  - Mantido botao "Adicionar ao Carrinho" existente

- **Cadastro Opcional de Cliente no Checkout**
  - Checkbox "Quero me cadastrar para facilitar proximas compras"
  - Campos CPF e Email aparecem apenas quando checkbox marcado
  - CPF obrigatorio para quem quer se cadastrar
  - Email opcional para contato adicional
  - Validacao de CPF com algoritmo completo (11 digitos)
  - Formatacao automatica do CPF: 000.000.000-00
  - Busca automatica de cliente existente pelo telefone
  - Auto-preenchimento de dados se cliente ja cadastrado

- **Estrutura de Dados para Clientes do Catalogo**
  - Nova coluna `phone_has_whatsapp` em customers
  - Nova coluna `source` (manual/catalog) para origem do cadastro
  - Nova coluna `total_orders` para contagem de pedidos
  - Nova coluna `total_spent` para valor total gasto
  - Nova coluna `last_order_at` para data do ultimo pedido
  - Indice unico por telefone+empresa (evita duplicatas)
  - Indice unico por CPF+empresa (evita duplicatas)
  - Coluna `customer_id` em catalog_orders (vinculo opcional)

- **LGPD: Consentimento para WhatsApp**
  - Checkbox de consentimento para receber mensagens
  - Campo `whatsapp_consent` em catalog_orders
  - Campo `consent_at` com data/hora do consentimento
  - Texto explicativo sobre uso do numero

- **Arquivos Criados**
  - `supabase/migrations/20260119100000_catalog_customer_registration.sql`

- **Arquivos Modificados**
  - `src/types/index.ts` - CustomerSource, novos campos em Customer e CatalogOrder
  - `src/modules/catalog-orders/CatalogOrdersPage.tsx` - Filtro de busca
  - `src/modules/catalog/CatalogPage.tsx` - Link e botao Ver Detalhes
  - `src/modules/catalog/components/CheckoutModal.tsx` - Cadastro de cliente

### v0.17.5 (Janeiro 2026)

- **UX: Interface Unificada de WhatsApp nas Configuracoes**
  - Dois cards separados (WhatsApp + Automacao) unificados em um unico card
  - Indicadores visuais claros de "Modo Automatico" e "Modo Manual"
  - Badge "ATIVO" mostra qual modo esta em uso
  - Cores diferenciadas: Verde (automatico), Amarelo (manual), Cinza (inativo)
  - Caixas de informacao explicando como cada modo funciona

- **Sincronizacao Automatica de Numero**
  - Ao conectar WhatsApp via QR Code, numero e sincronizado automaticamente
  - Campo `company.phone` atualizado junto com `whatsapp_settings`
  - Toast de confirmacao: "WhatsApp conectado! O numero foi sincronizado automaticamente."

- **Novo Layout quando Conectado**
  - Card verde com status de conexao e numero conectado
  - Icone de telefone com nome do perfil WhatsApp
  - Caixa azul explicando beneficios do modo automatico
  - Grid de notificacoes automaticas (4 cards interativos)
  - Secao de teste de mensagem

- **Novo Layout quando Desconectado**
  - Destaque visual para "Ative o Modo Automatico"
  - Gradiente verde no botao de conectar
  - Secao de modo manual como fallback
  - Caixa amarela explicando como funciona o modo manual
  - Campo de telefone para configurar numero de contato

- **Novos Icones**
  - `AutoModeIcon` - Indicador de modo automatico
  - `TouchAppIcon` - Indicador de modo manual
  - `InfoOutlinedIcon` - Caixas informativas
  - `PhoneIphoneIcon` - Numero do telefone conectado

- **Arquivos Modificados**
  - `src/modules/settings/SettingsPage.tsx` - Card unificado de WhatsApp
  - `docs/WHATSAPP_AUTOMATION.md` - Documentacao da nova interface
  - `docs/ROADMAP.md` - Este changelog

### v0.17.4 (Janeiro 2026)

- **UI: Cards de Notificacao WhatsApp Redesenhados**
  - Checkboxes simples substituidos por cards interativos
  - Grid responsivo 2x2 (1 coluna no mobile)
  - Icones especificos para cada tipo de notificacao:
    - `NotificationsActiveIcon` - Novo pedido (verde)
    - `InventoryIcon` - Pedido confirmado (azul)
    - `LocalShippingIcon` - Pedido entregue (esmeralda)
    - `CancelIcon` - Pedido cancelado (vermelho)
  - Cores distintas quando ativado/desativado
  - Checkmark de confirmacao no canto superior direito
  - Descricao curta explicando cada notificacao
  - Transicoes suaves ao interagir

- **UI: Deteccao de Provider de Autenticacao**
  - Nova secao mostrando metodos de login vinculados
  - Badges visuais para Google e Email/Senha
  - Deteccao automatica via `auth.currentUser.providerData`
  - Se usuario tem senha: mostra formulario de alteracao
  - Se usuario so usa Google: mostra mensagem orientando usar "Esqueci senha"
  - Titulo dinamico: "Alterar Senha" vs "Configurar Senha"

- **Arquivos Modificados**
  - `src/modules/settings/SettingsPage.tsx`
    - Novos imports: `NotificationsActiveIcon`, `InventoryIcon`, `LocalShippingIcon`, `CancelIcon`, `GoogleIcon`, `AddIcon`
    - Novo `useMemo` para `authProviders` (hasPassword, hasGoogle, providers)
    - Cards de notificacao redesenhados com grid e icones
    - Secao de senha condicional baseada no provider

### v0.17.3 (Janeiro 2026)

- **Correcao: Empresas podem conectar WhatsApp**
  - Edge Function `wuzapi-admin` agora permite que empresas conectem WhatsApp
  - Antes: Apenas super admins podiam executar `create-user`
  - Depois: Qualquer membro da empresa pode executar `create-user` para sua propria empresa
  - Verificacao de membership via `company_members` + `companies.slug`

- **Permissoes da Edge Function `wuzapi-admin`**
  | Acao | Permissao |
  |------|-----------|
  | `create-user` | Membro da empresa OU super admin |
  | `list-users` | Apenas super admin |
  | `delete-user` | Apenas super admin |
  | `get-user-status` | Qualquer usuario autenticado |

- **Arquivos Modificados**
  - `supabase/functions/wuzapi-admin/index.ts` - Nova logica de permissoes
  - `docs/ROADMAP.md` - Changelog atualizado
  - `docs/WHATSAPP_AUTOMATION.md` - Documentacao de permissoes
  - `docs/ARCHITECTURE.md` - Secao de Edge Functions atualizada

### v0.17.2 (Janeiro 2026)

- **Seguranca: Token Admin WuzAPI Protegido**
  - Token admin NUNCA exposto no frontend (removido de `.env.local`)
  - Nova Edge Function `wuzapi-admin` para operacoes administrativas
  - Validacao de Firebase ID Token sem SDK Admin (decodifica JWT manualmente)
  - Verificacao de `is_super_admin` no Supabase antes de autorizar
  - Deploy com `--no-verify-jwt` para aceitar tokens Firebase

- **Edge Function `wuzapi-admin`**
  - Acoes: `list-users`, `get-user-status`, `delete-user`, `force-reconnect`
  - Secrets configurados: `WUZAPI_ADMIN_TOKEN`, `WUZAPI_URL`, `SUPABASE_SERVICE_ROLE_KEY`
  - Validacao de claims Firebase: `iss`, `aud`, `exp`
  - Projeto Firebase: `saas-af55a`

- **Correcoes**
  - Corrigido erro "Invalid JWT" (401) - flag `--no-verify-jwt` necessaria
  - Corrigido erro "column profiles.role does not exist" - usando `is_super_admin`
  - Debounce no `WhatsAppConnectModal` para evitar race conditions
  - Timeout de health check reduzido de 30s para 5s

- **Documentacao Atualizada**
  - `WHATSAPP_AUTOMATION.md` - Secao de seguranca completa
  - `ARCHITECTURE.md` - Secao de Edge Functions e tokens
  - `SETUP.md` - Configuracao do WuzAPI e troubleshooting
  - `ROADMAP.md` - Changelog atualizado

- **Arquivos Modificados**
  - `supabase/functions/wuzapi-admin/index.ts` - Edge Function completa
  - `src/services/whatsapp.ts` - Chamadas via Edge Function para admin
  - `src/components/ui/WhatsAppConnectModal.tsx` - Debounce adicionado
  - `.env.local` - Token admin removido (apenas URL publica)

### v0.17.1 (Janeiro 2026)

- **Melhorias de Seguranca e Resiliencia no WhatsApp**
  - Token deterministico por empresa (evita usuarios duplicados no WuzAPI)
  - Timeout de 30s em todas as requisicoes (evita travamentos)
  - Retry automatico (3x) para erros 500 e de rede
  - Delay progressivo entre tentativas (1s, 2s, 3s)
  - Verificacao de conexao antes de enviar mensagem
  - Mensagem de erro clara quando WhatsApp desconectado

- **Correcoes na Pagina Admin WhatsApp**
  - Busca de instancia por token salvo (mais confiavel)
  - Fallback para busca por nome
  - Correcao: empresas conectadas agora aparecem corretamente
  - Correcao da deteccao de usuarios orfaos

- **Melhorias no Modal de Conexao**
  - Limite de 5 erros consecutivos no polling
  - Para o polling e mostra erro claro ao usuario
  - Evita consumo infinito de recursos

- **Edge Function Preparada (Supabase)**
  - Criado `supabase/functions/wuzapi-admin/index.ts`
  - Acoes: create-user, list-users, delete-user, get-user-status
  - Secrets configurados no Supabase
  - Preparado para uso futuro com autenticacao Firebase

- **Documentacao Atualizada**
  - Nova secao "Melhorias de Seguranca e Resiliencia" no WHATSAPP_AUTOMATION.md
  - Comandos uteis para debug do WuzAPI
  - Proximas melhorias planejadas

- **Arquivos Criados**
  - `supabase/functions/wuzapi-admin/index.ts`

- **Arquivos Modificados**
  - `src/services/whatsapp.ts` - Timeout, retry, verificacao de conexao
  - `src/components/ui/WhatsAppConnectModal.tsx` - Limite de erros no polling
  - `src/modules/admin/WhatsAppAdminPage.tsx` - Busca por token
  - `docs/WHATSAPP_AUTOMATION.md` - Documentacao de seguranca
  - `.env.local` - Token CLI Supabase

### v0.17.0 (Janeiro 2026)

- **Painel de Administracao WhatsApp (Super Admin)**
  - Nova pagina `/admin/whatsapp` para gerenciar todas as instancias WuzAPI
  - Visualizacao de status da API (online/offline)
  - Lista todas as empresas com integracao WhatsApp
  - Deteccao de instancias orfas (existem no WuzAPI mas nao no sistema)
  - Cards de estatisticas: total de instancias, conectadas, desconectadas, orfas
  - Funcoes de gerenciamento por instancia:
    - Ver status de conexao em tempo real
    - Forcar reconexao (gera novo QR Code)
    - Desconectar sessao (logout)
    - Excluir instancia completamente
  - Modais de confirmacao para acoes destrutivas (desconectar e excluir)

- **API WhatsApp Atualizada**
  - Nova funcao `listAllUsers()` para listar todas as instancias
  - Nova funcao `getUserStatus()` para verificar status individual
  - Nova funcao `forceReconnect()` para reconectar instancias
  - Nova funcao `deleteUserById()` para deletar por ID (hash)
  - Correcao do delete: WuzAPI espera ID (hash) e nao o nome
  - Interface `WuzAPIUser` com campo `id` adicionado

- **Navegacao Admin Atualizada**
  - Link "WhatsApp" adicionado na sidebar do Admin
  - Botao "WhatsApp" nas acoes rapidas do Dashboard Admin

- **Arquivos Criados**
  - `src/modules/admin/WhatsAppAdminPage.tsx` - Pagina completa do painel

- **Arquivos Modificados**
  - `src/services/whatsapp.ts` - Novas funcoes admin e correcao delete
  - `src/routes/index.tsx` - Nova rota `/admin/whatsapp`
  - `src/components/layout/AdminSidebar.tsx` - Link WhatsApp
  - `src/modules/admin/AdminDashboardPage.tsx` - Botao WhatsApp

### v0.16.1 (Janeiro 2026)

- **WhatsApp Non-Blocking (Fire and Forget)**
  - Envio de WhatsApp NAO bloqueia mais o sistema
  - Se WhatsApp falhar, pedido continua normalmente
  - Mensagens de sucesso agora sao neutras (nao prometem WhatsApp)
  - Preparacao para WhatsApp ser feature premium no futuro

- **Mensagem de Sucesso Atualizada**
  - Antes: "Voce recebera uma confirmacao no WhatsApp"
  - Depois: "A empresa recebeu seu pedido. Se voce informou corretamente seu contato, poderemos mante-lo informado sobre a situacao do seu pedido por mensagem."

### v0.16.0 (Janeiro 2026)

- **Notificacoes Automaticas de Pedidos via WhatsApp**
  - Cliente recebe confirmacao automatica ao fazer pedido no catalogo
  - Empresa recebe alerta de novo pedido no WhatsApp
  - Cliente notificado em todas mudancas de status (confirmado, entregue, cancelado)
  - Fallback para wa.me se WhatsApp nao estiver configurado
  - Botao do checkout mudou de "Enviar via WhatsApp" para "Enviar Pedido"

- **Arquivos Modificados**
  - `src/modules/catalog/components/CheckoutModal.tsx` - Envio automatico de notificacoes
  - `docs/WHATSAPP_AUTOMATION.md` - Documentacao completa do fluxo
  - `docs/ROADMAP.md` - Changelog atualizado

### v0.15.0 (Janeiro 2026)

- **Integracao WhatsApp com WuzAPI**
  - Substituicao do Evolution API pelo WuzAPI (Go + whatsmeow)
  - Instalacao na VPS KingHost (evertonapi.vps-kinghost.net)
  - Servico `src/services/whatsapp.ts` com API completa
  - Multi-tenant: cada empresa tem seu proprio usuario/token
  - Modal de conexao com QR Code
  - Verificacao de telefone via `/user/check` (resolve problema do 9o digito brasileiro)
  - Envio de mensagem de teste funcionando
  - Secao de automacao na pagina de Configuracoes

- **Arquivos Criados**
  - `src/services/whatsapp.ts` - Servico completo para WuzAPI
  - `src/components/ui/WhatsAppConnectModal.tsx` - Modal de conexao
  - `supabase/migrations/20260118000003_add_whatsapp_settings.sql` - Migration

- **Arquivos Modificados**
  - `src/types/index.ts` - Interface WhatsAppSettings atualizada para WuzAPI
  - `src/modules/settings/SettingsPage.tsx` - Secao de automacao WhatsApp
  - `src/modules/catalog-orders/CatalogOrdersPage.tsx` - Notificacoes de pedidos
  - `src/components/ui/index.ts` - Export do WhatsAppConnectModal

### v0.14.0 (Janeiro 2026)

- **Filtros de Status em Pedidos**
  - Botoes de filtro: Todos, Pendentes, Confirmados, Entregues
  - Cores correspondentes ao status de cada filtro
  - Contagem de pedidos por status em cada botao
  - Badge destacado para pedidos pendentes
  - Mensagem de empty state dinamica por filtro

- **Validacao de WhatsApp**
  - Formatacao automatica: (XX) XXXXX-XXXX
  - Validacao em tempo real com icone de status
  - Verifica DDD valido (11-99)
  - Celular deve comecar com 9
  - Aceita fixo (10 digitos) ou celular (11 digitos)
  - Botao "Testar WhatsApp" para verificar numero
  - Mensagens de erro especificas

- **Table Responsivo para Tablets**
  - Cards agora aparecem em tablets (< 1024px) alem de mobile
  - Prop `cardBreakpoint` para customizar breakpoint
  - Antes: cards apenas em < 768px, agora: < 1024px

- **Paginacao Automatica para Cards**
  - 10 itens por pagina por padrao
  - Navegacao com setas e contador de paginas
  - Exibe "1-10 de 50" para indicar posicao
  - Reset automatico ao filtrar/buscar
  - Prop `pageSize` para customizar quantidade
  - Prop `disablePagination` para desabilitar

- **Performance Otimizada**
  - Usa `useMemo` para dados paginados
  - Renderiza apenas itens da pagina atual
  - Menos DOM nodes = scroll mais suave

- **Tela de Configuracoes Melhorada**
  - Campo de logo em layout lateral (compacto)
  - Botao de lixo removido do ImageUpload
  - Layout responsivo (empilha no mobile)

- **ImageUpload com Novas Props**
  - `compact`: Modo compacto (quadrado, menor)
  - `showRemoveButton`: Controla botao de delete

### v0.13.0 (Janeiro 2026)

- **Sistema de Notificacoes de Pedidos**
  - Novo contexto `NotificationContext` para gerenciar notificacoes
  - Escuta novos pedidos via Supabase Realtime
  - Toast customizado com nome do cliente e valor do pedido
  - Som de notificacao usando Web Audio API (dois beeps)
  - Badge vermelho na Sidebar mostrando pedidos pendentes
  - Animacao pulse no badge quando ha novos pedidos
  - Auto-dismiss ao visitar pagina de pedidos

- **Hook useNotifications**
  - `pendingOrdersCount`: Quantidade de pedidos pendentes
  - `hasNewOrders`: Flag se ha pedidos nao vistos
  - `refreshPendingCount()`: Atualizar contagem manualmente
  - `markOrdersAsSeen()`: Marcar pedidos como vistos

- **Persistencia do Estado da Sidebar**
  - Estado colapsado/expandido salvo no localStorage
  - Preferencia mantida apos refresh da pagina
  - Chave `ejym_sidebar_collapsed` para AppLayout
  - Chave `ejym_admin_sidebar_collapsed` para AdminLayout

- **Atualizacao Automatica de Pedidos**
  - CatalogOrdersPage usa Realtime para atualizar lista
  - Sincronizacao automatica ao mudar status de pedidos

- **Comando de Deploy**
  - Novo script `npm run deploy` no package.json
  - Executa build + firebase deploy em sequencia

- **Arquivos Criados**
  - `src/contexts/NotificationContext.tsx`

- **Arquivos Modificados**
  - `src/components/layout/AppLayout.tsx` - NotificationProvider + persistencia sidebar
  - `src/components/layout/AdminLayout.tsx` - Persistencia sidebar
  - `src/components/layout/Sidebar.tsx` - Badge de pedidos + useNotifications
  - `src/modules/catalog-orders/CatalogOrdersPage.tsx` - Realtime + notificacoes
  - `package.json` - Script deploy

### v0.12.0 (Janeiro 2026)

- **Multiplas Imagens por Produto (ate 4)**
  - Nova coluna `images` JSONB na tabela `products`
  - Migration automatica de `image_url` existente para array `images`
  - Interface `ProductImage` com `url`, `order`, `isPrimary`
  - Compatibilidade retroativa com campo `image_url`

- **Novos Componentes UI**
  - `ImageCarousel`: Carrossel com suporte a swipe touch (mobile) e setas (desktop)
  - `ImageLightbox`: Visualizacao em tela cheia com navegacao por teclado/swipe
  - `MultiImageUpload`: Upload multiplo com drag & drop para reordenar imagens

- **Funcionalidades do ImageCarousel**
  - Navegacao por swipe no mobile
  - Setas de navegacao no desktop
  - Indicadores de pontos
  - Callback ao clicar para abrir lightbox

- **Funcionalidades do ImageLightbox**
  - Tela cheia com fundo escuro
  - Navegacao por setas/teclado/swipe
  - Contador de imagens (1/4)
  - Miniaturas na parte inferior
  - Tecla ESC para fechar

- **Funcionalidades do MultiImageUpload**
  - Grid 2x2 (mobile) ou 4 colunas (desktop)
  - Drag & drop HTML5 para reordenar
  - Botao de deletar em cada imagem
  - Indicador de imagem principal (estrela)
  - Limite de 4 imagens

- **Servicos de Storage Atualizados**
  - `uploadProductImages()`: Upload em lote
  - `deleteProductImages()`: Delete em lote

- **Paginas Atualizadas**
  - ProductsPage: Formulario com `MultiImageUpload`
  - CatalogPage: Cards com `ImageCarousel` e `ImageLightbox`
  - ProductPage: Detalhe com `ImageCarousel` e `ImageLightbox`

- **Arquivos Criados**
  - `supabase/migrations/20260118000001_add_product_images.sql`
  - `src/components/ui/ImageCarousel.tsx`
  - `src/components/ui/ImageLightbox.tsx`
  - `src/components/ui/MultiImageUpload.tsx`

- **Arquivos Modificados**
  - `src/types/index.ts` - Interface ProductImage e campo images em Product
  - `src/services/storage.ts` - Funcoes de upload/delete em lote
  - `src/components/ui/index.ts` - Exports dos novos componentes
  - `src/modules/products/ProductsPage.tsx` - MultiImageUpload no formulario
  - `src/modules/catalog/CatalogPage.tsx` - ImageCarousel + ImageLightbox
  - `src/modules/catalog/ProductPage.tsx` - ImageCarousel + ImageLightbox

- **Supabase Realtime**
  - Migration para habilitar Realtime nas tabelas principais
  - Tabelas habilitadas: `products`, `sales`, `sale_items`, `catalog_orders`, `catalog_order_items`, `categories`, `customers`
  - Hook `useRealtimeSubscription` para subscricoes com callbacks granulares
  - Hook `useRealtimeRefresh` simplificado para recarregar dados
  - Suporte a filtros por `company_id` para multi-tenancy
  - Eventos: INSERT, UPDATE, DELETE ou todos (*)

- **Arquivos Criados (Realtime)**
  - `supabase/migrations/20260118000002_enable_realtime.sql`
  - `src/hooks/useRealtimeSubscription.ts`

- **Scanner de Codigo de Barras**
  - Componente `BarcodeScanner` para leitura via camera
  - Suporte a EAN-13, EAN-8, UPC, Code 128, Code 39, QR Code
  - Preferencia automatica para camera traseira
  - Som de confirmacao ao escanear
  - Botao de scanner no campo EAN (ProductsPage)
  - Botao de scanner na busca de produtos (SalesPage)
  - Busca automatica por EAN e adicao ao carrinho
  - Suporte automatico a leitores USB/Bluetooth

- **Arquivos Criados (Barcode)**
  - `src/components/ui/BarcodeScanner.tsx`

- **Arquivos Modificados (Barcode)**
  - `src/components/ui/index.ts` - Export do BarcodeScanner
  - `src/modules/products/ProductsPage.tsx` - Botao de scan no EAN
  - `src/modules/sales/SalesPage.tsx` - Botao de scan e busca por EAN
  - `vite.config.ts` - Aumento do limite de cache PWA para 3MB

- **Dependencias Adicionadas**
  - `@zxing/browser` - Leitura de codigos via camera
  - `@zxing/library` - Decodificacao de codigos de barras

### v0.11.0 (Janeiro 2026)

- **Toolbar Sticky nas Paginas de Listagem**
  - PageContainer agora suporta prop `toolbar` para filtros fixos
  - Titulo e subtitulo rolam junto com o conteudo
  - Filtros/buscas ficam fixos no topo durante o scroll
  - Implementado em todas as paginas de listagem:
    - ProductsPage (busca + filtro de categoria)
    - CustomersPage (busca por nome, email, telefone)
    - SalesPage (busca + filtro de status)
    - CategoriesPage (busca por nome)
    - UsersPage (busca por nome ou email)
    - CompaniesPage (busca de empresas)

- **Novo Layout do Catalogo Publico**
  - Header arredondado com bordas e sombra
  - Container principal arredondado com scroll interno
  - Filtros (busca + categoria) fixos no topo
  - Produtos rolam independentemente
  - Footer movido para dentro do container de scroll
  - Grid de 2 colunas no mobile para melhor aproveitamento
  - Textos e botoes responsivos (menores no mobile)

- **Botao Limpar no Campo de Busca do Catalogo**
  - Icone X discreto aparece quando ha texto digitado
  - Limpa o campo de busca ao clicar
  - Posicionado a direita dentro do input

- **Arquivos Modificados**
  - `src/components/layout/PageContainer.tsx` - Nova prop `toolbar` com sticky
  - `src/modules/products/ProductsPage.tsx` - Filtros movidos para toolbar
  - `src/modules/customers/CustomersPage.tsx` - Busca movida para toolbar
  - `src/modules/sales/SalesPage.tsx` - Filtros movidos para toolbar
  - `src/modules/categories/CategoriesPage.tsx` - Busca movida para toolbar
  - `src/modules/users/UsersPage.tsx` - Busca movida para toolbar
  - `src/modules/companies/CompaniesPage.tsx` - Busca movida para toolbar
  - `src/modules/catalog/CatalogPage.tsx` - Novo layout arredondado com filtro fixo

### v0.10.0 (Janeiro 2026)

- **Campo EAN (Codigo de Barras) nos Produtos**
  - Nova coluna `ean` na tabela `products` (migration `20260117000001_add_ean_to_products.sql`)
  - Indice para buscas rapidas por codigo de barras
  - Campo EAN no formulario de criar/editar produto
  - Busca por nome, SKU ou EAN na lista de produtos
  - Exportacao Excel/PDF inclui coluna EAN
  - Importacao via Excel suporta coluna EAN
  - Modelo de importacao atualizado com exemplo de EAN

- **Novo Layout com Areas Arredondadas**
  - Sidebar arredondada (ja existia)
  - Header arredondado e fixo no topo
  - Area principal arredondada com scroll proprio
  - Scroll apenas na area de conteudo (header e sidebar ficam fixos)
  - Estrutura: container com `overflow-hidden` + area interna com `overflow-auto`
  - Conteudo clipado nas bordas arredondadas durante scroll

- **Melhorias no Header**
  - Seletor de empresa mostra seta apenas quando ha mais de 1 empresa
  - Com 1 empresa: exibe apenas logo + nome (sem dropdown)
  - Com multiplas empresas: exibe logo + nome + seta com dropdown

- **Correcao na Sidebar Colapsada**
  - Botao de menu centralizado corretamente quando sidebar esta colapsada
  - Container usa `justify-center` quando colapsado
  - Padding ajustado para melhor centralizacao

- **Arquivos Modificados**
  - `src/types/index.ts` - Adicionado campo `ean` na interface Product
  - `src/modules/products/ProductsPage.tsx` - Campo EAN no formulario, busca e exportacao
  - `src/components/layout/AppLayout.tsx` - Novo layout com scroll proprio
  - `src/components/layout/AdminLayout.tsx` - Novo layout com scroll proprio
  - `src/components/layout/Header.tsx` - Seletor de empresa condicional
  - `src/components/layout/AdminHeader.tsx` - Ajustes de layout
  - `src/components/layout/Sidebar.tsx` - Centralizacao do botao quando colapsado
  - `src/components/layout/AdminSidebar.tsx` - Centralizacao do botao quando colapsado
  - `supabase/migrations/20260117000001_add_ean_to_products.sql` - Nova migration

### v0.9.0 (Janeiro 2026)

- **PWA (Progressive Web App)**
  - Configuracao do vite-plugin-pwa com manifest e Workbox
  - Hook `usePWAInstall` para gerenciar instalacao
  - Componente `PWAInstallPrompt` com bottom sheet animado
  - Prompt de instalacao a cada 1 hora (se nao instalado)
  - Para de mostrar apos 5 recusas
  - Cache de assets estaticos e fontes Google
  - Icones PWA (192x192, 512x512, apple-touch-icon)
  - Meta tags para iOS e Android

### v0.8.0 (Janeiro 2026)

- **Layout Responsivo Mobile-First**
  - Sidebar como drawer no mobile com overlay
  - Header sticky apenas no mobile (alinhado com sidebar)
  - Tabelas convertidas em cards no mobile usando `mobileCardRender`
  - Margens e paddings reduzidos para melhor aproveitamento de espaco
  - Deteccao de mobile via `window.innerWidth < 768`
- **Toggle de Visibilidade de Senha**
  - Adicionado icone de olho em todos os inputs de senha
  - Usando prop `rightIcon` do componente Input para alinhamento correto
  - Implementado em: LoginPage, RegisterPage, AcceptInvitePage, SettingsPage
- **Confirmacao de Cancelamento de Venda**
  - Modal de confirmacao ao cancelar uma venda
  - Campo opcional para justificativa do cancelamento
  - Motivo salvo junto com a venda cancelada
- **Paginas com Cards no Mobile**
  - ProductsPage, CustomersPage, SalesPage
  - CategoriesPage, UsersPage, CompaniesPage
  - Modais de venda (carrinho e detalhes)

### v0.7.0 (Janeiro 2026)

- **Filtro de Periodo no Dashboard**
  - Opcoes: Hoje, Ontem, Ultimos 7 dias, Ultimos 30 dias, Este mes, Mes passado, Todo periodo
  - Filtra vendas, faturamento, pedidos do catalogo e graficos
  - Clientes e produtos mostram contagem total (nao sao afetados pelo filtro)
- **Busca de Produtos no Modal de Venda**
  - Campo de busca por nome, descricao ou SKU
  - Substituicao do dropdown por lista filtrada
  - Melhoria para lojas com muitos produtos

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
