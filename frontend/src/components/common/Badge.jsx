import { cn } from '@utils/cn';

const variants = {
  success: 'bg-green-900/40 text-green-400 border-green-800/60',
  danger:  'bg-red-900/40 text-red-400 border-red-800/60',
  warning: 'bg-amber-900/40 text-amber-400 border-amber-800/60',
  info:    'bg-blue-900/40 text-blue-400 border-blue-800/60',
  purple:  'bg-purple-900/40 text-purple-400 border-purple-800/60',
  neutral: 'bg-surface-700/60 text-surface-400 border-surface-600/60',
};

export default function Badge({ children, variant = 'neutral', className, dot = false }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
      variants[variant],
      className,
    )}>
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-green-400': variant === 'success',
          'bg-red-400':   variant === 'danger',
          'bg-amber-400': variant === 'warning',
          'bg-blue-400':  variant === 'info',
          'bg-purple-400':variant === 'purple',
          'bg-surface-400':variant === 'neutral',
        })} />
      )}
      {children}
    </span>
  );
}
