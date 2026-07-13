import { forwardRef } from 'react';
import { cn } from '@utils/cn';

const Input = forwardRef(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className,
  containerClassName,
  size = 'md',
  ...props
}, ref) => {
  const sizes = {
    sm: 'h-8 text-sm px-3',
    md: 'h-9 text-sm px-3',
    lg: 'h-11 text-base px-4',
  };

  return (
    <div className={cn('flex flex-col gap-1', fullWidth && 'w-full', containerClassName)}>
      {label && (
        <label className="text-sm font-medium text-surface-300">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-surface-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg bg-surface-800 border transition-colors',
            'text-surface-100 placeholder:text-surface-500',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-surface-600 hover:border-surface-500',
            sizes[size],
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-surface-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-surface-500">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export { Input };
export default Input;
