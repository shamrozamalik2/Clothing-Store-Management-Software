import { cn } from '@utils/cn';

const COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
];

function getColor(name = '') {
  let code = 0;
  for (let i = 0; i < name.length; i++) code += name.charCodeAt(i);
  return COLORS[code % COLORS.length];
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const sizes = {
  xs:  'h-6 w-6 text-2xs',
  sm:  'h-7 w-7 text-xs',
  md:  'h-8 w-8 text-sm',
  lg:  'h-10 w-10 text-sm',
  xl:  'h-12 w-12 text-base',
  '2xl':'h-16 w-16 text-lg',
};

export default function Avatar({ name = '', src, size = 'md', className }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-1 ring-surface-600', sizes[size], className)}
      />
    );
  }
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold text-white ring-1 ring-surface-600',
      getColor(name),
      sizes[size],
      className,
    )}>
      {getInitials(name)}
    </div>
  );
}
