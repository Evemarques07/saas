# Plano de Implementacao - Modais Interativos dos Feature Cards

## Visao Geral

Criar uma experiencia interativa para os 8 cards de recursos na secao "Tudo que voce precisa para vender mais". Ao clicar em cada card, um modal lateral (desktop) ou modal tradicional (mobile) exibe uma preview funcional do recurso.

---

## Comportamento do Modal

### Desktop (lg+)
- Modal desliza da **esquerda para direita**
- Posicao fixa na lateral esquerda da tela
- **Fecha automaticamente ao rolar a pagina**
- Overlay semi-transparente no restante da tela
- Largura: ~450px
- Altura: 100vh ou auto com max-height

### Mobile/Tablet (< lg)
- Modal tradicional centralizado
- Botao de fechar (X) visivel
- Overlay com click para fechar
- Largura: 95% da tela
- Max-height: 90vh com scroll interno

---

## Os 8 Cards e Seus Modais

### 1. Catalogo Online (ShoppingBagIcon)
**Objetivo:** Mostrar como o catalogo digital aparece para os clientes

**Conteudo do Modal:**
- Header com nome da loja ficticia
- Barra de busca
- 4-6 produtos mockados com:
  - Imagem
  - Nome do produto
  - Preco
  - Botao "Adicionar"
- Categorias clicaveis (tabs)
- Badge de "Novo" em alguns produtos

**Interatividade:**
- Trocar entre categorias
- Simular adicionar ao carrinho (contador no header)

---

### 2. Pedidos via WhatsApp (WhatsAppIcon)
**Objetivo:** Mostrar como o pedido chega no WhatsApp

**Conteudo do Modal:**
- Simulacao de tela do WhatsApp
- Mensagem formatada de pedido:
  - Nome do cliente
  - Lista de produtos
  - Quantidade e precos
  - Total
  - Endereco de entrega
- Botoes de acao: "Confirmar Pedido", "Responder"

**Interatividade:**
- Clicar em "Confirmar" mostra mensagem de confirmacao
- Animacao de "digitando..."

---

### 3. Dashboard Inteligente (BarChartIcon)
**Objetivo:** Preview do dashboard com metricas

**Conteudo do Modal:**
- Mini grafico de vendas (barras ou linha)
- Cards de metricas:
  - Vendas hoje: R$ 1.234
  - Pedidos: 23
  - Ticket medio: R$ 53,65
  - Clientes novos: 5
- Lista de ultimos pedidos (3-4 itens)

**Interatividade:**
- Hover nos graficos mostra valores
- Toggle entre "Hoje", "Semana", "Mes"

---

### 4. Scanner de Produtos (QrCodeScannerIcon)
**Objetivo:** Demonstrar o cadastro rapido via camera

**Conteudo do Modal:**
- Simulacao de viewfinder da camera
- Codigo de barras animado sendo "escaneado"
- Apos "escanear":
  - Formulario preenchido automaticamente
  - Nome do produto
  - Codigo
  - Campo de preco editavel
- Botao "Salvar Produto"

**Interatividade:**
- Animacao de scan
- Clicar "Escanear" inicia animacao
- Campos do formulario aparecem preenchidos

---

### 5. CRM de Clientes (PeopleIcon)
**Objetivo:** Mostrar o historico e gestao de clientes

**Conteudo do Modal:**
- Lista de clientes mockados (3-4)
- Ao "selecionar" um cliente:
  - Foto/avatar
  - Nome e telefone
  - Total gasto
  - Qtd de pedidos
  - Ultimo pedido
  - Produtos favoritos (tags)
- Status de fidelidade (Bronze, Prata, Ouro)

**Interatividade:**
- Clicar em cliente mostra detalhes
- Tabs: "Historico", "Dados", "Notas"

---

### 6. Controle de Estoque (InventoryIcon)
**Objetivo:** Alertas e gestao de estoque

**Conteudo do Modal:**
- Lista de produtos com estoque:
  - Nome
  - Quantidade atual
  - Status (Ok, Baixo, Critico)
- Alertas em destaque (produtos acabando)
- Barra de progresso visual do estoque
- Botao "Atualizar Estoque"

**Interatividade:**
- Clicar em produto abre mini-editor de quantidade
- Filtros: "Todos", "Baixo Estoque", "Sem Estoque"

---

### 7. Programa de Fidelidade (CardGiftcardIcon)
**Objetivo:** Mostrar o sistema de pontos e recompensas

**Conteudo do Modal:**
- Card de cliente com:
  - Nivel atual (Bronze/Prata/Ouro)
  - Pontos acumulados
  - Barra de progresso para proximo nivel
- Lista de recompensas disponiveis:
  - 100 pts = R$ 5 desconto
  - 250 pts = R$ 15 desconto
  - 500 pts = Produto gratis
- Historico de pontos (ultimas 3 transacoes)

**Interatividade:**
- Simular "Resgatar" recompensa
- Animacao de pontos sendo adicionados

---

### 8. Cupons Inteligentes (LocalOfferIcon)
**Objetivo:** Criacao e gestao de cupons

**Conteudo do Modal:**
- Lista de cupons ativos:
  - BEMVINDO10 - 10% off (23 usos)
  - FRETE50 - R$ 50 off frete (5 usos)
  - NATAL2024 - 15% off (expirado)
- Formulario de criacao rapida:
  - Codigo
  - Tipo (% ou R$)
  - Valor
  - Limite de usos
- Metricas do cupom selecionado

**Interatividade:**
- Toggle ativar/desativar cupom
- Simular criacao de novo cupom

---

## Estrutura de Arquivos

```
src/modules/landing/
├── LandingPage.tsx (atualizar para usar o FeatureModal)
├── FEATURE_MODALS_PLAN.md (este arquivo)
├── components/
│   ├── FeatureModal.tsx (componente container do modal)
│   └── feature-previews/
│       ├── CatalogPreview.tsx
│       ├── WhatsAppPreview.tsx
│       ├── DashboardPreview.tsx
│       ├── ScannerPreview.tsx
│       ├── CRMPreview.tsx
│       ├── StockPreview.tsx
│       ├── LoyaltyPreview.tsx
│       └── CouponsPreview.tsx
```

---

## Componente FeatureModal

```tsx
// Estrutura basica
interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  title: string;
  color: string;
}

// Comportamentos:
// - useEffect para detectar scroll e fechar (desktop)
// - useMediaQuery para alternar entre lateral/central
// - Animacoes com Tailwind (translate-x, opacity)
// - Trap focus para acessibilidade
// - Escape key para fechar
```

---

## Dados Mock

Criar arquivo `featureMockData.ts` com:
- Produtos de exemplo
- Clientes ficticios
- Pedidos mockados
- Cupons de exemplo
- Historico de pontos

---

## Animacoes

### Entrada (Desktop)
```css
transform: translateX(-100%) -> translateX(0)
opacity: 0 -> 1
duration: 300ms
easing: ease-out
```

### Entrada (Mobile)
```css
transform: scale(0.95) translateY(20px) -> scale(1) translateY(0)
opacity: 0 -> 1
duration: 200ms
```

### Saida ao Scroll
```css
transform: translateX(0) -> translateX(-50%)
opacity: 1 -> 0
duration: 200ms
```

---

## Ordem de Implementacao

1. [x] Criar estrutura de pastas
2. [x] Implementar FeatureModal.tsx (container)
3. [x] Criar CatalogPreview.tsx (mais simples para testar)
4. [x] Integrar com LandingPage.tsx
5. [x] Testar comportamento de scroll
6. [x] Implementar demais previews:
   - [x] WhatsAppPreview
   - [x] DashboardPreview
   - [x] ScannerPreview
   - [x] CRMPreview
   - [x] StockPreview
   - [x] LoyaltyPreview
   - [x] CouponsPreview
7. [x] Ajustar responsividade mobile
8. [x] Polir animacoes e transicoes
9. [ ] Testes finais em diferentes dispositivos

---

## Consideracoes Tecnicas

- Usar `createPortal` para renderizar modal fora da hierarquia
- `useCallback` para handlers de scroll otimizados
- `useMemo` para dados mock pesados
- Lazy loading dos previews com `React.lazy`
- Prevenir scroll do body quando modal aberto

---

## Acessibilidade

- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` com titulo
- Focus trap dentro do modal
- Fechar com Escape
- Anunciar abertura para screen readers

---

## Estimativa de Complexidade

| Componente | Complexidade | Prioridade |
|------------|--------------|------------|
| FeatureModal | Media | Alta |
| CatalogPreview | Media | Alta |
| WhatsAppPreview | Media | Media |
| DashboardPreview | Alta | Media |
| ScannerPreview | Alta | Baixa |
| CRMPreview | Media | Media |
| StockPreview | Baixa | Media |
| LoyaltyPreview | Media | Media |
| CouponsPreview | Media | Media |

---

## Proximos Passos

Apos aprovacao deste plano:
1. Comecar pelo FeatureModal.tsx
2. Implementar CatalogPreview como prova de conceito
3. Iterar sobre feedback
4. Completar demais previews
