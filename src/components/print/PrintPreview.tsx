/**
 * PrintPreview Component
 * Shows a preview of the receipt before printing
 */

import { useEffect, useRef, useState } from 'react';
import { Sale, Company } from '../../types';
import { getReceiptHTML, PaperWidth } from '../../services/print';

interface PrintPreviewProps {
  sale: Sale;
  company: Company;
  paperWidth?: PaperWidth;
  className?: string;
}

export function PrintPreview({
  sale,
  company,
  paperWidth = '80mm',
  className = '',
}: PrintPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    if (!iframeRef.current) return;

    const html = getReceiptHTML(sale, company, paperWidth);
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      // Adjust height to content
      setTimeout(() => {
        const body = doc.body;
        if (body) {
          const contentHeight = body.scrollHeight;
          setHeight(Math.min(contentHeight + 20, 600));
        }
      }, 100);
    }
  }, [sale, company, paperWidth]);

  const widthClass = paperWidth === '58mm' ? 'w-[200px]' : 'w-[280px]';

  return (
    <div className={`flex justify-center ${className}`}>
      <div
        className={`${widthClass} bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200`}
      >
        <iframe
          ref={iframeRef}
          title="Preview do Comprovante"
          className="w-full border-0"
          style={{ height: `${height}px` }}
        />
      </div>
    </div>
  );
}

/**
 * Inline preview component (renders HTML directly without iframe)
 */
interface InlinePreviewProps {
  sale: Sale;
  company: Company;
  paperWidth?: PaperWidth;
}

export function InlineReceiptPreview({
  sale,
  company,
  paperWidth = '80mm',
}: InlinePreviewProps) {
  const formatMoney = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getPaymentLabel = (method: string | null) => {
    const labels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_credito: 'Cartao de Credito',
      cartao_debito: 'Cartao de Debito',
    };
    return method ? labels[method] || method : 'Nao informado';
  };

  const getCustomerName = () => {
    if (sale.customer?.name) return sale.customer.name;
    if (sale.customer_name) return sale.customer_name;
    return 'Consumidor';
  };

  const getCustomerPhone = () => {
    if (sale.customer?.phone) return sale.customer.phone;
    if (sale.customer_phone) return sale.customer_phone;
    return null;
  };

  const widthClass = paperWidth === '58mm' ? 'w-[200px] text-[10px]' : 'w-[280px] text-xs';

  return (
    <div className="flex justify-center">
      <div
        className={`${widthClass} bg-white text-black p-4 rounded-lg shadow-lg border border-gray-200 font-mono`}
      >
        {/* Header */}
        <div className="border-t-2 border-black mb-2" />
        <h2 className="text-center font-bold text-sm mb-1">{company.name}</h2>
        <div className="border-t-2 border-black mb-2" />

        {company.phone && (
          <p className="text-center text-gray-800">Tel: {company.phone}</p>
        )}

        <div className="border-t border-dashed border-gray-500 my-2" />

        {/* Sale info */}
        <p>DATA: {formatDateTime(sale.created_at)}</p>
        <p className="font-bold">VENDA #{sale.id.slice(0, 8).toUpperCase()}</p>

        <div className="border-t border-dashed border-gray-500 my-2" />

        {/* Customer */}
        <p>CLIENTE: {getCustomerName()}</p>
        {getCustomerPhone() && <p>Tel: {getCustomerPhone()}</p>}

        <div className="border-t border-dashed border-gray-500 my-2" />

        {/* Items */}
        <p className="font-bold mb-1">ITENS:</p>
        <div className="border-t border-dashed border-gray-500 mb-2" />

        {sale.items?.map((item) => (
          <div key={item.id} className="mb-2">
            <p className="font-medium">
              {item.quantity}x {item.product_name}
            </p>
            <div className="flex justify-between pl-2 text-gray-800">
              <span>{formatMoney(item.unit_price)} cada</span>
              <span className="font-medium text-black">{formatMoney(item.total)}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-dashed border-gray-500 my-2" />

        {/* Totals */}
        <div className="flex justify-between">
          <span>SUBTOTAL:</span>
          <span>{formatMoney(sale.subtotal)}</span>
        </div>

        {(sale.discount ?? 0) > 0 && (
          <div className="flex justify-between text-red-600">
            <span>DESCONTO:</span>
            <span>-{formatMoney(sale.discount)}</span>
          </div>
        )}

        {sale.subtotal !== sale.total && (sale.discount ?? 0) === 0 && (
          <div className="flex justify-between text-red-600">
            <span>DESCONTO:</span>
            <span>-{formatMoney(sale.subtotal - sale.total)}</span>
          </div>
        )}

        <div className="border-t border-dashed border-gray-500 my-2" />

        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>{formatMoney(sale.total)}</span>
        </div>

        <div className="border-t border-dashed border-gray-500 my-2" />

        {/* Payment */}
        <p>PAGAMENTO: {getPaymentLabel(sale.payment_method)}</p>

        <div className="border-t border-dashed border-gray-500 my-2" />

        {/* Footer */}
        <div className="text-center mt-3">
          <p className="font-bold">OBRIGADO PELA PREFERENCIA!</p>
          <p className="text-gray-800">Volte sempre!</p>
        </div>

        <div className="border-t-2 border-black mt-2" />
      </div>
    </div>
  );
}
