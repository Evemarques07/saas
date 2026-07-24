import { useState, useRef, useEffect } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import { SelectOption } from '../../types';

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Dropdown estilizado (nao usa <select> nativo, entao nao abre o picker do SO).
 * Suporta busca (searchable) para listas grandes, dark mode e click-outside.
 */
export function CustomSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  searchable = false,
  error,
  disabled,
  className = '',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered =
    searchable && query
      ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
      : options;

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Limpa a busca ao fechar
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <div className="w-full" ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`
            w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left border rounded-lg
            bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}
            ${className}
          `}
        >
          <span className={`truncate ${selected ? '' : 'text-gray-400 dark:text-gray-500'}`}>
            {selected ? selected.label : placeholder}
          </span>
          <KeyboardArrowDownIcon
            className={`w-5 h-5 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute z-30 mt-1 w-full flex flex-col max-h-64 overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg dark:shadow-glow"
          >
            {searchable && (
              <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="relative">
                  <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md bg-transparent border border-gray-200 dark:border-gray-600 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">Nenhum resultado</p>
              ) : (
                filtered.map((option) => {
                  const isSelected = String(option.value) === String(value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(String(option.value));
                        setOpen(false);
                      }}
                      className={`
                        w-full text-left px-3 py-2 text-sm transition-colors
                        ${isSelected
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 font-medium'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
