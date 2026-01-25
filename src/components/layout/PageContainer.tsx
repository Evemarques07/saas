import { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}

export function PageContainer({ title, subtitle, action, toolbar, children }: PageContainerProps) {
  return (
    <div className="flex flex-col h-full -m-3 md:-m-4">
      {/* Header - rola junto com conteúdo */}
      <div className="px-3 md:px-4 pt-3 md:pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 md:mt-1">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0 overflow-x-auto pb-1 -mb-1">
              {action}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar - fica sticky no topo */}
      {toolbar && (
        <div className="sticky top-0 z-10 px-3 md:px-4 pb-3 bg-white dark:bg-gray-800">
          {toolbar}
        </div>
      )}

      {/* Content - área que rola */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-4 pb-3 md:pb-4">
        {children}
      </div>
    </div>
  );
}
