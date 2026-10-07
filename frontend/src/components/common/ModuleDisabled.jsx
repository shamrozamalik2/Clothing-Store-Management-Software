import { LockClosedIcon } from '@heroicons/react/24/outline';

// Shown instead of a page's content when its module is off for this business. The backend
// already refuses the API the same way; this is what the person sees instead of an empty list.
export default function ModuleDisabled({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-surface-700 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-800">
        <LockClosedIcon className="h-6 w-6 text-surface-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-surface-200">{label} is not enabled for your business</p>
        <p className="text-xs text-surface-500 mt-1">Ask your administrator to turn it on in Super Admin.</p>
      </div>
    </div>
  );
}
