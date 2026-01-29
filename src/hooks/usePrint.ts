/**
 * usePrint Hook
 * Provides printing functionality for sales receipts
 */

import { useState, useCallback } from 'react';
import { Sale, Company } from '../types';
import {
  printReceipt,
  PrintOptions,
  PrintResult,
  getReceiptHTML,
  getReceiptText,
  PaperWidth,
} from '../services/print';

interface UsePrintOptions {
  defaultPaperWidth?: PaperWidth;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UsePrintReturn {
  // State
  isPrinting: boolean;
  lastError: string | null;

  // Actions
  print: (sale: Sale, company: Company, options?: Partial<PrintOptions>) => Promise<PrintResult>;
  printBrowser: (sale: Sale, company: Company) => Promise<PrintResult>;
  downloadPDF: (sale: Sale, company: Company) => Promise<PrintResult>;
  getHTML: (sale: Sale, company: Company, paperWidth?: PaperWidth) => string;
  getText: (sale: Sale, company: Company) => string;

  // Utilities
  clearError: () => void;
}

export function usePrint(options: UsePrintOptions = {}): UsePrintReturn {
  const { defaultPaperWidth = '80mm', onSuccess, onError } = options;

  const [isPrinting, setIsPrinting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleResult = useCallback(
    (result: PrintResult) => {
      if (result.success) {
        setLastError(null);
        onSuccess?.();
      } else {
        const error = result.error || 'Erro desconhecido';
        setLastError(error);
        onError?.(error);
      }
      return result;
    },
    [onSuccess, onError]
  );

  const print = useCallback(
    async (
      sale: Sale,
      company: Company,
      printOptions?: Partial<PrintOptions>
    ): Promise<PrintResult> => {
      setIsPrinting(true);
      setLastError(null);

      try {
        const result = await printReceipt(sale, company, {
          method: printOptions?.method || 'browser',
          paperWidth: printOptions?.paperWidth || defaultPaperWidth,
          autoCut: printOptions?.autoCut ?? true,
          openDrawer: printOptions?.openDrawer ?? false,
        });

        return handleResult(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao imprimir';
        const result: PrintResult = { success: false, error: errorMessage };
        return handleResult(result);
      } finally {
        setIsPrinting(false);
      }
    },
    [defaultPaperWidth, handleResult]
  );

  const printBrowser = useCallback(
    async (sale: Sale, company: Company): Promise<PrintResult> => {
      return print(sale, company, { method: 'browser' });
    },
    [print]
  );

  const downloadPDF = useCallback(
    async (sale: Sale, company: Company): Promise<PrintResult> => {
      return print(sale, company, { method: 'pdf' });
    },
    [print]
  );

  const getHTML = useCallback(
    (sale: Sale, company: Company, paperWidth?: PaperWidth): string => {
      return getReceiptHTML(sale, company, paperWidth || defaultPaperWidth);
    },
    [defaultPaperWidth]
  );

  const getText = useCallback((sale: Sale, company: Company): string => {
    return getReceiptText(sale, company);
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    isPrinting,
    lastError,
    print,
    printBrowser,
    downloadPDF,
    getHTML,
    getText,
    clearError,
  };
}
