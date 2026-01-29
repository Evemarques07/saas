# Plano de Implementação: Impressão de Vendas

## Status de Implementação

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Impressão Básica (Browser/PDF) | ✅ Concluído |
| 2 | Compartilhamento WhatsApp | ✅ Concluído |
| 3 | Impressão Bluetooth | ✅ Concluído |
| 4 | Impressão de Rede | ✅ Concluído |
| 5 | Configurações Avançadas | 🔄 Parcial |

**Última atualização:** 2026-01-29

---

## Visão Geral

Este documento detalha o plano para implementar a funcionalidade de impressão de comprovantes de vendas no sistema EJYM, suportando múltiplos formatos de impressora e métodos de conexão.

---

## 1. Cenários de Uso

### 1.1 Tipos de Impressora

| Tipo | Largura do Papel | Uso Comum |
|------|------------------|-----------|
| Térmica 58mm | 32-35 caracteres/linha | Pequenos comércios, mobile |
| Térmica 80mm | 42-48 caracteres/linha | Balcão, restaurantes, varejo |
| Impressora comum | A4/Carta | Relatórios, escritório |

### 1.2 Métodos de Conexão

| Conexão | Ambiente | Tecnologia |
|---------|----------|------------|
| **USB** | Desktop/Notebook | Driver nativo do SO |
| **Bluetooth** | Mobile/Tablet | Web Bluetooth API |
| **Rede (Wi-Fi/Ethernet)** | Qualquer | Socket TCP/IP ou HTTP |
| **Compartilhamento de rede** | Windows | Impressora compartilhada |

---

## 2. Arquitetura da Solução

### 2.1 Abordagem Híbrida

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ PrintService │  │ ReceiptGen   │  │ PrintPreview Component │ │
│  │ (abstração)  │  │ (formatação) │  │ (visualização)         │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────────────────┘ │
│         │                 │                                     │
│  ┌──────┴─────────────────┴──────┐                              │
│  │      Print Adapters           │                              │
│  ├───────────────────────────────┤                              │
│  │ - BrowserPrintAdapter         │ → window.print() / PDF       │
│  │ - BluetoothPrintAdapter       │ → Web Bluetooth API          │
│  │ - NetworkPrintAdapter         │ → ESC/POS via HTTP           │
│  │ - WhatsAppShareAdapter        │ → Imagem via WhatsApp        │
│  └───────────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Estrutura de Arquivos

```
src/
├── services/
│   └── print/
│       ├── index.ts                 # Export principal ✅
│       ├── PrintService.ts          # Serviço principal ✅
│       ├── ReceiptGenerator.ts      # Gerador de recibos ✅
│       ├── ESCPOSCommands.ts        # Comandos ESC/POS ✅
│       └── BluetoothPrintAdapter.ts # Adapter Bluetooth ✅
├── components/
│   └── print/
│       ├── index.ts                 # Export dos componentes ✅
│       ├── PrintButton.tsx          # Botão com menu de opções ✅
│       ├── PrintPreview.tsx         # Preview do recibo ✅
│       ├── WhatsAppShareModal.tsx   # Modal compartilhamento WhatsApp ✅
│       └── BluetoothPrinterModal.tsx # Modal conexão Bluetooth ✅
├── hooks/
│   └── usePrint.ts                  # Hook para impressão ✅
└── types/
    └── web-bluetooth.d.ts           # TypeScript para Web Bluetooth ✅
```

---

## 3. Especificações Técnicas

### 3.1 Formato do Recibo (Template)

```
================================
       NOME DA EMPRESA
================================
CNPJ: XX.XXX.XXX/XXXX-XX
Tel: (XX) XXXXX-XXXX

DATA: DD/MM/YYYY HH:MM
VENDA #XXXXXXXX
--------------------------------
CLIENTE: Nome do Cliente
Tel: (XX) XXXXX-XXXX
--------------------------------
ITENS:
--------------------------------
2x Produto ABC
   R$ 25,00 cada    R$ 50,00

1x Produto XYZ
   R$ 15,00 cada    R$ 15,00
--------------------------------
SUBTOTAL:           R$ 65,00
DESCONTO:          -R$ 5,00
--------------------------------
TOTAL:              R$ 60,00
--------------------------------
PAGAMENTO: PIX
--------------------------------
       OBRIGADO PELA PREFERÊNCIA!
         Volte sempre!
================================
```

### 3.2 Comandos ESC/POS Essenciais

```typescript
// ESC/POS Command Reference
const ESC = 0x1B;
const GS = 0x1D;

const COMMANDS = {
  // Inicialização
  INIT: [ESC, 0x40],              // Reset printer

  // Alinhamento
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],

  // Formatação de texto
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x10],
  DOUBLE_WIDTH: [GS, 0x21, 0x20],
  DOUBLE_SIZE: [GS, 0x21, 0x30],
  NORMAL_SIZE: [GS, 0x21, 0x00],

  // Controle de papel
  LINE_FEED: [0x0A],
  CUT_PAPER: [GS, 0x56, 0x00],    // Full cut
  PARTIAL_CUT: [GS, 0x56, 0x01],  // Partial cut
  FEED_AND_CUT: [GS, 0x56, 0x41, 0x03], // Feed 3 lines and cut

  // Código de barras / QR Code
  QR_CODE_MODEL: [GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00],
  QR_CODE_SIZE: [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06],

  // Abertura da gaveta
  OPEN_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xFA],
};
```

### 3.3 Web Bluetooth API (Para impressoras Bluetooth)

```typescript
// Exemplo de conexão Bluetooth
interface BluetoothPrinter {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

async function connectBluetoothPrinter(): Promise<BluetoothPrinter> {
  // Solicitar dispositivo Bluetooth
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Printer service
    ],
    optionalServices: ['battery_service']
  });

  // Conectar ao GATT server
  const server = await device.gatt?.connect();
  const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
  const characteristic = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

  return { device, characteristic };
}

async function printViaBluetoothThermal(
  printer: BluetoothPrinter,
  data: Uint8Array
): Promise<void> {
  // Enviar dados em chunks (máximo 512 bytes por vez)
  const CHUNK_SIZE = 512;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await printer.characteristic.writeValue(chunk);
    // Pequeno delay entre chunks para evitar overflow
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
```

### 3.4 Impressão via Rede (HTTP/Socket)

```typescript
// Para impressoras com servidor web embutido ou print servers
interface NetworkPrinterConfig {
  ip: string;
  port: number;
  protocol: 'raw' | 'http' | 'ipp';
}

// Muitas impressoras térmicas de rede aceitam ESC/POS via porta 9100 (RAW)
// Em browsers, precisamos de um proxy ou serviço intermediário

// Solução: Print Server local ou Cloud Function
async function printViaNetwork(config: NetworkPrinterConfig, data: Uint8Array) {
  // Opção 1: Via Edge Function (Supabase)
  const response = await fetch('/functions/v1/print-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerIp: config.ip,
      printerPort: config.port,
      data: Array.from(data) // Converter para array para JSON
    })
  });

  return response.ok;
}
```

### 3.5 Impressão via Browser (window.print)

```typescript
// Gera HTML formatado e usa window.print()
function printViaBrowser(receiptHtml: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Comprovante</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        @media print {
          body {
            width: 80mm;
            margin: 0;
            padding: 5mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
          }
        }
        /* Estilos do recibo */
        .receipt { max-width: 80mm; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .total-row { display: flex; justify-content: space-between; }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      ${receiptHtml}
    </body>
    </html>
  `);

  printWindow.document.close();
  return true;
}
```

---

## 4. Compartilhamento via WhatsApp

### 4.1 Estratégia

O sistema já possui integração com WhatsApp via WuzAPI. Para compartilhar recibos:

1. **Gerar imagem do recibo** (usando html2canvas ou similar)
2. **Enviar via WhatsApp** (WuzAPI suporta envio de imagens)

### 4.2 Implementação

```typescript
import html2canvas from 'html2canvas';

async function shareReceiptViaWhatsApp(
  receiptElement: HTMLElement,
  customerPhone: string,
  userToken: string
): Promise<boolean> {
  // 1. Converter HTML para imagem
  const canvas = await html2canvas(receiptElement, {
    backgroundColor: '#ffffff',
    scale: 2, // Melhor qualidade
  });

  // 2. Converter para base64
  const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

  // 3. Enviar via WuzAPI
  const response = await fetch(`${WUZAPI_URL}/chat/send/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Token': userToken,
    },
    body: JSON.stringify({
      Phone: formatPhoneForWhatsApp(customerPhone),
      Image: imageBase64,
      Caption: 'Comprovante de venda'
    })
  });

  return response.ok;
}
```

### 4.3 Alternativa: Compartilhar como Texto

```typescript
// Formatar recibo como texto para WhatsApp
function formatReceiptForWhatsApp(sale: Sale, company: Company): string {
  const items = sale.items?.map(item =>
    `  ${item.quantity}x ${item.product_name}: R$ ${item.total.toFixed(2)}`
  ).join('\n');

  return `
*${company.name}*
━━━━━━━━━━━━━━━━
📅 ${new Date(sale.created_at).toLocaleDateString('pt-BR')}
🧾 Venda #${sale.id.slice(0, 8).toUpperCase()}
━━━━━━━━━━━━━━━━
${items}
━━━━━━━━━━━━━━━━
*Subtotal:* R$ ${sale.subtotal.toFixed(2)}
${sale.discount > 0 ? `*Desconto:* -R$ ${sale.discount.toFixed(2)}` : ''}
*TOTAL: R$ ${sale.total.toFixed(2)}*
━━━━━━━━━━━━━━━━
💳 ${sale.payment_method || 'Não informado'}
━━━━━━━━━━━━━━━━
_Obrigado pela preferência!_
`.trim();
}
```

---

## 5. Interface do Usuário

### 5.1 Botão de Impressão na Tela de Vendas

```tsx
// Adicionar ao modal de visualização de venda
<div className="flex gap-2">
  <PrintButton
    sale={viewingSale}
    onPrintSuccess={() => toast.success('Impresso com sucesso!')}
    onPrintError={(error) => toast.error(error)}
  />
  <ShareWhatsAppButton
    sale={viewingSale}
    disabled={!viewingSale.customer_phone}
    onSuccess={() => toast.success('Enviado via WhatsApp!')}
  />
</div>
```

### 5.2 Modal de Opções de Impressão

```
┌─────────────────────────────────────────┐
│          Imprimir Comprovante           │
├─────────────────────────────────────────┤
│                                         │
│  Como deseja imprimir?                  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🖨️  Impressora do sistema       │    │
│  │    (USB/Rede compartilhada)     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📱  Impressora Bluetooth        │    │
│  │    (Térmica portátil)           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🌐  Impressora de rede          │    │
│  │    (IP direto)                  │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📄  Salvar como PDF             │    │
│  │    (Para impressão posterior)   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 📲  Enviar via WhatsApp         │    │
│  │    (Imagem ou texto)            │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│                            [ Cancelar ] │
└─────────────────────────────────────────┘
```

### 5.3 Configurações de Impressora (Settings Page)

Adicionar seção em Configurações:

```
┌─────────────────────────────────────────────────────────────┐
│ 🖨️ Configurações de Impressão                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Impressora Padrão:                                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Dropdown] Nenhuma / Sistema / Bluetooth / Rede         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ── Impressora Bluetooth ──────────────────────────────────  │
│                                                             │
│ Dispositivo pareado:                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📱 Mini Printer XP-58  [Conectado] [Desconectar]        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [ + Parear nova impressora ]                                │
│                                                             │
│ ── Impressora de Rede ────────────────────────────────────  │
│                                                             │
│ Endereço IP:                  Porta:                        │
│ ┌─────────────────────────┐  ┌────────────┐                 │
│ │ 192.168.1.100           │  │ 9100       │                 │
│ └─────────────────────────┘  └────────────┘                 │
│                                                             │
│ [ Testar conexão ]                                          │
│                                                             │
│ ── Formato ───────────────────────────────────────────────  │
│                                                             │
│ Largura do papel:                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Radio] ○ 58mm (32 caracteres)                          │ │
│ │         ● 80mm (48 caracteres)                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑️ Cortar papel automaticamente após impressão          │ │
│ │ ☑️ Abrir gaveta de dinheiro (se disponível)             │ │
│ │ ☐ Imprimir logo da empresa                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                              [ Salvar Configurações ]       │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Banco de Dados

### 6.1 Adicionar colunas em `companies`

```sql
-- Migration: add_print_settings_to_companies
ALTER TABLE companies
ADD COLUMN print_settings JSONB DEFAULT '{
  "default_method": null,
  "paper_width": "80mm",
  "auto_cut": true,
  "open_drawer": false,
  "print_logo": false,
  "bluetooth_device": null,
  "network_printer": {
    "ip": null,
    "port": 9100
  }
}'::jsonb;

-- Índice para consultas
CREATE INDEX idx_companies_print_settings
ON companies USING gin (print_settings);
```

### 6.2 Interface TypeScript

```typescript
interface PrintSettings {
  default_method: 'browser' | 'bluetooth' | 'network' | null;
  paper_width: '58mm' | '80mm';
  auto_cut: boolean;
  open_drawer: boolean;
  print_logo: boolean;
  bluetooth_device: {
    id: string;
    name: string;
  } | null;
  network_printer: {
    ip: string | null;
    port: number;
  };
}

// Atualizar interface Company
interface Company {
  // ... campos existentes
  print_settings: PrintSettings | null;
}
```

---

## 7. Dependências

### 7.1 NPM Packages

```json
{
  "dependencies": {
    "html2canvas": "^1.4.1",      // Converter HTML para imagem
    "escpos-buffer": "^4.0.3"     // Biblioteca para comandos ESC/POS (opcional)
  }
}
```

### 7.2 APIs do Browser

| API | Suporte | Uso |
|-----|---------|-----|
| Web Bluetooth | Chrome, Edge, Opera | Impressoras Bluetooth |
| window.print() | Todos | Impressão via sistema |
| Blob/File API | Todos | Geração de PDF |

---

## 8. Compatibilidade de Impressoras

### 8.1 Impressoras Térmicas Testadas/Recomendadas

| Marca | Modelo | Conexão | Largura | Preço Aprox. |
|-------|--------|---------|---------|--------------|
| Epson | TM-T20X | USB/Rede | 80mm | R$ 800-1200 |
| Elgin | i9 | USB/Rede | 80mm | R$ 600-900 |
| Bematech | MP-4200 TH | USB/Serial | 80mm | R$ 500-800 |
| Leopardo | A7 | Bluetooth | 58mm | R$ 200-400 |
| GOOJPRT | PT-210 | Bluetooth | 58mm | R$ 150-250 |
| Xprinter | XP-58IIH | USB/Bluetooth | 58mm | R$ 200-350 |
| Jetway | JP-500 | USB/Rede | 80mm | R$ 400-600 |

### 8.2 Print Servers (Para rede)

| Dispositivo | Função |
|-------------|--------|
| TP-Link TL-PS110U | Converte USB para rede |
| Raspberry Pi | DIY Print Server |
| CUPS (Linux) | Servidor de impressão |

---

## 9. Fases de Implementação

### Fase 1: Impressão Básica (MVP) ✅
**Prioridade: Alta** | **Status: CONCLUÍDO**

- [x] Criar componente `PrintPreview` para visualização
- [x] Implementar `BrowserPrintAdapter` (window.print)
- [x] Gerar PDF do recibo
- [x] Adicionar botão "Imprimir" no modal de visualização de venda
- [x] Criar estilos CSS para impressão térmica (58mm e 80mm)

**Arquivos criados:**
- `src/services/print/PrintService.ts` - Orquestrador principal
- `src/services/print/ReceiptGenerator.ts` - Gerador de recibos (HTML, ESC/POS, texto)
- `src/services/print/ESCPOSCommands.ts` - Comandos ESC/POS e encoder
- `src/components/print/PrintPreview.tsx` - Preview do recibo
- `src/components/print/PrintButton.tsx` - Botão com menu dropdown

### Fase 2: Compartilhamento WhatsApp ✅
**Prioridade: Alta** | **Status: CONCLUÍDO**

- [x] Gerar imagem do recibo com html2canvas
- [x] Integrar com WuzAPI existente para envio de imagem
- [x] Criar opção de enviar como texto formatado
- [x] Adicionar botão "Enviar via WhatsApp" no modal

**Arquivos criados/modificados:**
- `src/components/print/WhatsAppShareModal.tsx` - Modal com escolha texto/imagem
- `src/services/whatsapp.ts` - Adicionada função `sendImageMessage`
- Integração com `usePlanFeatures` para verificar permissão `whatsapp_notifications`

### Fase 3: Impressão Bluetooth ✅
**Prioridade: Média** | **Status: CONCLUÍDO**

- [x] Implementar `BluetoothPrintAdapter`
- [x] Criar modal de pareamento de impressora
- [x] Implementar comandos ESC/POS básicos
- [x] Salvar dispositivo pareado nas configurações
- [x] Tratar reconexão automática

**Arquivos criados:**
- `src/services/print/BluetoothPrintAdapter.ts` - Adapter Web Bluetooth API
- `src/components/print/BluetoothPrinterModal.tsx` - Modal de conexão/impressão
- `src/types/web-bluetooth.d.ts` - TypeScript declarations para Web Bluetooth

**Notas de implementação:**
- Usa Web Bluetooth API (Chrome, Edge, Opera)
- Suporte a UUIDs padrão de impressoras térmicas
- Envio de dados em chunks de 512 bytes
- Estado de conexão persistido em memória

### Fase 4: Impressão de Rede ✅
**Prioridade: Média** | **Status: CONCLUÍDO**

- [x] Criar Edge Function `print-proxy` para envio raw
- [x] Implementar `NetworkPrintAdapter`
- [x] Adicionar configuração de IP/Porta nas settings
- [x] Implementar teste de conexão

**Arquivos criados:**
- `supabase/functions/print-proxy/index.ts` - Edge Function para TCP socket
- `src/services/print/NetworkPrintAdapter.ts` - Adapter para impressão de rede
- `supabase/migrations/20260130000001_add_print_settings.sql` - Migration para print_settings

**Arquivos modificados:**
- `src/types/index.ts` - Adicionada interface PrintSettings
- `src/services/print/PrintService.ts` - Implementado caso 'network'
- `src/services/print/index.ts` - Exports do NetworkPrintAdapter
- `src/modules/settings/SettingsPage.tsx` - UI de configuração de impressora
- `src/components/print/PrintButton.tsx` - Opção de rede no menu

**Notas de implementação:**
- Edge Function usa Deno.connect() para conexão TCP raw
- Dados enviados em base64 via JSON, decodificados na Edge Function
- Só permite IPs de rede privada (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- Autenticação via Bearer token (Supabase JWT)
- Timeout configurável (padrão 5000ms)

### Fase 5: Configurações Avançadas
**Prioridade: Baixa** | **Status: PARCIAL**

- [x] Upload e impressão de logo (usa logo_url da empresa)
- [ ] Personalização do template do recibo
- [ ] Histórico de impressões
- [ ] Suporte a códigos de barras no recibo
- [x] Impressão automática após venda

**Arquivos modificados:**
- `src/types/index.ts` - Adicionados campos `auto_print` e `print_logo` em PrintSettings
- `src/services/print/ReceiptGenerator.ts` - Suporte a logo no recibo HTML
- `src/services/print/PrintService.ts` - Opcao `showLogo` em PrintOptions
- `src/modules/sales/SalesPage.tsx` - Impressao automatica apos criar venda
- `src/modules/settings/SettingsPage.tsx` - UI para auto_print e print_logo

**Notas de implementação:**
- Logo suportado apenas em impressao browser/PDF (ESC/POS requer bitmap)
- Auto print usa impressora de rede se configurada
- Configuracoes de logo e auto_print ficam em print_settings da empresa

---

## 10. Considerações de Segurança

### 10.1 Web Bluetooth
- Requer HTTPS (já implementado)
- Usuário precisa autorizar o pareamento
- Funciona apenas em Chrome/Edge

### 10.2 Impressão de Rede
- Edge Function valida autenticação
- IP da impressora não exposto ao frontend
- Rate limiting na função

### 10.3 WhatsApp
- Usa token do usuário já autenticado
- Valida permissão de WhatsApp habilitado
- LGPD: só envia se cliente consentiu

---

## 11. Testes

### 11.1 Testes Manuais Necessários

| Cenário | Dispositivo | Impressora |
|---------|-------------|------------|
| Impressão browser | Desktop Chrome | Qualquer |
| Impressão browser | Mobile Safari | Qualquer |
| Bluetooth | Android Chrome | Térmica 58mm |
| Bluetooth | Desktop Chrome | Térmica 80mm |
| Rede | Qualquer | Epson TM-T20X |
| WhatsApp imagem | Qualquer | N/A |
| WhatsApp texto | Qualquer | N/A |

### 11.2 Simulador de Impressora

Para desenvolvimento, usar:
- **Windows**: Impressora "Microsoft Print to PDF"
- **macOS**: "Save as PDF"
- **Linux**: CUPS virtual printer
- **ESC/POS**: Emulador online como https://escpos-emulator.com

---

## 12. Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Tempo para imprimir (browser) | < 3 segundos |
| Tempo para imprimir (bluetooth) | < 5 segundos |
| Taxa de sucesso impressão | > 95% |
| Taxa de sucesso WhatsApp | > 98% |

---

## 13. Limitações Conhecidas

1. **Web Bluetooth**: Não funciona em Safari/Firefox
2. **Impressão de Rede**: Requer proxy server (Edge Function)
3. **Mobile**: Algumas impressoras não suportam pareamento via web
4. **iOS**: Web Bluetooth não suportado (usar app nativo ou window.print)

---

## 14. Alternativas Futuras

### 14.1 App Nativo Complementar
Para total compatibilidade mobile, considerar:
- React Native app para impressão
- Capacitor plugin para Web Bluetooth nativo

### 14.2 Print Service Local
Para ambientes corporativos:
- Electron app como print server local
- Serviço Windows/macOS para impressão silenciosa

---

## 15. Referências

- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [jsPDF Documentation](https://raw.githack.com/MrRio/jsPDF/master/docs/)
- [html2canvas](https://html2canvas.hertzen.com/)
- [WuzAPI Docs](https://github.com/asternic/wuzapi)

---

## Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2026-01-29 | 1.0 | Documento inicial |
| 2026-01-29 | 1.1 | Fase 1 concluída - Impressão básica (browser, PDF) |
| 2026-01-29 | 1.2 | Fase 2 concluída - WhatsApp (texto e imagem via WuzAPI) |
| 2026-01-29 | 1.3 | Fase 3 concluída - Impressão Bluetooth (Web Bluetooth API) |
| 2026-01-29 | 1.4 | Fase 4 concluída - Impressão de Rede (Edge Function + TCP) |
| 2026-01-29 | 1.5 | Fase 5 parcial - Logo no recibo e impressão automática |
