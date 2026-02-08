/**
 * Receipt Generator for Sales
 * Generates formatted receipts for different output formats
 */

import { Sale, SaleItem, Company } from '../../types';
import { ESCPOSEncoder, PaperWidth, PAPER_CONFIG } from './ESCPOSCommands';

export interface ReceiptData {
  company: {
    name: string;
    phone?: string | null;
    document?: string | null; // CNPJ
    address?: string | null;
    logo_url?: string | null;
  };
  sale: Sale;
  showLogo?: boolean;
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format currency without symbol (for receipts)
 */
export function formatMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Format date/time for receipt
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get payment method label
 */
export function getPaymentMethodLabel(method: string | null): string {
  const labels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'PIX',
    cartao_credito: 'Cartao de Credito',
    cartao_debito: 'Cartao de Debito',
    credito: 'Credito',
    debito: 'Debito',
  };
  return method ? labels[method] || method : 'Nao informado';
}

/**
 * Get customer name from sale
 */
export function getCustomerName(sale: Sale): string {
  if (sale.customer?.name) return sale.customer.name;
  if (sale.customer_name) return sale.customer_name;
  return 'Consumidor';
}

/**
 * Get customer phone from sale
 */
export function getCustomerPhone(sale: Sale): string | null {
  if (sale.customer?.phone) return sale.customer.phone;
  if (sale.customer_phone) return sale.customer_phone;
  return null;
}

/**
 * Generate ESC/POS receipt for thermal printers
 */
export function generateESCPOSReceipt(
  data: ReceiptData,
  paperWidth: PaperWidth = '80mm'
): Uint8Array {
  const encoder = new ESCPOSEncoder(paperWidth);
  const { company, sale } = data;
  const config = PAPER_CONFIG[paperWidth];

  // Header
  encoder.doubleDivider();
  encoder.align('center').bold(true).size('double').line(company.name);
  encoder.size('normal').bold(false);
  encoder.doubleDivider();

  // Company info
  if (company.document) {
    encoder.centered(`CNPJ: ${company.document}`);
  }
  if (company.phone) {
    encoder.centered(`Tel: ${company.phone}`);
  }
  encoder.newline();

  // Sale info
  encoder.line(`DATA: ${formatDateTime(sale.created_at)}`);
  encoder.bold(true).line(`VENDA #${sale.id.slice(0, 8).toUpperCase()}`).bold(false);
  encoder.divider();

  // Customer
  encoder.line(`CLIENTE: ${getCustomerName(sale)}`);
  const phone = getCustomerPhone(sale);
  if (phone) {
    encoder.line(`Tel: ${phone}`);
  }
  encoder.divider();

  // Items header
  encoder.bold(true).line('ITENS:').bold(false);
  encoder.divider();

  // Items
  if (sale.items && sale.items.length > 0) {
    for (const item of sale.items) {
      // Product name (may wrap)
      const qtyPrefix = `${item.quantity}x `;
      const productName = item.product_name;

      // First line: quantity + product name
      encoder.line(`${qtyPrefix}${productName}`);

      // Second line: unit price + total (right aligned)
      const unitPrice = `${formatMoney(item.unit_price)} cada`;
      const totalPrice = formatMoney(item.total);
      encoder.columns(`   ${unitPrice}`, totalPrice);
      encoder.newline();
    }
  }

  encoder.divider();

  // Totals
  encoder.columns('SUBTOTAL:', formatMoney(sale.subtotal));

  const discountAmount = (sale.discount ?? 0) > 0
    ? sale.discount
    : sale.subtotal !== sale.total ? sale.subtotal - sale.total : 0;

  if (discountAmount > 0) {
    encoder.columns('DESCONTO:', `-${formatMoney(discountAmount)}`);
  }

  encoder.divider();
  encoder.bold(true);
  encoder.columns('TOTAL:', formatMoney(sale.total));
  encoder.bold(false);
  encoder.divider();

  // Payment method
  encoder.line(`PAGAMENTO: ${getPaymentMethodLabel(sale.payment_method)}`);
  encoder.divider();

  // Footer
  encoder.newline();
  encoder.align('center');
  encoder.bold(true).line('OBRIGADO PELA PREFERENCIA!').bold(false);
  encoder.line('Volte sempre!');
  encoder.doubleDivider();
  encoder.newline(2);

  // Cut paper
  encoder.cut();

  return encoder.build();
}

/**
 * Generate HTML receipt for browser printing
 */
export function generateHTMLReceipt(
  data: ReceiptData,
  paperWidth: PaperWidth = '80mm'
): string {
  const { company, sale } = data;
  const width = paperWidth === '58mm' ? '58mm' : '80mm';

  const itemsHtml = (sale.items || [])
    .map(
      (item) => `
      <div class="item">
        <div class="item-name">${item.quantity}x ${item.product_name}</div>
        <div class="item-details">
          <span>${formatMoney(item.unit_price)} cada</span>
          <span class="item-total">${formatMoney(item.total)}</span>
        </div>
      </div>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante de Venda</title>
  <style>
    @page {
      size: ${width} auto;
      margin: 0;
    }

    @media print {
      html, body {
        width: ${width};
        margin: 0 !important;
        padding: 0 !important;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${paperWidth === '58mm' ? '10px' : '12px'};
      line-height: 1.3;
      width: ${width};
      max-width: ${width};
      padding: 5mm;
      background: white;
      color: black;
    }

    .receipt {
      width: 100%;
    }

    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }

    .double-divider {
      border-top: 2px solid #000;
      margin: 4px 0;
    }

    .center {
      text-align: center;
    }

    .bold {
      font-weight: bold;
    }

    .company-name {
      font-size: ${paperWidth === '58mm' ? '14px' : '16px'};
      font-weight: bold;
      text-align: center;
      margin: 4px 0;
    }

    .info-line {
      margin: 2px 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }

    .item {
      margin: 6px 0;
    }

    .item-name {
      font-weight: bold;
    }

    .item-details {
      display: flex;
      justify-content: space-between;
      padding-left: 10px;
      color: #333;
    }

    .item-total {
      font-weight: bold;
    }

    .total-row {
      font-weight: bold;
      font-size: ${paperWidth === '58mm' ? '12px' : '14px'};
    }

    .footer {
      text-align: center;
      margin-top: 8px;
    }

    .footer-message {
      font-weight: bold;
      margin-bottom: 4px;
    }

    .logo {
      text-align: center;
      margin: 8px 0;
    }

    .logo img {
      max-width: ${paperWidth === '58mm' ? '40mm' : '50mm'};
      max-height: ${paperWidth === '58mm' ? '20mm' : '25mm'};
      object-fit: contain;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="double-divider"></div>
    ${data.showLogo && company.logo_url ? `
    <div class="logo">
      <img src="${company.logo_url}" alt="${company.name}" />
    </div>
    ` : ''}
    <div class="company-name">${company.name}</div>
    <div class="double-divider"></div>

    ${company.document ? `<div class="center info-line">CNPJ: ${company.document}</div>` : ''}
    ${company.phone ? `<div class="center info-line">Tel: ${company.phone}</div>` : ''}

    <div class="divider"></div>

    <div class="info-line">DATA: ${formatDateTime(sale.created_at)}</div>
    <div class="info-line bold">VENDA #${sale.id.slice(0, 8).toUpperCase()}</div>

    <div class="divider"></div>

    <div class="info-line">CLIENTE: ${getCustomerName(sale)}</div>
    ${getCustomerPhone(sale) ? `<div class="info-line">Tel: ${getCustomerPhone(sale)}</div>` : ''}

    <div class="divider"></div>

    <div class="bold">ITENS:</div>
    <div class="divider"></div>

    ${itemsHtml}

    <div class="divider"></div>

    <div class="row">
      <span>SUBTOTAL:</span>
      <span>${formatMoney(sale.subtotal)}</span>
    </div>

    ${(() => {
      const disc = (sale.discount ?? 0) > 0
        ? sale.discount
        : sale.subtotal !== sale.total ? sale.subtotal - sale.total : 0;
      return disc > 0 ? `
    <div class="row">
      <span>DESCONTO:</span>
      <span>-${formatMoney(disc)}</span>
    </div>` : '';
    })()}

    <div class="divider"></div>

    <div class="row total-row">
      <span>TOTAL:</span>
      <span>${formatMoney(sale.total)}</span>
    </div>

    <div class="divider"></div>

    <div class="info-line">PAGAMENTO: ${getPaymentMethodLabel(sale.payment_method)}</div>

    <div class="divider"></div>

    <div class="footer">
      <div class="footer-message">OBRIGADO PELA PREFERENCIA!</div>
      <div>Volte sempre!</div>
    </div>

    <div class="double-divider"></div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text receipt for WhatsApp sharing
 */
export function generateTextReceipt(data: ReceiptData): string {
  const { company, sale } = data;

  const items = (sale.items || [])
    .map((item) => `  ${item.quantity}x ${item.product_name}: ${formatMoney(item.total)}`)
    .join('\n');

  const discountAmt = (sale.discount ?? 0) > 0
    ? sale.discount
    : sale.subtotal !== sale.total ? sale.subtotal - sale.total : 0;
  const discountLine = discountAmt > 0 ? `*Desconto:* -${formatMoney(discountAmt)}\n` : '';

  return `
*${company.name}*
${'━'.repeat(20)}
📅 ${formatDateTime(sale.created_at)}
🧾 Venda #${sale.id.slice(0, 8).toUpperCase()}
${'━'.repeat(20)}
👤 ${getCustomerName(sale)}
${getCustomerPhone(sale) ? `📱 ${getCustomerPhone(sale)}` : ''}
${'━'.repeat(20)}
*Itens:*
${items}
${'━'.repeat(20)}
*Subtotal:* ${formatMoney(sale.subtotal)}
${discountLine}*TOTAL: ${formatMoney(sale.total)}*
${'━'.repeat(20)}
💳 ${getPaymentMethodLabel(sale.payment_method)}
${'━'.repeat(20)}
_Obrigado pela preferência!_
  `.trim();
}

/**
 * Generate receipt data from sale and company
 */
export function createReceiptData(
  sale: Sale,
  company: Company,
  options?: { showLogo?: boolean }
): ReceiptData {
  return {
    company: {
      name: company.name,
      phone: company.phone,
      document: null, // Add CNPJ field to company if needed
      address: null,
      logo_url: company.logo_url,
    },
    sale,
    showLogo: options?.showLogo ?? true,
  };
}
