import { cn } from '@utils/cn';

export default function Toggle({ checked, onChange, label, disabled = false, size = 'md' }) {
  const sizes = {
    sm: { track: 'h-4 w-8',   thumb: 'h-3 w-3', on: 'translate-x-4' },
    md: { track: 'h-5 w-9',   thumb: 'h-3.5 w-3.5', on: 'translate-x-4' },
    lg: { track: 'h-6 w-11',  thumb: 'h-4 w-4', on: 'translate-x-5' },
  };
  const s = sizes[size];
  return (
    <label className={cn('inline-flex items-center gap-2.5 cursor-pointer', disabled && 'opacity-50 pointer-events-none')}>
      <div
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative flex items-center rounded-full transition-colors duration-200',
          s.track,
          checked ? 'bg-primary-600' : 'bg-surface-600',
        )}
      >
        <span className={cn(
          'absolute left-0.5 rounded-full bg-white shadow transition-transform duration-200',
          s.thumb,
          checked ? s.on : 'translate-x-0',
        )} />
      </div>
      {label && <span className="text-sm text-surface-300 select-none">{label}</span>}
    </label>
  );
}
