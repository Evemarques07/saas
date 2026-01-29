/**
 * Print Service Module
 * Exports all printing-related functionality
 */

// Main service
export {
  printReceipt,
  printViaBrowser,
  downloadAsPDF,
  printToIframe,
  getReceiptHTML,
  getReceiptESCPOS,
  getReceiptText,
  isBluetoothSupported,
  isPrintingSupported,
} from './PrintService';

export type { PrintMethod, PrintOptions, PrintResult } from './PrintService';

// Receipt generator
export {
  generateHTMLReceipt,
  generateESCPOSReceipt,
  generateTextReceipt,
  createReceiptData,
  formatCurrency,
  formatMoney,
  formatDateTime,
  getPaymentMethodLabel,
  getCustomerName,
  getCustomerPhone,
} from './ReceiptGenerator';

export type { ReceiptData } from './ReceiptGenerator';

// ESC/POS Commands
export { ESCPOS, PAPER_CONFIG, ESCPOSEncoder } from './ESCPOSCommands';
export type { PaperWidth } from './ESCPOSCommands';

// Bluetooth Adapter
export {
  isBluetoothSupported as isBluetoothAvailable,
  isConnected as isBluetoothConnected,
  getConnectedPrinter,
  connectPrinter,
  disconnectPrinter,
  printData as printViaBluetooth,
} from './BluetoothPrintAdapter';
export type { BluetoothPrinterDevice, BluetoothPrintResult } from './BluetoothPrintAdapter';

// Network Adapter
export {
  isNetworkPrintingAvailable,
  testConnection as testNetworkConnection,
  printData as printViaNetwork,
  validateConfig as validateNetworkConfig,
} from './NetworkPrintAdapter';
export type { NetworkPrinterConfig, NetworkPrintResult } from './NetworkPrintAdapter';
