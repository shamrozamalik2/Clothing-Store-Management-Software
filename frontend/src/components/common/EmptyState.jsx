import { isValidElement } from 'react';
import { cn } from '@utils/cn';

export default function EmptyState({ icon, title, description, action, className }) {
  const iconContent = icon
    ? isValidElement(icon)
      ? icon
      : (() => { const Icon = icon; return <Icon className="h-7 w-7 text-surface-500" />; })()
    : null;

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {iconContent && (
        <div className="h-14 w-14 rounded-2xl bg-surface-700 flex items-center justify-center mb-4">
          {iconContent}
        </div>
      )}
      <p className="text-base font-medium text-surface-300">{title}</p>
      {description && <p className="text-sm text-surface-500 mt-1 max-w-sm">{description}</p>}
      {action && (
        <div className="mt-4">
          {isValidElement(action)
            ? action
            : <button onClick={action.onClick} className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">{action.label}</button>
          }
        </div>
      )}
    </div>
  );
}
