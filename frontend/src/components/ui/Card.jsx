import { cn } from '@utils/cn';

function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'bg-surface-800 border border-surface-700 rounded-xl shadow-card',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn('px-5 py-4 border-b border-surface-700', className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ children, className, ...props }) {
  return (
    <h3 className={cn('text-base font-semibold text-surface-100', className)} {...props}>
      {children}
    </h3>
  );
}

function CardContent({ children, className, ...props }) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn('px-5 py-3 border-t border-surface-700 bg-surface-800/50 rounded-b-xl', className)}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;
Card.Footer = CardFooter;

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
export default Card;
