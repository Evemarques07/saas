import { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageContainer({ title, subtitle, action, children }: PageContainerProps) {
  return (
    <div className="p-3 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
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
      {children}
    </div>
  );
}
