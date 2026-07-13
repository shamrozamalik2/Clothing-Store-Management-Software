import { forwardRef } from 'react';
import { cn } from '@utils/cn';

const Select = forwardRef(({
  label,
  error,
  hint,
  fullWidth = true,
  className,
  containerClassName,
  children,
  placeholder,
  ...props
}, ref) => (
  <div className={cn('flex flex-col gap-1', fullWidth && 'w-full', containerClassName)}>
    {label && (
      <label className="text-sm font-medium text-surface-300">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
    )}
    <select
      ref={ref}
      className={cn(
        'h-9 w-full px-3 rounded-lg bg-surface-800 border text-sm transition-colors',
        'text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-red-500' : 'border-surface-600 hover:border-surface-500',
        className,
      )}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
    {error && <p className="text-xs text-red-400">{error}</p>}
    {hint && !error && <p className="text-xs text-surface-500">{hint}</p>}
  </div>
));

Select.displayName = 'Select';
export default Select;
