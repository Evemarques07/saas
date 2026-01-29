interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = ['Termos', 'Sua Loja', 'Segmentos', 'Logo'];

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto mb-8 px-4">
      {/* Container principal com posicionamento relativo */}
      <div className="relative flex items-start justify-between">
        {/* Linha de conexão de fundo (passa por trás dos círculos) */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" style={{ marginLeft: '20px', marginRight: '20px', width: 'calc(100% - 40px)' }} />

        {/* Linha de progresso preenchida */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all duration-500 ease-out"
          style={{
            marginLeft: '20px',
            width: currentStep > 1
              ? `calc(${((currentStep - 1) / (totalSteps - 1)) * 100}% - ${40 / totalSteps}px)`
              : '0%'
          }}
        />

        {/* Steps */}
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={index} className="relative z-10 flex flex-col items-center" style={{ width: `${100 / totalSteps}%` }}>
              {/* Step Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary-500 text-white shadow-md'
                    : isCurrent
                    ? 'bg-primary-600 text-white ring-4 ring-primary-200 dark:ring-primary-900/50 shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-700'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-2 text-xs font-medium text-center transition-colors duration-300 ${
                  isCurrent
                    ? 'text-primary-600 dark:text-primary-400'
                    : isCompleted
                    ? 'text-primary-500 dark:text-primary-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {stepLabels[index] || `Passo ${stepNumber}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
