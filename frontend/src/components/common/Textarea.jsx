import { forwardRef } from 'react';
import { cn } from '@utils/cn';

const Textarea = forwardRef(({ label, error, hint, fullWidth = true, containerClassName, rows = 3, className, ...props }, ref) => (
  <div className={cn('flex flex-col gap-1', fullWidth && 'w-full', containerClassName)}>
    {label && (
      <label className="text-sm font-medium text-surface-300">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
    )}
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full px-3 py-2 rounded-lg bg-surface-800 border text-sm resize-none transition-colors',
        'text-surface-100 placeholder:text-surface-500',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-red-500' : 'border-surface-600 hover:border-surface-500',
        className,
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
    {hint && !error && <p className="text-xs text-surface-500">{hint}</p>}
  </div>
));
Textarea.displayName = 'Textarea';
export default Textarea;
