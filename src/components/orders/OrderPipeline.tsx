interface PipelineStep {
  id: string;
  label: string;
  step: number;
}

interface OrderPipelineProps {
  steps: PipelineStep[];
  currentStep: number;
  isLate?: boolean;
}

export default function OrderPipeline({ steps, currentStep, isLate }: OrderPipelineProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-5 mb-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Pipeline de la commande</h3>
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          const isFuture = i > currentStep;

          let dotColor = 'bg-[var(--border-primary)]';
          let lineColor = 'bg-[var(--border-primary)]';
          let textColor = 'text-[var(--text-tertiary)]';

          if (isDone) {
            dotColor = 'bg-brand-green';
            lineColor = 'bg-brand-green';
            textColor = 'text-brand-green';
          } else if (isCurrent) {
            dotColor = isLate ? 'bg-brand-red' : 'bg-brand-blue';
            textColor = isLate ? 'text-brand-red font-bold' : 'text-brand-blue font-bold';
          }

          return (
            <div key={step.id} className="flex items-center flex-shrink-0">
              {/* Dot */}
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${dotColor}`}>
                  {isDone ? '✓' : step.step}
                </div>
                <span className={`text-[10px] mt-1.5 text-center whitespace-nowrap ${textColor}`}>
                  {step.label}
                </span>
              </div>
              {/* Line */}
              {i < steps.length - 1 && (
                <div className={`w-8 lg:w-12 h-0.5 mx-1 flex-shrink-0 ${isDone ? lineColor : 'bg-[var(--border-primary)]'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
