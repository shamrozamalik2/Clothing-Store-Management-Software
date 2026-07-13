import { forwardRef } from 'react';
import { cn } from '@utils/cn';

const variants = {
  primary:   'bg-primary-600 hover:bg-primary-500 text-white shadow-sm',
  secondary: 'bg-surface-700 hover:bg-surface-600 text-surface-100 shadow-sm',
  danger:    'bg-red-600 hover:bg-red-500 text-white shadow-sm',
  success:   'bg-green-600 hover:bg-green-500 text-white shadow-sm',
  ghost:     'hover:bg-surface-700 text-surface-300 hover:text-surface-100',
  outline:   'border border-surface-600 hover:border-surface-500 text-surface-200 hover:bg-surface-800',
};

const sizes = {
  xs:  'h-7 px-2.5 text-xs gap-1',
  sm:  'h-8 px-3 text-sm gap-1.5',
  md:  'h-9 px-4 text-sm gap-2',
  lg:  'h-11 px-5 text-base gap-2',
  xl:  'h-12 px-6 text-base gap-2.5',
  icon:'h-9 w-9 p-0',
};

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  leftIcon,
  rightIcon,
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Spinner size={size} />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});

function Spinner({ size }) {
  const s = size === 'xs' || size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <svg className={cn('animate-spin shrink-0', s)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

Button.displayName = 'Button';
export { Button };
export default Button;
