import { ReactNode, useState, useEffect, useMemo } from 'react';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { TableColumn } from '../../types';

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  emptyMessage?: string;
  loading?: boolean;
  mobileCardRender?: (item: T) => ReactNode;
  /** Breakpoint em pixels para mostrar cards ao inves de tabela (default: 1024 para incluir tablets) */
  cardBreakpoint?: number;
  /** Quantidade de itens por pagina (default: 10 para cards, sem limite para tabela) */
  pageSize?: number;
  /** Desabilitar paginacao */
  disablePagination?: boolean;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onSort,
  sortKey,
  sortDirection,
  emptyMessage = 'Nenhum registro encontrado',
  loading,
  mobileCardRender,
  cardBreakpoint = 1024,
  pageSize = 10,
  disablePagination = false,
}: TableProps<T>) {
  const [isCardView, setIsCardView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Detectar se deve mostrar cards
  useEffect(() => {
    const checkCardView = () => setIsCardView(window.innerWidth < cardBreakpoint);
    checkCardView();
    window.addEventListener('resize', checkCardView);
    return () => window.removeEventListener('resize', checkCardView);
  }, [cardBreakpoint]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable || !onSort) return;

    const key = String(column.key);
    const direction = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, direction);
  };

  const getValue = (item: T, key: keyof T | string): ReactNode => {
    if (typeof key === 'string' && key.includes('.')) {
      const keys = key.split('.');
      let value: unknown = item;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return value as ReactNode;
    }
    return (item as Record<string, unknown>)[key as string] as ReactNode;
  };

  // Paginacao para cards
  const shouldPaginate = isCardView && mobileCardRender && !disablePagination && data.length > pageSize;
  const totalPages = shouldPaginate ? Math.ceil(data.length / pageSize) : 1;

  const paginatedData = useMemo(() => {
    if (!shouldPaginate) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize, shouldPaginate]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Loading state
  if (loading) {
    if (isCardView && mobileCardRender) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 dark:bg-gray-800" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 border-t border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Card view (mobile e tablet)
  if (isCardView && mobileCardRender) {
    if (data.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {/* Cards */}
        {paginatedData.map((item) => (
          <div key={keyExtractor(item)}>
            {mobileCardRender(item)}
          </div>
        ))}

        {/* Paginacao */}
        {shouldPaginate && totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, data.length)} de {data.length}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === 1
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg transition-colors ${
                  currentPage === totalPages
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Table view (desktop)
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none' : ''
                  }`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortKey === String(column.key) && (
                      sortDirection === 'asc' ? (
                        <KeyboardArrowUpIcon className="w-4 h-4" />
                      ) : (
                        <KeyboardArrowDownIcon className="w-4 h-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {column.render ? column.render(item) : getValue(item, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
