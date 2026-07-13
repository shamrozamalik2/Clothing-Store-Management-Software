import Badge from './Badge';

const MAP = {
  in_stock:     { label: 'In Stock',     variant: 'success' },
  low_stock:    { label: 'Low Stock',    variant: 'warning' },
  out_of_stock: { label: 'Out of Stock', variant: 'danger'  },
};

export default function StockBadge({ status, qty }) {
  const cfg = MAP[status] ?? MAP.in_stock;
  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
      {qty !== undefined && (
        <span className="text-xs text-surface-500 pl-1">{qty} units</span>
      )}
    </div>
  );
}
