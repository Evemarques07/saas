/**
 * Print Service - Main orchestrator for printing receipts
 */

import { Sale, Company } from '../../types';
import { PaperWidth } from './ESCPOSCommands';
import {
  ReceiptData,
  createReceiptData,
  generateHTMLReceipt,
  generateESCPOSReceipt,
  generateTextReceipt,
} from './ReceiptGenerator';
import {
  isConnected as isBluetoothConnected,
  printData as printBluetooth,
} from './BluetoothPrintAdapter';
import {
  printData as printNetwork,
  NetworkPrinterConfig,
} from './NetworkPrintAdapter';

export type PrintMethod = 'browser' | 'bluetooth' | 'network' | 'pdf';

export interface PrintOptions {
  method: PrintMethod;
  paperWidth?: PaperWidth;
  autoCut?: boolean;
  openDrawer?: boolean;
  networkConfig?: NetworkPrinterConfig;
  showLogo?: boolean;
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

/**
 * Print via browser's native print dialog
 */
export async function printViaBrowser(
  receiptHtml: string
): Promise<PrintResult> {
  return new Promise((resolve) => {
    try {
      const printWindow = window.open('', '_blank', 'width=400,height=600');

      if (!printWindow) {
        resolve({
          success: false,
          error: 'Não foi possível abrir a janela de impressão. Verifique se pop-ups estão permitidos.',
        });
        return;
      }

      printWindow.document.write(receiptHtml);
      printWindow.document.close();

      // Wait for content to load
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();

          // Close window after print dialog
          setTimeout(() => {
            printWindow.close();
            resolve({ success: true });
          }, 500);
        }, 250);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
            resolve({ success: true });
          }, 500);
        } catch {
          resolve({ success: true }); // Assume success if we got this far
        }
      }, 1000);
    } catch (error) {
      resolve({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao imprimir',
      });
    }
  });
}

/**
 * Generate and download PDF
 */
export async function downloadAsPDF(
  receiptHtml: string,
  filename: string = 'comprovante'
): Promise<PrintResult> {
  try {
    // Create a blob with the HTML content
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Open in new window for printing/saving as PDF
    const printWindow = window.open(url, '_blank');

    if (!printWindow) {
      URL.revokeObjectURL(url);
      return {
        success: false,
        error: 'Não foi possível abrir a janela. Verifique se pop-ups estão permitidos.',
      };
    }

    // Clean up URL after some time
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar PDF',
    };
  }
}

/**
 * Print to iframe (alternative method for some scenarios)
 */
export function printToIframe(receiptHtml: string): PrintResult {
  try {
    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return { success: false, error: 'Erro ao criar documento de impressão' };
    }

    doc.open();
    doc.write(receiptHtml);
    doc.close();

    // Wait for content to load then print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao imprimir',
    };
  }
}

/**
 * Main print function - orchestrates printing based on method
 */
export async function printReceipt(
  sale: Sale,
  company: Company,
  options: PrintOptions
): Promise<PrintResult> {
  const { method, paperWidth = '80mm', showLogo = true } = options;

  // Create receipt data
  const receiptData: ReceiptData = createReceiptData(sale, company, { showLogo });

  switch (method) {
    case 'browser': {
      const html = generateHTMLReceipt(receiptData, paperWidth);
      return printViaBrowser(html);
    }

    case 'pdf': {
      const html = generateHTMLReceipt(receiptData, paperWidth);
      const filename = `venda_${sale.id.slice(0, 8)}`;
      return downloadAsPDF(html, filename);
    }

    case 'bluetooth': {
      // Check if Bluetooth printer is connected
      if (!isBluetoothConnected()) {
        return {
          success: false,
          error: 'BLUETOOTH_NOT_CONNECTED',
        };
      }

      // Generate ESC/POS data
      const escposData = generateESCPOSReceipt(receiptData, paperWidth);
      return printBluetooth(escposData);
    }

    case 'network': {
      // Network printing requires configuration
      if (!options.networkConfig || !options.networkConfig.ip) {
        return {
          success: false,
          error: 'NETWORK_NOT_CONFIGURED',
        };
      }

      // Generate ESC/POS data
      const escposData = generateESCPOSReceipt(receiptData, paperWidth);
      return printNetwork(escposData, options.networkConfig);
    }

    default:
      return {
        success: false,
        error: 'Método de impressão não suportado',
      };
  }
}

/**
 * Get receipt as HTML (for preview)
 */
export function getReceiptHTML(
  sale: Sale,
  company: Company,
  paperWidth: PaperWidth = '80mm',
  showLogo: boolean = true
): string {
  const receiptData = createReceiptData(sale, company, { showLogo });
  return generateHTMLReceipt(receiptData, paperWidth);
}

/**
 * Get receipt as ESC/POS bytes (for thermal printers)
 */
export function getReceiptESCPOS(
  sale: Sale,
  company: Company,
  paperWidth: PaperWidth = '80mm'
): Uint8Array {
  // Note: Logo not supported in ESC/POS mode (requires bitmap conversion)
  const receiptData = createReceiptData(sale, company, { showLogo: false });
  return generateESCPOSReceipt(receiptData, paperWidth);
}

/**
 * Get receipt as text (for WhatsApp)
 */
export function getReceiptText(sale: Sale, company: Company): string {
  const receiptData = createReceiptData(sale, company, { showLogo: false });
  return generateTextReceipt(receiptData);
}

/**
 * Check if Web Bluetooth is supported
 */
export function isBluetoothSupported(): boolean {
  return 'bluetooth' in navigator;
}

/**
 * Check if printing is supported (always true for browser)
 */
export function isPrintingSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.print === 'function';
}
