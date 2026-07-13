import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@utils/cn';

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  debounce = 300,
  autoFocus = false,
}) {
  const [local, setLocal] = useState(value ?? '');
  const timer = useRef(null);

  useEffect(() => { setLocal(value ?? ''); }, [value]);

  function handleChange(e) {
    const v = e.target.value;
    setLocal(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), debounce);
  }

  function clear() {
    setLocal('');
    clearTimeout(timer.current);
    onChange('');
  }

  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-500 pointer-events-none" />
      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'h-9 w-full pl-9 pr-8 rounded-lg bg-surface-800 border border-surface-600',
          'text-sm text-surface-100 placeholder:text-surface-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          'hover:border-surface-500 transition-colors'
        )}
      />
      {local && (
        <button
          onClick={clear}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center
                     text-surface-500 hover:text-surface-300 transition-colors"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
