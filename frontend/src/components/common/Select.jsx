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
      <label className="text-xs font-semibold text-surface-300 uppercase tracking-wide">
        {label}
        {props.required && <span className="text-red-400 ml-1">*</span>}
      </label>
    )}
    <select
      ref={ref}
      className={cn(
        'h-9 w-full px-3 rounded-lg border text-sm transition-all duration-150',
        'text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        error ? 'border-red-500' : 'border-surface-600 hover:border-surface-500',
        className,
      )}
      style={{ backgroundColor: 'rgb(var(--card))', color: 'rgb(var(--s-100))' }}
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
